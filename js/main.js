import { createClient } from "https://esm.sh/@supabase/supabase-js";

/* ---------------- Debug + global error handlers ---------------- */
console.log("✅ main.js loaded", new Date().toISOString());
window.addEventListener("error", (e) => console.error("Global error:", e.message, e));
window.addEventListener("unhandledrejection", (e) => console.error("Promise rejection:", e.reason));

/* ---------------- Supabase config ---------------- */
const supabase = createClient(
  "https://lvzktprqdfzbgasorbgo.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2emt0cHJxZGZ6Ymdhc29yYmdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTQzMTYsImV4cCI6MjA3ODI3MDMxNn0.r2ZXYc1mYna72oxijRH2u1N63_ZEmCeTL-zcVj-6WUY"
);

/* ---------------- Formations ---------------- */
const FORMATIONS = {
  "3-4-3": [["GK"],["RWB","RM"],["CB"],["CB"],["CB"],["LWB","LM"],["CM"],["CM"],["LW"],["ST"],["RW"]],
  "3-5-2": [["GK"],["RWB","RM"],["CB"],["CB"],["CB"],["LWB","LM"],["CDM"],["CDM"],["CAM"],["ST"],["ST"]],
  "4-4-2": [["GK"],["RB"],["CB"],["CB"],["LB"],["RM","RW"],["CM"],["CM"],["LM","LW"],["ST"],["ST"]],
  "4-1-2-1-2": [["GK"],["RB"],["CB"],["CB"],["LB"],["CDM"],["RM","RW"],["LM","LW"],["CAM"],["ST"],["ST"]],
  "4-2-3-1": [["GK"],["RB"],["CB"],["CB"],["LB"],["CDM"],["CDM"],["RM","RW"],["CAM"],["LM","LW"],["ST"]],
  "4-3-3 (Holding)": [["GK"],["RB"],["CB"],["CB"],["LB"],["CDM"],["CM"],["CM"],["RW"],["ST"],["LW"]],
  "4-3-3 (Flat)": [["GK"],["RB"],["CB"],["CB"],["LB"],["CM"],["CM"],["CM"],["RW"],["ST"],["LW"]],
  "4-3-3 (Attack)": [["GK"],["RB"],["CB"],["CB"],["LB"],["CM"],["CM"],["CAM"],["RW"],["ST"],["LW"]],
};

const BACKLINE = new Set(["GK","RB","CB","LB","RWB","LWB"]);
const $ = (id) => document.getElementById(id);
const keyOf = (p) => `${p.Name}|${p.Club}`;

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}
function sumRating(t){return t.reduce((s,p)=>s+(Number(p.Rating)||0),0);}
function has95(team){return team.some(p=>Number(p.Rating)>=95);}

function statsHTML(p, showCS){
  const parts = [
    p.Club,
    p.League,
    `Apps ${p.Appearances ?? 0}`,
    `G ${p.Goals ?? 0}`,
    `A ${p.Assists ?? 0}`
  ];
  if(showCS) parts.push(`CS ${p["Clean Sheets"] ?? 0}`);
  return parts.filter(Boolean).join(" · ");
}

/* ---------------- Random / Goat mode core ---------------- */
function currentFormationSlots(){
  return FORMATIONS["4-3-3 (Holding)"];
}

async function loadByPositions(posSlots){
  const pools = new Map();
  for(const pos of new Set(posSlots.flat())){
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("Position", pos)
      .limit(500);
    if(error) throw new Error(error.message);
pools.set(pos, shuffle([...(data || [])]));
//                    ^^^  three dots, not ".["
  }
  return pools;
}

function drawTeamFromPools(formationSlots, pools, excludeKeys = new Set()){
  const team = [];
  const taken = new Set(excludeKeys);
  for(const slot of formationSlots){
    const choices = slot.flatMap(pos => pools.get(pos) || []);
    let pick = null;
    while(choices.length){
      const c = choices.pop();
      if(!taken.has(keyOf(c))){ pick = c; break; }
    }
    if(!pick) throw new Error(`Not enough players for ${slot.join("/")}`);
    team.push(pick);
    taken.add(keyOf(pick));
  }
  return { team, taken };
}

function renderTeams(A,B){
  const a = [];
  const b = [];
  const slots = (draft.active && series.lastA.length) ? series.lastSlots : currentFormationSlots();
  for(let i=0;i<slots.length;i++){
    const pA = A[i], pB = B[i];
    const rA = Number(pA.Rating || 0), rB = Number(pB.Rating || 0);
    let classA = "", classB = "";
    if(rA > rB){ classA="winner"; classB="loser"; }
    else if(rB > rA){ classA="loser"; classB="winner"; }
    const back = slots[i].some(pos => BACKLINE.has(pos));
    a.push(
      `<li class="${classA}">
        <span class="pos">${pA.Position}</span>
        <span class="name">
          ${pA.Name}
          <span class="sub"> ${statsHTML(pA, back)}</span>
        </span>
        <span class="meta">${rA}</span>
      </li>`
    );
    b.push(
      `<li class="${classB}">
        <span class="pos">${pB.Position}</span>
        <span class="name">
          ${pB.Name}
          <span class="sub"> ${statsHTML(pB, back)}</span>
        </span>
        <span class="meta">${rB}</span>
      </li>`
    );
  }
  $("teamA").innerHTML = a.join("");
  $("teamB").innerHTML = b.join("");
  $("sumA").textContent = `Total ${sumRating(A)}`;
  $("sumB").textContent = `Total ${sumRating(B)}`;
}

async function ensureGoatsOnBoth(A,B){
  if(has95(A) && has95(B)) return;
  const { data: goats } = await supabase
    .from("players")
    .select("*")
    .gte("Rating", 95)
    .limit(500);
  if(!goats?.length) return;
  const pool = shuffle(goats);

  function inject(team, other){
    if(has95(team)) return;
    for(const g of pool){
      if(team.some(p=>keyOf(p)===keyOf(g)) || other.some(p=>keyOf(p)===keyOf(g))) continue;
      const slots = currentFormationSlots();
      let idx = slots.findIndex(arr => arr.includes(g.Position));
      if(idx < 0) idx = 0;
      team[idx] = g;
      return;
    }
  }

  inject(A,B);
  inject(B,A);
}

async function generate(goat = false){
  $("error").textContent = "";
  try{
    const slots = currentFormationSlots();
    const pools = await loadByPositions(slots);
    const { team: A, taken } = drawTeamFromPools(slots, pools);
    const { team: B } = drawTeamFromPools(slots, pools, taken);
    if(goat) await ensureGoatsOnBoth(A,B);
    series.lastSlots = slots;
    renderTeams(A,B);
  }catch(e){
    $("error").textContent = e.message;
  }
}
/* ---------------- Match simulation (xG model) ---------------- */
// teamRatings = { att, mid, def } all roughly 83–99
function expectedGoals(team, opponent){
  const Att = team.att, Mid = team.mid, Def = team.def;
  const OppAtt = opponent.att, OppMid = opponent.mid, OppDef = opponent.def;

  // 1. Base attack pressure
  const attack_pressure = Att + 0.5 * Mid - 1.1 * OppDef;

  // 2. Attack vs defence advantage
  const diff = Att - OppDef;
  let boost;
  if (diff >= 7)      boost = 1.18;
  else if (diff >= 3) boost = 1.08;
  else if (diff <= -7)boost = 0.75;
  else if (diff <= -3)boost = 0.9;
  else                boost = 1.0;

  // 3. Midfield influence
  const mid_diff = Mid - OppMid;
  const mid_multiplier = 1.0 + Math.max(-0.12, Math.min(0.12, mid_diff * 0.02));

  // 4. Pressure → expected goals (λ)
  const base_lambda = 0.12 * Math.exp(attack_pressure / 20.0);
  const lam = base_lambda * boost * mid_multiplier;
  return Math.max(0.05, Math.min(lam, 4.0)); // clamp 0.05–4.0
}

function poissonSample(lam){
  const L = Math.exp(-lam);
  let k = 0, p = 1.0;
  while(true){
    k += 1;
    p *= Math.random();
    if(p <= L) break;
  }
  return k - 1;
}

function simulateMatchXG(rA, rB){
  const lamA = expectedGoals(rA, rB);
  const lamB = expectedGoals(rB, rA);
  const gA = poissonSample(lamA);
  const gB = poissonSample(lamB);
  return { gA, gB, lamA, lamB };
}

/* ---------------- Draft state ---------------- */
const draft = {
  active: false,
  formation: "4-3-3 (Holding)",
  slotIndex: 0,
  yourXI: Array(11).fill(null),
  oppXI: Array(11).fill(null),
  subs: [],
  oppSubs: [],
  taken: new Set(),
  globalPool: [],
  slots(){ return FORMATIONS[this.formation]; }
};

const series = {
  matchNo: 0,
  wins: 0,
  lastA: [],
  lastB: [],
  lastSlots: currentFormationSlots(),
  prematchXI: []
};

/* ---------------- Panel toggler ---------------- */
function togglePanels({ setup = false, prematch = false, series = false } = {}){
  $("setupPanel")?.classList.toggle("hidden", !setup);
  $("prematchPanel")?.classList.toggle("hidden", !prematch);
  $("seriesPanel")?.classList.toggle("hidden", !series);
}

/* ---------------- Simple "page" navigation ---------------- */
function showPage(pageId){
  // toggle page sections
  document.querySelectorAll(".page").forEach(sec => {
    if(sec.id === pageId) sec.classList.remove("hidden");
    else sec.classList.add("hidden");
  });

  // highlight active nav button
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("primary", btn.dataset.target === pageId);
  });

  // if we leave Draft page, hide any open draft panels
  if(pageId !== "page-draft"){
    togglePanels({ setup:false, prematch:false, series:false });
    draft.active = false;
  }
}

/* --- GOAL SCORER WEIGHTS & SELECTION --- */

function scorerWeightByPosition(pos){
  if (pos === "GK") return 0.01;     // keepers almost never score

  if (pos === "ST" || pos === "CF") return 5;       // strikers
  if (pos === "RW" || pos === "LW") return 4;       // wide forwards
  if (pos === "CAM")               return 3.5;
  if (pos === "CM" || pos === "RM" || pos === "LM" || pos === "CDM") return 2;
  if (pos === "RWB" || pos === "LWB") return 1.5;
  if (pos === "RB" || pos === "LB" || pos === "CB") return 1;

  return 2;
}

function pickScorer(players){
  if (!players.length) return null;

  // Miracle GK goal (1 in 1000)
  if (Math.random() < 1/1000){
    const gk = players.find(p => p.Position === "GK");
    if (gk) return gk;
  }

  const weights = players.map(p => {
    const w = scorerWeightByPosition(p.Position);
    const jitter = 0.5 + Math.random() * 0.5;
    return w * jitter;
  });

  const total = weights.reduce((a,b)=>a+b,0);
  let r = Math.random() * total;

  for (let i = 0; i < players.length; i++){
    r -= weights[i];
    if (r <= 0) return players[i];
  }
  return players[players.length - 1];
}

function simulateGoalsForTeam(players, goals){
  const events = [];
  for (let i = 0; i < goals; i++){
    const minute = 1 + Math.floor(Math.random() * 95); // realistic minutes
    const scorer = pickScorer(players);
    events.push({ minute, scorer });
  }
  events.sort((a,b)=>a.minute - b.minute);
  return events;
}

/* ---------------- Draft helpers ---------------- */
async function buildGlobalPool(){
  draft.globalPool = [];
  const distinct = new Set(Object.values(FORMATIONS).flat(1).flat());
  for(const pos of distinct){
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("Position", pos)
      .limit(800);
 if (data?.length) draft.globalPool.push(...data);
//                              ^^^ three dots again
  }
}

function availableForAny(positions){
  return draft.globalPool.filter(
    p => positions.includes(p.Position) && !draft.taken.has(keyOf(p))
  );
}

function randomOppFor(positions){
  const list = availableForAny(positions);
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

function candHTML(p){
  const showCS = BACKLINE.has(p.Position);
  return `
    <button class="cand" data-key="${keyOf(p)}">
      <div class="line1">
        <span>${p.Position} — ${p.Name}</span>
        <span>${p.Rating}</span>
      </div>
      <div class="line2">${p.Club} · ${p.League}</div>
      <div class="line3">
        ${
          showCS
            ? `Apps ${p.Appearances ?? 0} · G ${p.Goals ?? 0} · A ${p.Assists ?? 0} · CS ${p["Clean Sheets"] ?? 0}`
            : `Apps ${p.Appearances ?? 0} · G ${p.Goals ?? 0} · A ${p.Assists ?? 0}`
        }
      </div>
    </button>
  `;
}

/* ---------------- Draft screens ---------------- */
function resetSetupSelections(){
  draft.slotIndex = 0;
  draft.yourXI = Array(11).fill(null);
  draft.oppXI  = Array(11).fill(null);
  draft.subs = [];
  draft.oppSubs = [];
  draft.taken = new Set();
  $("setupSubsCount").textContent = `0 / 5`;
}

function renderSetup(){
  const slots = draft.slots();
  const idx = draft.slotIndex;
  const pickingSubs = idx >= 11;

  $("setupStep").textContent = pickingSubs
    ? `Subs — pick 5`
    : `Pick for slot ${idx+1}/11 (${slots[idx].join(" / ")})`;

  $("setupInstruction").textContent = pickingSubs
    ? `Choose 5 substitutes from remaining players (4 options shown).`
    : `Pick ONE of these 4 candidates for ${slots[idx].join("/")} — your opponent will auto-pick a different one.`;

  $("setupSubs").classList.toggle("hidden", !pickingSubs);

  if(!pickingSubs){
    const cands = shuffle(availableForAny(slots[idx])).slice(0, 4);
    $("setupCandidates").innerHTML =
      cands.map(candHTML).join("") ||
      `<div class="pill">No candidates left for ${slots[idx].join("/")}. Add more players.</div>`;

    Array.from($("setupCandidates").querySelectorAll(".cand")).forEach(btn => {
      btn.addEventListener("click", () => {
        const p = draft.globalPool.find(x => keyOf(x) === btn.dataset.key);
        if(!p) return;
        draft.yourXI[idx] = p;
        draft.taken.add(keyOf(p));
        const opp = randomOppFor(slots[idx]);
        if(opp){
          draft.oppXI[idx] = opp;
          draft.taken.add(keyOf(opp));
        }
        draft.slotIndex++;
        renderSetup();
      });
    });
  } else {
    $("setupSubsCount").textContent = `${draft.subs.length} / 5`;
    const remain = shuffle(draft.globalPool.filter(p => !draft.taken.has(keyOf(p))));
    const cands = remain.slice(0, 4);
    $("setupSubsCandidates").innerHTML =
      cands.map(candHTML).join("") ||
      `<div class="pill">No players remaining.</div>`;

    Array.from($("setupSubsCandidates").querySelectorAll(".cand")).forEach(btn => {
      btn.addEventListener("click", () => {
        if(draft.subs.length >= 5) return;
        const p = draft.globalPool.find(x => keyOf(x) === btn.dataset.key);
        if(!p) return;
        draft.subs.push(p);
        draft.taken.add(keyOf(p));
        const r = shuffle(
          draft.globalPool.filter(x => !draft.taken.has(keyOf(x)))
        ).pop();
        if(r){
          draft.oppSubs.push(r);
          draft.taken.add(keyOf(r));
        }
        $("setupSubsCount").textContent = `${draft.subs.length} / 5`;
        renderSetup();
      });
    });
  }
}

async function startSetup(){
  $("error").textContent = "";
  try{
    draft.active = true;
    draft.formation = $("setupFormation").value;
    await buildGlobalPool();
    resetSetupSelections();
    togglePanels({ setup:true, prematch:false, series:false });
    renderSetup();
  }catch(e){
    $("error").textContent = e.message;
  }
}

function endSetup(){
  togglePanels({ setup:false, prematch:false, series:false });
  draft.active = false;
}

function autoPickSubs(){
  while(draft.subs.length < 5){
    const r = shuffle(
      draft.globalPool.filter(x => !draft.taken.has(keyOf(x)))
    ).pop();
    if(!r) break;
    draft.subs.push(r);
    draft.taken.add(keyOf(r));

    const opp = shuffle(
      draft.globalPool.filter(x => !draft.taken.has(keyOf(x)))
    ).pop();
    if(opp){
      draft.oppSubs.push(opp);
      draft.taken.add(keyOf(opp));
    }
  }
  $("setupSubsCount").textContent = `${draft.subs.length} / 5`;
  renderSetup();
}

function finishSetup(){
  if(draft.yourXI.some(x => !x)){
    $("error").textContent = "Finish all 11 picks first.";
    return;
  }
  if(draft.subs.length < 5){
    $("error").textContent = "Pick 5 subs first.";
    return;
  }
  series.matchNo = 0;
  series.wins = 0;
  togglePanels({ setup:false, prematch:true, series:false });
  renderPrematchPool();
}

function renderPrematchPool(){
  const pool = [...draft.yourXI, ...draft.subs];
  //             ^^^              ^^^
  $("prematchFormation").value = draft.formation;
  $("seriesStatus").textContent = `Match ${series.matchNo+1} of 3`;

  $("prematchPool").innerHTML = pool.map((p,i) => `
    <label class="pick">
      <input type="checkbox" data-idx="${i}">
      <strong>${p.Position} — ${p.Name}</strong> (${p.Rating})<br>
      <span class="pill">${p.Club} · ${p.League}</span>
    </label>
  `).join("");
}

function chosenXIFromPool(){
  const pool = [...draft.yourXI, ...draft.subs];
  const checks = Array.from(
    $("prematchPool").querySelectorAll('input[type="checkbox"]:checked')
  );
  const indices = checks.map(c => Number(c.dataset.idx));
  if(indices.length !== 11) return null;
  return indices.map(i => pool[i]);
}

function assignToFormation(players, formationKey){
  const slots = FORMATIONS[formationKey];
  const used = new Set();
  const team = Array(11).fill(null);
  for(let i=0;i<slots.length;i++){
    const need = slots[i];
    const idx = players.findIndex(
      (p,pi) => !used.has(pi) && need.includes(p.Position)
    );
    if(idx === -1) return null;
    team[i] = players[idx];
    used.add(idx);
  }
  return team;
}

async function playMatch(){
  const chosen = chosenXIFromPool();
  if(!chosen){
    $("error").textContent = "Select exactly 11 players first.";
    return;
  }
  const f = $("prematchFormation").value;
  const yourAssigned = assignToFormation(chosen, f);
  if(!yourAssigned){
    $("error").textContent = `Your 11 don't fit ${f}. Try another formation or different players.`;
    return;
  }

  const slots = FORMATIONS[f];
  const pools = await loadByPositions(slots);
  const { team: opp } = drawTeamFromPools(
    slots,
    pools,
    new Set(chosen.map(keyOf))
  );

  series.lastSlots = slots;
  renderTeams(yourAssigned, opp);
  series.lastA = yourAssigned;
  series.lastB = opp;

  const win = sumRating(yourAssigned) > sumRating(opp);
  if(win) series.wins++;

  $("seriesLabel").textContent = `Played ${series.matchNo+1}/3`;
  $("seriesResult").textContent = win
    ? "You win this match on total rating."
    : "You lose this match on total rating.";
  $("finalScore").textContent =
    (series.matchNo+1 >= 3) ? `Final: ${series.wins}/3` : "";

  togglePanels({ setup:false, prematch:false, series:true });
  $("btn-next-match").disabled = (series.matchNo + 1 >= 3);
}

function nextMatch(){
  series.matchNo++;
  if(series.matchNo >= 3){
    $("finalScore").textContent = `Final: ${series.wins}/3`;
    $("btn-next-match").disabled = true;
    return;
  }
  togglePanels({ setup:false, prematch:true, series:false });
  $("seriesStatus").textContent = `Match ${series.matchNo+1} of 3`;
  renderPrematchPool();
}
/* ---------------- Tournament state & helpers ---------------- */

/* --- TEAM RATING AGGREGATION (att, mid, def) --- */

const ATT_POS = new Set(["ST","CF","RW","LW","CAM"]);
const MID_POS = new Set(["CM","CDM","LM","RM","RWB","LWB"]);
const DEF_POS = new Set(["CB","RB","LB","GK"]);

function aggregateTeamRatings(players){
  let attSum = 0, attCount = 0;
  let midSum = 0, midCount = 0;
  let defSum = 0, defCount = 0;

  players.forEach(p => {
    const r = Number(p.Rating) || 0;
    const pos = p.Position;

    if (ATT_POS.has(pos)) { attSum += r; attCount++; }
    else if (MID_POS.has(pos)) { midSum += r; midCount++; }
    else if (DEF_POS.has(pos)) { defSum += r; defCount++; }
    else { midSum += r; midCount++; }
  });

  function avg(sum, cnt, fallback){
    return cnt ? Math.round(sum / cnt) : fallback;
  }

  const overall = Math.round(
    (attSum + midSum + defSum) / Math.max(attCount + midCount + defCount, 1)
  );

  return {
    att: avg(attSum, attCount, overall),
    mid: avg(midSum, midCount, overall),
    def: avg(defSum, defCount, overall)
  };
}

function buildXIAndSubs(players, formationKey){
  const slots = FORMATIONS[formationKey] || FORMATIONS["4-3-3 (Holding)"];
  const used = new Set();
  const xi = Array(slots.length).fill(null);

  // pick best available player (by Rating) for each slot
  for (let i = 0; i < slots.length; i++){
    const need = slots[i];
    let bestIdx = -1;
    let bestRating = -Infinity;

    for (let idx = 0; idx < players.length; idx++){
      if (used.has(idx)) continue;
      const p = players[idx];
      if (!need.includes(p.Position)) continue;
      const r = Number(p.Rating) || 0;
      if (r > bestRating){
        bestRating = r;
        bestIdx = idx;
      }
    }

    // if no positional match, take best remaining player
    if (bestIdx === -1){
      for (let idx = 0; idx < players.length; idx++){
        if (used.has(idx)) continue;
        const p = players[idx];
        const r = Number(p.Rating) || 0;
        if (r > bestRating){
          bestRating = r;
          bestIdx = idx;
        }
      }
    }

    if (bestIdx === -1){
      // safety fallback
      xi[i] = players[0];
      used.add(0);
    } else {
      xi[i] = players[bestIdx];
      used.add(bestIdx);
    }
  }

  // remaining players become a randomised bench; keep up to 4 subs at random
  const remaining = players
    .map((p, idx) => ({ p, idx }))
    .filter(obj => !used.has(obj.idx))
    .map(obj => obj.p);

  const subsPool = shuffle([...remaining]);
  const subs = subsPool.slice(0, 4);

  return { xi, subs };
}

function randomFormationKey(){
  const keys = Object.keys(FORMATIONS);
  if (!keys.length) return "4-3-3 (Holding)";
  return keys[Math.floor(Math.random() * keys.length)];
}

const GROUP_IDS = ["A","B","C","D"];

const AI_TEAM_NAMES = [
  "Total Footballers",
  "Classic XI",
  "Galácticos FC",
  "Prime Time FC",
  "Ultimate Legends",
  "Squad Goals",
  "Passing Masters",
  "No Look FC",
  "Tiki Taka Town",
  "Top Bins United",
  "Crossbar Crew",
  "Last Minute Winners",
  "Volley Merchants",
  "Channel Runners",
  "Park the Bus FC"
];

const tournament = {
  teams: [],
  groups: {},
  fixtures: [],
  champion: null,
  userTeamId: 0,          // "Your Club"
  currentUserFixtureIdx: 0
};

function clamp(x,min,max){ return x < min ? min : x > max ? max : x; }

function createStrongTeam(id, label){
  // base in 87–93, then small variation per unit
  let base = 87 + Math.random() * 6;
  let att  = base + (Math.random() * 6 - 3);
  let mid  = base + (Math.random() * 6 - 3);
  let def  = base + (Math.random() * 6 - 3);
  // ensure average >= 87
  let avg = (att + mid + def) / 3;
  if(avg < 87){
    const bump = 87 - avg;
    att += bump; mid += bump; def += bump;
  }
  att = Math.round(clamp(att,83,99));
  mid = Math.round(clamp(mid,83,99));
  def = Math.round(clamp(def,83,99));
  return {
    id,
    name: label,
    ratings: { att, mid, def }
  };
}
// Build 16 squads of 15 real players from Supabase
async function buildTournamentSquads(){
  // Grab a pool of strong players (rating 84+ so teams can reach high averages)
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .gte("Rating", 84)
    .order("Rating", { ascending: false })
    .limit(400); // plenty for 16 x 15

  if (error) throw new Error(error.message);
  if (!data || !data.length) {
    throw new Error("No players found for tournament squads.");
  }

  const players = shuffle([...data]);
  const total = players.length;
  const squads = [];

  // 16 teams x 15 players. If we run out, we wrap around (so no errors).
  for (let i = 0; i < 16; i++) {
    const squad = [];
    for (let j = 0; j < 15; j++) {
      const idx = (i * 15 + j) % total;
      squad.push(players[idx]);
    }
    squads.push(squad);
  }

  return squads;
}

// Build a simple 4-3-3 style XI for a team so we can assign scorers
function generateSyntheticXIForTeam(team){
  const template = ["GK","RB","CB","CB","LB","CM","CM","CAM","RW","ST","LW"];

  return template.map(pos => {
    let rating;
    if (ATT_POS.has(pos))      rating = team.ratings.att;
    else if (DEF_POS.has(pos)) rating = team.ratings.def;
    else                       rating = team.ratings.mid;

    return {
      Name: `${team.name} ${pos}`,
      Club: team.name,
      League: "Twenty10s Tournament",
      Position: pos,
      Rating: rating
    };
  });
}

async function initTournament(userSquad = null){
  tournament.teams = [];
  tournament.groups = {};
  tournament.fixtures = [];
  tournament.champion = null;

  // Build 16 real squads of 15 players each from Supabase
  const squads = await buildTournamentSquads();

  // User formation for "Your Club"
  const formationSelect = $("tournamentFormation");
  const userFormationKey = formationSelect?.value || "4-3-3 (Holding)";

  for (let i = 0; i < 16; i++) {
    let name;
    let players;
    let formationKey;

    if (i === 0) {
      // Team 0 = Your Club (user team if available)
      name = "Your Club";
      if (userSquad && userSquad.length >= 11) {
        // Use up to 15 user players
        players = userSquad.slice(0, 15);
      } else {
        // Fallback: random squad from Supabase
        players = squads[i];
      }
      formationKey = userFormationKey;      // user-picked formation
    } else {
      name = AI_TEAM_NAMES[i - 1] || `Team ${i + 1}`;
      players = squads[i];
      formationKey = randomFormationKey();  // random formation for AI
    }

    const { xi, subs } = buildXIAndSubs(players, formationKey);
    const ratings = aggregateTeamRatings(xi); // ratings based on XI

    tournament.teams.push({
      id: i,
      name,
      players,        // full 15-man squad
      xi,             // starting XI based on formation
      subs,           // 4 random subs
      formation: formationKey,
      ratings         // used for xG in simulations
    });
  }

  // shuffle teams and assign to groups A–D (4 each)
  const ids = shuffle(tournament.teams.map(t => t.id));
  GROUP_IDS.forEach((g, gi) => {
    tournament.groups[g] = ids.slice(gi * 4, gi * 4 + 4);
  });

  // create double round-robin fixtures inside each group
  GROUP_IDS.forEach(g => {
    const tIds = tournament.groups[g];
    for (let i = 0; i < tIds.length; i++) {
      for (let j = i + 1; j < tIds.length; j++) {
        tournament.fixtures.push({
          stage: "groups", group: g, homeId: tIds[i], awayId: tIds[j], gH: null, gA: null
        });
        tournament.fixtures.push({
          stage: "groups", group: g, homeId: tIds[j], awayId: tIds[i], gH: null, gA: null
        });
      }
    }
  });
}

function playAllGroupMatches(){
  for(const f of tournament.fixtures){
    if(f.stage !== "groups") continue;
    const home = tournament.teams.find(t=>t.id===f.homeId);
    const away = tournament.teams.find(t=>t.id===f.awayId);
    const { gA, gB } = simulateMatchXG(home.ratings, away.ratings);
    f.gH = gA; f.gA = gB;
  }
}

function groupTables(){
  // returns { A:[rows...], ... } where row = { teamId, pts, gd, gf, ga, played, won,drawn,lost }
  const tables = {};
  GROUP_IDS.forEach(g => {
    const ids = tournament.groups[g];
    const rows = {};
    ids.forEach(id => {
      rows[id] = { teamId:id, pts:0, gd:0, gf:0, ga:0, played:0, won:0, drawn:0, lost:0 };
    });

    for(const f of tournament.fixtures){
      if(f.stage !== "groups" || f.group !== g) continue;
      const h = rows[f.homeId], a = rows[f.awayId];
      const gH = f.gH, gA = f.gA;
      h.played++; a.played++;
      h.gf += gH; h.ga += gA;
      a.gf += gA; a.ga += gH;
      if(gH > gA){
        h.won++; a.lost++;
        h.pts += 3;
      }else if(gA > gH){
        a.won++; h.lost++;
        a.pts += 3;
      }else{
        h.drawn++; a.drawn++;
        h.pts++; a.pts++;
      }
    }

    const arr = Object.values(rows);
    arr.forEach(r => r.gd = r.gf - r.ga);
    arr.sort((a,b)=>{
      if(b.pts !== a.pts) return b.pts - a.pts;
      if(b.gd  !== a.gd)  return b.gd  - a.gd;
      if(b.gf  !== a.gf)  return b.gf  - a.gf;
      return Math.random() - 0.5; // random tiebreak
    });

    tables[g] = arr;
  });

  return tables;
}

function simulateTwoLeggedTie(teamA, teamB){
  let aggA = 0, aggB = 0;
  for(let leg=0;leg<2;leg++){
    const { gA, gB } = simulateMatchXG(teamA.ratings, teamB.ratings);
    aggA += gA; aggB += gB;
  }
  if(aggA === aggB){
    // simple random decider if still tied
    if(Math.random() < 0.5) aggA++;
    else aggB++;
  }
  return {
    teamA, teamB,
    aggA, aggB,
    winner: aggA > aggB ? teamA : teamB
  };
}

function playKnockouts(tables){
  // Only group winners advance → 4 teams → 2 semis.
  const winners = GROUP_IDS.map(g => {
    const row = tables[g][0];
    return tournament.teams.find(t => t.id === row.teamId);
  });

  const semi1 = simulateTwoLeggedTie(winners[0], winners[1]); // A vs B
  const semi2 = simulateTwoLeggedTie(winners[2], winners[3]); // C vs D

  // one-leg final between semi winners
  const finalTeams = [semi1.winner, semi2.winner];

  // xG-based score
  const { gA, gB } = simulateMatchXG(finalTeams[0].ratings, finalTeams[1].ratings);
  let fA = gA, fB = gB;
  let winner = gA > gB ? finalTeams[0] : finalTeams[1];

  if (gA === gB){
    // random late deciding goal
    if (Math.random() < 0.5){ winner = finalTeams[0]; fA++; }
    else { winner = finalTeams[1]; fB++; }
  }

  // Use each team's XI + 4 subs as the scoring pool
  const poolA = [
    ...(finalTeams[0].xi || finalTeams[0].players || []),
    ...(finalTeams[0].subs || [])
  ];
  const poolB = [
    ...(finalTeams[1].xi || finalTeams[1].players || []),
    ...(finalTeams[1].subs || [])
  ];
  const eventsA = simulateGoalsForTeam(poolA, fA);
  const eventsB = simulateGoalsForTeam(poolB, fB);

  tournament.champion = winner;

  return {
    semi1,
    semi2,
    final: {
      teamA: finalTeams[0],
      teamB: finalTeams[1],
      gA: fA,
      gB: fB,
      winner,
      eventsA,
      eventsB
    }
  };
}

function showSquad(teamId){
  const team = tournament.teams.find(t => t.id === teamId);
  if (!team) return;

  const box = $("tournamentSquad");
  const titleEl = $("squadTitle");
  const subtitleEl = $("squadSubtitle");
  const listEl = $("squadList");

  const avgRating = Math.round(
    team.players.reduce((s,p) => s + (Number(p.Rating) || 0), 0) /
    Math.max(team.players.length, 1)
  );

  titleEl.textContent = `${team.name} — Squad`;
  subtitleEl.textContent = `${team.players.length} players · avg rating ${avgRating}`;

  listEl.innerHTML = team.players.map(p => `
    <div class="pool pick">
      <strong>${p.Position} — ${p.Name}</strong> (${p.Rating})<br>
      <span class="pill">${p.Club} · ${p.League}</span>
    </div>
  `).join("");

  box.classList.remove("hidden");
}

function renderTournament(tables, ko){
  const el = $("tournamentOutput");
  const parts = [];

  // Groups
  GROUP_IDS.forEach(g => {
    const rows = tables[g];
    parts.push(`
      <div class="t-group-card">
        <div class="t-group-title">Group ${g}</div>
        <table class="t-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>P</th><th>W</th><th>D</th><th>L</th>
              <th>GF</th><th>GA</th><th>GD</th><th>Pts</th>
            </tr>
          </thead>
          <tbody>
            ${
              rows.map(r => {
                const t = tournament.teams.find(x => x.id === r.teamId);
                return `
                  <tr>
                    <td>
                      <button class="link-button t-team" data-team-id="${t.id}">
                        ${t.name}
                      </button>
                    </td>
                    <td>${r.played}</td>
                    <td>${r.won}</td>
                    <td>${r.drawn}</td>
                    <td>${r.lost}</td>
                    <td>${r.gf}</td>
                    <td>${r.ga}</td>
                    <td>${r.gd}</td>
                    <td>${r.pts}</td>
                  </tr>
                `;
              }).join("")
            }
          </tbody>
        </table>
      </div>
    `);
  });

  // Knockouts
  const s1 = ko.semi1, s2 = ko.semi2, f = ko.final;

  function semiLine(s){
    return `${s.teamA.name} ${s.aggA}–${s.aggB} ${s.teamB.name}`;
  }

  function formatScorers(teamName, events){
    if (!events || !events.length) return `${teamName}: (no goals recorded)`;
    return `${teamName}: ` + events.map(e => `${e.scorer.Name} ${e.minute}'`).join(", ");
  }

  parts.push(`
    <div class="t-knockout">
      <h3>Semi-finals (two legs)</h3>
      <div class="pill">${semiLine(s1)}</div>
      <div class="pill">${semiLine(s2)}</div>
      <h3 style="margin-top:8px;">Final</h3>
      <div class="pill">${f.teamA.name} ${f.gA}–${f.gB} ${f.teamB.name}</div>
      <div class="pill t-scorers">${formatScorers(f.teamA.name, f.eventsA)}</div>
      <div class="pill t-scorers">${formatScorers(f.teamB.name, f.eventsB)}</div>
      <h3 style="margin-top:8px;">Champion</h3>
      <div class="pill">🏆 ${tournament.champion.name}</div>
    </div>
  `);

  el.innerHTML = parts.join("");

  // Wire up team name clicks to show squads
  document.querySelectorAll(".t-team").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.teamId);
      showSquad(id);
    });
  });
}


async function runFullTournament(){
  const out = $("tournamentOutput");
  if (out) {
    out.innerHTML = `<div class="pill">Building tournament squads and simulating matches...</div>`;
  }

  // Build user squad from Draft if available: 11 XI + 4 subs
  let userSquad = null;
  if (draft.yourXI && draft.yourXI.every(p => p) && draft.subs && draft.subs.length >= 4) {
  userSquad = [...draft.yourXI, ...draft.subs.slice(0, 4)];
}

  await initTournament(userSquad);  // Your Club will use this if present
  playAllGroupMatches();
  const tables = groupTables();
  const ko = playKnockouts(tables);
  renderTournament(tables, ko);
}

/* ---------------- Wire up after DOM ready ---------------- */
document.addEventListener("DOMContentLoaded", () => {

  /* ---------------- Navigation Buttons ---------------- */
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => showPage(btn.dataset.target));
  });

  // Start on Home
  showPage("page-home");

  /* ---------------- Home Page Buttons ---------------- */
  $("btn-generate")?.addEventListener("click", () => generate(false));
  $("btn-rematch")?.addEventListener("click",  () => generate(false));
  $("btn-goat")?.addEventListener("click",     () => generate(true));

  /* ---------------- Draft Entry (Draft Page) ---------------- */
  $("btn-draft")?.addEventListener("click", () => {
    showPage("page-draft");
    startSetup();
  });

  /* ---------------- Draft Setup Events ---------------- */
  $("btn-exit-setup")?.addEventListener("click", () => endSetup());

  $("setupFormation")?.addEventListener("change", e => {
    draft.formation = e.target.value;
    resetSetupSelections();
    renderSetup();
  });

  $("btn-setup-auto-subs")?.addEventListener("click", () => autoPickSubs());
  $("btn-setup-finish")?.addEventListener("click", () => finishSetup());

  /* ---------------- Pre-match (Draft Series) ---------------- */
  $("btn-exit-prematch")?.addEventListener("click", () =>
    togglePanels({ setup:false, prematch:false, series:false })
  );

  $("prematchFormation")?.addEventListener("change", () => { /* stored on play */ });

  $("btn-play-match")?.addEventListener("click", () => playMatch());

/* ---------- Tournament Mode State ---------- */

const TOURNAMENT_NUM_TEAMS = 16;
const TOURNAMENT_GROUP_SIZE = 4;
const TOURNAMENT_SQUAD_SIZE = 15;

const TOURNAMENT_STAGES = {
  NOT_STARTED: "not_started",
  GROUPS: "groups",
  SEMIS: "semis",
  FINAL: "final",
  FINISHED: "finished",
};

let tournament = {
  stage: TOURNAMENT_STAGES.NOT_STARTED,

  // All generated teams (length 16)
  teams: [], // each: { id, name, rating, squad:[players], isUser:boolean }

  // Index of the team the user controls (in tournament.teams)
  userTeamIndex: null,

  // Groups A–D
  groups: [
    { name: "Group A", teamIndices: [], table: [] },
    { name: "Group B", teamIndices: [], table: [] },
    { name: "Group C", teamIndices: [], table: [] },
    { name: "Group D", teamIndices: [], table: [] },
  ],

  // List of matches in chronological order
  fixtures: [],
  // each fixture:
  // { id, stage:"group"|"semi"|"final", groupName:null|"Group A",
  //   homeIndex, awayIndex, leg:1|2, played:false, score:null, scorers:[] }

  currentMatchIndex: 0,

  // Last XI the user used (for "Use last lineup" button later)
  previousXI: null, // { formation:"4-3-3", playerIds:[..11 ids..] }

  // Final info once completed
  championIndex: null,
};

/* ---------- Tournament Helper Functions ---------- */

function buildTournamentTeams() {
  tournament.teams = [];

  for (let i = 0; i < TOURNAMENT_NUM_TEAMS; i++) {
    const team = {
      id: i,
      name: `Team ${i + 1}`,
      rating: 70 + Math.floor(Math.random() * 11), // 70–80 for now
      squad: [],
      isUser: false,
    };

    // 15-man squad
    team.squad = buildTournamentSquad(team);

    tournament.teams.push(team);
  }
}

function buildTournamentSquad(team) {
  const squad = [];
  for (let i = 0; i < TOURNAMENT_SQUAD_SIZE; i++) {
    squad.push({
      id: `${team.id}-${i}`,
      name: `Player ${i + 1}`,
      position: "MID",     // placeholder for now
      rating: team.rating, // placeholder
    });
  }
  return squad;
}

function assignTeamsToGroups() {
  const indices = [...Array(TOURNAMENT_NUM_TEAMS).keys()];

  // Simple shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Clear any previous group data
  tournament.groups.forEach(group => {
    group.teamIndices = [];
    group.table = [];
  });

  // 4 groups of 4
  indices.forEach((teamIndex, i) => {
    const groupIdx = Math.floor(i / TOURNAMENT_GROUP_SIZE); // 0–3
    tournament.groups[groupIdx].teamIndices.push(teamIndex);
  });

  // Init tables
  tournament.groups.forEach(group => {
    group.table = group.teamIndices.map(teamIndex => ({
      teamIndex,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    }));
  });
}

function buildGroupFixtures() {
  tournament.fixtures = [];

  tournament.groups.forEach(group => {
    const t = group.teamIndices;

    // Round robin, home & away
    for (let i = 0; i < t.length; i++) {
      for (let j = i + 1; j < t.length; j++) {
        // First leg
        tournament.fixtures.push({
          id: `G-${group.name}-${t[i]}-${t[j]}-1`,
          stage: "group",
          groupName: group.name,
          homeIndex: t[i],
          awayIndex: t[j],
          leg: 1,
          played: false,
          score: null,   // { home, away }
          scorers: [],   // [{ teamIndex, playerId, minute }]
        });
        // Second leg
        tournament.fixtures.push({
          id: `G-${group.name}-${t[j]}-${t[i]}-2`,
          stage: "group",
          groupName: group.name,
          homeIndex: t[j],
          awayIndex: t[i],
          leg: 2,
          played: false,
          score: null,
          scorers: [],
        });
      }
    }
  });
}

function pickUserTeam() {
  const randomIndex = Math.floor(Math.random() * TOURNAMENT_NUM_TEAMS);
  tournament.userTeamIndex = randomIndex;

  tournament.teams.forEach((t, i) => {
    t.isUser = (i === randomIndex);
  });

  console.log("User controls team:", tournament.teams[randomIndex]?.name);
}

function initTournament() {
  // Reset core state
  tournament.stage = TOURNAMENT_STAGES.GROUPS;
  tournament.teams = [];
  tournament.userTeamIndex = null;
  tournament.championIndex = null;
  tournament.currentMatchIndex = 0;
  tournament.previousXI = null;

  // Reset groups & fixtures
  tournament.groups = [
    { name: "Group A", teamIndices: [], table: [] },
    { name: "Group B", teamIndices: [], table: [] },
    { name: "Group C", teamIndices: [], table: [] },
    { name: "Group D", teamIndices: [], table: [] },
  ];
  tournament.fixtures = [];

  // 1) Build 16 teams with 15-man squads each
  buildTournamentTeams();

  // 2) Assign teams into groups A–D
  assignTeamsToGroups();

  // 3) Build group stage fixtures (home & away)
  buildGroupFixtures();

  // 4) Pick a user team (for now random – later could be selectable)
  pickUserTeam();

  // 5) Later: move to squad selection UI
  // showTournamentSquadSelection();

  console.log("Tournament initialised:", tournament);
}

/* ---------------- Series Page ---------------- */
$("btn-exit-series")?.addEventListener("click", () =>
  togglePanels({ setup:false, prematch:false, series:false })
);

$("btn-next-match")?.addEventListener("click", () => nextMatch());

/* ---------------- Squad Panel Close Button ---------------- */
$("btn-close-squad")?.addEventListener("click", () => {
  $("tournamentSquad")?.classList.add("hidden");
});

/* ---------------- Tournament Button ---------------- */
$("btn-run-tournament")?.addEventListener("click", () => {
  showPage("page-tournament");
  initTournament();   // new flow
});

/* ---------------- Initial Home Page Render ---------------- */
generate(false);
});

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

/* ---------------- Tournament (Supabase) Globals ---------------- */

// no TOURNAMENT_SQUAD_SIZE here

let tournamentPool = [];       // all eligible players (85–90 rated)
let userTournamentSquad = [];  // user's chosen 15
let tournamentTeams = [];      // user + 15 AI teams

/* ---------------- Load players from Supabase ---------------- */

async function loadTournamentPoolFromSupabase() {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .gte("Rating", 80)          // 👈 only players 80+
      .lte("Rating", 99)          // 👈 and max 99
      .order("Rating", { ascending: false }); // 👈 highest first

    if (error) {
      console.error("Supabase load error:", error);
      return [];
    }

    // Still sort + normalise rating as number just in case
    tournamentPool = (data || []).sort(
      (a, b) => Number(b.Rating) - Number(a.Rating)
    );

    console.log("🎯 Loaded Supabase tournament pool:", tournamentPool.length);
    console.log(
      "Top 5 ratings in pool:",
      tournamentPool.slice(0, 5).map(p => p.Rating)
    );

    return tournamentPool;

  } catch (err) {
    console.error("Unexpected Supabase load error:", err);
    return [];
  }
}


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

function pickScorer(players) {
  if (!players || !players.length) return null;

  const ctx = buildLineRatingContext(players);

  // Tiny "miracle GK goal" chance (but essentially never)
  const gks = players.filter((p) => getLineForPos(p.Position) === "gk");
  if (gks.length && Math.random() < 1 / 5000) {
    return gks[Math.floor(Math.random() * gks.length)];
  }

  // Everyone else: weighted by line + rating
  const weights = players.map((p) => scorerWeight(p, ctx));
  const total = weights.reduce((a, b) => a + b, 0) || 1;

  let r = Math.random() * total;
  for (let i = 0; i < players.length; i++) {
    r -= weights[i];
    if (r <= 0) return players[i];
  }
  return players[players.length - 1];
}

// Turn a goal count into scorer + minute events
function simulateGoalsForTeam(players, goals) {
  const events = [];
  if (!players || !players.length || !goals) return events;

  for (let i = 0; i < goals; i++) {
    const minute = 1 + Math.floor(Math.random() * 95);
    const scorer = pickScorer(players);
    events.push({
      minute,
      scorer,
    });
  }

  // chronological order
  events.sort((a, b) => a.minute - b.minute);
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
/* ---------- Tournament Mode State ---------- */


const FORMATION_POSITIONS = {
  "3-4-3":      ["GK","CB","CB","CB","RM","CM","CM","LM","RW","ST","LW"],
  "3-5-2":      ["GK","CB","CB","CB","RM","CM","CAM","CM","LM","ST","ST"],
  "4-4-2":      ["GK","RB","CB","CB","LB","RM","CM","CM","LM","ST","ST"],
  "4-1-2-1-2":  ["GK","RB","CB","CB","LB","CDM","CM","CM","CAM","ST","ST"],
  "4-2-3-1":    ["GK","RB","CB","CB","LB","CDM","CDM","CAM","RW","ST","LW"],
  "4-3-3 (Holding)": ["GK","RB","CB","CB","LB","CDM","CM","CM","RW","ST","LW"],
  "4-3-3 (Flat)":    ["GK","RB","CB","CB","LB","CM","CM","CM","RW","ST","LW"],
  "4-3-3 (Attack)":  ["GK","RB","CB","CB","LB","CM","CAM","CM","RW","ST","LW"],
};

const DRAFT_SUB_PICKS = 4;
const ALL_POSITIONS = ["GK","RB","CB","LB","CDM","CM","CAM","RM","LM","RW","LW","ST"];

let draftState = {
  active: false,
  step: 0,
  totalSteps: 0,
  picks: [],
  currentCandidates: [],
  taken: new Set(),      // track players already picked
};

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

  // NEW — formation + required XI
  userFormation: "4-3-3 (Holding)",
  requiredPositions: [],
};

/* ---------- Tournament Helper Functions ---------- */

// Find the next unplayed group fixture that involves the user
function getNextUserFixtureIndex() {
  if (tournament.userTeamIndex == null) return -1;

  return tournament.fixtures.findIndex(
    f =>
      f.stage === "group" &&
      !f.played &&
      (f.homeIndex === tournament.userTeamIndex ||
        f.awayIndex === tournament.userTeamIndex)
  );
}

function getFixtureLabel(fix) {
  if (!fix) return "";
  const home = tournament.teams[fix.homeIndex]?.name || "Home";
  const away = tournament.teams[fix.awayIndex]?.name || "Away";
  const group = fix.groupName || "";
  const legStr = fix.leg ? ` · Leg ${fix.leg}` : "";
  return `${group} · ${home} vs ${away}${legStr}`;
}

// Update a single group's table from a finished fixture
function updateTablesFromFixture(fix) {
  if (!fix || !fix.score) return;

  const group =
    tournament.groups.find(g => g.name === fix.groupName) ||
    tournament.groups.find(
      g => g.teamIndices.includes(fix.homeIndex) && g.teamIndices.includes(fix.awayIndex)
    );

  if (!group || !group.table) return;

  const homeRow = group.table.find(r => r.teamIndex === fix.homeIndex);
  const awayRow = group.table.find(r => r.teamIndex === fix.awayIndex);
  if (!homeRow || !awayRow) return;

  const gh = fix.score.home;
  const ga = fix.score.away;

  homeRow.played++;
  awayRow.played++;

  homeRow.gf += gh;
  homeRow.ga += ga;
  awayRow.gf += ga;
  awayRow.ga += gh;

  homeRow.gd = homeRow.gf - homeRow.ga;
  awayRow.gd = awayRow.gf - awayRow.ga;

  if (gh > ga) {
    homeRow.won++;
    homeRow.points += 3;
    awayRow.lost++;
  } else if (ga > gh) {
    awayRow.won++;
    awayRow.points += 3;
    homeRow.lost++;
  } else {
    homeRow.drawn++;
    awayRow.drawn++;
    homeRow.points += 1;
    awayRow.points += 1;
  }

  // sort by Points, GD, GF
  group.table.sort(
    (a, b) =>
      b.points - a.points ||
      (b.gd || 0) - (a.gd || 0) ||
      (b.gf || 0) - (a.gf || 0)
  );

  if (tournament.tables && group.name in tournament.tables) {
    tournament.tables[group.name] = group.table;
  }
}

// Tiny xG-ish generator based on rating + create scorers

// ---------- Scorer helpers: line + rating aware ----------

// Classify a player's line (for scoring logic)
function getLineForPos(pos) {
  if (!pos) return "mid";
  const p = String(pos).toUpperCase();

  if (p === "GK") return "gk";

  if (["CB", "LCB", "RCB", "LB", "RB", "LWB", "RWB"].includes(p)) {
    return "def";
  }

  if (
    ["CDM", "CM", "LCM", "RCM", "LDM", "RDM", "LM", "RM", "CAM"].includes(p)
  ) {
    return "mid";
  }

  if (["LW", "RW", "LF", "RF", "CF", "ST"].includes(p)) {
    return "att";
  }

  // default any weird ones to midfield
  return "mid";
}

// Compute team + line average ratings for an XI
function buildLineRatingContext(players) {
  const sums = { gk: 0, def: 0, mid: 0, att: 0 };
  const counts = { gk: 0, def: 0, mid: 0, att: 0 };

  let teamSum = 0;
  let teamCount = 0;

  for (const p of players || []) {
    const r = Number(p.Rating) || 0;
    const line = getLineForPos(p.Position);
    sums[line] += r;
    counts[line] += 1;
    teamSum += r;
    teamCount += 1;
  }

  const lineAvg = {};
  for (const key of ["gk", "def", "mid", "att"]) {
    lineAvg[key] = counts[key] ? sums[key] / counts[key] : null;
  }

  const teamAvg = teamCount ? teamSum / teamCount : 0;

  return { lineAvg, teamAvg };
}

// Base scoring weight by line
function baseLineWeight(line) {
  if (line === "gk") return 0.01;
  if (line === "def") return 0.4;
  if (line === "mid") return 1.0;
  if (line === "att") return 2.5;
  return 1.0;
}

// Rating-aware scoring weight for a single player
function scorerWeight(player, ctx) {
  const line = getLineForPos(player.Position);
  const base = baseLineWeight(line);

  const rating = Number(player.Rating) || ctx.teamAvg || 70;
  const lineAvg = ctx.lineAvg[line] || ctx.teamAvg || 70;

  // How good is this player compared to their line?
  const rel = lineAvg > 0 ? rating / lineAvg : 1;

  // Exponent > 1 makes stars stand out more
  const starBoost = Math.pow(rel, 1.4); // 90 vs 75 ≈ 1.25x-ish

  // Small random jitter so it’s not always the exact same guy
  const jitter = 0.8 + Math.random() * 0.4; // 0.8–1.2

  return base * starBoost * jitter;
}

// Tiny xG-ish generator based on rating + line-aware scorers
function simulateFixtureAtIndex(
  idx,
  isUserMatch,
  overrideHomeRating,
  overrideAwayRating,
  homeLineup,
  awayLineup
) {
  const fix = tournament.fixtures[idx];
  if (!fix || fix.played) return;

  const home = tournament.teams[fix.homeIndex];
  const away = tournament.teams[fix.awayIndex];
  if (!home || !away) return;

  // If overrides are provided (for the user's XI), use them
  const homeRating =
    overrideHomeRating != null ? overrideHomeRating : (home.rating ?? 75);
  const awayRating =
    overrideAwayRating != null ? overrideAwayRating : (away.rating ?? 75);

  const base = 1.4;
  const diff = homeRating - awayRating;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const homeXG = clamp(base + diff / 25, 0.2, 4.5);
  const awayXG = clamp(base - diff / 25, 0.2, 4.5);

  function sampleGoals(lambda) {
    let goals = 0;
    const steps = 8;
    const p = lambda / steps;
    for (let i = 0; i < steps; i++) {
      if (Math.random() < p) goals++;
    }
    return goals;
  }

  const gh = sampleGoals(homeXG);
  const ga = sampleGoals(awayXG);

  fix.played = true;
  fix.score = { home: gh, away: ga };

  // ---- Build realistic scorers using the line-aware logic ----
  const homeSquad =
    homeLineup && homeLineup.length ? homeLineup : (home.squad || []);
  const awaySquad =
    awayLineup && awayLineup.length ? awayLineup : (away.squad || []);

  const homeEvents = simulateGoalsForTeam(homeSquad, gh);
  const awayEvents = simulateGoalsForTeam(awaySquad, ga);

  fix.scorers = {
    home: homeEvents.map((e) => ({
      name: e.scorer?.Name || e.scorer?.name || "Home Player",
      minute: e.minute,
    })),
    away: awayEvents.map((e) => ({
      name: e.scorer?.Name || e.scorer?.name || "Away Player",
      minute: e.minute,
    })),
  };

  updateTablesFromFixture(fix);

  if (isUserMatch) {
    const isHome = fix.homeIndex === tournament.userTeamIndex;
    const yourGoals = isHome ? gh : ga;
    const oppGoals = isHome ? ga : gh;
    const yourTeam = tournament.teams[tournament.userTeamIndex];
    const oppTeam = tournament.teams[isHome ? fix.awayIndex : fix.homeIndex];

    const yourScorersList = (isHome ? fix.scorers.home : fix.scorers.away)
      .map((g) => `${g.name} (${g.minute}')`)
      .join(", ") || "None";

    const oppScorersList = (isHome ? fix.scorers.away : fix.scorers.home)
      .map((g) => `${g.name} (${g.minute}')`)
      .join(", ") || "None";

    alert(
      `Result: ${yourTeam.name} ${yourGoals}–${oppGoals} ${oppTeam.name}\n\n` +
      `${yourTeam.name} scorers: ${yourScorersList}\n` +
      `${oppTeam.name} scorers: ${oppScorersList}`
    );
  }
}


  function buildScorers(goals, squad, fallbackName) {
    const events = [];
    for (let i = 0; i < goals; i++) {
      const minute = 1 + Math.floor(Math.random() * 90);
      const p = randomFrom(squad, fallbackName);
      events.push({
        name: p.Name || p.name || fallbackName,
        minute,
      });
    }
    // sort by minute so it looks like a real timeline
    events.sort((a, b) => a.minute - b.minute);
    return events;
  }

  const homeScorers = buildScorers(gh, homeSquad, "Home Player");
  const awayScorers = buildScorers(ga, awaySquad, "Away Player");

  fix.scorers = {
    home: homeScorers,
    away: awayScorers,
  };

  updateTablesFromFixture(fix);

  if (isUserMatch) {
    const isHome = fix.homeIndex === tournament.userTeamIndex;
    const yourGoals = isHome ? gh : ga;
    const oppGoals = isHome ? ga : gh;
    const yourTeam = tournament.teams[tournament.userTeamIndex];
    const oppTeam = tournament.teams[isHome ? fix.awayIndex : fix.homeIndex];

    const yourScorers = (isHome ? homeScorers : awayScorers)
      .map(g => `${g.name} (${g.minute}')`)
      .join(", ") || "None";

    const oppScorers = (isHome ? awayScorers : homeScorers)
      .map(g => `${g.name} (${g.minute}')`)
      .join(", ") || "None";

    alert(
      `Result: ${yourTeam.name} ${yourGoals}–${oppGoals} ${oppTeam.name}\n\n` +
      `${yourTeam.name} scorers: ${yourScorers}\n` +
      `${oppTeam.name} scorers: ${oppScorers}`
    );
  }

// Show / hide the "Next Group Match" card
function showNextMatchPanel() {
  const panel = $("tournamentNextMatch");
  const label = $("tournamentNextLabel");
  if (!panel || !label) return;

  const idx = getNextUserFixtureIndex();
  if (idx === -1) {
    panel.classList.add("hidden");
    label.textContent = "Group stage complete.";
    return;
  }

  const fix = tournament.fixtures[idx];
  panel.classList.remove("hidden");
  label.textContent = getFixtureLabel(fix);
}

// Show the prematch panel for the current tournament fixture
function showTournamentPrematch() {
  const panel = $("tournamentPrematch");
  const poolEl = $("tournamentPrematchPool");
  const formationSelect = $("tournamentMatchFormation");
  const errorEl = $("tournamentMatchError");
  const vsLabel = $("tournamentMatchVs");

  if (!panel || !poolEl || !formationSelect) {
    console.warn("Tournament prematch elements missing.");
    return;
  }

  if (errorEl) errorEl.textContent = "";

  const idx = tournament.currentMatchIndex;
  const fix =
    idx != null && idx >= 0 ? tournament.fixtures[idx] : null;

  const userTeam = tournament.teams[tournament.userTeamIndex];
  const squad = userTeam?.squad || [];

  // Show "You vs Opponent"
  if (fix && userTeam && vsLabel) {
    const isHome = fix.homeIndex === tournament.userTeamIndex;
    const oppTeam =
      tournament.teams[isHome ? fix.awayIndex : fix.homeIndex];
    vsLabel.textContent = `${userTeam.name} vs ${
      oppTeam?.name || "Opponent"
    }`;
  }

  // Build checkbox list of your 15-man squad
  poolEl.innerHTML = squad
    .map(
      (p, i) => `
      <label class="player-row">
        <input 
          type="checkbox"
          class="tournament-xi-checkbox"
          data-idx="${i}"
        />
        <span class="name">${p.Name}</span>
        <span class="pos">${p.Position}</span>
        <span class="rating">${p.Rating}</span>
      </label>
    `
    )
    .join("");

  // Default formation: last used, otherwise the one chosen at tournament start
  const defaultFormation =
    (tournament.previousXI && tournament.previousXI.formation) ||
    tournament.userFormation ||
    "4-3-3 (Holding)";

  const options = Array.from(formationSelect.options).map(o => o.value);
  if (options.includes(defaultFormation)) {
    formationSelect.value = defaultFormation;
  }

  // If we have a previous XI, pre-tick those players
  if (tournament.previousXI && Array.isArray(tournament.previousXI.keys)) {
    const prevKeys = new Set(tournament.previousXI.keys);
    squad.forEach((p, i) => {
      if (prevKeys.has(keyOf(p))) {
        const input = poolEl.querySelector(
          `input.tournament-xi-checkbox[data-idx="${i}"]`
        );
        if (input) input.checked = true;
      }
    });
  }

  // Show prematch panel, hide simple "Next match" card while picking
  panel.classList.remove("hidden");
  const nextPanel = $("tournamentNextMatch");
  if (nextPanel) nextPanel.classList.add("hidden");
}

function applyPreviousTournamentXI() {
  const userTeam = tournament.teams[tournament.userTeamIndex];
  const squad = userTeam?.squad || [];
  const panel = $("tournamentPrematch");
  const poolEl = $("tournamentPrematchPool");
  const formationSelect = $("tournamentMatchFormation");

  if (!panel || !poolEl || !tournament.previousXI) return;

  const prevKeys = new Set(tournament.previousXI.keys || []);

  // Clear all checks first
  const allChecks = poolEl.querySelectorAll("input.tournament-xi-checkbox");
  allChecks.forEach(c => (c.checked = false));

  // Re-check the previous XI
  squad.forEach((p, i) => {
    if (prevKeys.has(keyOf(p))) {
      const input = poolEl.querySelector(
        `input.tournament-xi-checkbox[data-idx="${i}"]`
      );
      if (input) input.checked = true;
    }
  });

  // Restore previous formation
  if (formationSelect && tournament.previousXI.formation) {
    formationSelect.value = tournament.previousXI.formation;
  }
}

function getTournamentChosenXI() {
  const userTeam = tournament.teams[tournament.userTeamIndex];
  const squad = userTeam?.squad || [];
  const panel = $("tournamentPrematch");
  if (!panel) return null;

  const checks = Array.from(
    panel.querySelectorAll('input.tournament-xi-checkbox:checked')
  );
  const indices = checks.map(c => Number(c.dataset.idx));

  if (indices.length !== 11) return null;

  return indices
    .map(i => squad[i])
    .filter(Boolean);
}

function playTournamentMatch() {
  const errorEl = $("tournamentMatchError");
  if (errorEl) errorEl.textContent = "";

  const chosen = getTournamentChosenXI();
  if (!chosen) {
    if (errorEl) {
      errorEl.textContent = "Select exactly 11 players for your XI.";
    } else {
      alert("Select exactly 11 players for your XI.");
    }
    return;
  }

  const formationSelect = $("tournamentMatchFormation");
  const formationKey =
    formationSelect?.value ||
    tournament.userFormation ||
    "4-3-3 (Holding)";

  // Enforce formation using the same logic as Series mode
  const yourAssigned = assignToFormation(chosen, formationKey);
  if (!yourAssigned) {
    const msg = `Your 11 don't fit ${formationKey}. Try a different combination or formation.`;
    if (errorEl) errorEl.textContent = msg;
    else alert(msg);
    return;
  }

  const idx = tournament.currentMatchIndex;
  if (idx == null || idx < 0 || !tournament.fixtures[idx]) {
    console.warn("No current tournament fixture to play.");
    return;
  }

  const fix = tournament.fixtures[idx];
  const isHome = fix.homeIndex === tournament.userTeamIndex;
  const oppIndex = isHome ? fix.awayIndex : fix.homeIndex;
  const oppTeam = tournament.teams[oppIndex];

  // Average rating of your XI vs AI team rating
  const userAvgRating = yourAssigned.length
    ? Math.round(
        yourAssigned.reduce(
          (sum, p) => sum + (Number(p.Rating) || 0),
          0
        ) / yourAssigned.length
      )
    : (tournament.teams[tournament.userTeamIndex].rating ?? 75);

  const oppRating = oppTeam?.rating ?? 75;

  const homeOverride = isHome ? userAvgRating : oppRating;
  const awayOverride = isHome ? oppRating : userAvgRating;

  // Remember last XI so you can basically “use same team as last game”
  tournament.previousXI = {
    formation: formationKey,
    keys: yourAssigned.map(p => keyOf(p)),
  };
  tournament.userFormation = formationKey;

  // Work out lineups for both sides for scorer generation
  const homeLineup = isHome ? yourAssigned : (oppTeam.squad || []);
  const awayLineup = isHome ? (oppTeam.squad || []) : yourAssigned;

  // Actually simulate this match with overrides + lineups
  simulateFixtureAtIndex(
    idx,
    true,
    homeOverride,
    awayOverride,
    homeLineup,
    awayLineup
  );

  // Hide prematch panel and bring back the standard tournament view
  const prematchPanel = $("tournamentPrematch");
  if (prematchPanel) prematchPanel.classList.add("hidden");

  renderTournament();
  showNextMatchPanel();

  // If that was your last group game, move into KO/finish
  const another = getNextUserFixtureIndex();
  if (another === -1) {
    finishTournamentFromGroups();
  }
}


// Called when user clicks "Next tournament match" → opens prematch
function playNextGroupMatch() {
  const nextIdx = getNextUserFixtureIndex();
  if (nextIdx === -1) {
    alert("No more group matches for your team.");
    return;
  }

  // Sim AI vs AI fixtures that come before your next match
  for (let i = 0; i < nextIdx; i++) {
    const f = tournament.fixtures[i];
    const involvesUser =
      f.homeIndex === tournament.userTeamIndex ||
      f.awayIndex === tournament.userTeamIndex;
    if (!f.played && !involvesUser) {
      simulateFixtureAtIndex(i, false);
    }
  }

  // Store which fixture this prematch is for
  tournament.currentMatchIndex = nextIdx;

  // Open the prematch XI/formation picker for this game
  showTournamentPrematch();
}


// Build the remaining AI teams using Supabase players
function buildAITeamsPlaceholder() {
  // Your 15 custom AI team names
  const AI_TEAM_NAMES = [
    "CF Monteluna",
    "RK Dynamo Varga",
    "AC Rosendale",
    "FK Baltica Varna",
    "Sporting Verdanos",
    "Real Sosobad",
    "Notin Your Forest",
    "Bayern Bruised",
    "Athletic Biltoast",
    "FC No Chance",
    "Borussia Teeth",
    "Lads on Toure",
    "Giroud Sandstorm",
    "Obi One Kenobi Nil",
    "Expected Toulouse",
  ];

  // user team already pushed as team 0
  const userTeam = tournament.teams[0];
  const userSquad = userTeam?.squad || [];

  // avoid reusing user's players in AI squads
  const usedKeys = new Set(userSquad.map(keyOf));

  // helper to get a random item
  const randItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // helper to pick a player by position, falling back if needed
  function pickForPosition(pos) {
    let candidates = tournamentPool.filter(
      (p) => p.Position === pos && !usedKeys.has(keyOf(p))
    );

    if (!candidates.length) {
      candidates = tournamentPool.filter((p) => !usedKeys.has(keyOf(p)));
    }

    if (!candidates.length) return null;

    const chosen = randItem(candidates);
    usedKeys.add(keyOf(chosen));
    return chosen;
  }

  // Build each AI team
  const formationKeys = Object.keys(FORMATION_POSITIONS);

  const existingCount = tournament.teams.length; // should be 1 (user)

  for (let i = existingCount; i < TOURNAMENT_NUM_TEAMS; i++) {
    const formationKey = randItem(formationKeys);
    const positions = FORMATION_POSITIONS[formationKey] || FORMATION_POSITIONS["4-3-3 (Holding)"];

    const xi = [];
    for (const pos of positions) {
      const p = pickForPosition(pos);
      if (!p) break;
      xi.push(p);
    }

    // If we can't fill a full XI, stop creating AI teams
    if (xi.length < 11) {
      console.warn("Not enough players in Supabase to fill all AI XIs.");
      break;
    }

    const squad = [...xi];

    // Fill up to TOURNAMENT_SQUAD_SIZE with random subs
    while (squad.length < TOURNAMENT_SQUAD_SIZE) {
      const subsCandidates = tournamentPool.filter((p) => !usedKeys.has(keyOf(p)));
      if (!subsCandidates.length) break;
      const sub = randItem(subsCandidates);
      usedKeys.add(keyOf(sub));
      squad.push(sub);
    }

    const avgRating = Math.round(
      squad.reduce((sum, p) => sum + (Number(p.Rating) || 0), 0) / squad.length
    );

    const team = {
      id: i,
      name: AI_TEAM_NAMES[i - 1] || `AI Team ${i + 1}`,
      rating: avgRating,
      squad,
      isUser: false,
      formation: formationKey,
    };

    tournament.teams.push(team);
  }
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

async function initTournament() {
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
  tournament.ko = { semis: [], final: [] };
  tournament.tables = {};

  // Hide the "New Tournament" button at the start of a fresh tournament
  updateTournamentRestartButton();

  // 1) Read the user's chosen formation for their XI later
  const formationSelect = $("tournamentFormation");
  const selectedFormation = formationSelect?.value || "4-3-3 (Holding)";
  tournament.userFormation = selectedFormation;
  tournament.requiredPositions =
    FORMATION_POSITIONS[selectedFormation] ||
    FORMATION_POSITIONS["4-3-3 (Holding)"];

  console.log("User formation:", tournament.userFormation);
  console.log("Required XI positions:", tournament.requiredPositions);

  // 2) Load Supabase tournament pool (85–90 rated players)
  const pool = await loadTournamentPoolFromSupabase();
  if (!pool || pool.length < TOURNAMENT_SQUAD_SIZE) {
    alert("Not enough eligible players in Supabase to start a tournament (need at least 15).");
    return;
  }

  // 3) Start the 15-man draft using real Supabase players
  showTournamentSquadSelection();
}

// Show the tournament draft panel and start at pick 1 (Supabase-backed)
function showTournamentSquadSelection() {
  draftState.active = true;
  draftState.step = 0;

  const xiCount = tournament.requiredPositions?.length || 11;
  draftState.totalSteps = xiCount + DRAFT_SUB_PICKS; // 11 + 4 = 15
  draftState.picks = [];
  draftState.currentCandidates = [];
  draftState.taken = new Set();  // reset taken set

  // 👉 actually draw the first set of options
  renderTournamentDraftStep();
}

function renderTournamentDraftStep() {
  const panel = $("tournamentSquad");
  const list = $("tournamentSquadList");
  const countLabel = $("tournamentSquadCount");

  if (!panel || !list || !countLabel) {
    console.warn(
      "Tournament squad UI elements missing (tournamentSquad / tournamentSquadList / tournamentSquadCount)."
    );
    return;
  }

  // If we've already picked all players, finish the draft
  if (draftState.step >= draftState.totalSteps) {
    finishTournamentDraft();
    return;
  }

  panel.classList.remove("hidden");

  const xiCount = tournament.requiredPositions?.length || 11;
  const isSubPick = draftState.step >= xiCount;

  // Decide which position this pick is for
  let desiredPos;
  if (!isSubPick) {
    desiredPos = tournament.requiredPositions[draftState.step] || "ST";
  } else {
    // subs can be any position
    desiredPos =
      ALL_POSITIONS[
        Math.floor(Math.random() * ALL_POSITIONS.length)
      ] || "ST";
  }

  // --- Build candidates from Supabase pool ---

  // helper to check if player already taken in this draft
  const isTaken = (p) => draftState.taken.has(keyOf(p));

  // shuffle helper
  const localShuffle = (arr) => shuffle([ ...arr ]);

  let candidates = [];

  if (!isSubPick) {
    // ---- XI picks: keep old behaviour (all 4 same required position) ----
    const poolForPos = tournamentPool.filter(
      (p) => p.Position === desiredPos && !isTaken(p)
    );

    candidates = localShuffle(poolForPos).slice(0, 4);

    // fallback: if we couldn't get any for that position, use any untaken players
    if (!candidates.length) {
      const untaken = tournamentPool.filter((p) => !isTaken(p));
      candidates = localShuffle(untaken).slice(0, 4);
    }
  } else {
    // ---- SUB PICKS: mix positions, max 2 per position in this set of 4 ----
    const untaken = localShuffle(
      tournamentPool.filter((p) => !isTaken(p))
    );

    const posCounts = {};
    for (const p of untaken) {
      const pos = p.Position;
      const count = posCounts[pos] || 0;
      if (count >= 2) continue;        // already have 2 of this position

      candidates.push(p);
      posCounts[pos] = count + 1;

      if (candidates.length >= 4) break; // stop once we have 4 options
    }

    // absolute fallback: if something went weird, just take any 4 untaken
    if (!candidates.length) {
      candidates = untaken.slice(0, 4);
    }
  }


  // Still nothing? Show a message
  if (!candidates.length) {
    list.innerHTML = `
      <div class="pill">
        No more available players in Supabase for this pick. Add more players and restart the tournament.
      </div>
    `;
    return;
  }

  draftState.currentCandidates = candidates;

  list.innerHTML = candidates
    .map(
      (p, i) => `
      <label class="player-row">
        <input 
          type="radio"
          name="tournament-cand"
          class="tournament-squad-radio"
          data-index="${i}"
        />
        <span class="name">${p.Name}</span>
        <span class="pos">${p.Position}</span>
        <span class="rating">${p.Rating}</span>
      </label>
    `
    )
    .join("");

  countLabel.textContent = `${draftState.picks.length} / ${draftState.totalSteps} selected`;
}

// Called when the "Next Player" button is clicked
function confirmDraftPick() {
  if (!draftState.active) return;

  const list = $("tournamentSquadList");
  const countLabel = $("tournamentSquadCount");
  if (!list || !countLabel) return;

  const selected = list.querySelector(
    'input[name="tournament-cand"]:checked'
  );
  if (!selected) {
    alert("Please select a player first.");
    return;
  }

  const idx = Number(selected.dataset.index);
  const chosen = draftState.currentCandidates[idx];
  if (!chosen) return;

  // Record pick
  draftState.picks.push(chosen);
  draftState.step++;

  // Mark this player as taken so we don't offer them again
  draftState.taken.add(keyOf(chosen));

  countLabel.textContent = `${draftState.picks.length} / ${draftState.totalSteps} selected`;

  if (draftState.step >= draftState.totalSteps) {
    // All 15 chosen → build the tournament
    finishTournamentDraft();
  } else {
    // Move to next pick
    renderTournamentDraftStep();
  }
}

function renderTournament(tables, ko) {
  const container = $("tournamentOutput");
  if (!container) return;

  const groupsHtml = tournament.groups
    .map((group) => {
      const rows =
        group.table && group.table.length
          ? group.table
          : (tables && tables[group.name]) || [];

      const body = rows
        .map((row, idx) => {
          const team = tournament.teams[row.teamIndex];
          const name =
            team?.name ?? row.name ?? `Team ${row.teamIndex + 1}`;
          const isUser =
            row.teamIndex === tournament.userTeamIndex;

 return `
  <tr${isUser ? ' class="highlight-row"' : ""}>
    <td>${idx + 1}</td>
    <td>
      <button
        type="button"
        class="table-team-link"
        data-team-index="${row.teamIndex}"
      >
        ${name}
      </button>
    </td>
    <td>${row.played}</td>
    <td>${row.won}</td>
    <td>${row.drawn}</td>
    <td>${row.lost}</td>
    <td>${row.gf}</td>
    <td>${row.ga}</td>
    <td>${row.gd}</td>
    <td>${row.points}</td>
  </tr>
`;

        })
        .join("");

      return `
      <div class="card mini">
        <div class="draft-head"><strong>${group.name}</strong></div>
        <table class="mini-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
    })
    .join("");

// Knockouts: QFs (two legs), SFs (two legs), Final (one leg)
const bracket =
  ko || tournament.ko || { quarters: [], semis: [], final: [] };

const koQuarters = (bracket.quarters || [])
  .map((m) => {
    let homeLabel = m.homeFrom;
    let awayLabel = m.awayFrom;

    if (typeof m.homeIndex === "number") {
      homeLabel = tournament.teams[m.homeIndex]?.name || homeLabel;
    }
    if (typeof m.awayIndex === "number") {
      awayLabel = tournament.teams[m.awayIndex]?.name || awayLabel;
    }

    let legStr = "";
    if (m.legs && m.legs.length === 2) {
      const l1 = m.legs[0];
      const l2 = m.legs[1];
      legStr = ` – 1st: ${l1.score.home}–${l1.score.away}, 2nd: ${l2.score.home}–${l2.score.away}`;
    }

    const aggStr = m.aggScore
      ? ` (agg ${m.aggScore.home}–${m.aggScore.away})`
      : "";

    return `<li>${m.id}: ${homeLabel} vs ${awayLabel}${legStr}${aggStr}</li>`;
  })
  .join("");

const koSemis = (bracket.semis || [])
  .map((m) => {
    let homeLabel = m.homeFrom;
    let awayLabel = m.awayFrom;

    if (typeof m.homeIndex === "number") {
      homeLabel = tournament.teams[m.homeIndex]?.name || homeLabel;
    }
    if (typeof m.awayIndex === "number") {
      awayLabel = tournament.teams[m.awayIndex]?.name || awayLabel;
    }

    let legStr = "";
    if (m.legs && m.legs.length === 2) {
      const l1 = m.legs[0];
      const l2 = m.legs[1];
      legStr = ` – 1st: ${l1.score.home}–${l1.score.away}, 2nd: ${l2.score.home}–${l2.score.away}`;
    }

    const aggStr = m.aggScore
      ? ` (agg ${m.aggScore.home}–${m.aggScore.away})`
      : "";

    return `<li>${m.id}: ${homeLabel} vs ${awayLabel}${legStr}${aggStr}</li>`;
  })
  .join("");

const koFinalList = (bracket.final || [])
  .map((m) => {
    let homeLabel = m.homeFrom;
    let awayLabel = m.awayFrom;

    if (typeof m.homeIndex === "number") {
      homeLabel = tournament.teams[m.homeIndex]?.name || homeLabel;
    }
    if (typeof m.awayIndex === "number") {
      awayLabel = tournament.teams[m.awayIndex]?.name || awayLabel;
    }

    let scoreStr = "";
    if (m.score) {
      scoreStr = ` (${m.score.home}–${m.score.away})`;
    }

    return `<li>${m.id}: ${homeLabel} vs ${awayLabel}${scoreStr}</li>`;
  })
  .join("");

let championHtml = "";
if (typeof tournament.championIndex === "number") {
  const champName =
    tournament.teams[tournament.championIndex]?.name || "Unknown";
  championHtml = `<p><strong>Champion: ${champName}</strong></p>`;
}

const koHtml = `
  <div class="card mini">
    <div class="draft-head"><strong>Knockouts</strong></div>
    <h4>Quarter-finals (two legs)</h4>
    <ul>${koQuarters || "<li>Not set yet.</li>"}</ul>
    <h4>Semi-finals (two legs)</h4>
    <ul>${koSemis || "<li>Not set yet.</li>"}</ul>
    <h4>Final</h4>
    <ul>${koFinalList || "<li>Not set yet.</li>"}</ul>
    ${championHtml}
  </div>
`;

  container.innerHTML = `
    <div class="group-grid">${groupsHtml}</div>
    <hr />
    ${koHtml}
  `;
}

// Decide which formation a team uses in tournament view
function getTeamFormation(team) {
  const keys = Object.keys(FORMATION_POSITIONS);

  // User team: stick to the tournament user formation
  if (team.isUser) {
    return tournament.userFormation || "4-3-3 (Holding)";
  }

  // If AI already has a formation and it's valid, use it
  if (team.formation && FORMATION_POSITIONS[team.formation]) {
    return team.formation;
  }

  // Otherwise, assign a random formation from the available ones
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  team.formation = randomKey;
  return randomKey;
}

// Build "best XI" and subs for a squad & formation
function pickBestXIFromSquad(squad, formationKey) {
  const slots =
    FORMATION_POSITIONS[formationKey] ||
    FORMATION_POSITIONS["4-3-3 (Holding)"];

  // Sort whole squad by rating (highest first)
  const remaining = [...(squad || [])].sort(
    (a, b) => (Number(b.Rating) || 0) - (Number(a.Rating) || 0)
  );

  const xi = [];
  const used = new Set();

  for (const desiredPos of slots) {
    // 1) Best player in exact position
    let idx = remaining.findIndex(
      (p) => p.Position === desiredPos && !used.has(keyOf(p))
    );

    // 2) Fallback: best remaining player at all
    if (idx === -1) {
      idx = remaining.findIndex((p) => !used.has(keyOf(p)));
    }

    if (idx === -1) continue; // squad too small, just skip

    const player = remaining[idx];
    xi.push(player);
    used.add(keyOf(player));
    remaining.splice(idx, 1);
  }

  // Rest are subs (still in rating order)
  const subs = remaining;

  return { xi, subs };
}

// Render a clicked team into the right-hand detail card
function showTournamentTeamDetail(teamIndex) {
  const panel = $("tournamentTeamDetail");
  const nameEl = $("tournamentTeamDetailName");
  const metaEl = $("tournamentTeamDetailMeta");
  const bodyEl = $("tournamentTeamDetailBody");

  if (!panel || !nameEl || !metaEl || !bodyEl) return;

  const team = tournament.teams[teamIndex];
  if (!team) return;

  const formation = getTeamFormation(team);
  const { xi, subs } = pickBestXIFromSquad(team.squad || [], formation);

  const squadRating =
    typeof team.rating === "number"
      ? team.rating
      : Math.round(
          (team.squad || []).reduce(
            (sum, p) => sum + (Number(p.Rating) || 0),
            0
          ) / Math.max(1, (team.squad || []).length)
        );

  nameEl.textContent = team.name || `Team ${teamIndex + 1}`;
  metaEl.textContent = `Formation: ${formation} · Squad rating: ${squadRating}`;

  const xiHtml = (xi || [])
    .map(
      (p) => `
      <li>
        <span class="pos">${p.Position}</span>
        <span class="name">${p.Name}</span>
        <span class="rating">${p.Rating}</span>
      </li>
    `
    )
    .join("");

  const subsHtml = (subs || [])
    .map(
      (p) => `
      <li class="sub-row">
        <span class="pos">${p.Position}</span>
        <span class="name">${p.Name}</span>
        <span class="rating">${p.Rating}</span>
      </li>
    `
    )
    .join("");

  bodyEl.innerHTML = `
    <h4>Best XI</h4>
    <ul class="mini-list">
      ${xiHtml || "<li>No players in squad.</li>"}
    </ul>
    <h4>Subs</h4>
    <ul class="mini-list">
      ${subsHtml || "<li>No subs.</li>"}
    </ul>
  `;

  panel.classList.remove("hidden");
}


// Build empty group tables (all 0s) based on the drawn groups
function createEmptyTables() {
  const tables = {};

  tournament.groups.forEach((group) => {
    const rows = group.teamIndices.map((teamIndex) => {
      const team = tournament.teams[teamIndex];
      return {
        teamIndex,
        name: team?.name || `Team ${teamIndex + 1}`,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        points: 0,
      };
    });

    group.table = rows;
    tables[group.name] = rows;
  });

  tournament.tables = tables;
  return tables;
}

// Simple empty knockout bracket: 2 quarters + 2 semis + a final
function createEmptyKO() {
  const ko = {
    quarters: [
      {
        id: "QF1",
        homeFrom: "Winner Group A",
        awayFrom: "Runner-up Group B",
        homeIndex: null,
        awayIndex: null,
        legs: [],
        aggScore: null,
        winnerIndex: null,
      },
      {
        id: "QF2",
        homeFrom: "Winner Group C",
        awayFrom: "Runner-up Group D",
        homeIndex: null,
        awayIndex: null,
        legs: [],
        aggScore: null,
        winnerIndex: null,
      },
      {
        id: "QF3",
        homeFrom: "Runner-up Group A",
        awayFrom: "Winner Group B",
        homeIndex: null,
        awayIndex: null,
        legs: [],
        aggScore: null,
        winnerIndex: null,
      },
      {
        id: "QF4",
        homeFrom: "Runner-up Group C",
        awayFrom: "Winner Group D",
        homeIndex: null,
        awayIndex: null,
        legs: [],
        aggScore: null,
        winnerIndex: null,
      },
    ],
    semis: [
      {
        id: "SF1",
        homeFrom: "Winner QF1",
        awayFrom: "Winner QF2",
        homeIndex: null,
        awayIndex: null,
        legs: [],
        aggScore: null,
        winnerIndex: null,
      },
      {
        id: "SF2",
        homeFrom: "Winner QF3",
        awayFrom: "Winner QF4",
        homeIndex: null,
        awayIndex: null,
        legs: [],
        aggScore: null,
        winnerIndex: null,
      },
    ],
    final: [
      {
        id: "F",
        homeFrom: "Winner SF1",
        awayFrom: "Winner SF2",
        homeIndex: null,
        awayIndex: null,
        score: null,
        winnerIndex: null,
      },
    ],
  };

  tournament.ko = ko;
  return ko;
}


// Simulate all remaining unplayed GROUP fixtures (AI vs AI)
function simulateAllRemainingGroupFixtures() {
  for (let i = 0; i < tournament.fixtures.length; i++) {
    const f = tournament.fixtures[i];
    if (f.stage === "group" && !f.played) {
      simulateFixtureAtIndex(i, false);
    }
  }
}

// Use final group tables to fill the semi-finals
function buildKnockoutsFromGroups() {
  const ko = tournament.ko || createEmptyKO();

  function getPlaces(groupName) {
    const group = tournament.groups.find((g) => g.name === groupName);
    if (!group || !group.table || group.table.length < 2) {
      return [null, null];
    }
    // table is already sorted by points / GD / GF
    return [group.table[0].teamIndex, group.table[1].teamIndex];
  }

  const [wA, rA] = getPlaces("Group A");
  const [wB, rB] = getPlaces("Group B");
  const [wC, rC] = getPlaces("Group C");
  const [wD, rD] = getPlaces("Group D");

  // Quarter-finals mapping:
  // QF1: Winner A vs Runner-up B
  // QF2: Winner C vs Runner-up D
  // QF3: Runner-up A vs Winner B
  // QF4: Runner-up C vs Winner D

  if (ko.quarters && ko.quarters[0]) {
    ko.quarters[0].homeIndex = wA;
    ko.quarters[0].awayIndex = rB;
    if (typeof wA === "number") {
      ko.quarters[0].homeFrom =
        tournament.teams[wA]?.name || ko.quarters[0].homeFrom;
    }
    if (typeof rB === "number") {
      ko.quarters[0].awayFrom =
        tournament.teams[rB]?.name || ko.quarters[0].awayFrom;
    }
  }

  if (ko.quarters && ko.quarters[1]) {
    ko.quarters[1].homeIndex = wC;
    ko.quarters[1].awayIndex = rD;
    if (typeof wC === "number") {
      ko.quarters[1].homeFrom =
        tournament.teams[wC]?.name || ko.quarters[1].homeFrom;
    }
    if (typeof rD === "number") {
      ko.quarters[1].awayFrom =
        tournament.teams[rD]?.name || ko.quarters[1].awayFrom;
    }
  }

  if (ko.quarters && ko.quarters[2]) {
    ko.quarters[2].homeIndex = rA;
    ko.quarters[2].awayIndex = wB;
    if (typeof rA === "number") {
      ko.quarters[2].homeFrom =
        tournament.teams[rA]?.name || ko.quarters[2].homeFrom;
    }
    if (typeof wB === "number") {
      ko.quarters[2].awayFrom =
        tournament.teams[wB]?.name || ko.quarters[2].awayFrom;
    }
  }

  if (ko.quarters && ko.quarters[3]) {
    ko.quarters[3].homeIndex = rC;
    ko.quarters[3].awayIndex = wD;
    if (typeof rC === "number") {
      ko.quarters[3].homeFrom =
        tournament.teams[rC]?.name || ko.quarters[3].homeFrom;
    }
    if (typeof wD === "number") {
      ko.quarters[3].awayFrom =
        tournament.teams[wD]?.name || ko.quarters[3].awayFrom;
    }
  }

  tournament.ko = ko;
}

// One-off KO match using ratings, must produce a winner (no draws)
function simulateKOMatch(homeIndex, awayIndex) {
  const home = tournament.teams[homeIndex];
  const away = tournament.teams[awayIndex];
  if (!home || !away) return null;

  const base = 1.4;
  const diff = (home.rating ?? 75) - (away.rating ?? 75);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const homeXG = clamp(base + diff / 25, 0.2, 4.5);
  const awayXG = clamp(base - diff / 25, 0.2, 4.5);

  const sampleGoals = (lambda) => {
    let goals = 0;
    const steps = 8;
    const p = lambda / steps;
    for (let i = 0; i < steps; i++) {
      if (Math.random() < p) goals++;
    }
    return goals;
  };

  let gh = sampleGoals(homeXG);
  let ga = sampleGoals(awayXG);

  // No draws in knockouts – someone wins
  if (gh === ga) {
    if (Math.random() < 0.5) gh++;
    else ga++;
  }

  const winnerIndex = gh > ga ? homeIndex : awayIndex;
  return { gh, ga, winnerIndex };
}

function simulateTwoLegTie(homeIndex, awayIndex) {
  const home = tournament.teams[homeIndex];
  const away = tournament.teams[awayIndex];
  if (!home || !away) return null;

  function simulateLeg(hIndex, aIndex) {
    const h = tournament.teams[hIndex];
    const a = tournament.teams[aIndex];
    if (!h || !a) return { gh: 0, ga: 0 };

    const base = 1.4;
    const diff = (h.rating ?? 75) - (a.rating ?? 75);

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const homeXG = clamp(base + diff / 25, 0.2, 4.5);
    const awayXG = clamp(base - diff / 25, 0.2, 4.5);

    const sampleGoals = (lambda) => {
      let goals = 0;
      const steps = 8;
      const p = lambda / steps;
      for (let i = 0; i < steps; i++) {
        if (Math.random() < p) goals++;
      }
      return goals;
    };

    const gh = sampleGoals(homeXG);
    const ga = sampleGoals(awayXG);
    return { gh, ga };
  }

  // First leg: homeIndex at home
  const leg1 = simulateLeg(homeIndex, awayIndex);
  // Second leg: awayIndex at home
  const leg2 = simulateLeg(awayIndex, homeIndex);

  const aggHome = leg1.gh + leg2.ga;
  const aggAway = leg1.ga + leg2.gh;

  let winnerIndex = null;
  if (aggHome > aggAway) {
    winnerIndex = homeIndex;
  } else if (aggAway > aggHome) {
    winnerIndex = awayIndex;
  } else {
    // tie on aggregate -> random winner
    winnerIndex = Math.random() < 0.5 ? homeIndex : awayIndex;
  }

  return {
    leg1,
    leg2,
    aggScore: { home: aggHome, away: aggAway },
    winnerIndex,
  };
}


// Play both semis + the final and record the champion
function simulateKnockouts() {
  const ko = tournament.ko;
  if (!ko) return;

  // --- Quarter-finals: two-legged ties ---
  (ko.quarters || []).forEach((tie) => {
    if (
      typeof tie.homeIndex !== "number" ||
      typeof tie.awayIndex !== "number"
    )
      return;

    const res = simulateTwoLegTie(tie.homeIndex, tie.awayIndex);
    if (!res) return;

    tie.legs = [
      {
        homeIndex: tie.homeIndex,
        awayIndex: tie.awayIndex,
        score: { home: res.leg1.gh, away: res.leg1.ga },
      },
      {
        homeIndex: tie.awayIndex,
        awayIndex: tie.homeIndex,
        score: { home: res.leg2.gh, away: res.leg2.ga },
      },
    ];
    tie.aggScore = res.aggScore;
    tie.winnerIndex = res.winnerIndex;
  });

  const qWinners = (ko.quarters || [])
    .map((t) => t.winnerIndex)
    .filter((idx) => typeof idx === "number");

  // --- Semis: two-legged ties based on QF winners ---
  if (qWinners.length >= 4) {
    if (ko.semis[0]) {
      ko.semis[0].homeIndex = qWinners[0];
      ko.semis[0].awayIndex = qWinners[1];
      ko.semis[0].homeFrom =
        tournament.teams[qWinners[0]]?.name || ko.semis[0].homeFrom;
      ko.semis[0].awayFrom =
        tournament.teams[qWinners[1]]?.name || ko.semis[0].awayFrom;
    }
    if (ko.semis[1]) {
      ko.semis[1].homeIndex = qWinners[2];
      ko.semis[1].awayIndex = qWinners[3];
      ko.semis[1].homeFrom =
        tournament.teams[qWinners[2]]?.name || ko.semis[1].homeFrom;
      ko.semis[1].awayFrom =
        tournament.teams[qWinners[3]]?.name || ko.semis[1].awayFrom;
    }
  }

  // Simulate semis as two-legged ties
  (ko.semis || []).forEach((tie) => {
    if (
      typeof tie.homeIndex !== "number" ||
      typeof tie.awayIndex !== "number"
    )
      return;

    const res = simulateTwoLegTie(tie.homeIndex, tie.awayIndex);
    if (!res) return;

    tie.legs = [
      {
        homeIndex: tie.homeIndex,
        awayIndex: tie.awayIndex,
        score: { home: res.leg1.gh, away: res.leg1.ga },
      },
      {
        homeIndex: tie.awayIndex,
        awayIndex: tie.homeIndex,
        score: { home: res.leg2.gh, away: res.leg2.ga },
      },
    ];
    tie.aggScore = res.aggScore;
    tie.winnerIndex = res.winnerIndex;
  });

  const sfWinners = (ko.semis || [])
    .map((t) => t.winnerIndex)
    .filter((idx) => typeof idx === "number");

  // --- Final: single match between SF winners ---
  if (sfWinners.length >= 2 && ko.final && ko.final[0]) {
    const final = ko.final[0];
    final.homeIndex = sfWinners[0];
    final.awayIndex = sfWinners[1];
    final.homeFrom =
      tournament.teams[sfWinners[0]]?.name || final.homeFrom;
    final.awayFrom =
      tournament.teams[sfWinners[1]]?.name || final.awayFrom;

    // reuse your existing simulateKOMatch for a one-off final
    const resF = simulateKOMatch(sfWinners[0], sfWinners[1]);
    if (resF) {
      final.score = { home: resF.gh, away: resF.ga };
      final.winnerIndex = resF.winnerIndex;
      tournament.championIndex = resF.winnerIndex;
    }
  }
}


function updateTournamentRestartButton() {
  const btn = $("btn-new-tournament");
  if (!btn) return;

  const hasChampion = typeof tournament.championIndex === "number";
  // Show only once a champion exists
  btn.classList.toggle("hidden", !hasChampion);
}

// Finish everything once the user has played all their group games
function finishTournamentFromGroups() {
  // 1) Play all remaining AI group fixtures
  simulateAllRemainingGroupFixtures();

  // 2) Build & simulate knockouts
  buildKnockoutsFromGroups();
  simulateKnockouts();  // <-- this sets tournament.championIndex

  // 3) Re-render UI
  renderTournament();
  showNextMatchPanel();

  // 4) NOW update the button visibility
  updateTournamentRestartButton();   // 👈 ADD THIS LINE

  if (typeof tournament.championIndex === "number") {
    const champ = tournament.teams[tournament.championIndex]?.name || "Unknown";
    console.log("Tournament champion:", champ);
  }
}

function finishTournamentDraft() {
  draftState.active = false;

  const userSquad = draftState.picks || [];
  userTournamentSquad = userSquad;  // store globally too
  console.log("finishTournamentDraft called, picked players:", userSquad);

  if (userSquad.length !== 15) {
    console.warn("Expected 15 drafted players, got", userSquad.length);
  }

  const avgRating = userSquad.length
    ? Math.round(
        userSquad.reduce(
          (sum, p) => sum + (Number(p.Rating) || 0),
          0
        ) / userSquad.length
      )
    : 75;


  // 1) User team as team 0
  tournament.teams = [];
  tournament.userTeamIndex = 0;

  tournament.teams.push({
    id: 0,
    name: "Your Club",
    rating: avgRating,
    squad: userSquad,
    isUser: true,
  });

  // 2) AI teams
  buildAITeamsPlaceholder();

  // 3) Groups + fixtures
  assignTeamsToGroups();
  buildGroupFixtures();

  // 4) Hide draft panel
  $("tournamentSquad")?.classList.add("hidden");

  // 5) Build empty tables + KO and store them
  let tables, ko;
  try {
    tables = createEmptyTables();
    ko = createEmptyKO();
  } catch (err) {
    console.error("Error creating tables/KO:", err);
    const out = $("tournamentOutput");
    if (out) {
      out.innerHTML =
        `<div class="pill">Draft complete (15 players), but an error occurred building tables. Check console.</div>`;
    }
    return;
  }

// 6) Render tournament & show "Next Match" panel
try {
  renderTournament(tables, ko);
  showNextMatchPanel();

  // 👉 ADD THIS HERE (3b)
  updateTournamentRestartButton();    // ✔️ Shows/hides "New Tournament" button

} catch (err) {
  console.error("Error in renderTournament:", err);
  const out = $("tournamentOutput");
  if (out) {
    out.innerHTML =
      `<div class="pill">Draft complete (15 players), but an error occurred rendering the tournament. Check console.</div>`;
  }
  return;
}

console.log("Tournament ready:", {
  teams: tournament.teams,
  groups: tournament.groups,
  fixtures: tournament.fixtures,
});
}


/* ---------------- Wire up after DOM ready ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  /* ---------------- Navigation Buttons ---------------- */
  document.querySelectorAll(".nav-btn")?.forEach(btn => {
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
    initTournament();   // new tournament flow with draft
  });

  /* ---------------- Tournament Squad / Draft Events ---------------- */
  $("btn-save-tournament-squad")?.addEventListener("click", () => {
    confirmDraftPick();
  });

/* ---------------- Tournament "Next Match" Button ---------------- */
$("btn-tournament-play-next")?.addEventListener("click", () => {
  playNextGroupMatch();
});

  /* ---------------- Tournament "New Tournament" Button ---------------- */
  $("btn-new-tournament")?.addEventListener("click", () => {
    initTournament();
  });

/* ---------------- Tournament Prematch "Play" Button ---------------- */
$("btn-tournament-play-match")?.addEventListener("click", () => {
  playTournamentMatch();
});

$("btn-tournament-use-last-xi")?.addEventListener("click", () => {
  applyPreviousTournamentXI();
});

  /* ---------------- Tournament Team Detail: close button ---------------- */
  $("btn-close-team-detail")?.addEventListener("click", () => {
    $("tournamentTeamDetail")?.classList.add("hidden");
  });

  /* ---------------- Tournament Team Detail: click team in table ---------------- */
  $("tournamentOutput")?.addEventListener("click", (evt) => {
    const target = evt.target;
    if (!(target instanceof HTMLElement)) return;

    const link = target.closest(".table-team-link");
    if (!link) return;

    const idx = Number(link.dataset.teamIndex);
    if (!Number.isFinite(idx)) return;

    showTournamentTeamDetail(idx);
  });


  /* ---------------- Initial Home Page Render ---------------- */
  generate(false);
});

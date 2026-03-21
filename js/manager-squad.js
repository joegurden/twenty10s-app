// js/manager-squad.js

import { supabase } from "./supabaseClient.js";

// same pattern as SBS
function photoUrlFor(playerId) {
  const { data } = supabase.storage
    .from("player-photos")
    .getPublicUrl(`headshots/${playerId}.webp`);

  return data?.publicUrl || "";
}

function normalizePos(p) {
  return String(p || "").toUpperCase().trim();
}

const money = (n) => "£" + Math.round(n).toLocaleString("en-GB");

const cfg = JSON.parse(localStorage.getItem("managerConfig") || "null");
const difficulty = localStorage.getItem("managerDifficulty") || "medium";
const DIFFICULTY_BUDGETS = {
  hard:   { transfer: 1_500_000_000, wages: 3_500_000 },
  medium: { transfer: 2_000_000_000, wages: 3_900_000 },
  easy:   { transfer: 2_500_000_000, wages: 4_600_000 },
};

const ACTIVE_BUDGET = DIFFICULTY_BUDGETS[difficulty] || DIFFICULTY_BUDGETS.medium;

if (!cfg) {
  window.location.href = "manager.html";
}

// ---- Difficulty-based captain rating rules (your spec) ----
// Easy: 94–99
// Medium: 90–94
// Hard: < 90
const CAPTAIN_RATING_BANDS = {
  easy:   { min: 94, max: 99, label: "Captain must be rated 94–99" },
  medium: { min: 90, max: 94, label: "Captain must be rated 90–94" },
  hard:   { min: 0,  max: 89, label: "Captain must be rated under 90" },
};

// ---- Formations (v1) ----
// Each formation defines 11 “slots” with a label + category for filtering.
const FORMATIONS = {
  "4-3-3":   ["GK","LB","CB","CB","RB","CM","CM","CM","LW","ST","RW"],
  "4-2-3-1": ["GK","LB","CB","CB","RB","CDM","CDM","LAM","CAM","RAM","ST"],
  "4-4-2":   ["GK","LB","CB","CB","RB","LM","CM","CM","RM","ST","ST"],
  "3-5-2":   ["GK","CB","CB","CB","LWB","CM","CDM","CM","RWB","ST","ST"],
  "3-4-3":   ["GK","CB","CB","CB","LM","CM","CM","RM","LW","ST","RW"],
};

// Slot coordinates (percentage positioning) for each label type.
// Quick v1 mapping: we’ll place by row.
const SLOT_COORDS = {
  "GK":  { x: 50, y: 86 },
  // Back line
  "LB":  { x: 18, y: 72 },
  "LWB": { x: 16, y: 66 },
  "CB":  [{ x: 38, y: 74 }, { x: 62, y: 74 }, { x: 50, y: 74 }],
  "RB":  { x: 82, y: 72 },
  "RWB": { x: 84, y: 66 },
  // Mid
  "CDM": [{ x: 36, y: 56 }, { x: 64, y: 56 }, { x: 50, y: 58 }],
  "CM":  [{ x: 34, y: 52 }, { x: 50, y: 50 }, { x: 66, y: 52 }],
  "LM":  { x: 18, y: 52 },
  "RM":  { x: 82, y: 52 },
  "LAM": { x: 34, y: 40 },
  "CAM": { x: 50, y: 40 },
  "RAM": { x: 66, y: 40 },
  // Front
  "LW":  { x: 20, y: 26 },
  "ST":  [{ x: 50, y: 24 }, { x: 44, y: 26 }, { x: 56, y: 26 }],
  "RW":  { x: 80, y: 26 },
};

// ---- Placeholder player pool ----
// Replace this later with your Supabase players list.
let PLAYER_POOL = [];

async function loadPlayersFromSupabase() {
  const { data, error } = await supabase
  .from("players")
  .select("ID,Name,Position,Rating,Club,League,value,wages")
  .limit(5000);

  if (error) throw new Error(error.message);

  // NOTE: fee/wage – see section 4 below
  PLAYER_POOL = (data || [])
  .map((p) => ({
    id: p.ID,
    name: p.Name,
    pos: slotGroupFromPosition(normalizePos(p.Position)),
    role: normalizePos(p.Position),
    rating: Number(p.Rating),
    club: p.Club,
    league: p.League,
    photo: photoUrlFor(p.ID),

    // ✅ REAL finance fields from Supabase
    fee: Number(p.value) || 0,
    wage: Number(p.wages) || 0,
  }))
  .filter((p) => p.id != null && p.name && p.role && Number.isFinite(p.rating));
}

function slotGroupFromPosition(role) {
  if (role === "GK") return "GK";
  if (["LB","RB","CB","LWB","RWB"].includes(role)) return "DEF";
  if (["CDM","CM","LM","RM","CAM","LAM","RAM"].includes(role)) return "MID";
  return "ATT";
}

function uniqueById(arr) {
  const seen = new Set();
  return arr.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function roleCountsForFormation(formation) {
  const counts = {};
  for (const role of FORMATIONS[formation]) {
    counts[role] = (counts[role] || 0) + 1;
  }
  return counts;
}

function buildDraftPools() {
  const roleCounts = roleCountsForFormation(state.formation);
  const pools = {};
  const excludedIds = new Set();

  Object.entries(roleCounts).forEach(([role, count]) => {
    const choicesNeeded = Math.max(cfg.optionsPerPos, count * 3);
    const roleChoices = buildTieredRoleChoices(role, choicesNeeded, excludedIds);

    pools[role] = roleChoices;
    roleChoices.forEach((p) => excludedIds.add(p.id));
  });

  state.draftPools = pools;

  state.areaPools = {
    GK: uniqueById(
      Object.entries(pools)
        .filter(([role]) => getSlotFamily(role) === "GK")
        .flatMap(([, players]) => players)
    ),
    DEF: uniqueById(
      Object.entries(pools)
        .filter(([role]) => getSlotFamily(role) === "DEF")
        .flatMap(([, players]) => players)
    ),
    MID: uniqueById(
      Object.entries(pools)
        .filter(([role]) => getSlotFamily(role) === "MID")
        .flatMap(([, players]) => players)
    ),
    ATT: uniqueById(
      Object.entries(pools)
        .filter(([role]) => getSlotFamily(role) === "ATT")
        .flatMap(([, players]) => players)
    ),
  };
}
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getSlotFamily(slotLabel) {
  if (slotLabel === "GK") return "GK";
  if (["LB","RB","CB","LWB","RWB"].includes(slotLabel)) return "DEF";
  if (["CDM","CM","LM","RM","CAM","LAM","RAM"].includes(slotLabel)) return "MID";
  return "ATT";
}

const PRICE_BANDS = {
  GK:  { cheap: 50000000, value: 70000000, starter: 97500000, star: 122500000 },

  LB:  { cheap: 30000000, value: 52500000, starter: 82500000, star: 112500000 },
  RB:  { cheap: 37500000, value: 47500000, starter: 72500000, star: 112500000 },
  CB:  { cheap: 42500000, value: 67500000, starter: 105000000, star: 127500000 },
  LWB: { cheap: 30000000, value: 52500000, starter: 82500000, star: 112500000 },
  RWB: { cheap: 37500000, value: 47500000, starter: 72500000, star: 112500000 },

  CDM: { cheap: 45000000, value: 55000000, starter: 105000000, star: 120000000 },
  CM:  { cheap: 50000000, value: 67500000, starter: 102500000, star: 127500000 },
  CAM: { cheap: 50000000, value: 67500000, starter: 97500000, star: 125000000 },
  LM:  { cheap: 47500000, value: 62500000, starter: 100000000, star: 125000000 },
  RM:  { cheap: 47500000, value: 62500000, starter: 100000000, star: 125000000 },
  LAM: { cheap: 50000000, value: 67500000, starter: 97500000, star: 125000000 },
  RAM: { cheap: 50000000, value: 67500000, starter: 97500000, star: 125000000 },

  LW:  { cheap: 45000000, value: 65000000, starter: 107500000, star: 132500000 },
  RW:  { cheap: 40000000, value: 50000000, starter: 82500000, star: 120000000 },
  ST:  { cheap: 40000000, value: 60000000, starter: 100000000, star: 120000000 },
};

const DIFFICULTY_RECIPES = {
  hard:   ["cheap", "starter", "starOrElite"],
  medium: ["cheap", "value", "starter", "star", "wildcard"],
  easy:   ["cheap", "value", "value", "starter", "starter", "star", "star", "starOrElite"],
};

function pickRandom(arr) {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function removePicked(pool, pickedIds) {
  return pool.filter((p) => !pickedIds.has(p.id));
}

function getRoleBands(role) {
  return PRICE_BANDS[role] || PRICE_BANDS.CM;
}

function splitByTier(players, role) {
  const b = getRoleBands(role);

  return {
    cheap: players.filter((p) => p.fee <= b.cheap),
    value: players.filter((p) => p.fee > b.cheap && p.fee <= b.value),
    starter: players.filter((p) => p.fee > b.value && p.fee <= b.starter),
    star: players.filter((p) => p.fee > b.starter && p.fee <= b.star),
    elite: players.filter((p) => p.fee > b.star),
  };
}

function pickFromTierMap(tiers, token) {
  if (token === "cheap") return pickRandom(tiers.cheap) || pickRandom(tiers.value) || pickRandom(tiers.starter) || pickRandom(tiers.star) || pickRandom(tiers.elite);
  if (token === "value") return pickRandom(tiers.value) || pickRandom(tiers.cheap) || pickRandom(tiers.starter) || pickRandom(tiers.star);
  if (token === "starter") return pickRandom(tiers.starter) || pickRandom(tiers.value) || pickRandom(tiers.star) || pickRandom(tiers.cheap);
  if (token === "star") return pickRandom(tiers.star) || pickRandom(tiers.starter) || pickRandom(tiers.value);
  if (token === "starOrElite") {
    const eliteChance = 0.16; // rare, but not insanely rare
    if (Math.random() < eliteChance && tiers.elite.length) return pickRandom(tiers.elite);
    return pickRandom(tiers.star) || pickRandom(tiers.elite) || pickRandom(tiers.starter);
  }
  if (token === "wildcard") {
    const weighted = [
      ...tiers.cheap,
      ...tiers.value,
      ...tiers.value,
      ...tiers.starter,
      ...tiers.starter,
      ...tiers.star,
      ...tiers.elite,
    ];
    return pickRandom(weighted);
  }
  return null;
}

function buildTieredRoleChoices(role, count, excludedIds = new Set()) {
  const candidates = removePicked(
    shuffleArray(PLAYER_POOL.filter((p) => p.role === role)),
    excludedIds
  );

  const tiers = splitByTier(candidates, role);
  const recipe = DIFFICULTY_RECIPES[difficulty] || DIFFICULTY_RECIPES.medium;

  const picked = [];
  const used = new Set();

  recipe.slice(0, count).forEach((token) => {
    const availableTiers = {
      cheap: tiers.cheap.filter((p) => !used.has(p.id)),
      value: tiers.value.filter((p) => !used.has(p.id)),
      starter: tiers.starter.filter((p) => !used.has(p.id)),
      star: tiers.star.filter((p) => !used.has(p.id)),
      elite: tiers.elite.filter((p) => !used.has(p.id)),
    };

    const chosen = pickFromTierMap(availableTiers, token);
    if (chosen) {
      used.add(chosen.id);
      picked.push(chosen);
    }
  });

  if (picked.length < count) {
    const fallback = candidates.filter((p) => !used.has(p.id)).slice(0, count - picked.length);
    picked.push(...fallback);
  }

  return picked;
}

function buildTieredAffordableBenchChoices(excludedIds = new Set()) {
  const affordable = PLAYER_POOL.filter((p) =>
    !excludedIds.has(p.id) &&
    p.fee <= state.transferRemaining &&
    p.wage <= state.wageRemaining
  );

  const byPos = {
    GK: affordable.filter((p) => p.pos === "GK"),
    DEF: affordable.filter((p) => p.pos === "DEF"),
    MID: affordable.filter((p) => p.pos === "MID"),
    ATT: affordable.filter((p) => p.pos === "ATT"),
  };

  const chosen = [];
  const used = new Set();

  function addTieredFromGroup(groupPlayers, roleHint = null) {
    if (!groupPlayers.length) return;

    const roleForBands = roleHint || groupPlayers[0]?.role || "CM";
    const tiers = splitByTier(groupPlayers, roleForBands);

    const tokens = ["cheap", "starter", "starOrElite"];
    const token = tokens[Math.floor(Math.random() * tokens.length)];

    const candidate = pickFromTierMap({
      cheap: tiers.cheap.filter((p) => !used.has(p.id)),
      value: tiers.value.filter((p) => !used.has(p.id)),
      starter: tiers.starter.filter((p) => !used.has(p.id)),
      star: tiers.star.filter((p) => !used.has(p.id)),
      elite: tiers.elite.filter((p) => !used.has(p.id)),
    }, token);

    if (candidate && !used.has(candidate.id)) {
      used.add(candidate.id);
      chosen.push(candidate);
    }
  }

  addTieredFromGroup(shuffleArray(byPos.DEF), "CB");
  addTieredFromGroup(shuffleArray(byPos.MID), "CM");
  addTieredFromGroup(shuffleArray(byPos.ATT), "ST");

  // 4th = wildcard from all affordable
  addTieredFromGroup(shuffleArray(affordable));

  // 5th = best premium affordable, fallback to any remaining
  const remaining = affordable.filter((p) => !used.has(p.id));
  const premiumAffordable = [...remaining].sort((a, b) => b.fee - a.fee)[0];

  if (premiumAffordable) {
    used.add(premiumAffordable.id);
    chosen.push(premiumAffordable);
  }

  while (chosen.length < 5) {
    const fallback = remaining.find((p) => !used.has(p.id));
    if (!fallback) break;
    used.add(fallback.id);
    chosen.push(fallback);
  }

  return chosen.slice(0, 5);
}

let state = {
  managerName: localStorage.getItem("managerName") || "",
  formation: localStorage.getItem("managerFormation") || "4-3-3",
  captainId: localStorage.getItem("managerCaptainId") || "",
  selectedSlotIndex: 0,
  // squad picks by slot index, plus bench later
  picks: [], // length = 11
subs: Array(4).fill(null),
  // budget remaining
  transferRemaining: ACTIVE_BUDGET.transfer,
wageRemaining: ACTIVE_BUDGET.wages,
  tab: "SELECTED",
draftPools: {},
areaPools: {},
formationLocked: false,
};

const el = (id) => document.getElementById(id);

// HUD refs
const msDifficultyPill = el("msDifficultyPill");
const msManagerNamePill = el("msManagerNamePill");
const msFormationPill = el("msFormationPill");
const msTransferText = el("msTransferText");
const msWageText = el("msWageText");
const msPlayersText = el("msPlayersText");
const msTransferFill = el("msTransferFill");
const msWageFill = el("msWageFill");
const msPlayersFill = el("msPlayersFill");

const formationSelect = el("formationSelect");
const pitchArea = el("pitchArea");
const playerList = el("playerList");
const subsArea = el("subsArea");
const msNote = el("msNote");

// Modals
const nameModal = el("nameModal");
const captainModal = el("captainModal");
const mgrFirst = el("mgrFirst");
const mgrLast = el("mgrLast");
const btnSaveName = el("btnSaveName");
const captainList = el("captainList");
const captainRuleText = el("captainRuleText");
const btnCaptainConfirm = el("btnCaptainConfirm");

// Buttons
el("btnResetSquad").addEventListener("click", resetSquad);
el("btnSubmitSquad").addEventListener("click", submitSquad);

// Tabs
document.querySelectorAll(".tab").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    state.tab = b.dataset.tab;
    renderPlayers();
  });
});

formationSelect.value = state.formation;
formationSelect.addEventListener("change", () => {
  if (state.formationLocked) {
    formationSelect.value = state.formation;
    return;
  }

  state.formation = formationSelect.value;
  localStorage.setItem("managerFormation", state.formation);
});

// --- init ---
function ensureFormationChosenFirst() {
  if (state.formationLocked) return false;

  const ok = confirm(`Start this save with ${state.formation}? This cannot be changed.`);
  if (!ok) return true;

  state.formationLocked = true;
  localStorage.setItem("managerFormation", state.formation);
  localStorage.setItem("managerFormationLocked", "1");

  buildDraftPools();
  return false;
}

async function boot() {
  await loadPlayersFromSupabase();
state.formationLocked = !!localStorage.getItem("managerFormationLocked");
if (state.formationLocked) {
  buildDraftPools();
}

  msDifficultyPill.textContent = `Difficulty: ${capitalize(difficulty)}`;
  formationSelect.value = state.formation;
if (ensureFormationChosenFirst()) return;
if (!state.managerName) { openNameModal(); return; }
  if (!state.captainId) { openCaptainModal(); return; }

  renderAll();
}
boot();

function openNameModal() {
  nameModal.classList.remove("hidden");
  btnSaveName.addEventListener("click", () => {
    const f = (mgrFirst.value || "").trim();
    const l = (mgrLast.value || "").trim();
    if (!f || !l) return;

    state.managerName = `${f} ${l}`;
    localStorage.setItem("managerName", state.managerName);

    nameModal.classList.add("hidden");
    openCaptainModal();
  }, { once: true });
}

function openCaptainModal() {
  captainModal.classList.remove("hidden");

  const band = CAPTAIN_RATING_BANDS[difficulty] || CAPTAIN_RATING_BANDS.medium;
  captainRuleText.textContent = band.label;

  const eligible = PLAYER_POOL
    .filter(p => p.rating >= band.min && p.rating <= band.max)
    .slice(0, 8);

  let chosen = null;
  btnCaptainConfirm.disabled = true;
  captainList.innerHTML = "";

  eligible.forEach((p) => {
    const card = document.createElement("div");
    card.className = "cap-card";
    card.innerHTML = `
      <strong>${p.name}</strong>
      <div class="sub">Rating ${p.rating} · ${p.role} · Fee ${money(p.fee)} · Wage ${money(p.wage)}/wk</div>
    `;
    card.addEventListener("click", () => {
      document.querySelectorAll(".cap-card").forEach(x => x.classList.remove("active"));
      card.classList.add("active");
      chosen = p.id;
      btnCaptainConfirm.disabled = false;
    });
    captainList.appendChild(card);
  });

  btnCaptainConfirm.addEventListener("click", () => {
    state.captainId = chosen;
    localStorage.setItem("managerCaptainId", chosen);
    captainModal.classList.add("hidden");
    renderAll();
  }, { once: true });
}

function renderAll() {
  msManagerNamePill.textContent = `Manager: ${state.managerName || "—"}`;
  msFormationPill.textContent = `Formation: ${state.formation}`;
  msNote.style.display = state.captainId ? "none" : "block";

  // Initialize picks array length = 11
  const slots = FORMATIONS[state.formation];
  if (state.picks.length !== slots.length) state.picks = Array(slots.length).fill(null);

  renderPitch();
renderSubs();
  renderPlayers();
  updateBudgets();
}

function renderPitch() {
  pitchArea.innerHTML = "";

  const slots = FORMATIONS[state.formation];
  const cbCounter = { CB: 0, ST: 0, CM: 0, CDM: 0 };

  slots.forEach((label, idx) => {
    const tile = document.createElement("div");
    tile.className = "slot" + (idx === state.selectedSlotIndex ? " active" : "");
    tile.dataset.index = String(idx);

    // Positioning
    const pos = resolveCoord(label, cbCounter);
    tile.style.left = `calc(${pos.x}% - 75px)`;
    tile.style.top = `calc(${pos.y}% - 42px)`;

    const picked = state.picks[idx];

    if (!picked) {
      tile.innerHTML = `<div>
        <div class="pos">${label}</div>
        <div class="hint">+ Select Player</div>
      </div>`;
    } else {
      const isActive = idx === state.selectedSlotIndex;

      tile.innerHTML = `
        <div class="slot-photo ${isActive ? "active" : ""}">
          <img src="${picked.photo || "img/player-placeholder.png"}">
        </div>

        <div class="picked">
          <strong>${picked.name}</strong>
          <span>${picked.role}</span>

          ${isActive ? `
            <div class="slot-finance">
              ${money(picked.fee)} · ${money(picked.wage)}/wk
            </div>
          ` : ""}
        </div>
      `;
    } // ✅ FIXED

    tile.addEventListener("click", () => {
  state.selectedSlotIndex = idx;
  renderPitch();
  renderPlayers(); // ✅ THIS FIXES YOUR ISSUE
});

    pitchArea.appendChild(tile);
  });
}

function renderSubs() {
  if (!subsArea) return;

  subsArea.innerHTML = "";

  state.subs.forEach((sub, idx) => {
    const card = document.createElement("div");
    card.className = "sub-card" + (!sub ? " empty" : "");

    if (!sub) {
      card.innerHTML = `
        <div class="sub-meta">
          <strong>Sub ${idx + 1}</strong>
          <span>Pick after your starting XI is complete</span>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="sub-top">
          <div class="pimg">
            <img src="${sub.photo || "img/player-placeholder.png"}" alt="${sub.name}">
          </div>
          <div class="sub-meta">
            <strong>${sub.name}</strong>
            <span>${sub.pos} · ${sub.role} · Rating ${sub.rating}</span>
          </div>
        </div>

        <div class="sub-bottom">
          <div>
            <div class="sub-price">${money(sub.fee)}</div>
            <div class="sub-wage">${money(sub.wage)}/wk</div>
          </div>
          <div class="sub-actions">
            <button class="secondary small sub-btn" data-remove-sub="${idx}">Remove</button>
          </div>
        </div>
      `;
    }

    subsArea.appendChild(card);
  });

  subsArea.querySelectorAll("[data-remove-sub]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.removeSub);
      const prev = state.subs[idx];
      if (!prev) return;

      state.transferRemaining += prev.fee;
      state.wageRemaining += prev.wage;
      state.subs[idx] = null;

      renderSubs();
      renderPlayers();
      updateBudgets();
    });
  });
}

function resolveCoord(label, counter) {
  const entry = SLOT_COORDS[label];

  if (Array.isArray(entry)) {
    const i = counter[label] || 0;
    counter[label] = i + 1;
    return entry[Math.min(i, entry.length - 1)];
  }

  // For “CB”/etc arrays stored under key
  if (label === "CB" || label === "ST" || label === "CM" || label === "CDM") {
    const arr = SLOT_COORDS[label];
    const i = counter[label] || 0;
    counter[label] = i + 1;
    return arr[Math.min(i, arr.length - 1)];
  }

  return entry || { x: 50, y: 50 };
}

function renderPlayers() {
  if (!state.captainId) {
    playerList.innerHTML = `<div class="pill">Pick your Captain first to unlock players.</div>`;
    return;
  }

  const slotLabel = FORMATIONS[state.formation][state.selectedSlotIndex];
  const selectedStarters = state.picks.filter(Boolean).length;
  const buildingStarters = selectedStarters < FORMATIONS[state.formation].length;

  const excludedIds = new Set([
    ...state.picks.filter(Boolean).map((p) => p.id),
    ...state.subs.filter(Boolean).map((p) => p.id),
  ]);

  let visiblePlayers = [];
  let canUsePlayer = () => true;

  if (buildingStarters) {
    if (state.tab === "SELECTED") {
      visiblePlayers = (state.draftPools[slotLabel] || []).filter((p) => !excludedIds.has(p.id));
    } else {
      visiblePlayers = (state.areaPools[state.tab] || []).filter((p) => !excludedIds.has(p.id));
    }

    canUsePlayer = (p) => p.role === slotLabel;
   } else {
  const benchChoices = buildTieredAffordableBenchChoices(excludedIds);

  if (state.tab === "SELECTED") {
    visiblePlayers = benchChoices;
  } else {
    visiblePlayers = benchChoices.filter((p) => p.pos === state.tab);
  }

  canUsePlayer = (p) =>
    p.fee <= state.transferRemaining &&
    p.wage <= state.wageRemaining;
}

  playerList.innerHTML = "";

  visiblePlayers.forEach((p) => {
    const canUse = canUsePlayer(p);

    const row = document.createElement("div");
    row.className = "player-row";
    if (!canUse) row.style.opacity = "0.45";

    row.innerHTML = `
      <div style="display:flex; gap:10px; align-items:center;">
        <div class="pimg">
          <img src="${p.photo || "img/player-placeholder.png"}" alt="${p.name}">
        </div>

        <div class="player-meta">
          <strong>${p.name}</strong>
          <span>${p.pos} · ${p.role} · Rating ${p.rating}</span>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:12px;">
        <div class="player-prices">
          <div>${money(p.fee)}</div>
          <div class="wage">${money(p.wage)}/wk</div>
        </div>
        <button class="primary small" ${!canUse ? "disabled" : ""}>
          ${canUse ? "Add" : "—"}
        </button>
      </div>
    `;

    if (canUse) {
      row.querySelector("button").addEventListener("click", () => addToSelectedSlot(p));
    }

    playerList.appendChild(row);
  });
}
function addToSelectedSlot(player) {
  if (!state.captainId) return;

  if (player.fee > state.transferRemaining) {
    alert("Not enough transfer budget.");
    return;
  }
  if (player.wage > state.wageRemaining) {
    alert("Not enough wage budget.");
    return;
  }

  const startersComplete = state.picks.filter(Boolean).length >= FORMATIONS[state.formation].length;

  if (!startersComplete) {
    const idx = state.selectedSlotIndex;
    const prev = state.picks[idx];

    if (prev) {
      state.transferRemaining += prev.fee;
      state.wageRemaining += prev.wage;
    }

    state.picks[idx] = player;
    state.transferRemaining -= player.fee;
    state.wageRemaining -= player.wage;

    renderPitch();
    renderPlayers();
    renderSubs();
    updateBudgets();
    return;
  }

  const emptySubIndex = state.subs.findIndex((s) => !s);
  if (emptySubIndex === -1) {
    alert("All 4 subs are already selected.");
    return;
  }

  state.subs[emptySubIndex] = player;
  state.transferRemaining -= player.fee;
  state.wageRemaining -= player.wage;

  renderSubs();
  renderPlayers();
  updateBudgets();
}

function updateBudgets() {
  const selectedCount = state.picks.filter(Boolean).length + state.subs.filter(Boolean).length;

  const totalTransfer = ACTIVE_BUDGET.transfer;
  const totalWage = ACTIVE_BUDGET.wages;

  msTransferText.textContent = `${money(state.transferRemaining)} / ${money(totalTransfer)}`;
  msWageText.textContent = `${money(state.wageRemaining)} / ${money(totalWage)} / week`;
  msPlayersText.textContent = `${selectedCount} / ${cfg.squadSize}`;

  const tPct = clamp(100 * (1 - state.transferRemaining / totalTransfer), 0, 100);
  const wPct = clamp(100 * (1 - state.wageRemaining / totalWage), 0, 100);
  const pPct = clamp(100 * (selectedCount / cfg.squadSize), 0, 100);

  msTransferFill.style.width = `${tPct}%`;
  msWageFill.style.width = `${wPct}%`;
  msPlayersFill.style.width = `${pPct}%`;
}

function resetSquad() {
  if (!confirm("Reset squad picks?")) return;
  state.picks = [];
state.subs = Array(4).fill(null);
  state.selectedSlotIndex = 0;
  state.transferRemaining = ACTIVE_BUDGET.transfer;
state.wageRemaining = ACTIVE_BUDGET.wages;
  buildDraftPools();
renderAll();
}

function submitSquad() {
  const selectedCount = state.picks.filter(Boolean).length;
  if (state.picks.filter(Boolean).length < 11) {
  alert("Pick a full starting XI first.");
  return;
}

if (state.subs.filter(Boolean).length < 4) {
  alert("Pick all 4 substitutes first.");
  return;
}
  alert("Submitted! Next we’ll add scoring + saving.");
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function capitalize(s){ return (s||"").slice(0,1).toUpperCase() + (s||"").slice(1); }

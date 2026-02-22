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

if (!cfg) {
  // Safety: if user lands here directly
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

let state = {
  managerName: localStorage.getItem("managerName") || "",
  formation: localStorage.getItem("managerFormation") || "4-3-3",
  captainId: localStorage.getItem("managerCaptainId") || "",
  selectedSlotIndex: 0,
  // squad picks by slot index, plus bench later
  picks: [], // length = 11
  // budget remaining
  transferRemaining: cfg.transfer,
  wageRemaining: cfg.wages,
  tab: "ALL",
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
  state.formation = formationSelect.value;
  localStorage.setItem("managerFormation", state.formation);
  // Rebuild slots (clears picks for v1 to avoid mismatch)
  state.picks = [];
  state.selectedSlotIndex = 0;
  renderAll();
});

// --- init ---
async function boot() {
  await loadPlayersFromSupabase();

  msDifficultyPill.textContent = `Difficulty: ${capitalize(difficulty)}`;
  formationSelect.value = state.formation;

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
      tile.innerHTML = `<div class="picked">
        <strong>${picked.name}</strong>
        <span>${picked.role} · ${money(picked.fee)} · ${money(picked.wage)}/wk</span>
      </div>`;
    }

    tile.addEventListener("click", () => {
      state.selectedSlotIndex = idx;
      renderPitch();
    });

    pitchArea.appendChild(tile);
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
  // Must choose captain first
  if (!state.captainId) {
    playerList.innerHTML = `<div class="pill">Pick your Captain first to unlock players.</div>`;
    return;
  }

  const slotLabel = FORMATIONS[state.formation][state.selectedSlotIndex];
const tab = state.tab;

const slotGroup =
  slotLabel === "GK" ? "GK"
  : ["LB","RB","CB","LWB","RWB"].includes(slotLabel) ? "DEF"
  : ["CDM","CM","LM","RM","CAM","LAM","RAM"].includes(slotLabel) ? "MID"
  : "ATT";

const matchesTab = (p) => {
  if (tab === "ALL") return true;
  return p.pos === tab; // p.pos is "GK"/"DEF"/"MID"/"ATT"
};

const notPicked = (p) => !state.picks.some(x => x?.id === p.id);

const limit = cfg.optionsPerPos;

// 1) exact role list (RB shows RBs etc.)
let filtered = PLAYER_POOL
  .filter(matchesTab)
  .filter(notPicked)
  .filter(p => p.role === slotLabel)
  .slice(0, limit);

// 2) fallback to same group if not enough exact-role players
if (filtered.length < limit) {
  const remaining = limit - filtered.length;

  const fallback = PLAYER_POOL
    .filter(matchesTab)
    .filter(notPicked)
    .filter(p => p.pos === slotGroup)
    .filter(p => p.role !== slotLabel)
    .filter(p => !filtered.some(x => x.id === p.id))
    .slice(0, remaining);

  filtered = filtered.concat(fallback);
}

  playerList.innerHTML = "";

  filtered.forEach((p) => {
    const row = document.createElement("div");
    row.className = "player-row";

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
    <button class="primary small">Add</button>
  </div>
`;

    row.querySelector("button").addEventListener("click", () => addToSelectedSlot(p));
    playerList.appendChild(row);
  });
}

function addToSelectedSlot(player) {
  // Must choose captain first
  if (!state.captainId) return;

  // Check budgets
  if (player.fee > state.transferRemaining) {
    alert("Not enough transfer budget.");
    return;
  }
  if (player.wage > state.wageRemaining) {
    alert("Not enough wage budget.");
    return;
  }

  const idx = state.selectedSlotIndex;

  // Refund old pick if replacing
  const prev = state.picks[idx];
  if (prev) {
    state.transferRemaining += prev.fee;
    state.wageRemaining += prev.wage;
  }

  // Apply new pick
  state.picks[idx] = player;
  state.transferRemaining -= player.fee;
  state.wageRemaining -= player.wage;

  renderPitch();
  renderPlayers();
  updateBudgets();
}

function updateBudgets() {
  // total selected (just XI for now)
  const selectedCount = state.picks.filter(Boolean).length;

  // HUD text
  msTransferText.textContent = `${money(state.transferRemaining)} / ${money(cfg.transfer)}`;
  msWageText.textContent = `${money(state.wageRemaining)} / ${money(cfg.wages)} / week`;
  msPlayersText.textContent = `${selectedCount} / ${cfg.squadSize}`;

  // Fills
  const tPct = clamp(100 * (1 - state.transferRemaining / cfg.transfer), 0, 100);
  const wPct = clamp(100 * (1 - state.wageRemaining / cfg.wages), 0, 100);
  const pPct = clamp(100 * (selectedCount / cfg.squadSize), 0, 100);

  msTransferFill.style.width = `${tPct}%`;
  msWageFill.style.width = `${wPct}%`;
  msPlayersFill.style.width = `${pPct}%`;
}

function resetSquad() {
  if (!confirm("Reset squad picks?")) return;
  state.picks = [];
  state.selectedSlotIndex = 0;
  state.transferRemaining = cfg.transfer;
  state.wageRemaining = cfg.wages;
  renderAll();
}

function submitSquad() {
  const selectedCount = state.picks.filter(Boolean).length;
  if (selectedCount < 11) {
    alert("Pick a full starting XI first.");
    return;
  }
  alert("Submitted! Next we’ll add scoring + saving.");
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function capitalize(s){ return (s||"").slice(0,1).toUpperCase() + (s||"").slice(1); }

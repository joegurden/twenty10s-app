import { supabase } from "./supabaseClient.js";

function photoUrlFor(playerId) {
  const { data } = supabase.storage
    .from("player-photos")
    .getPublicUrl(`headshots/${playerId}.webp`);
  return data?.publicUrl || "";
}

function normalizePos(p) {
  return String(p || "").toUpperCase().trim();
}

function money(n) {
  return "£" + Math.round(Number(n) || 0).toLocaleString("en-GB");
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function capitalize(s) {
  return (s || "").slice(0, 1).toUpperCase() + (s || "").slice(1);
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandom(arr) {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function averageRating(players) {
  const valid = players.filter(Boolean);
  if (!valid.length) return 0;
  return valid.reduce((sum, p) => sum + (Number(p.rating) || 0), 0) / valid.length;
}

function el(id) {
  return document.getElementById(id);
}

function clearManagementSelections() {
  state.selectedSlotIndex = -1;
  state.swapSourceIndex = null;
  state.pendingSubIndex = null;
  state.pendingReserveIndex = null;
}

const difficulty = localStorage.getItem("managerDifficulty") || "medium";
const cfg = JSON.parse(localStorage.getItem("managerConfig") || "null");

const ACTIVE_BUDGETS = {
  hard: { transfer: 1_500_000_000, wages: 3_500_000 },
  medium: { transfer: 2_000_000_000, wages: 3_900_000 },
  easy: { transfer: 2_500_000_000, wages: 4_600_000 },
};

const ACTIVE_BUDGET = ACTIVE_BUDGETS[difficulty] || ACTIVE_BUDGETS.medium;

const FORMATIONS = {
  "4-3-3": ["GK","LB","CB","CB","RB","CM","CM","CM","LW","ST","RW"],
  "4-3-3 (Attack)": ["GK","LB","CB","CB","RB","CAM","CM","CM","LW","ST","RW"],
  "4-3-3 (Holding)": ["GK","LB","CB","CB","RB","CDM","CM","CM","LW","ST","RW"],
  "4-2-3-1": ["GK","LB","CB","CB","RB","CDM","CDM","LW","CAM","RW","ST"],
  "4-4-2": ["GK","LB","CB","CB","RB","LM","CM","CM","RM","ST","ST"],
  "3-5-2": ["GK","CB","CB","CB","LWB","CM","CDM","CM","RWB","ST","ST"],
  "3-4-3": ["GK","CB","CB","CB","LM","CM","CM","RM","LW","ST","RW"],
  "4-1-2-1-2 Wide": ["GK","LB","CB","CB","RB","CDM","LM","RM","CAM","ST","ST"],
  "4-1-2-1-2 (Diamond)": ["GK","LB","CB","CB","RB","CDM","CM","CM","CAM","ST","ST"],
};

const FORMATION_COORDS = {
  "4-3-3": [
    { x: 50, y: 86 },
    { x: 16, y: 72 }, { x: 37, y: 75 }, { x: 63, y: 75 }, { x: 84, y: 72 },
    { x: 34, y: 50 }, { x: 50, y: 46 }, { x: 66, y: 50 },
    { x: 18, y: 24 }, { x: 50, y: 18 }, { x: 82, y: 24 },
  ],

  "4-3-3 (Attack)": [
    { x: 50, y: 86 },
    { x: 16, y: 72 }, { x: 37, y: 75 }, { x: 63, y: 75 }, { x: 84, y: 72 },
    { x: 50, y: 38 },
    { x: 36, y: 50 }, { x: 64, y: 50 },
    { x: 18, y: 24 }, { x: 50, y: 18 }, { x: 82, y: 24 },
  ],

  "4-3-3 (Holding)": [
    { x: 50, y: 86 },
    { x: 16, y: 72 }, { x: 37, y: 75 }, { x: 63, y: 75 }, { x: 84, y: 72 },
    { x: 50, y: 58 },
    { x: 36, y: 46 }, { x: 64, y: 46 },
    { x: 18, y: 24 }, { x: 50, y: 18 }, { x: 82, y: 24 },
  ],

  "4-2-3-1": [
    { x: 50, y: 86 },
    { x: 16, y: 72 }, { x: 37, y: 75 }, { x: 63, y: 75 }, { x: 84, y: 72 },
    { x: 40, y: 58 }, { x: 60, y: 58 },
    { x: 18, y: 36 }, { x: 50, y: 34 }, { x: 82, y: 36 },
    { x: 50, y: 18 },
  ],

  "4-4-2": [
    { x: 50, y: 86 },
    { x: 16, y: 72 }, { x: 37, y: 75 }, { x: 63, y: 75 }, { x: 84, y: 72 },
    { x: 18, y: 50 }, { x: 40, y: 48 }, { x: 60, y: 48 }, { x: 82, y: 50 },
    { x: 43, y: 20 }, { x: 57, y: 20 },
  ],

  "3-5-2": [
    { x: 50, y: 86 },
    { x: 34, y: 75 }, { x: 50, y: 77 }, { x: 66, y: 75 },
    { x: 14, y: 58 }, { x: 38, y: 48 }, { x: 50, y: 58 }, { x: 62, y: 48 }, { x: 86, y: 58 },
    { x: 43, y: 20 }, { x: 57, y: 20 },
  ],

  "3-4-3": [
    { x: 50, y: 86 },
    { x: 34, y: 75 }, { x: 50, y: 77 }, { x: 66, y: 75 },
    { x: 18, y: 50 }, { x: 42, y: 48 }, { x: 58, y: 48 }, { x: 82, y: 50 },
    { x: 18, y: 24 }, { x: 50, y: 18 }, { x: 82, y: 24 },
  ],

  "4-1-2-1-2 Wide": [
    { x: 50, y: 86 },
    { x: 16, y: 72 }, { x: 37, y: 75 }, { x: 63, y: 75 }, { x: 84, y: 72 },
    { x: 50, y: 60 },
    { x: 18, y: 48 }, { x: 82, y: 48 },
    { x: 50, y: 36 },
    { x: 43, y: 20 }, { x: 57, y: 20 },
  ],

  "4-1-2-1-2 (Diamond)": [
    { x: 50, y: 86 },
    { x: 16, y: 72 }, { x: 37, y: 75 }, { x: 63, y: 75 }, { x: 84, y: 72 },
    { x: 50, y: 60 },
    { x: 38, y: 48 }, { x: 62, y: 48 },
    { x: 50, y: 36 },
    { x: 43, y: 20 }, { x: 57, y: 20 },
  ],
};

const POSITION_ADAPTABILITY = {
  GK: ["GK"],

  LB: ["LB","LWB"],
  LWB: ["LWB","LB","LM"],
  CB: ["CB","LB","RB","CDM"],
  RB: ["RB","RWB"],
  RWB: ["RWB","RB","RM"],

  CDM: ["CDM","CM","CB"],
  CM: ["CM","CDM","CAM","LM","RM"],
  CAM: ["CAM","CM","ST","LM","RM"],
  LM: ["LM","LW","LWB","CM"],
  RM: ["RM","RW","RWB","CM"],

  LW: ["LW","LM","ST","CAM"],
  RW: ["RW","RM","ST","CAM"],
  ST: ["ST","CAM","LW","RW"],
};

const AI_TEAM_NAMES = [
  "Average Joes FC",
  "Bayern Ballerz",
  "Ctrl Alt De Ligt",
  "Dynamo Chicken Kiev",
  "Expected Toulouse",
  "Game of Throw-Ins",
  "Lads On Touré",
  "Messi Business",
  "Net Six & Chill",
  "No Kane No Gain",
  "Pique Blinders",
  "Real Social Dads",
  "Tea & Tiki Taka",
  "Who Ate All Depay",
  "Zero Pts Given",
];

let PLAYER_POOL = [];

let state = {
  managerName: localStorage.getItem("managerName") || "",
  formation: localStorage.getItem("managerFormation") || "4-3-3",
  picks: [],
  subs: Array(4).fill(null),
  reserveSlots: Array(3).fill(null),
  selectedSlotIndex: -1,
  swapSourceIndex: null,
  pendingSubIndex: null,
  pendingReserveIndex: null,
  transferRemaining: ACTIVE_BUDGET.transfer,
  wageRemaining: ACTIVE_BUDGET.wages,
  aiTeams: [],
};

const msDifficultyPill = el("msDifficultyPill");
const msManagerNamePill = el("msManagerNamePill");
const msFormationPill = el("msFormationPill");
const formationSelect = el("formationSelect");
const pitchArea = el("pitchArea");
const subsArea = el("subsArea");
const reservesArea = el("reservesArea");
const msNote = el("msNote");
const leagueTableBody = el("leagueTableBody");
const bookiesList = el("bookiesList");
const playerStatsRow = el("playerStatsRow");
const scoutModal = el("scoutModal");
const scoutModalTitle = el("scoutModalTitle");
const scoutModalSub = el("scoutModalSub");
const scoutLockedMessage = el("scoutLockedMessage");
const scoutPitchWrap = el("scoutPitchWrap");
const scoutPitchArea = el("scoutPitchArea");
const btnCloseScoutModal = el("btnCloseScoutModal");

el("btnStartSeason")?.addEventListener("click", () => {
  alert("Season flow comes next — this hub is ready to plug into match sim.");
});

btnCloseScoutModal?.addEventListener("click", closeScoutModal);

scoutModal?.addEventListener("click", (e) => {
  if (e.target === scoutModal) {
    closeScoutModal();
  }
});

formationSelect?.addEventListener("change", () => {
  state.formation = formationSelect.value;
  localStorage.setItem("managerFormation", state.formation);

  const newSlots = FORMATIONS[state.formation];
  const oldPicks = [...state.picks];

  state.picks = Array(newSlots.length).fill(null);

  for (let i = 0; i < Math.min(oldPicks.length, state.picks.length); i++) {
    state.picks[i] = oldPicks[i];
  }

  clearManagementSelections();
  generateLeagueData(true);
  renderAll();
});

async function loadPlayersFromSupabase() {
  const { data, error } = await supabase
    .from("players")
    .select("ID,Name,Position,Rating,Club,League,value,wages")
    .limit(5000);

  if (error) throw new Error(error.message);

  PLAYER_POOL = (data || [])
    .map((p) => ({
      id: p.ID,
      name: p.Name,
      pos: slotGroupFromPosition(normalizePos(p.Position)),
      role: normalizePos(p.Position),
      rating: Number(p.Rating) || 0,
      club: p.Club,
      league: p.League,
      fee: Number(p.value) || 0,
      wage: Number(p.wages) || 0,
      photo: photoUrlFor(p.ID),
    }))
    .filter((p) => p.id != null && p.name && p.role);
}

function slotGroupFromPosition(role) {
  if (role === "GK") return "GK";
  if (["LB","RB","CB","LWB","RWB"].includes(role)) return "DEF";
  if (["CDM","CM","LM","RM","CAM"].includes(role)) return "MID";
  return "ATT";
}

function canPlayPosition(playerRole, slotRole) {
  const allowed = POSITION_ADAPTABILITY[playerRole] || [];
  return allowed.includes(slotRole);
}

function isNaturalPosition(playerRole, slotRole) {
  return playerRole === slotRole;
}

function getValidStarterTargets(player) {
  const targets = [];
  const slots = FORMATIONS[state.formation];

  slots.forEach((slotRole, idx) => {
    if (canPlayPosition(player.role, slotRole)) {
      targets.push(idx);
    }
  });

  return targets;
}

function loadHubSquad() {
  const saved =
    JSON.parse(localStorage.getItem("managerHubSquad") || "null") ||
    JSON.parse(localStorage.getItem("managerSquad") || "null");

  if (!saved) {
    window.location.href = "manager-squad.html";
    return;
  }

  state.managerName = saved.managerName || state.managerName;
  state.formation = saved.formation || state.formation;
  state.picks = Array.isArray(saved.picks) ? saved.picks : [];
  state.subs = Array.isArray(saved.subs) ? saved.subs : Array(4).fill(null);
  state.reserveSlots = Array.isArray(saved.reserves) ? saved.reserves : Array(3).fill(null);
  state.transferRemaining = Number(saved.transferRemaining ?? ACTIVE_BUDGET.transfer);
  state.wageRemaining = Number(saved.wageRemaining ?? ACTIVE_BUDGET.wages);
}

function renderAll() {
msNote.style.display = "block";

if (formationSelect) {
  formationSelect.value = state.formation;
}

renderHud();
renderPitch();
renderSubs();
renderReserves();
renderLeagueTable();
renderBookiesOdds();
renderPlayerStats();
}

function renderHud() {
  msManagerNamePill.textContent = `Manager: ${state.managerName || "—"}`;
  msDifficultyPill.textContent = `Difficulty: ${capitalize(difficulty)}`;
  msFormationPill.textContent = `Formation: ${state.formation}`;
}

function renderPitch() {
  pitchArea.innerHTML = "";

  const slots = FORMATIONS[state.formation];
  const coords = FORMATION_COORDS[state.formation] || FORMATION_COORDS["4-3-3"];

  let validTargets = [];

  if (state.swapSourceIndex !== null && state.picks[state.swapSourceIndex]) {
    validTargets = getValidStarterTargets(state.picks[state.swapSourceIndex]);
  }

  if (state.pendingSubIndex !== null && state.subs[state.pendingSubIndex]) {
    validTargets = getValidStarterTargets(state.subs[state.pendingSubIndex]);
  }

  if (state.pendingReserveIndex !== null && state.reserveSlots[state.pendingReserveIndex]) {
    validTargets = getValidStarterTargets(state.reserveSlots[state.pendingReserveIndex]);
  }

  slots.forEach((label, idx) => {
    const tile = document.createElement("div");
    const picked = state.picks[idx];

    const isSwapActive = state.swapSourceIndex === idx;
    const isSelected =
      state.swapSourceIndex === null &&
      state.pendingSubIndex === null &&
      state.pendingReserveIndex === null &&
      idx === state.selectedSlotIndex;

    const isGreenTarget =
      (state.swapSourceIndex !== null ||
        state.pendingSubIndex !== null ||
        state.pendingReserveIndex !== null) &&
      validTargets.includes(idx) &&
      !isSwapActive;

    tile.className =
      "slot" +
      (isSwapActive || isSelected ? " active" : "") +
      (isGreenTarget ? " valid-target" : "");

    const pos = coords[idx] || { x: 50, y: 50 };
    tile.style.left = `calc(${pos.x}% - 75px)`;
    tile.style.top = `calc(${pos.y}% - 42px)`;

    if (!picked) {
      tile.innerHTML = `
        <div>
          <div class="pos">${label}</div>
          <div class="hint">Open Slot</div>
        </div>
      `;
    } else {
      tile.innerHTML = `
        <div class="slot-photo">
          <img src="${picked.photo || photoUrlFor(picked.id) || "img/player-placeholder.png"}" alt="${picked.name}">
        </div>
        <div class="picked">
          <strong>${picked.name}</strong>
          <span>${picked.role}</span>
        </div>
      `;
    }

    tile.addEventListener("click", () => {
      if (state.pendingSubIndex !== null) {
        attemptSubSwap(state.pendingSubIndex, idx);
        clearManagementSelections();
        renderAll();
        return;
      }

      if (state.pendingReserveIndex !== null) {
        attemptReserveToStarterSwap(state.pendingReserveIndex, idx);
        clearManagementSelections();
        renderAll();
        return;
      }

      if (!picked) return;

      if (state.swapSourceIndex === null) {
        state.swapSourceIndex = idx;
        state.selectedSlotIndex = idx;
        state.pendingSubIndex = null;
        state.pendingReserveIndex = null;
        renderAll();
        return;
      }

      if (state.swapSourceIndex === idx) {
        clearManagementSelections();
        renderAll();
        return;
      }

      attemptSwap(state.swapSourceIndex, idx);
      clearManagementSelections();
      renderAll();
    });

    pitchArea.appendChild(tile);
  });
}

function renderSubs() {
  subsArea.innerHTML = "";

  state.subs.forEach((sub, idx) => {
    const card = document.createElement("div");
    card.className =
      "sub-card" +
      (!sub ? " empty" : "") +
      (state.pendingSubIndex === idx ? " active" : "");

    if (!sub) {
      card.innerHTML = `
        <div class="sub-meta">
          <strong>Sub ${idx + 1}</strong>
          <span>Empty slot</span>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="sub-top">
          <div class="pimg">
            <img src="${sub.photo || photoUrlFor(sub.id) || "img/player-placeholder.png"}" alt="${sub.name}">
          </div>
          <div class="sub-meta">
            <strong>${sub.name}</strong>
            <span>${sub.pos} · ${sub.role} · Rating ${sub.rating}</span>
          </div>
        </div>
      `;
    }

    card.addEventListener("click", () => {
      if (!sub) return;

      if (state.pendingSubIndex === idx) {
        state.pendingSubIndex = null;
        renderAll();
        return;
      }

      state.pendingSubIndex = idx;
      state.pendingReserveIndex = null;
      state.swapSourceIndex = null;
      state.selectedSlotIndex = -1;
      renderAll();
    });

    subsArea.appendChild(card);
  });
}

function renderReserves() {
  reservesArea.innerHTML = "";

  state.reserveSlots.forEach((player, idx) => {
    const card = document.createElement("div");
    card.className =
      "sub-card reserve-card" +
      (!player ? " empty" : "") +
      (state.pendingReserveIndex === idx ? " active" : "");

    if (!player) {
      card.innerHTML = `
        <div class="sub-meta">
          <strong>Reserve ${idx + 1}</strong>
          <span>Temporary holding slot</span>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="sub-top">
          <div class="pimg">
            <img src="${player.photo || photoUrlFor(player.id) || "img/player-placeholder.png"}" alt="${player.name}">
          </div>
          <div class="sub-meta">
            <strong>${player.name}</strong>
            <span>${player.pos} · ${player.role} · Rating ${player.rating}</span>
          </div>
        </div>
      `;
    }

    card.addEventListener("click", () => {
      if (state.swapSourceIndex !== null) {
        attemptStarterToReserveSwap(state.swapSourceIndex, idx);
        clearManagementSelections();
        renderAll();
        return;
      }

      if (state.pendingSubIndex !== null) {
        const subPlayer = state.subs[state.pendingSubIndex];
        const reservePlayer = state.reserveSlots[idx] || null;

        if (!subPlayer) return;

        state.reserveSlots[idx] = subPlayer;
        state.subs[state.pendingSubIndex] = reservePlayer;

        clearManagementSelections();
        renderAll();
        return;
      }

      if (!player) return;

      if (state.pendingReserveIndex === idx) {
        state.pendingReserveIndex = null;
        renderAll();
        return;
      }

      state.pendingReserveIndex = idx;
      state.pendingSubIndex = null;
      state.swapSourceIndex = null;
      state.selectedSlotIndex = -1;
      renderAll();
    });

    reservesArea.appendChild(card);
  });
}

function attemptSwap(fromIdx, toIdx) {
  const slots = FORMATIONS[state.formation];
  const fromPlayer = state.picks[fromIdx];
  const toPlayer = state.picks[toIdx];

  if (!fromPlayer || !toPlayer) {
    state.swapSourceIndex = null;
    return;
  }

  const fromSlot = slots[fromIdx];
  const toSlot = slots[toIdx];

  const fromCanPlayTo = canPlayPosition(fromPlayer.role, toSlot);
  const toCanPlayFrom = canPlayPosition(toPlayer.role, fromSlot);

  if (!fromCanPlayTo || !toCanPlayFrom) {
    alert("This player cannot play this position.");
    state.swapSourceIndex = null;
    state.selectedSlotIndex = -1;
    return;
  }

  [state.picks[fromIdx], state.picks[toIdx]] = [state.picks[toIdx], state.picks[fromIdx]];
  state.swapSourceIndex = null;
  state.selectedSlotIndex = -1;
}

function attemptSubSwap(subIdx, starterIdx) {
  const starterPlayer = state.picks[starterIdx];
  const subPlayer = state.subs[subIdx];
  const starterSlot = FORMATIONS[state.formation][starterIdx];

  if (!starterPlayer || !subPlayer) return;

  if (!canPlayPosition(subPlayer.role, starterSlot)) {
    alert("This player cannot play this position.");
    return;
  }

  state.subs[subIdx] = starterPlayer;
  state.picks[starterIdx] = subPlayer;
  state.selectedSlotIndex = -1;
}

function attemptStarterToReserveSwap(starterIdx, reserveIdx) {
  const starterPlayer = state.picks[starterIdx];
  if (!starterPlayer) return;

  const reservePlayer = state.reserveSlots[reserveIdx] || null;

  state.reserveSlots[reserveIdx] = starterPlayer;
  state.picks[starterIdx] = reservePlayer;

  state.swapSourceIndex = null;
  state.selectedSlotIndex = -1;
}

function attemptReserveToStarterSwap(reserveIdx, starterIdx) {
  const reservePlayer = state.reserveSlots[reserveIdx];
  if (!reservePlayer) return;

  const starterSlot = FORMATIONS[state.formation][starterIdx];
  if (!canPlayPosition(reservePlayer.role, starterSlot)) {
    alert("This player cannot play this position.");
    return;
  }

  const starterPlayer = state.picks[starterIdx] || null;

  state.picks[starterIdx] = reservePlayer;
  state.reserveSlots[reserveIdx] = starterPlayer;
  state.selectedSlotIndex = -1;
}

function getAllUsedUserIds() {
  return new Set([
    ...state.picks.filter(Boolean).map((p) => p.id),
    ...state.subs.filter(Boolean).map((p) => p.id),
    ...state.reserveSlots.filter(Boolean).map((p) => p.id),
  ]);
}

function countNaturalCandidatesForFormation(formation, globalUsedIds) {
  const needed = {};
  const slots = FORMATIONS[formation] || [];

  slots.forEach((slot) => {
    needed[slot] = (needed[slot] || 0) + 1;
  });

  let totalCoverage = 0;
  let fullyCovered = true;

  Object.entries(needed).forEach(([role, count]) => {
    const availableCount = PLAYER_POOL.filter((p) =>
      !globalUsedIds.has(p.id) &&
      p.rating >= 84 &&
      p.rating <= 95 &&
      isNaturalPosition(p.role, role)
    ).length;

    totalCoverage += Math.min(availableCount, count);

    if (availableCount < count) {
      fullyCovered = false;
    }
  });

  return {
    formation,
    fullyCovered,
    totalCoverage,
  };
}

function pickFormationForAITeam(globalUsedIds) {
  const preferredOrder = [
    "4-2-3-1",
    "4-4-2",
    "4-3-3 (Holding)",
    "4-3-3 (Attack)",
    "4-1-2-1-2 Wide",
    "4-1-2-1-2 (Diamond)",
    "4-3-3",
  ];

  const scored = preferredOrder
    .map((formation) => countNaturalCandidatesForFormation(formation, globalUsedIds))
    .sort((a, b) => {
      if (a.fullyCovered !== b.fullyCovered) {
        return a.fullyCovered ? -1 : 1;
      }
      if (a.totalCoverage !== b.totalCoverage) {
        return b.totalCoverage - a.totalCoverage;
      }
      return preferredOrder.indexOf(a.formation) - preferredOrder.indexOf(b.formation);
    });

  return scored[0]?.formation || "4-3-3";
}

function getCandidatesForSlot(slotRole, globalUsedIds, localUsedIds) {
  return PLAYER_POOL.filter((p) =>
    !globalUsedIds.has(p.id) &&
    !localUsedIds.has(p.id) &&
    isNaturalPosition(p.role, slotRole) &&
    p.rating >= 84 &&
    p.rating <= 95
  );
}

function pickClosestToTarget(candidates, targetRating) {
  if (!candidates.length) return null;

  const sorted = [...candidates].sort((a, b) => {
    const da = Math.abs(a.rating - targetRating);
    const db = Math.abs(b.rating - targetRating);
    if (da !== db) return da - db;
    return b.rating - a.rating;
  });

  const topSlice = sorted.slice(0, Math.min(6, sorted.length));
  return pickRandom(topSlice);
}

function buildBenchForAITeam(globalUsedIds, localUsedIds) {
  const available = shuffleArray(
    PLAYER_POOL.filter((p) =>
      !globalUsedIds.has(p.id) &&
      !localUsedIds.has(p.id) &&
      p.rating >= 84 &&
      p.rating <= 95
    )
  );

  const bench = [];

  const gk = available.find((p) => p.role === "GK");
  if (gk) {
    bench.push(gk);
    localUsedIds.add(gk.id);
  }

  const def = available.find((p) => !localUsedIds.has(p.id) && p.pos === "DEF");
  if (def) {
    bench.push(def);
    localUsedIds.add(def.id);
  }

  const mid = available.find((p) => !localUsedIds.has(p.id) && p.pos === "MID");
  if (mid) {
    bench.push(mid);
    localUsedIds.add(mid.id);
  }

  const att = available.find((p) => !localUsedIds.has(p.id) && p.pos === "ATT");
  if (att) {
    bench.push(att);
    localUsedIds.add(att.id);
  }

  return bench.slice(0, 4);
}

function generateAITeam(teamName, globalUsedIds) {
  let best = null;

  for (let attempt = 0; attempt < 60; attempt++) {
    const formation = pickFormationForAITeam(globalUsedIds);
    const slots = FORMATIONS[formation];
    const localUsedIds = new Set();
    const starters = [];
    const targetAvg = 87 + Math.random() * 5;
    let failed = false;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const remaining = slots.length - i;
      const currentTotal = starters.reduce((sum, p) => sum + p.rating, 0);
      const desiredPlayerRating = ((targetAvg * slots.length) - currentTotal) / remaining;

      const candidates = getCandidatesForSlot(slot, globalUsedIds, localUsedIds);
      const chosen = pickClosestToTarget(candidates, desiredPlayerRating);

      if (!chosen) {
        failed = true;
        break;
      }

      starters.push(chosen);
      localUsedIds.add(chosen.id);
    }

    if (failed || starters.length !== 11) continue;

    const subs = buildBenchForAITeam(globalUsedIds, localUsedIds);
    if (subs.length !== 4) continue;

    const avg = averageRating(starters);

    const squad = {
      name: teamName,
      formation,
      starters,
      subs,
      avgRating: Number(avg.toFixed(1)),
    };

    if (avg >= 87 && avg <= 92) {
      [...localUsedIds].forEach((id) => globalUsedIds.add(id));
      return squad;
    }

    if (!best || Math.abs(avg - 89.5) < Math.abs(best.avgRating - 89.5)) {
      best = squad;
    }
  }

  if (best) {
    const used = [
      ...best.starters.map((p) => p.id),
      ...best.subs.map((p) => p.id),
    ];
    used.forEach((id) => globalUsedIds.add(id));
    return best;
  }

  return {
    name: teamName,
    formation: "4-3-3",
    starters: [],
    subs: [],
    avgRating: 87.0,
  };
}

function generateLeagueData(force = false) {
  const AI_LOGIC_VERSION = "natural-positions-no-3atb-v1";

  const saved = !force
    ? JSON.parse(localStorage.getItem("managerHubLeague") || "null")
    : null;

  if (
    saved &&
    saved.version === AI_LOGIC_VERSION &&
    Array.isArray(saved.aiTeams) &&
    saved.aiTeams.length === 15
  ) {
    state.aiTeams = saved.aiTeams;
    return;
  }

  const globalUsedIds = getAllUsedUserIds();
  const aiTeams = [];

  AI_TEAM_NAMES.forEach((name) => {
    const squad = generateAITeam(name, globalUsedIds);
    aiTeams.push(squad);
  });

  state.aiTeams = aiTeams;

  localStorage.setItem(
    "managerHubLeague",
    JSON.stringify({
      version: AI_LOGIC_VERSION,
      aiTeams: state.aiTeams,
    })
  );
}

function getAITeamsByStrength() {
  return [...state.aiTeams].sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
}

function getBottom10ScoutableNames() {
  const sorted = getAITeamsByStrength();
  return new Set(sorted.slice(-10).map((team) => team.name));
}

function getTop5LockedNames() {
  const sorted = getAITeamsByStrength();
  return new Set(sorted.slice(0, 5).map((team) => team.name));
}

function closeScoutModal() {
  scoutModal?.classList.add("hidden");
}

function openScoutModalForTeam(teamName) {
  if (teamName === "Your Team") return;

  const team = state.aiTeams.find((t) => t.name === teamName);
  if (!team) return;

  const bottom10 = getBottom10ScoutableNames();
  const top5 = getTop5LockedNames();

  scoutModalTitle.textContent = team.name;
  scoutModalSub.textContent = `Formation: ${team.formation} · Expected lineup`;

  if (top5.has(team.name)) {
    scoutLockedMessage.classList.remove("hidden");
    scoutPitchWrap.classList.add("hidden");
    scoutModal.classList.remove("hidden");
    return;
  }

  if (bottom10.has(team.name)) {
    scoutLockedMessage.classList.add("hidden");
    scoutPitchWrap.classList.remove("hidden");
    renderScoutPitch(team);
    scoutModal.classList.remove("hidden");
  }
}

function renderScoutPitch(team) {
  if (!scoutPitchArea) return;

  scoutPitchArea.innerHTML = "";

  const slots = FORMATIONS[team.formation] || FORMATIONS["4-3-3"];
  const coords = FORMATION_COORDS[team.formation] || FORMATION_COORDS["4-3-3"];

  slots.forEach((label, idx) => {
    const player = team.starters[idx];
    const pos = coords[idx] || { x: 50, y: 50 };

    const tile = document.createElement("div");
    tile.className = "scout-slot";
    tile.style.left = `calc(${pos.x}% - 75px)`;
    tile.style.top = `calc(${pos.y}% - 42px)`;

    if (!player) {
      tile.innerHTML = `
        <div>
          <div class="pos">${label}</div>
          <div class="hint">Unknown</div>
        </div>
      `;
    } else {
      tile.innerHTML = `
        <div class="slot-photo">
          <img src="${player.photo || photoUrlFor(player.id) || "img/player-placeholder.png"}" alt="${player.name}">
        </div>
        <div class="picked">
          <strong>${player.name}</strong>
          <span>${player.role}</span>
        </div>
      `;
    }

    scoutPitchArea.appendChild(tile);
  });
}

function renderLeagueTable() {
  const userTeam = {
    name: "Your Team",
    avgRating: Number(averageRating(state.picks).toFixed(1)) || 0,
  };

  const teams = [userTeam, ...state.aiTeams]
    .map((team) => ({
      name: team.name,
      avgRating: team.avgRating || 0,
      P: 0,
      W: 0,
      D: 0,
      L: 0,
      GF: 0,
      GA: 0,
      GD: 0,
      PTS: 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  leagueTableBody.innerHTML = "";

  teams.forEach((team, idx) => {
    const tr = document.createElement("tr");
    if (team.name === "Your Team") tr.classList.add("your-team");

    const teamCell =
      team.name === "Your Team"
        ? `<td class="team-col">${team.name}</td>`
        : `<td class="team-col"><button class="scout-team-btn" type="button" data-team-name="${team.name}">${team.name}</button></td>`;

    tr.innerHTML = `
      <td>${idx + 1}</td>
      ${teamCell}
      <td>${team.P}</td>
      <td>${team.W}</td>
      <td>${team.D}</td>
      <td>${team.L}</td>
      <td>${team.GF}</td>
      <td>${team.GA}</td>
      <td>${team.GD}</td>
      <td>${team.PTS}</td>
    `;

    leagueTableBody.appendChild(tr);
  });

  leagueTableBody.querySelectorAll("[data-team-name]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openScoutModalForTeam(btn.dataset.teamName);
    });
  });
}

function decimalToFractionalOdds(score, index) {
  if (index === 0) return "3/1";
  if (index === 1) return "4/1";
  if (index === 2) return "5/1";
  if (index === 3) return "6/1";
  if (score >= 90) return "8/1";
  if (score >= 89) return "10/1";
  if (score >= 88) return "12/1";
  return "16/1";
}

function renderBookiesOdds() {
  const userTeam = {
    name: "Your Team",
    avgRating: Number(averageRating(state.picks).toFixed(1)) || 0,
  };

  const champions = [userTeam, ...state.aiTeams]
    .filter((team) => Number.isFinite(team.avgRating))
    .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
    .slice(0, 5);

  bookiesList.innerHTML = "";

  champions.forEach((team, idx) => {
    const row = document.createElement("div");
    row.className = "odds-row";
    row.innerHTML = `
      <div class="odds-row-left">
        <span class="badge-dot"></span>
        <div class="odds-name">${team.name}</div>
      </div>
      <div class="odds-price">${decimalToFractionalOdds(team.avgRating || 0, idx)}</div>
    `;
    bookiesList.appendChild(row);
  });
}

function renderPlayerStats() {
  playerStatsRow.innerHTML = "";

  const featured = [...state.picks.filter(Boolean)].slice(0, 4);

  featured.forEach((player) => {
    const card = document.createElement("div");
    card.className = "player-stat-card";
    card.innerHTML = `
      <div class="pimg">
        <img src="${player.photo || photoUrlFor(player.id) || "img/player-placeholder.png"}" alt="${player.name}">
      </div>
      <div class="player-stat-meta">
        <strong>${player.name}</strong>
        <span>${player.role} · Rating ${player.rating}</span>
      </div>
    `;
    playerStatsRow.appendChild(card);
  });
}

async function boot() {
  if (!cfg) {
    window.location.href = "manager.html";
    return;
  }

  loadHubSquad();
  await loadPlayersFromSupabase();
  generateLeagueData(true);
  renderAll();
}

boot();
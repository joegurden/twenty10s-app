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
  season: null,
fixtureModalMatchday: 1,
seasonStatsIndex: 0,
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
const btnStartSeason = el("btnStartSeason");
const btnFixtureList = el("btnFixtureList");
const fixtureModal = el("fixtureModal");
const btnCloseFixtureModal = el("btnCloseFixtureModal");
const fixtureListBody = el("fixtureListBody");
const btnPrevFixtureWeek = el("btnPrevFixtureWeek");
const btnNextFixtureWeek = el("btnNextFixtureWeek");
const fixtureModalWeekLabel = el("fixtureModalWeekLabel");
const btnSeasonStats = el("btnSeasonStats");
const seasonStatsModal = el("seasonStatsModal");
const btnCloseSeasonStatsModal = el("btnCloseSeasonStatsModal");
const btnPrevSeasonStats = el("btnPrevSeasonStats");
const btnNextSeasonStats = el("btnNextSeasonStats");
const seasonStatsCategoryLabel = el("seasonStatsCategoryLabel");
const seasonStatsBody = el("seasonStatsBody");

btnStartSeason?.addEventListener("click", () => {
  handleSeasonButton();
});

btnFixtureList?.addEventListener("click", () => {
  loadSeasonState();

  if (!state.season || !state.season.fixtures?.length) return;

  const nextFixture = getNextUserFixture(state.season);
  state.fixtureModalMatchday = nextFixture?.matchday || state.season.currentMatchday || 1;

  renderFixtureListModal();
  fixtureModal?.classList.remove("hidden");
});

btnSeasonStats?.addEventListener("click", () => {
  loadSeasonState();
  if (!state.season) return;

  renderSeasonStatsModal();
  seasonStatsModal?.classList.remove("hidden");
});

btnCloseSeasonStatsModal?.addEventListener("click", () => {
  seasonStatsModal?.classList.add("hidden");
});

seasonStatsModal?.addEventListener("click", (e) => {
  if (e.target === seasonStatsModal) {
    seasonStatsModal.classList.add("hidden");
  }
});

btnPrevSeasonStats?.addEventListener("click", () => {
  state.seasonStatsIndex = (state.seasonStatsIndex + 2) % 3;
  renderSeasonStatsModal();
});

btnNextSeasonStats?.addEventListener("click", () => {
  state.seasonStatsIndex = (state.seasonStatsIndex + 1) % 3;
  renderSeasonStatsModal();
});

btnCloseFixtureModal?.addEventListener("click", () => {
  fixtureModal?.classList.add("hidden");
});

fixtureModal?.addEventListener("click", (e) => {
  if (e.target === fixtureModal) {
    fixtureModal.classList.add("hidden");
  }
});

btnPrevFixtureWeek?.addEventListener("click", () => {
  if (!state.season?.fixtures?.length) return;

  state.fixtureModalMatchday = Math.max(1, state.fixtureModalMatchday - 1);
  renderFixtureListModal();
});

btnNextFixtureWeek?.addEventListener("click", () => {
  if (!state.season?.fixtures?.length) return;

  const maxMatchday = state.season.fixtures.length;
  state.fixtureModalMatchday = Math.min(maxMatchday, state.fixtureModalMatchday + 1);
  renderFixtureListModal();
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

function loadSeasonState() {
  state.season = JSON.parse(localStorage.getItem("managerSeason") || "null");
}

function getTeamNameForPlayerId(playerId) {
  if (!state.season?.teams?.length) return "Unknown Team";

  const targetId = String(playerId);

  for (const team of state.season.teams) {
    const inStarters = (team.starters || []).some((p) => String(p.id) === targetId);
    const inSubs = (team.subs || []).some((p) => String(p.id) === targetId);
    const inReserves = (team.reserves || []).some((p) => String(p.id) === targetId);

    if (inStarters || inSubs || inReserves) {
      return team.name;
    }
  }

  return "Unknown Team";
}

function getPlayerById(playerId) {
  if (!state.season?.teams?.length) return null;

  const targetId = String(playerId);

  for (const team of state.season.teams) {
    const found = [...(team.starters || []), ...(team.subs || []), ...(team.reserves || [])]
      .find((p) => String(p.id) === targetId);

    if (found) return found;
  }

  return null;
}

function saveSeasonState() {
  localStorage.setItem("managerSeason", JSON.stringify(state.season));
}

function getUserTeamData() {
  return {
    name: "Your Team",
    formation: state.formation,
    starters: state.picks.filter(Boolean),
    subs: state.subs.filter(Boolean),
    reserves: state.reserveSlots.filter(Boolean),
    avgRating: Number(averageRating(state.picks).toFixed(1)) || 0,
    isUser: true,
  };
}

function buildLeagueTeams() {
  const userTeam = getUserTeamData();
  const shuffledAI = shuffleArray([...state.aiTeams]).map((team) => ({
    ...team,
    isUser: false,
  }));

  return [userTeam, ...shuffledAI];
}

function renderAll() {
  loadSeasonState();

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
  updateSeasonButtons();
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

  return { formation, fullyCovered, totalCoverage };
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
      if (a.fullyCovered !== b.fullyCovered) return a.fullyCovered ? -1 : 1;
      if (a.totalCoverage !== b.totalCoverage) return b.totalCoverage - a.totalCoverage;
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
      isUser: false,
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
    [...best.starters, ...best.subs].forEach((p) => globalUsedIds.add(p.id));
    return best;
  }

  return {
    name: teamName,
    formation: "4-3-3",
    starters: [],
    subs: [],
    avgRating: 87.0,
    isUser: false,
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

function buildRoundRobinMatchdays(teamNames) {
  const teams = [...teamNames];
  const hasBye = teams.length % 2 !== 0;

  if (hasBye) teams.push("__BYE__");

  const rounds = [];
  const rotation = [...teams];
  const totalRounds = rotation.length - 1;
  const half = rotation.length / 2;

  for (let round = 0; round < totalRounds; round++) {
    const fixtures = [];

    for (let i = 0; i < half; i++) {
      const home = rotation[i];
      const away = rotation[rotation.length - 1 - i];

      if (home !== "__BYE__" && away !== "__BYE__") {
        fixtures.push(
          round % 2 === 0
            ? { homeTeam: home, awayTeam: away }
            : { homeTeam: away, awayTeam: home }
        );
      }
    }

    rounds.push(fixtures);

    const fixed = rotation[0];
    const moved = rotation.pop();
    rotation.splice(1, 0, moved);
    rotation[0] = fixed;
  }

  return rounds;
}

function createSeasonFixtures(teams) {
  const names = teams.map((team) => team.name);
  const firstHalf = buildRoundRobinMatchdays(names);
  const secondHalf = firstHalf.map((matchday) =>
    matchday.map((fixture) => ({
      homeTeam: fixture.awayTeam,
      awayTeam: fixture.homeTeam,
    }))
  );

  const allMatchdays = [...firstHalf, ...secondHalf];

  return allMatchdays.map((matchday, idx) => ({
    matchday: idx + 1,
    fixtures: matchday.map((fixture, fixtureIdx) => ({
      id: `md${idx + 1}-fx${fixtureIdx + 1}`,
      matchday: idx + 1,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      played: false,
      score: null,
      events: [],
    })),
  }));
}

function createSeasonState() {
  const teams = buildLeagueTeams();
  const fixtures = createSeasonFixtures(teams);

  const tableStats = {};
  teams.forEach((team) => {
    tableStats[team.name] = {
      P: 0,
      W: 0,
      D: 0,
      L: 0,
      GF: 0,
      GA: 0,
      GD: 0,
      PTS: 0,
    };
  });

  return {
    started: true,
    currentMatchday: 1,
    userTeamName: "Your Team",
    teams,
    fixtures,
    tableStats,
    playerStats: {},
  };
}
function getNextUserFixture(season) {
  for (const matchday of season.fixtures) {
    for (const fixture of matchday.fixtures) {
      if (
        !fixture.played &&
        (fixture.homeTeam === season.userTeamName || fixture.awayTeam === season.userTeamName)
      ) {
        return fixture;
      }
    }
  }

  return null;
}

function handleSeasonButton() {
  loadSeasonState();

  if (!state.season || !state.season.started) {
    state.season = createSeasonState();
    saveSeasonState();
  }

  const nextFixture = getNextUserFixture(state.season);

  if (!nextFixture) {
    alert("Season complete.");
    return;
  }

  window.location.href = "manager-game.html";
}

function updateSeasonButtons() {
  loadSeasonState();

  const seasonStarted = !!(state.season && state.season.started);

  if (btnStartSeason) {
    btnStartSeason.textContent = seasonStarted ? "Next Match" : "Start Season";
  }

  if (btnFixtureList) {
    btnFixtureList.style.display = seasonStarted ? "" : "none";
  }

  if (btnSeasonStats) {
    btnSeasonStats.style.display = seasonStarted ? "" : "none";
  }
}

function renderFixtureListModal() {
  loadSeasonState();

  if (!state.season || !fixtureListBody) return;

  const allMatchdays = state.season.fixtures || [];
  const maxMatchday = allMatchdays.length || 1;

  if (!state.fixtureModalMatchday || state.fixtureModalMatchday < 1) {
    state.fixtureModalMatchday = 1;
  }

  if (state.fixtureModalMatchday > maxMatchday) {
    state.fixtureModalMatchday = maxMatchday;
  }

  const selectedMatchday = allMatchdays.find(
    (md) => md.matchday === state.fixtureModalMatchday
  );

  fixtureListBody.innerHTML = "";
  fixtureModalWeekLabel.textContent = `Matchday ${state.fixtureModalMatchday}`;

  if (btnPrevFixtureWeek) {
    btnPrevFixtureWeek.disabled = state.fixtureModalMatchday <= 1;
  }

  if (btnNextFixtureWeek) {
    btnNextFixtureWeek.disabled = state.fixtureModalMatchday >= maxMatchday;
  }

  if (!selectedMatchday) return;

  const day = document.createElement("div");
  day.className = "fixture-day";
  day.innerHTML = `<h4>Matchday ${selectedMatchday.matchday}</h4>`;

  selectedMatchday.fixtures.forEach((fixture) => {
    const isUserFixture =
      fixture.homeTeam === state.season.userTeamName ||
      fixture.awayTeam === state.season.userTeamName;

    const row = document.createElement("div");
    row.className =
      "fixture-row" +
      (fixture.played ? " played" : "") +
      (isUserFixture ? " user-fixture" : "");

    const middleText = fixture.played && fixture.score
      ? `${fixture.score.home} - ${fixture.score.away}`
      : "vs";

    row.innerHTML = `
      <div class="fixture-home">${fixture.homeTeam}</div>
      <div class="fixture-vs">${middleText}</div>
      <div class="fixture-away">${fixture.awayTeam}</div>
    `;

    day.appendChild(row);
  });

  fixtureListBody.appendChild(day);
}

function renderSeasonStatsModal() {
  loadSeasonState();

  if (!state.season || !seasonStatsBody) return;

  const categories = [
    { key: "goals", label: "Top Scorers" },
    { key: "assists", label: "Top Assists" },
    { key: "cleanSheets", label: "Clean Sheets" },
  ];

  const current = categories[state.seasonStatsIndex] || categories[0];
  seasonStatsCategoryLabel.textContent = current.label;
  seasonStatsBody.innerHTML = "";

  const rows = Object.entries(state.season.playerStats || {})
    .map(([playerId, stats]) => {
      const player = getPlayerById(playerId);
      return {
        playerId,
        player,
        teamName: getTeamNameForPlayerId(playerId),
        value: Number(stats[current.key] || 0),
      };
    })
    .filter((row) => row.player && row.value > 0)
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return a.player.name.localeCompare(b.player.name);
    })
    .slice(0, 15);

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "fixture-day";
    empty.innerHTML = `<h4>No stats yet</h4>`;
    seasonStatsBody.appendChild(empty);
    return;
  }

  const card = document.createElement("div");
  card.className = "fixture-day";

  rows.forEach((row, idx) => {
    const statRow = document.createElement("div");
    statRow.className = "season-stat-row";
    statRow.innerHTML = `
      <div class="season-stat-rank">${idx + 1}</div>
      <div class="season-stat-main">
        <div class="pimg">
          <img src="${row.player.photo || photoUrlFor(row.player.id) || "img/player-placeholder.png"}" alt="${row.player.name}">
        </div>
        <div class="season-stat-meta">
          <strong>${row.player.name}</strong>
          <span>${row.teamName}</span>
        </div>
      </div>
      <div class="season-stat-value">${row.value}</div>
    `;
    card.appendChild(statRow);
  });

  seasonStatsBody.appendChild(card);
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
  loadSeasonState();

  const fallbackTeams = [getUserTeamData(), ...state.aiTeams].map((team) => ({
    name: team.name,
    P: 0,
    W: 0,
    D: 0,
    L: 0,
    GF: 0,
    GA: 0,
    GD: 0,
    PTS: 0,
  }));

  const teams = state.season?.tableStats
    ? Object.entries(state.season.tableStats).map(([name, stats]) => ({
        name,
        ...stats,
      }))
    : fallbackTeams;

  teams.sort((a, b) => {
    if (b.PTS !== a.PTS) return b.PTS - a.PTS;
    if (b.GD !== a.GD) return b.GD - a.GD;
    if (b.GF !== a.GF) return b.GF - a.GF;
    return a.name.localeCompare(b.name);
  });

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
  const userTeam = getUserTeamData();

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
  loadSeasonState();
  playerStatsRow.innerHTML = "";

  const seasonPlayerStats = state.season?.playerStats || {};
  const featured = [...state.picks.filter(Boolean)].slice(0, 4);

  featured.forEach((player) => {
    const stats = seasonPlayerStats[player.id] || {
      appearances: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
    };

    const card = document.createElement("div");
    card.className = "player-stat-card";
    card.innerHTML = `
      <div class="pimg">
        <img src="${player.photo || photoUrlFor(player.id) || "img/player-placeholder.png"}" alt="${player.name}">
      </div>
      <div class="player-stat-meta">
        <strong>${player.name}</strong>
        <span>${player.role} · G ${stats.goals} · A ${stats.assists} · CS ${stats.cleanSheets}</span>
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
  loadSeasonState();

  // ✅ ONLY generate AI teams if no season exists yet
  if (!state.season || !state.season.started) {
    generateLeagueData(true);
  } else {
    // ✅ use saved teams from season
    state.aiTeams = state.season.teams.filter(t => !t.isUser);
  }

  renderAll();
}

boot();

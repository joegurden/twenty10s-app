function el(id) {
  return document.getElementById(id);
}

function photoUrlFor(playerId) {
  return `https://mzjmdxuflcosovmriaja.supabase.co/storage/v1/object/public/player-photos/headshots/${playerId}.webp`;
}

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

const state = {
  season: null,
  fixture: null,
  homeTeam: null,
  awayTeam: null,
};

const mgMatchday = el("mgMatchday");
const mgStatus = el("mgStatus");
const mgHomeName = el("mgHomeName");
const mgAwayName = el("mgAwayName");
const mgHomeScore = el("mgHomeScore");
const mgAwayScore = el("mgAwayScore");
const mgHomeLineupTitle = el("mgHomeLineupTitle");
const mgAwayLineupTitle = el("mgAwayLineupTitle");
const mgHomeFormation = el("mgHomeFormation");
const mgAwayFormation = el("mgAwayFormation");
const mgHomePitch = el("mgHomePitch");
const mgAwayPitch = el("mgAwayPitch");
const mgHomeSubs = el("mgHomeSubs");
const mgAwaySubs = el("mgAwaySubs");

el("btnBackToHub")?.addEventListener("click", () => {
  window.location.href = "manager-hub.html";
});

el("btnPlayMatch")?.addEventListener("click", () => {
  alert("Match simulation comes next — this screen is now wired for fixtures and lineups.");
});

function loadSeason() {
  state.season = JSON.parse(localStorage.getItem("managerSeason") || "null");

  if (!state.season || !state.season.started) {
    window.location.href = "manager-hub.html";
    return;
  }
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

function getTeamByName(name) {
  return state.season.teams.find((team) => team.name === name) || null;
}

function renderSubs(subsArea, subs) {
  subsArea.innerHTML = "";

  (subs || []).forEach((sub, idx) => {
    const card = document.createElement("div");
    card.className = "sub-card";

    card.innerHTML = `
      <div class="sub-top">
        <div class="pimg">
          <img src="${sub.photo || photoUrlFor(sub.id) || "img/player-placeholder.png"}" alt="${sub.name}">
        </div>
        <div class="sub-meta">
          <strong>${sub.name}</strong>
          <span>${sub.role} · Rating ${sub.rating}</span>
        </div>
      </div>
    `;

    subsArea.appendChild(card);
  });

  while (subsArea.children.length < 4) {
    const empty = document.createElement("div");
    empty.className = "sub-card empty";
    empty.innerHTML = `
      <div class="sub-meta">
        <strong>Bench ${subsArea.children.length + 1}</strong>
        <span>Empty slot</span>
      </div>
    `;
    subsArea.appendChild(empty);
  }
}

function renderTeamPitch(pitchEl, team) {
  pitchEl.innerHTML = "";

  const formation = team.formation || "4-3-3";
  const slots = FORMATIONS[formation] || FORMATIONS["4-3-3"];
  const coords = FORMATION_COORDS[formation] || FORMATION_COORDS["4-3-3"];

  slots.forEach((label, idx) => {
    const player = (team.starters || [])[idx];
    const pos = coords[idx] || { x: 50, y: 50 };

    const tile = document.createElement("div");
    tile.className = "slot";
    tile.style.left = `calc(${pos.x}% - 75px)`;
    tile.style.top = `calc(${pos.y}% - 42px)`;

    if (!player) {
      tile.innerHTML = `
        <div>
          <div class="pos">${label}</div>
          <div class="hint">Unavailable</div>
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

    pitchEl.appendChild(tile);
  });
}

function renderMatch() {
  const fixture = getNextUserFixture(state.season);

  if (!fixture) {
    mgMatchday.textContent = "Season Complete";
    mgStatus.textContent = "No remaining fixtures";
    mgHomeName.textContent = "—";
    mgAwayName.textContent = "—";
    return;
  }

  state.fixture = fixture;
  state.homeTeam = getTeamByName(fixture.homeTeam);
  state.awayTeam = getTeamByName(fixture.awayTeam);

  mgMatchday.textContent = `Matchday ${fixture.matchday}`;
  mgStatus.textContent = "Pre-Match";
  mgHomeName.textContent = fixture.homeTeam;
  mgAwayName.textContent = fixture.awayTeam;
  mgHomeScore.textContent = "0";
  mgAwayScore.textContent = "0";

  mgHomeLineupTitle.textContent = `${fixture.homeTeam} Lineup`;
  mgAwayLineupTitle.textContent = `${fixture.awayTeam} Lineup`;
  mgHomeFormation.textContent = state.homeTeam?.formation || "4-3-3";
  mgAwayFormation.textContent = state.awayTeam?.formation || "4-3-3";

  renderTeamPitch(mgHomePitch, state.homeTeam || { formation: "4-3-3", starters: [] });
  renderTeamPitch(mgAwayPitch, state.awayTeam || { formation: "4-3-3", starters: [] });

  renderSubs(mgHomeSubs, state.homeTeam?.subs || []);
  renderSubs(mgAwaySubs, state.awayTeam?.subs || []);
}

function boot() {
  loadSeason();
  renderMatch();
}

boot();
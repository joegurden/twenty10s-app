import { FORMATIONS, FORMATION_COORDS } from "./shared/formations.js";

import { supabase } from "./supabaseClient.js";

function photoUrlFor(playerId) {
  const { data } = supabase.storage
    .from("player-photos")
    .getPublicUrl(`headshots/${playerId}.webp`);

  return data?.publicUrl || "img/player-placeholder.png";
}

function badgeUrlFor(abbreviation) {
  if (!abbreviation) return "";

  const { data } = supabase.storage
    .from("badges")
    .getPublicUrl(`${abbreviation}.png`);

  return data?.publicUrl || "";
}

let currentChallenge = null;
let selectedSlot = null;
let correctAnswers = {};
let filledSlots = {};

async function loadChallenge() {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("fixturebuilder")
    .select("*")
    .eq("challenge_date", today)
    .single();

  console.log("Fixturebuilder data:", data);
  console.log("Fixturebuilder error:", error);

  if (error) {
    console.error(error);
    return;
  }

  showDifficultyScreen(transformFixtureRow(data));
}

function transformFixtureRow(row) {
  return {
    fixture: {
  home_team: row.home_team,
  away_team: row.away_team,
  home_badge: row.home_badge,
  away_badge: row.away_badge,
  score_home: row.home_score,
  score_away: row.away_score,
},
date: row.Date,
competition: row.Competition,
matchday: row.Matchday,
    home_formation: row.home_formation,
    away_formation: row.away_formation,

    lineup: {
      home: [
        row.id_home_pos_1,
        row.id_home_pos_2,
        row.id_home_pos_3,
        row.id_home_pos_4,
        row.id_home_pos_5,
        row.id_home_pos_6,
        row.id_home_pos_7,
        row.id_home_pos_8,
        row.id_home_pos_9,
        row.id_home_pos_10,
        row.id_home_pos_11,
      ],
      away: [
        row.id_away_pos_1,
        row.id_away_pos_2,
        row.id_away_pos_3,
        row.id_away_pos_4,
        row.id_away_pos_5,
        row.id_away_pos_6,
        row.id_away_pos_7,
        row.id_away_pos_8,
        row.id_away_pos_9,
        row.id_away_pos_10,
        row.id_away_pos_11,
      ],
    },

    scorers: {
      home: row.home_scorers || [],
      away: row.away_scorers || [],
    },
  };
}

function showDifficultyScreen(data) {
  document.getElementById("preGameFixtureTitle").textContent =
    `${data.fixture.home_team} vs ${data.fixture.away_team}`;

  document.getElementById("preGameFixtureMeta").textContent =
    `${data.competition || ""} · ${data.matchday || ""} · ${data.date || ""}`;

  document.querySelectorAll(".fr-card").forEach(card => {
    card.addEventListener("click", () => {
      const difficulty = card.dataset.difficulty;

      localStorage.setItem("fixtureDifficulty", difficulty);

      document.getElementById("fixtureDifficultyScreen").classList.add("hidden");
      document.getElementById("fixtureGameScreen").classList.remove("hidden");

      renderChallenge(data);
    });
  });
}

function renderChallenge(data) {

currentChallenge = data;

// Store correct answers
data.lineup.home.forEach((playerId, index) => {
  correctAnswers[`home-${index}`] = playerId;
});

data.lineup.away.forEach((playerId, index) => {
  correctAnswers[`away-${index}`] = playerId;
});  

// Title
  document.getElementById("fixtureTitle").textContent =
    `${data.fixture.home_team} vs ${data.fixture.away_team}`;

  // Score
  document.querySelector(".mg-scoreboard").innerHTML = `
  <div class="score-team">
    <img src="${badgeUrlFor(data.fixture.home_badge)}" alt="${data.fixture.home_team}">
    <span id="homeScore">${data.fixture.score_home}</span>
  </div>

  <span class="score-dash">-</span>

  <div class="score-team">
    <span id="awayScore">${data.fixture.score_away}</span>
    <img src="${badgeUrlFor(data.fixture.away_badge)}" alt="${data.fixture.away_team}">
  </div>
`;

  // Team names
  document.getElementById("homeTeam").textContent =
    data.fixture.home_team;

  document.getElementById("awayTeam").textContent =
    data.fixture.away_team;

  // Lineups
renderPitch("homePitch", data.lineup.home, data.home_formation || "4-3-3", "home");
renderPitch("awayPitch", data.lineup.away, data.away_formation || "4-3-3", "away");
}

function renderPitch(containerId, playerIds, formation, side) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const slots = FORMATIONS[formation] || FORMATIONS["4-3-3"];
  const coords = FORMATION_COORDS[formation] || FORMATION_COORDS["4-3-3"];

  playerIds.forEach((id, index) => {
    const div = document.createElement("div");
    const slotKey = `${side}-${index}`;
    const pos = coords[index] || { x: 50, y: 50 };

    div.className = "slot";
    div.dataset.slot = slotKey;
    div.style.left = `calc(${pos.x}% - 55px)`;
div.style.top = `calc(${pos.y}% - 34px)`;

    if (filledSlots[slotKey]) {
      div.innerHTML = `
        <div class="picked">
          <strong>${filledSlots[slotKey].name}</strong>
          <span>${slots[index]}</span>
        </div>
      `;
      div.classList.add("correct");
    } else {
      div.innerHTML = `
        <div>
          <div class="pos">${slots[index]}</div>
          <div class="hint">Position ${index + 1}</div>
        </div>
      `;
    }

   div.addEventListener("click", () => {
  if (filledSlots[slotKey] || div.classList.contains("correct")) {
    return;
  }

  selectedSlot = slotKey;

  document.querySelectorAll(".slot").forEach(el => {
    el.classList.remove("active");
  });

  div.classList.add("active");

  showSlotInput(div, slotKey);
});

    container.appendChild(div);
  });
}

function showSlotInput(slotDiv, slotKey) {
  document.querySelectorAll(".slot-search").forEach(el => el.remove());

  const originalContent = slotDiv.innerHTML;

  slotDiv.innerHTML = `
    <div class="slot-search">
      <input class="slot-player-input" placeholder="Search player..." />
      <div class="slot-suggestions"></div>
    </div>
  `;

  const input = slotDiv.querySelector(".slot-player-input");
  const suggestionsBox = slotDiv.querySelector(".slot-suggestions");

  input.focus();

  input.addEventListener("input", (e) => {
    handleSearch(e, suggestionsBox, slotKey);
  });

  input.addEventListener("blur", () => {
  setTimeout(() => {
    if (!filledSlots[slotKey] && !slotDiv.classList.contains("correct")) {
      slotDiv.innerHTML = originalContent;
    }
  }, 300);
});
}

async function handleGuess() {
  if (!selectedSlot) {
    alert("Select a position first");
    return;
  }

  const input = document.getElementById("playerInput").value;

  const player = await findPlayerByName(input);

  if (!player) {
    alert("Player not found");
    return;
  }

  checkAnswer(selectedSlot, player);
}

async function handleSearch(e, suggestionsBox, slotKey) {
  const query = e.target.value.trim();

  if (query.length < 2) {
    suggestionsBox.innerHTML = "";
    return;
  }

  const { data, error } = await supabase
    .from("players")
    .select('"ID","Name","Club"')
    .ilike('"Name"', `%${query}%`)
    .limit(6);

  if (error) {
    console.error(error);
    suggestionsBox.innerHTML = "";
    return;
  }

  renderSuggestions((data || []).map(p => ({
  id: p.ID,
  name: p.Name,
  photo: photoUrlFor(p.ID)
})), suggestionsBox, slotKey);
}

function renderSuggestions(players, container, slotKey) {
  container.innerHTML = "";

  players.forEach(player => {
    const div = document.createElement("div");
    div.className = "suggestion-item";

    div.innerHTML = `
  <div class="suggestion-photo">
    <img src="${player.photo || 'img/player-placeholder.png'}" alt="${player.name}">
  </div>
  <div class="suggestion-info">
    <strong>${player.name}</strong>
  </div>
`;

    div.addEventListener("click", () => {
      selectSuggestion(player, slotKey);
    });

    container.appendChild(div);
  });
}

function selectSuggestion(player, slotKey) {
  checkAnswer(slotKey, player);
}

async function findPlayerByName(name) {
  const { data } = await supabase
    .from("players")
.select('"ID","Name"')
.ilike('"Name"', `%${name}%`)
.limit(1);

  return data?.[0] ? {
  id: data[0].ID,
  name: data[0].Name,
  photo: photoUrlFor(data[0].ID)
} : null;
}

function getSlotLabel(slot) {
  const [side, indexText] = slot.split("-");
  const index = Number(indexText);

  const formation =
    side === "home"
      ? currentChallenge.home_formation
      : currentChallenge.away_formation;

  const slots = FORMATIONS[formation] || FORMATIONS["4-3-3"];

  return slots[index] || "";
}

function showWrongGuessMessage(message) {
  let box = document.getElementById("guessMessage");

  if (!box) {
    box = document.createElement("div");
    box.id = "guessMessage";
    box.className = "guess-message";
    document.body.appendChild(box);
  }

  box.textContent = message;
  box.classList.add("show");

  setTimeout(() => {
    box.classList.remove("show");
  }, 1400);
}

function checkAnswer(slot, player) {
  const correctPlayerId = correctAnswers[slot];
  const slotDiv = document.querySelector(`[data-slot="${slot}"]`);

  if (player.id === correctPlayerId) {
  filledSlots[slot] = player;

  slotDiv.classList.remove("active", "wrong");
  slotDiv.classList.add("correct");

    slotDiv.innerHTML = `
      <div class="slot-photo">
        <img src="${player.photo || 'img/player-placeholder.png'}"
             alt="${player.name}">
      </div>

      <div class="picked">
        <strong>${player.name}</strong>
        <span>${getSlotLabel(slot)}</span>
      </div>
    `;

    return;
  }

  slotDiv.classList.add("wrong");
  showWrongGuessMessage("Wrong player — try again");

  setTimeout(() => {
    slotDiv.classList.remove("wrong");
  }, 800);
}

loadChallenge();
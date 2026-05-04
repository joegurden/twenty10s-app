import { FORMATIONS, FORMATION_COORDS } from "./shared/formations.js";

import { supabase } from "./supabaseClient.js";

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

  renderChallenge(transformFixtureRow(data));
}

function transformFixtureRow(row) {
  return {
    fixture: {
      home_team: row.home_team,
      away_team: row.away_team,
      score_home: row.home_score,
      score_away: row.away_score,
    },

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
  document.getElementById("homeScore").textContent =
    data.fixture.score_home;

  document.getElementById("awayScore").textContent =
    data.fixture.score_away;

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
    div.style.left = `calc(${pos.x}% - 75px)`;
    div.style.top = `calc(${pos.y}% - 42px)`;

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
      selectedSlot = slotKey;

      document.querySelectorAll(".slot").forEach(el => {
        el.classList.remove("active");
      });

      div.classList.add("active");
    });

    container.appendChild(div);
  });
}

document.getElementById("submitGuess").addEventListener("click", handleGuess);
document.getElementById("playerInput").addEventListener("input", handleSearch);
document.getElementById("playerInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleGuess();
  }
});

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

async function handleSearch(e) {
  const query = e.target.value.trim();

  if (query.length < 2) {
    document.getElementById("suggestions").innerHTML = "";
    return;
  }

  const validIds = Object.values(correctAnswers);

  if (!validIds.length) {
    console.warn("No correct answers loaded yet");
    return;
  }

  const { data, error } = await supabase
    .from("players")
    .select("id, name")
    .in("id", validIds)
    .ilike("name", `%${query}%`)
    .limit(5);

  if (error) {
    console.error("Player search error:", error);
    renderSuggestions([]);
    return;
  }

  renderSuggestions(data || []);
}

function renderSuggestions(players = []) {
  const container = document.getElementById("suggestions");
  container.innerHTML = "";

  players.forEach(player => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    div.textContent = player.name;

    div.addEventListener("click", () => {
      selectSuggestion(player);
    });

    container.appendChild(div);
  });
}

function selectSuggestion(player) {
  document.getElementById("playerInput").value = player.name;

  document.getElementById("suggestions").innerHTML = "";

  checkAnswer(selectedSlot, player);
}

async function findPlayerByName(name) {
  const { data } = await supabase
    .from("players")
    .select("*")
    .ilike("name", `%${name}%`)
    .limit(1);

  return data?.[0];
}

function checkAnswer(slot, player) {
  const correctPlayerId = correctAnswers[slot];

  const slotDiv = document.querySelector(`[data-slot="${slot}"]`);

  if (player.id === correctPlayerId) {
slotDiv.innerHTML = `
  <div class="picked">
    <strong>${player.name}</strong>
  </div>
`;
slotDiv.classList.add("correct");

    filledSlots[slot] = player;
  } else {
    slotDiv.classList.add("wrong");

    setTimeout(() => {
      slotDiv.classList.remove("wrong");
    }, 800);
  }
}

loadChallenge();
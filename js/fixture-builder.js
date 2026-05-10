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
let currentDifficulty = null;
let lives = 3;
let gameStage = "players";

let guessedScore = false;
let guessedScorers = false;
let guessedShirtNumbers = false;
let guessedGoals = [];

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

shirtNumbers: {
  home: [
    row.shirtno_home_1, row.shirtno_home_2, row.shirtno_home_3,
    row.shirtno_home_4, row.shirtno_home_5, row.shirtno_home_6,
    row.shirtno_home_7, row.shirtno_home_8, row.shirtno_home_9,
    row.shirtno_home_10, row.shirtno_home_11,
  ],
  away: [
    row.shirtno_away_1, row.shirtno_away_2, row.shirtno_away_3,
    row.shirtno_away_4, row.shirtno_away_5, row.shirtno_away_6,
    row.shirtno_away_7, row.shirtno_away_8, row.shirtno_away_9,
    row.shirtno_away_10, row.shirtno_away_11,
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

currentDifficulty = difficulty;
lives = 3;
gameStage = "players";

localStorage.setItem("fixtureDifficulty", difficulty);

      document.getElementById("fixtureDifficultyScreen").classList.add("hidden");
      document.getElementById("fixtureGameScreen").classList.remove("hidden");

      renderChallenge(data);
    });
  });
}

function renderChallenge(data) {

currentChallenge = data;
createProgressPanel();
updateProgressPanel();

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

 document.querySelector(".mg-scoreboard").innerHTML = `
  <div class="sky-scoreboard">
    <div class="sky-score-top">
      <div class="sky-team sky-team-home">
        <img src="${badgeUrlFor(data.fixture.home_badge)}" alt="${data.fixture.home_team}">
        <strong>${data.fixture.home_team}</strong>
      </div>

      <div class="sky-score-box">
        <span id="homeScore">${currentDifficulty === "easy" ? data.fixture.score_home : "?"}</span>
        <em></em>
        <span id="awayScore">${currentDifficulty === "easy" ? data.fixture.score_away : "?"}</span>
      </div>

      <div class="sky-team sky-team-away">
        <strong>${data.fixture.away_team}</strong>
        <img src="${badgeUrlFor(data.fixture.away_badge)}" alt="${data.fixture.away_team}">
      </div>
    </div>

    <div class="sky-scorers">
      <div id="homeScorersList" class="sky-scorer-list"></div>
      <div class="sky-scorer-divider"></div>
      <div id="awayScorersList" class="sky-scorer-list"></div>
    </div>
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

function getSlotHint(side, index) {
  if (currentDifficulty !== "easy") {
    return `Position ${index + 1}`;
  }

  return "Name length hidden";
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
          <div class="hint">${getSlotHint(side, index)}</div>
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
updateProgressPanel();
checkStageProgress();

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

  lives--;
updateProgressPanel();

slotDiv.classList.add("wrong");
showWrongGuessMessage(`Wrong player — ${lives} lives left`);

setTimeout(() => {
  slotDiv.classList.remove("wrong");
}, 800);

if (lives <= 0) {
  endGame();
}
}

function createProgressPanel() {
  if (document.getElementById("fixtureProgressPanel")) return;

  const panel = document.createElement("div");
  panel.id = "fixtureProgressPanel";
  panel.className = "fixture-progress-panel";

  const header = document.querySelector(".mg-header");
  header.insertAdjacentElement("afterend", panel);
}

function updateProgressPanel() {
  const panel = document.getElementById("fixtureProgressPanel");
  if (!panel || !currentChallenge) return;

  const homeDone = Object.keys(filledSlots).filter(k => k.startsWith("home-")).length;
  const awayDone = Object.keys(filledSlots).filter(k => k.startsWith("away-")).length;

  const totalScorers =
    (currentChallenge.scorers.home?.length || 0) +
    (currentChallenge.scorers.away?.length || 0);

  const rows = [
    `Lives: ${lives}`,
    `${currentChallenge.fixture.home_team}: ${homeDone} / 11 players`,
    `${currentChallenge.fixture.away_team}: ${awayDone} / 11 players`,
  ];

  if (["medium", "hard", "very-hard"].includes(currentDifficulty)) {
    rows.push(`Score: ${guessedScore ? "1 / 1" : "0 / 1"}`);
  }

  if (["hard", "very-hard"].includes(currentDifficulty)) {
    rows.push(`Scorers: ${guessedGoals.length} / ${totalScorers}`);
  }

  if (currentDifficulty === "very-hard") {
    rows.push(`Shirt numbers: ${guessedShirtNumbers ? "22 / 22" : "0 / 22"}`);
  }

  panel.innerHTML = rows.map(r => `<span>${r}</span>`).join("");
}

function checkStageProgress() {
  const guessedPlayers = Object.keys(filledSlots).length;

  if (guessedPlayers === 22) {
    if (currentDifficulty === "easy") {
      showWrongGuessMessage("Complete! You earned 25 coins");
      return;
    }

    gameStage = "score";
showWrongGuessMessage("Players complete — now guess the score");
showScoreGuessPanel();
  }
}

function showScoreGuessPanel() {
  if (document.getElementById("scoreGuessPanel")) return;

  const panel = document.createElement("div");
  panel.id = "scoreGuessPanel";
  panel.className = "score-guess-panel";

  panel.innerHTML = `
    <strong>Guess the final score</strong>
    <div class="score-inputs">
      <input id="homeScoreGuess" type="number" min="0" placeholder="${currentChallenge.fixture.home_team}" />
      <span>-</span>
      <input id="awayScoreGuess" type="number" min="0" placeholder="${currentChallenge.fixture.away_team}" />
      <button id="submitScoreGuess">Submit score</button>
    </div>
  `;

  document.getElementById("fixtureProgressPanel").insertAdjacentElement("afterend", panel);

  document.getElementById("submitScoreGuess").addEventListener("click", checkScoreGuess);
}

function endGame() {
  showWrongGuessMessage("Game over");
  document.querySelectorAll(".slot").forEach(slot => {
    slot.style.pointerEvents = "none";
  });

  const scorePanel = document.getElementById("scoreGuessPanel");
  if (scorePanel) scorePanel.remove();
}

function updateScoreboardScorers() {
  if (!currentChallenge) return;

  const homeList = document.getElementById("homeScorersList");
  const awayList = document.getElementById("awayScorersList");

  if (!homeList || !awayList) return;

  const goals = getAllGoalEvents();

  const guessedHomeGoals = [];
  const guessedAwayGoals = [];

  guessedGoals.forEach(index => {
    const goal = goals[index];
    if (!goal) return;

    const scorerText = `
      <div class="sky-scorer">
        <span>⚽</span>
        ${goal.name || goal.player_name || goal.scorer || "Scorer"} 
        ${goal.minute ? `${goal.minute}'` : ""}
        ${goal.own_goal ? " OG" : ""}
      </div>
    `;

    if (goal.team === "home") guessedHomeGoals.push(scorerText);
    if (goal.team === "away") guessedAwayGoals.push(scorerText);
  });

  homeList.innerHTML = guessedHomeGoals.join("");
  awayList.innerHTML = guessedAwayGoals.join("");
}

function getAllGoalEvents() {
  return [
    ...(currentChallenge.scorers.home || []).map(goal => ({
      ...goal,
      team: "home",
      teamName: currentChallenge.fixture.home_team
    })),
    ...(currentChallenge.scorers.away || []).map(goal => ({
      ...goal,
      team: "away",
      teamName: currentChallenge.fixture.away_team
    })),
  ];
}

function showScorerGuessPanel() {
  if (document.getElementById("scorerGuessPanel")) return;

  const panel = document.createElement("div");
  panel.id = "scorerGuessPanel";
  panel.className = "scorer-guess-panel";

  panel.innerHTML = `
    <strong>Guess every goal scorer</strong>
    <div class="scorer-inputs">
      <input id="scorerGuessInput" placeholder="Type scorer name..." />
      <button id="submitScorerGuess">Submit scorer</button>
    </div>
  `;

  document.querySelector(".mg-scoreboard").insertAdjacentElement("afterend", panel);

  document.getElementById("submitScorerGuess").addEventListener("click", checkScorerGuess);
}

async function checkScorerGuess() {
  const input = document.getElementById("scorerGuessInput").value.trim();

  if (!input) return;

  const player = await findPlayerByName(input);

  if (!player) {
    lives--;
    updateProgressPanel();
    showWrongGuessMessage(`Scorer not found — ${lives} lives left`);

    if (lives <= 0) endGame();
    return;
  }

  const goals = getAllGoalEvents();

  const goalIndex = goals.findIndex((goal, index) =>
    Number(goal.id) === Number(player.id) &&
    !guessedGoals.includes(index)
  );

  if (goalIndex === -1) {
    lives--;
    updateProgressPanel();
    showWrongGuessMessage(`Wrong scorer — ${lives} lives left`);

    if (lives <= 0) endGame();
    return;
  }

  guessedGoals.push(goalIndex);

  const goal = goals[goalIndex];

  goal.name = player.name;
updateScoreboardScorers();

  document.getElementById("scorerGuessInput").value = "";

  if (guessedGoals.length === goals.length) {
    guessedScorers = true;
    updateProgressPanel();

    document.getElementById("scorerGuessPanel").remove();

    if (currentDifficulty === "hard") {
      gameStage = "complete";
      showWrongGuessMessage("Complete! You earned 50 coins");
    } else {
      gameStage = "shirtNumbers";
      showWrongGuessMessage("Scorers complete — now guess shirt numbers");
    }
  } else {
    updateProgressPanel();
    showWrongGuessMessage("Correct scorer");
  }
}

loadChallenge();

function checkScoreGuess() {
  const homeGuess = Number(document.getElementById("homeScoreGuess").value);
  const awayGuess = Number(document.getElementById("awayScoreGuess").value);

  if (
    homeGuess === Number(currentChallenge.fixture.score_home) &&
    awayGuess === Number(currentChallenge.fixture.score_away)
  ) {
    guessedScore = true;
    gameStage = ["hard", "very-hard"].includes(currentDifficulty) ? "scorers" : "complete";

    document.getElementById("homeScore").textContent = currentChallenge.fixture.score_home;
    document.getElementById("awayScore").textContent = currentChallenge.fixture.score_away;

    document.getElementById("scoreGuessPanel").remove();

    updateProgressPanel();

    if (currentDifficulty === "medium") {
  showWrongGuessMessage("Complete! You earned 30 coins");
} else {
  showWrongGuessMessage("Score correct — now guess the scorers");
  showScorerGuessPanel();
}

    return;
  }

  lives--;
  updateProgressPanel();
  showWrongGuessMessage(`Wrong score — ${lives} lives left`);

  if (lives <= 0) {
    endGame();
  }
}
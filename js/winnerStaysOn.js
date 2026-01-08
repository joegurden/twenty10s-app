import { supabase } from "./supabaseClient.js";

const $ = (id) => document.getElementById(id);

const els = {
  meta: $("wsoMeta"),
  hint: $("wsoHint"),
  champ: $("wsoChampionName"),
  left: $("wsoLeftName"),
  right: $("wsoRightName"),
  btnKeep: $("btnKeep"),
  btnPickLeft: $("btnPickLeft"),
  btnPickRight: $("btnPickRight"),
  btnNewGame: $("btnNewGame"),
  result: $("wsoResult"),
};

const state = {
  allPlayers: [],
  round: 1,
  maxRounds: 5,
  champ: null,
  left: null,
  right: null,
  locked: false,
  seen: new Set(), // NEW: players already shown this game
};

function normalizePos(p) {
  return String(p || "").toUpperCase().trim();
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function loadPlayersFromSupabase() {
  const { data, error } = await supabase
    .from("players")
    .select("Name,Position,Rating,Club,League")
    .limit(5000);

  if (error) throw new Error(error.message);

  return (data || [])
    .map((p, idx) => ({
      id: `${p.Name}|${p.Club || ""}|${idx}`,
      name: p.Name,
      pos: normalizePos(p.Position),
      rating: Number(p.Rating),
      club: p.Club,
      league: p.League,
    }))
    .filter((p) => p.name && p.pos && Number.isFinite(p.rating));
}

function render() {
  const r = `${state.round}/${state.maxRounds}`;
  const pos = state.champ?.pos ? ` • ${state.champ.pos}` : "";
  els.meta.textContent = `Round ${r}${pos}`;

  els.champ.textContent = state.champ?.name || "—";
  els.left.textContent = state.left?.name || "—";
  els.right.textContent = state.right?.name || "—";

  els.btnKeep.disabled = state.locked;
  els.btnPickLeft.disabled = state.locked;
  els.btnPickRight.disabled = state.locked;

  els.hint.textContent = state.locked
    ? "Game over. Start a new game."
    : "Pick a challenger or press Keep.";

  if (state.locked) {
    els.result.classList.remove("hidden");
    els.result.innerHTML = `
      <strong>Winner 🏆</strong>
      <div style="margin-top:10px; font-size:18px;">
        ${state.champ?.name || "—"}
      </div>
    `;
  } else {
    els.result.classList.add("hidden");
    els.result.innerHTML = "";
  }
}

function pickInitialChampion(players) {
  // rated < 96 and not previously seen
  const eligible = players.filter(p => p.rating < 96 && !isSeen(p));

  // Prefer positions with decent depth so we can always find challengers
  const byPos = new Map();
  for (const p of eligible) {
    if (!byPos.has(p.pos)) byPos.set(p.pos, []);
    byPos.get(p.pos).push(p);
  }

  const viablePositions = [...byPos.entries()]
    .filter(([_, list]) => list.length >= 20)
    .map(([pos]) => pos);

  const pos = viablePositions.length
    ? sample(viablePositions)
    : sample([...byPos.keys()]);

  const pool = byPos.get(pos) || eligible;

  return sample(pool);
}

function findChallengers(players, champ) {
  // same position, not champ, not seen
  const samePos = players.filter(
    p => p.pos === champ.pos && p.id !== champ.id && !isSeen(p)
  );

  let widen = 0;
  let candidates = samePos.filter(p => Math.abs(p.rating - champ.rating) <= 3);

  while (candidates.length < 2 && widen < 8) {
    widen += 1;
    candidates = samePos.filter(p => Math.abs(p.rating - champ.rating) <= (3 + widen));
  }

  // last resort: any same position not seen
  if (candidates.length < 2) candidates = samePos;

  const picked = shuffle(candidates).slice(0, 2);
  return { left: picked[0] || null, right: picked[1] || null };
}

function nextRound() {
  if (state.round >= state.maxRounds) {
    state.locked = true;
    render();
    return;
  }
  state.round += 1;

  const { left, right } = findChallengers(state.allPlayers, state.champ);
  state.left = left;
  state.right = right;

  markSeen(state.left);   // NEW
  markSeen(state.right);  // NEW

  render();
}

function chooseChallenger(which) {
  if (state.locked) return;

  const chosen = which === "left" ? state.left : state.right;
  if (!chosen) return;

  state.champ = chosen;
  markSeen(state.champ); // NEW (does nothing if already seen)

  nextRound();
}


function keepChampion() {
  if (state.locked) return;

  // Champion stays, challengers refresh and advance round
  nextRound();
}
function markSeen(p) {
  if (p?.id) state.seen.add(p.id);
}

function isSeen(p) {
  return !!p?.id && state.seen.has(p.id);
}

function newGame() {
  state.round = 1;
  state.locked = false;
  state.seen = new Set(); // NEW: reset per game

  state.champ = pickInitialChampion(state.allPlayers);
  markSeen(state.champ);

  const { left, right } = findChallengers(state.allPlayers, state.champ);
  state.left = left;
  state.right = right;

  markSeen(state.left);
  markSeen(state.right);

  render();
}


async function init() {
  try {
    els.meta.textContent = "Loading players…";
    state.allPlayers = await loadPlayersFromSupabase();

    if (state.allPlayers.length < 50) {
      els.meta.textContent = "Not enough players found.";
      els.hint.textContent = "Check your Supabase table / data.";
      return;
    }

    els.btnPickLeft.addEventListener("click", () => chooseChallenger("left"));
    els.btnPickRight.addEventListener("click", () => chooseChallenger("right"));
    els.btnKeep.addEventListener("click", keepChampion);
    els.btnNewGame.addEventListener("click", newGame);

    newGame();
  } catch (err) {
    console.error(err);
    els.meta.textContent = "Error loading players.";
    els.hint.textContent = err.message || "Check console for details.";
  }
}

init();

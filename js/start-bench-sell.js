import { supabase } from "./supabaseClient.js";

const $ = (id) => document.getElementById(id);

const els = {
  meta: $("sbsMeta"),
  hint: $("sbsHint"),
  pool: $("sbsPool"),
  result: $("sbsResult"),
  submit: $("btnSubmitSBS"),
  newRound: $("btnNewRoundSBS"),
  slotStart: $("slot-start"),
  slotBench: $("slot-bench"),
  slotSell: $("slot-sell"),
};

const state = {
  allPlayers: [],
  round: { position: null, minRating: null, maxRating: null, pool: [] },
  slots: { start: null, bench: null, sell: null },
  selectedPoolId: null,
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

function isUsed(playerId) {
  const { start, bench, sell } = state.slots;
  return [start, bench, sell].some((p) => p && p.id === playerId);
}

/* ---------------- Supabase load ----------------
   Your main.js uses table "players" and fields like:
   Position, Name, Rating  :contentReference[oaicite:2]{index=2}
*/
async function loadPlayersFromSupabase() {
  const { data, error } = await supabase
    .from("players")
    .select("Name,Position,Rating,Club,League") // keep light; rating used internally only
    .limit(5000);

  if (error) throw new Error(error.message);

  // Normalize into a predictable shape
  const cleaned = (data || [])
    .map((p, idx) => ({
      id: `${p.Name}|${p.Club || ""}|${idx}`, // stable enough for a round
      name: p.Name,
      pos: normalizePos(p.Position),
      rating: Number(p.Rating),
      club: p.Club,
      league: p.League,
    }))
    .filter((p) => p.name && p.pos && Number.isFinite(p.rating));

  return cleaned;
}

/* ---------------- Round generation ---------------- */
function generateRound(players) {
  const byPos = new Map();
  for (const pl of players) {
    if (!byPos.has(pl.pos)) byPos.set(pl.pos, []);
    byPos.get(pl.pos).push(pl);
  }

  // only positions with some depth
  const viable = [...byPos.entries()]
    .filter(([_, list]) => list.length >= 10)
    .map(([pos]) => pos);

  const pos = viable.length ? sample(viable) : sample([...byPos.keys()]);
  const poolAll = byPos.get(pos) || [];

  // pick anchor and enforce 4 rating window
  const anchor = sample(poolAll).rating;
  let minRating = anchor;
  let maxRating = anchor + 4;

  let widen = 0;
  let candidates = poolAll.filter((p) => p.rating >= minRating && p.rating <= maxRating);

  while (candidates.length < 3 && widen < 8) {
    widen += 1;
    candidates = poolAll.filter(
      (p) => p.rating >= (minRating - widen) && p.rating <= (maxRating + widen)
    );
  }

  return {
    position: pos,
    minRating: minRating - widen,
    maxRating: maxRating + widen,
    pool: shuffle(candidates).slice(0, 3),
  };
}

/* ---------------- Render ---------------- */
function setSlotButton(el, player) {
  el.classList.remove("armed");
  if (!player) {
    el.textContent = "Click to place";
    el.classList.add("empty");
    el.classList.remove("filled");
    return;
  }
  // ✅ rating hidden
  el.textContent = `${player.name}`;
  el.classList.remove("empty");
  el.classList.add("filled");
}

function renderMeta() {
  // You said users shouldn't see rating.
  // We'll show position only (you can add “same rating range” without numbers if you want).
  els.meta.textContent = `Position: ${state.round.position}`;
}

function renderSlots() {
  setSlotButton(els.slotStart, state.slots.start);
  setSlotButton(els.slotBench, state.slots.bench);
  setSlotButton(els.slotSell, state.slots.sell);
}

function renderPool() {
  els.pool.innerHTML = "";
  for (const p of state.round.pool) {
    const btn = document.createElement("div");
    btn.className = "sbs-pill";
    btn.dataset.id = p.id;

    // ✅ rating hidden
    btn.textContent = p.name;

    if (isUsed(p.id)) btn.classList.add("used");
    if (!isUsed(p.id) && state.selectedPoolId === p.id) btn.classList.add("selected");

    btn.addEventListener("click", () => {
      if (isUsed(p.id)) return;
      state.selectedPoolId = (state.selectedPoolId === p.id) ? null : p.id;
      render();
    });

    els.pool.appendChild(btn);
  }
}

function updateSubmitState() {
  const filled = state.slots.start && state.slots.bench && state.slots.sell;
  els.submit.disabled = !filled;
}

function renderHint() {
  if (!state.selectedPoolId) {
    els.hint.textContent = "Pick a name below, then click Start/Bench/Sell.";
    return;
  }
  const p = state.round.pool.find((x) => x.id === state.selectedPoolId);
  els.hint.textContent = p
    ? `Selected: ${p.name}. Now click Start, Bench, or Sell.`
    : "Pick a name below, then click Start/Bench/Sell.";
}

function renderResult(show) {
  if (!show) {
    els.result.classList.add("hidden");
    els.result.innerHTML = "";
    return;
  }
  const s = state.slots;
  els.result.classList.remove("hidden");
  els.result.innerHTML = `
    <strong>Submitted ✅</strong>
    <div style="margin-top:8px; line-height:1.6;">
      <div>Start: <strong>${s.start.name}</strong></div>
      <div>Bench: <strong>${s.bench.name}</strong></div>
      <div>Sell: <strong>${s.sell.name}</strong></div>
    </div>
  `;
}

function render() {
  renderMeta();
  renderSlots();
  renderPool();
  renderHint();
  updateSubmitState();
}

/* ---------------- Interactions ---------------- */
function slotKeyFromEl(el) {
  if (el === els.slotStart) return "start";
  if (el === els.slotBench) return "bench";
  if (el === els.slotSell) return "sell";
  return null;
}

function clearSlot(slotKey) {
  state.slots[slotKey] = null;
  render();
}

function placeSelectedInto(slotKey) {
  const id = state.selectedPoolId;
  if (!id) return;

  const player = state.round.pool.find((p) => p.id === id);
  if (!player) return;
  if (isUsed(id)) return;

  state.slots[slotKey] = player;
  state.selectedPoolId = null;
  render();
}

function bindSlot(el) {
  el.addEventListener("click", () => {
    const key = slotKeyFromEl(el);
    if (!key) return;

    // click filled slot -> return to pool
    if (state.slots[key]) {
      clearSlot(key);
      return;
    }

    // click empty -> place selected
    placeSelectedInto(key);
  });
}

function newRound() {
  state.slots = { start: null, bench: null, sell: null };
  state.selectedPoolId = null;
  renderResult(false);

  state.round = generateRound(state.allPlayers);
  render();
}

function submitRound() {
  if (!(state.slots.start && state.slots.bench && state.slots.sell)) return;
  renderResult(true);
}

/* ---------------- Init ---------------- */
async function init() {
  try {
    els.meta.textContent = "Loading players…";
    state.allPlayers = await loadPlayersFromSupabase();

    if (state.allPlayers.length < 3) {
      els.meta.textContent = "Not enough players found.";
      els.hint.textContent = "Add players to Supabase and reload.";
      return;
    }

    bindSlot(els.slotStart);
    bindSlot(els.slotBench);
    bindSlot(els.slotSell);

    els.newRound.addEventListener("click", newRound);
    els.submit.addEventListener("click", submitRound);

    newRound();
  } catch (err) {
    console.error(err);
    els.meta.textContent = "Error loading players.";
    els.hint.textContent = err.message || "Check console for details.";
  }
}

init();

export const GAMES = {
  start_bench_sell: {
    title: "Start Bench Sell",
    href: "start-bench-sell.html",
    image: "img/start-one-bench-one-sell-one.png",
    desc: "Start, bench, or sell players in different scenarios.",
    status: "live"
  },
  winner_stays_on: {
    title: "Winner Stays On",
    href: "winner-stays-on.html",
    image: "img/winner-stays-on.png",
    desc: "Make your pick. Winner stays on.",
    status: "live"
  },
  who_am_i: {
    title: "Who Am I?",
    href: null,
    image: "img/who-am-i.png",
    desc: "Guess the mystery player from clues.",
    status: "soon"
  },
  fixture_rebuilder: {
    title: "Fixture Rebuilder",
    href: null,
    image: "img/fixture-rebuilder.png",
    desc: "Rebuild the fixture list from clues.",
    status: "soon"
  },

  // Not built yet, but tiles still populated:
  missing_xi: {
    title: "Missing XI",
    href: null,
    image: "img/fixture-rebuilder.png", // temporary fallback
    desc: "Fill the missing players in the XI.",
    status: "soon"
  },
  keep_3_lose_1: {
    title: "Keep 3, Lose 1",
    href: null,
    image: "img/start-one-bench-one-sell-one.png", // temporary fallback
    desc: "Pick your 3. Bin 1.",
    status: "soon"
  },
  best_xi: {
    title: "Best XI",
    href: null,
    image: "img/winner-stays-on.png", // temporary fallback
    desc: "Build the best XI from a theme.",
    status: "soon"
  }
};

export const DEFAULT_ORDER = [
  "start_bench_sell",
  "winner_stays_on",
  "who_am_i",
  "fixture_rebuilder",
  "missing_xi",
  "keep_3_lose_1",
  "best_xi"
];
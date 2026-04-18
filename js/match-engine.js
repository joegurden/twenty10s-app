function average(arr) {
  const valid = (arr || []).filter((n) => Number.isFinite(n));
  if (!valid.length) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pickWeighted(items) {
  const valid = items.filter((item) => item.weight > 0);
  const total = valid.reduce((sum, item) => sum + item.weight, 0);

  if (!valid.length || total <= 0) return null;

  let roll = Math.random() * total;

  for (const item of valid) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }

  return valid[valid.length - 1].value;
}

function getPlayerUnitGroups(team) {
  const starters = team?.starters || [];

  return {
    gk: starters.filter((p) => p.role === "GK"),
    def: starters.filter((p) => ["LB", "RB", "CB", "LWB", "RWB"].includes(p.role)),
    mid: starters.filter((p) => ["CDM", "CM", "CAM", "LM", "RM"].includes(p.role)),
    att: starters.filter((p) => ["LW", "RW", "ST"].includes(p.role)),
  };
}

function getUnitRatings(team) {
  const groups = getPlayerUnitGroups(team);

  return {
    gk: average(groups.gk.map((p) => p.rating || 0)),
    def: average(groups.def.map((p) => p.rating || 0)),
    mid: average(groups.mid.map((p) => p.rating || 0)),
    att: average(groups.att.map((p) => p.rating || 0)),
    overall: average((team?.starters || []).map((p) => p.rating || 0)),
  };
}

function getTeamMatchStrength(team, isHome = false) {
  const units = getUnitRatings(team);

  const base =
    units.overall * 0.30 +
    units.att * 0.28 +
    units.mid * 0.20 +
    units.def * 0.14 +
    units.gk * 0.08;

  const homeBonus = isHome ? 1.2 : 0;
  const variance = randomBetween(-1.2, 1.2);

  return {
    ...units,
    strength: base + homeBonus + variance,
  };
}

function getExpectedGoals(homeTeam, awayTeam) {
  const home = getTeamMatchStrength(homeTeam, true);
  const away = getTeamMatchStrength(awayTeam, false);

  const homeAttackVsAwayDef =
  1.38 +
    (home.att - away.def) * 0.045 +
    (home.mid - away.mid) * 0.020 +
    (home.overall - away.overall) * 0.015;

  const awayAttackVsHomeDef =
  1.14 +
    (away.att - home.def) * 0.045 +
    (away.mid - home.mid) * 0.020 +
    (away.overall - home.overall) * 0.015;

  return {
    homeXG: clamp(homeAttackVsAwayDef + randomBetween(-0.35, 0.35), 0.15, 3.8),
    awayXG: clamp(awayAttackVsHomeDef + randomBetween(-0.35, 0.35), 0.05, 3.5),
    homeStrength: home,
    awayStrength: away,
  };
}

function sampleGoalsFromXG(xg) {
  const roll = Math.random();

  if (xg < 0.45) {
    if (roll < 0.68) return 0;
    if (roll < 0.93) return 1;
    return 2;
  }

  if (xg < 0.95) {
    if (roll < 0.42) return 0;
    if (roll < 0.78) return 1;
    if (roll < 0.94) return 2;
    return 3;
  }

  if (xg < 1.45) {
    if (roll < 0.22) return 0;
    if (roll < 0.56) return 1;
    if (roll < 0.84) return 2;
    if (roll < 0.95) return 3;
    return 4;
  }

  if (xg < 2.05) {
    if (roll < 0.14) return 0;
    if (roll < 0.36) return 1;
    if (roll < 0.67) return 2;
    if (roll < 0.88) return 3;
    if (roll < 0.97) return 4;
    return 5;
  }

  if (roll < 0.08) return 0;
  if (roll < 0.24) return 1;
  if (roll < 0.50) return 2;
  if (roll < 0.74) return 3;
  if (roll < 0.90) return 4;
  if (roll < 0.97) return 5;
  return 6;
}

function getStarAttackers(team) {
  const attackers = (team?.starters || [])
    .filter((p) => ["LW", "ST", "RW"].includes(p.role))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  return {
    main: attackers[0] || null,
    second: attackers[1] || null,
    third: attackers[2] || null,
  };
}

function getStarCreators(team) {
  const creators = (team?.starters || [])
    .filter((p) => ["CAM", "LW", "RW", "CM", "LM", "RM"].includes(p.role))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));

  return {
    main: creators[0] || null,
    second: creators[1] || null,
  };
}

function getScorerWeight(player, team) {
  const ratingBoost = (player.rating || 80) - 75;
  const stars = getStarAttackers(team);

  const byRole = {
    ST: 16.5,
    LW: 10.5,
    RW: 10.5,
    CAM: 5.5,

    LM: 2.6,
    RM: 2.6,
    CM: 1.7,

    CDM: 0.5,
    LB: 0.15,
    RB: 0.15,
    LWB: 0.2,
    RWB: 0.2,
    CB: 0.05,
    GK: 0.0,
  };

  let weight = (byRole[player.role] || 0.05) + ratingBoost * 0.22;

  if (stars.main && player.id === stars.main.id) {
    weight *= 1.75;
  } else if (stars.second && player.id === stars.second.id) {
    weight *= 1.25;
  } else if (stars.third && player.id === stars.third.id) {
    weight *= 1.1;
  }

  if (player.role === "ST") {
    weight *= 1.15;
  }

  const formBoost = (player.form ?? 60) - 60;
  weight *= 1 + (formBoost * 0.01);

  return Math.max(0, weight);
}

function getAssistWeight(player, team) {
  const ratingBoost = (player.rating || 80) - 75;
  const creators = getStarCreators(team);
  const starAttackers = getStarAttackers(team);

  const byRole = {
    CAM: 11.0,
    LW: 9.5,
    RW: 9.5,
    LM: 6.5,
    RM: 6.5,
    CM: 4.8,

    ST: 3.2,
    CDM: 1.3,

    LB: 2.8,
    RB: 2.8,
    LWB: 3.4,
    RWB: 3.4,

    CB: 0.2,
    GK: 0.0,
  };

  let weight = (byRole[player.role] || 0.05) + ratingBoost * 0.14;

  if (creators.main && player.id === creators.main.id) {
    weight *= 1.45;
  } else if (creators.second && player.id === creators.second.id) {
    weight *= 1.18;
  }

  if (starAttackers.main && player.id === starAttackers.main.id && player.role !== "ST") {
    weight *= 1.12;
  }

  const formBoost = (player.form ?? 60) - 60;
  weight *= 1 + (formBoost * 0.01);

  return Math.max(0, weight);
}

function pickScorer(team) {
  const starters = (team?.starters || []).filter((p) => p.role !== "GK");

  return pickWeighted(
    starters.map((player) => ({
      value: player,
      weight: getScorerWeight(player, team),
    }))
  );
}

function pickAssister(team, scorerId) {
  const starters = (team?.starters || [])
    .filter((p) => p.id !== scorerId)
    .filter((p) => p.role !== "GK");

  const assistedChance = 0.82;
  if (Math.random() > assistedChance) return null;

  return pickWeighted(
    starters.map((player) => ({
      value: player,
      weight: getAssistWeight(player, team),
    }))
  );
}

function generateGoalMinute(existingMinutes = []) {
  let minute = 1;

  for (let tries = 0; tries < 25; tries++) {
    const roll = Math.random();

    if (roll < 0.08) {
      minute = Math.floor(randomBetween(1, 10));
    } else if (roll < 0.65) {
      minute = Math.floor(randomBetween(11, 75));
    } else if (roll < 0.94) {
      minute = Math.floor(randomBetween(76, 90));
    } else {
      minute = Math.floor(randomBetween(91, 96));
    }

    if (!existingMinutes.includes(minute)) return minute;
  }

  return Math.floor(randomBetween(1, 96));
}

function buildGoalEvents(team, side, goalsFor) {
  const events = [];
  const usedMinutes = [];

  for (let i = 0; i < goalsFor; i++) {
    const scorer = pickScorer(team);
    if (!scorer) continue;

    const assister = pickAssister(team, scorer.id);
    const minute = generateGoalMinute(usedMinutes);
    usedMinutes.push(minute);

    events.push({
      type: "goal",
      side,
      minute,
      scorerId: scorer.id,
      scorerName: scorer.name,
      assisterId: assister?.id || null,
      assisterName: assister?.name || null,
    });
  }

  return events.sort((a, b) => a.minute - b.minute);
}

function buildPlayerStatsObject(playersMap, playerId) {
  if (!playersMap[playerId]) {
    playersMap[playerId] = {
      appearances: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
    };
  }
  return playersMap[playerId];
}

function applyAppearanceStats(playersMap, team) {
  (team?.starters || []).forEach((player) => {
    const stats = buildPlayerStatsObject(playersMap, player.id);
    stats.appearances += 1;
  });
}

function applyGoalAndAssistStats(playersMap, events) {
  events.forEach((event) => {
    if (event.type !== "goal") return;

    const scorerStats = buildPlayerStatsObject(playersMap, event.scorerId);
    scorerStats.goals += 1;

    if (event.assisterId) {
      const assisterStats = buildPlayerStatsObject(playersMap, event.assisterId);
      assisterStats.assists += 1;
    }
  });
}

function applyCleanSheetStats(playersMap, team, goalsAgainst) {
  if (goalsAgainst !== 0) return;

  const gk = (team?.starters || []).find((player) => player.role === "GK");
  if (!gk) return;

  const stats = buildPlayerStatsObject(playersMap, gk.id);
  stats.cleanSheets += 1;
}

function clampStat(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function getEventCountsForTeam(events, side) {
  const counts = {};

  (events || []).forEach((event) => {
    if (event.type !== "goal" || event.side !== side) return;

    if (event.scorerId != null) {
      counts[event.scorerId] = counts[event.scorerId] || { goals: 0, assists: 0 };
      counts[event.scorerId].goals += 1;
    }

    if (event.assisterId != null) {
      counts[event.assisterId] = counts[event.assisterId] || { goals: 0, assists: 0 };
      counts[event.assisterId].assists += 1;
    }
  });

  return counts;
}

function getTeamResult(goalsFor, goalsAgainst) {
  if (goalsFor > goalsAgainst) return "win";
  if (goalsFor < goalsAgainst) return "loss";
  return "draw";
}

function getFormFitnessBoost(form) {
  const f = clampStat(form ?? 60);

  if (f >= 86) return 4;
  if (f >= 70) return 3;
  if (f >= 56) return 2;
  if (f >= 46) return 1;
  return 0;
}

function applyPostMatchConditionChanges(team, goalsFor, goalsAgainst, events, side) {
  const eventCounts = getEventCountsForTeam(events, side);
  const result = getTeamResult(goalsFor, goalsAgainst);

  const starters = (team?.starters || []).map((player) => {
    const stats = eventCounts[player.id] || { goals: 0, assists: 0 };

    let fitnessLoss = 0;
    let formChange = 0;

    // FITNESS
    // Better players lose a tiny bit less, but not enough to ignore fatigue.
  if (player.role === "GK") {
  fitnessLoss = 0;
} else if (["CB", "LB", "RB", "LWB", "RWB"].includes(player.role)) {
  fitnessLoss = 15;
} else if (["CDM", "CM", "CAM", "LM", "RM"].includes(player.role)) {
  fitnessLoss = 17;
} else {
  fitnessLoss = 18;
}

fitnessLoss -= Math.max(0, ((player.rating || 80) - 80) * 0.12);

const formFitnessBoost = getFormFitnessBoost(player.form);
fitnessLoss = Math.max(0, fitnessLoss - formFitnessBoost);

if (player.role === "GK") {
  fitnessLoss = 0;
}

    // FORM
    if (result === "win") formChange += 3;
    else if (result === "draw") formChange += 0;
    else formChange -= 3;

    if (player.role === "GK") {
      if (goalsAgainst === 0) formChange += 6;
      else if (goalsAgainst >= 3) formChange -= 4;
      else formChange -= Math.max(0, goalsAgainst - 1);
    } else if (["CB", "LB", "RB", "LWB", "RWB"].includes(player.role)) {
      if (goalsAgainst === 0) formChange += 4;
      else if (goalsAgainst >= 3) formChange -= 3;
      formChange += stats.goals * 4 + stats.assists * 3;
    } else if (["CDM", "CM", "CAM", "LM", "RM"].includes(player.role)) {
      formChange += stats.goals * 5 + stats.assists * 4;
      if (goalsFor === 0) formChange -= 1;
    } else {
      // attackers
      formChange += stats.goals * 6 + stats.assists * 3;
      if (stats.goals === 0 && goalsFor === 0) formChange -= 2;
    }

    return {
      ...player,
      fitness: clampStat((player.fitness ?? 92) - fitnessLoss),
      form: clampStat((player.form ?? 60) + formChange),
    };
  });

  const subs = (team?.subs || []).map((player) => ({
  ...player,
  fitness: 100,
  form: clampStat((player.form ?? 60)),
}));

const reserves = (team?.reserves || []).map((player) => ({
  ...player,
  fitness: 100,
  form: clampStat((player.form ?? 60)),
}));

  return {
    ...team,
    starters,
    subs,
    reserves,
  };
}

function buildEmptyTeamTableStats() {
  return {
    P: 0,
    W: 0,
    D: 0,
    L: 0,
    GF: 0,
    GA: 0,
    GD: 0,
    PTS: 0,
  };
}

function applyResultToTeamTable(tableStats, goalsFor, goalsAgainst) {
  tableStats.P += 1;
  tableStats.GF += goalsFor;
  tableStats.GA += goalsAgainst;
  tableStats.GD = tableStats.GF - tableStats.GA;

  if (goalsFor > goalsAgainst) {
    tableStats.W += 1;
    tableStats.PTS += 3;
  } else if (goalsFor === goalsAgainst) {
    tableStats.D += 1;
    tableStats.PTS += 1;
  } else {
    tableStats.L += 1;
  }
}

export function simulateMatch(homeTeam, awayTeam) {
  const { homeXG, awayXG, homeStrength, awayStrength } = getExpectedGoals(homeTeam, awayTeam);

  let homeGoals = sampleGoalsFromXG(homeXG);
  let awayGoals = sampleGoalsFromXG(awayXG);

  const strengthGap = homeStrength.strength - awayStrength.strength;

  if (strengthGap > 2.4 && homeGoals <= awayGoals && Math.random() < 0.45) {
    homeGoals += 1;
  }

  if (strengthGap < -2.4 && awayGoals <= homeGoals && Math.random() < 0.45) {
    awayGoals += 1;
  }

  homeGoals = clamp(homeGoals, 0, 6);
  awayGoals = clamp(awayGoals, 0, 6);

  const homeEvents = buildGoalEvents(homeTeam, "home", homeGoals);
  const awayEvents = buildGoalEvents(awayTeam, "away", awayGoals);

  const events = [...homeEvents, ...awayEvents].sort((a, b) => a.minute - b.minute);

  return {
    homeTeam: homeTeam.name,
    awayTeam: awayTeam.name,
    homeGoals,
    awayGoals,
    events,
    meta: {
      homeXG: Number(homeXG.toFixed(2)),
      awayXG: Number(awayXG.toFixed(2)),
    },
  };
}

export function simulateMatchday(matchdayFixtures, teams, existingPlayerStats = {}, existingTableStats = {}) {
  let updatedTeams = structuredClone(teams || []);
  const playerStats = structuredClone(existingPlayerStats || {});
  const tableStats = structuredClone(existingTableStats || {});

  updatedTeams.forEach((team) => {
    if (!tableStats[team.name]) {
      tableStats[team.name] = buildEmptyTeamTableStats();
    }
  });

  const results = matchdayFixtures.map((fixture) => {
    const homeTeam = updatedTeams.find((team) => team.name === fixture.homeTeam);
    const awayTeam = updatedTeams.find((team) => team.name === fixture.awayTeam);

    const result = simulateMatch(homeTeam, awayTeam);

    applyAppearanceStats(playerStats, homeTeam);
    applyAppearanceStats(playerStats, awayTeam);

    applyGoalAndAssistStats(playerStats, result.events);

    applyCleanSheetStats(playerStats, homeTeam, result.awayGoals);
    applyCleanSheetStats(playerStats, awayTeam, result.homeGoals);

    applyResultToTeamTable(tableStats[homeTeam.name], result.homeGoals, result.awayGoals);
    applyResultToTeamTable(tableStats[awayTeam.name], result.awayGoals, result.homeGoals);

    const refreshedHomeTeam = applyPostMatchConditionChanges(
      homeTeam,
      result.homeGoals,
      result.awayGoals,
      result.events,
      "home"
    );

    const refreshedAwayTeam = applyPostMatchConditionChanges(
      awayTeam,
      result.awayGoals,
      result.homeGoals,
      result.events,
      "away"
    );

    updatedTeams = updatedTeams.map((team) => {
      if (team.name === refreshedHomeTeam.name) return refreshedHomeTeam;
      if (team.name === refreshedAwayTeam.name) return refreshedAwayTeam;
      return team;
    });

    return {
      ...fixture,
      played: true,
      score: {
        home: result.homeGoals,
        away: result.awayGoals,
      },
      events: result.events,
      meta: result.meta,
    };
  });

  return {
    fixtures: results,
    teams: updatedTeams,
    playerStats,
    tableStats,
  };
}
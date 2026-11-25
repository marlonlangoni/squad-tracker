// Rodar com a ferramenta javascript do navegador integrado, numa aba já aberta em https://tracker.gg
// (o fetch usa a sessão da própria página). Devolve um JSON (string) com os 3 perfis do ato atual.
(async () => {
  const base = 'https://api.tracker.gg/api/v2/valorant/standard';
  const ids = ['L4ngoni#1989', 'Mattin#1993', 'Snoop Dogglas#2908'];
  const K = ['matchesPlayed','matchesWon','matchesLost','matchesTied','matchesWinPct','mVPs','roundsPlayed','roundsWinPct','scorePerRound','kills','deaths','assists','killsPerRound','deathsPerRound','assistsPerRound','kDRatio','kDARatio','damagePerRound','damageDeltaPerRound','headshotsPercentage','dealtHeadshots','dealtBodyshots','dealtLegshots','firstBloods','firstDeaths','firstBloodsPerRound','firstDeathsPerRound','survived','traded','tradesAvenger','kAST','mostKillsInMatch','flawless','thrifty','aces','clutches','clutchesLost','clutches1v1','clutches1v2','clutches1v3','clutches1v4','clutches1v5','clutchesLost1v1','clutchesLost1v2','clutchesLost1v3','clutchesLost1v4','clutchesLost1v5','kills3K','kills4K','kills5K','esr','plantsPerRound','attackKDRatio','attackRoundsWinPct','attackDamagePerRound','attackKAST','attackFirstBloodsPerRound','attackFirstDeathsPerRound','defenseKDRatio','defenseRoundsWinPct','defenseDamagePerRound','defenseKAST','defenseFirstBloodsPerRound','defenseFirstDeathsPerRound','trnPerformanceScore','timePlayed'];
  const r3 = x => typeof x === 'number' ? Math.round(x * 1000) / 1000 : x;
  const out = {};
  for (const id of ids) {
    const j = await (await fetch(`${base}/profile/riot/${encodeURIComponent(id)}?forceCollect=true&playlist=competitive`, { credentials: 'include' })).json();
    const S = j.data.metadata.defaultSeason;
    const segs = j.data.segments;
    const se = segs.find(s => s.type === 'season' && s.attributes.seasonId === S);
    const pk = segs.find(s => s.type === 'peak-rating');
    const st = se.stats;
    const ags = segs.filter(s => s.type === 'agent' && s.attributes.seasonId === S);
    out[id] = {
      season: S, seasonName: se.metadata.shortName, level: j.data.metadata.accountLevel,
      rank: st.rank?.metadata?.tierName, peak: pk?.stats?.peakRating?.metadata?.tierName, peakAct: pk?.stats?.peakRating?.metadata?.actName,
      s: Object.fromEntries(K.map(k => { const v = st[k]; return [k, v ? (v.percentile != null ? [r3(v.value), Math.round(v.percentile)] : r3(v.value)) : null]; })),
      agents: ags.sort((a, b) => b.stats.matchesPlayed.value - a.stats.matchesPlayed.value).slice(0, 6).map(a => ({ n: a.metadata.name, r: a.metadata.role, c: a.metadata.color, m: a.stats.matchesPlayed.value, wr: r3(a.stats.matchesWinPct.value), kd: r3(a.stats.kDRatio.value), adr: r3(a.stats.damagePerRound.value), acs: r3(a.stats.scorePerRound.value) })),
      agentCount: ags.length,
      roles: segs.filter(s => s.type === 'agent-role').map(a => ({ n: a.metadata.name, m: a.stats.matchesPlayed.value, wr: r3(a.stats.matchesWinPct.value), kd: r3(a.stats.kDRatio.value) }))
    };
  }
  return JSON.stringify(out);
})()

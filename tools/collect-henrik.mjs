// Coleta os dados do squad pela HenrikDev API (https://api.henrikdev.xyz) e grava em raw/
// os mesmos arquivos que a coleta pelo navegador gerava. Depois é só rodar tools/build-data.mjs.
//
// Uso (na pasta do projeto):  node tools/collect-henrik.mjs
// Chave: variável de ambiente HENRIK_API_KEY, ou uma linha HENRIK_API_KEY=... no arquivo .env da raiz.
//
// O que ele grava:
//   raw/profile.json            números do ato, agentes, funções, elo atual e pico
//   raw/overview-<id>.json      mapas, armas e últimas 20 partidas
//   raw/performance-<id>.json   elo de cada ato
//   raw/matches-l4.json         parceiros de time do Marlon
//
// Cada partida baixada vira um resumo em match-cache.json (vai para o git), assim cada
// execução só baixa as partidas novas.
//
// O que só o Tracker.gg tem e some com esta coleta: percentis ("top 20%") e o Tracker Score.
//
// Ponto de partida do ato (trn-baseline.json): a lista de partidas da Riot não volta até o começo do ato,
// então os números do Tracker.gg de um momento ficam guardados e só as partidas depois dele são somadas.
//   node tools/collect-henrik.mjs --base   grava o squad-data.json atual como ponto de partida
//                                          (use logo depois de uma coleta pelo navegador no Tracker.gg)
// No ato seguinte o ponto de partida deixa de valer e tudo vem da HenrikDev.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(root, ...a);
const API = 'https://api.henrikdev.xyz';
const PLATFORM = 'pc';
// A conta responde "na" (shard da Riot), mas as partidas de vocês ficam em "br".
const REGION = 'br';
const MODE = 'competitive';
const SQUAD = { l4: 'L4ngoni#1989', mt: 'Mattin#1993', sd: 'Snoop Dogglas#2908' };
const TRADE_MS = 3000;
const BASE_FILE = 'trn-baseline.json';

/* ---------------- chave e HTTP ---------------- */
function apiKey() {
  if (process.env.HENRIK_API_KEY) return process.env.HENRIK_API_KEY.trim();
  try {
    const line = fs.readFileSync(P('.env'), 'utf8').split(/\r?\n/).find(l => /^\s*HENRIK_API_KEY\s*=/.test(l));
    if (line) return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
  } catch {}
  return null;
}
const KEY = apiKey();
if (!KEY && !process.argv.includes('--base')) {
  console.error('Falta a chave da HenrikDev API: defina HENRIK_API_KEY ou crie um .env com HENRIK_API_KEY=...');
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
let calls = 0;
async function get(p, query = {}) {
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null)).toString();
  const url = `${API}${p}${qs ? '?' + qs : ''}`;
  for (let attempt = 1; attempt <= 6; attempt++) {
    calls++;
    let res;
    try { res = await fetch(url, { headers: { Authorization: KEY, Accept: 'application/json' } }); }
    catch (e) { if (attempt === 6) throw e; await sleep(3000 * attempt); continue; }
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.max(+res.headers.get('retry-after') || 0, +res.headers.get('x-ratelimit-reset') || 0, 2 * attempt);
      if (attempt === 6) throw new Error(`${res.status} em ${p}`);
      console.log(`   … ${res.status === 429 ? 'limite da API' : 'erro ' + res.status}, esperando ${wait}s`);
      await sleep(wait * 1000 + 250);
      continue;
    }
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = body?.errors?.map(e => e.message).join('; ') || res.statusText;
      const err = new Error(`${res.status} em ${p}: ${msg}`); err.status = res.status; throw err;
    }
    // Se a cota está no fim, espera ela renovar em vez de tomar 429.
    if (res.headers.get('x-ratelimit-remaining') === '0') await sleep((+res.headers.get('x-ratelimit-reset') || 5) * 1000 + 250);
    return body;
  }
}
const riotPath = riot => { const [n, t] = riot.split('#'); return `${encodeURIComponent(n)}/${encodeURIComponent(t)}`; };

/* ---------------- utilitários ---------------- */
const readJSON = f => { try { return JSON.parse(fs.readFileSync(P(f), 'utf8')); } catch { return null; } };
const writeJSON = (f, o) => fs.writeFileSync(P(f), JSON.stringify(o));
const r1 = x => Math.round(x * 10) / 10, r3 = x => Math.round(x * 1000) / 1000;
const div = (a, b) => (b ? a / b : 0);
const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
const ord = n => (n === 1 ? 'MVP' : n + (n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'));

// "e9a3" -> "E9: A3";  a partir de 2025 a Riot passou a chamar de V25, V26... ("e10a1" -> "V25: A1")
function actName(short) {
  const m = /^e(\d+)a(\d+)$/i.exec(short || '');
  if (!m) return short || null;
  const ep = +m[1];
  return ep >= 10 ? `V${ep + 15}: A${m[2]}` : `E${ep}: A${m[2]}`;
}

/* ---------------- resumo de uma partida ---------------- */
// Guarda só o que o site usa, para cada jogador do squad que estava na partida.
function summarize(m, puuidToId) {
  const meta = m.metadata;
  const players = m.players || [];
  const team = Object.fromEntries(players.map(p => [p.puuid, p.team_id]));
  const teamIds = (m.teams || []).map(t => t.team_id);
  const other = t => teamIds.find(x => !same(x, t));
  const byScore = [...players].sort((a, b) => (b.stats?.score || 0) - (a.stats?.score || 0));
  const rounds = m.rounds || [];

  // Quem atacou em cada round.
  const attacker = rounds.map(r => {
    if (r.plant?.player?.team) return r.plant.player.team;
    if (r.winning_team && r.winning_team_role) return /^att/i.test(r.winning_team_role) ? r.winning_team : other(r.winning_team);
    return null;
  });
  const ref = attacker.findIndex(a => a);
  if (ref >= 0) {
    // Preenche rounds sem informação pela regra de lados: troca no round 13 e a cada round da prorrogação.
    const half = i => (i < 12 ? 0 : i < 24 ? 1 : (i - 24) % 2);
    const firstHalfAtk = half(ref) === 0 ? attacker[ref] : other(attacker[ref]);
    for (let i = 0; i < attacker.length; i++) if (!attacker[i]) attacker[i] = half(i) === 0 ? firstHalfAtk : other(firstHalfAtk);
  }

  // Abates agrupados por round, em ordem de tempo.
  const roundIdx = new Map(rounds.map((r, i) => [r.id ?? i, i]));
  const killsBy = rounds.map(() => []);
  for (const k of m.kills || []) {
    const i = roundIdx.get(k.round) ?? k.round;
    if (killsBy[i]) killsBy[i].push(k);
  }
  for (const ks of killsBy) ks.sort((a, b) => a.time_in_round_in_ms - b.time_in_round_in_ms);

  const out = {};
  for (const pl of players) {
    const id = puuidToId[pl.puuid];
    if (!id) continue;
    const me = pl.puuid, myTeam = pl.team_id;
    const t = (m.teams || []).find(x => same(x.team_id, myTeam)) || {};
    const ot = (m.teams || []).find(x => !same(x.team_id, myTeam)) || {};
    const us = t.rounds?.won ?? 0, them = t.rounds?.lost ?? ot.rounds?.won ?? 0;
    const st = pl.stats || {};
    const side = () => ({ r: 0, rw: 0, k: 0, d: 0, dmg: 0, kast: 0, fb: 0, fd: 0 });
    const s = {
      agent: pl.agent?.name, team: myTeam, res: us > them ? 'W' : us < them ? 'L' : 'T', us, them,
      place: byScore.findIndex(p => p.puuid === me) + 1,
      score: st.score || 0, k: st.kills || 0, d: st.deaths || 0, a: st.assists || 0,
      hs: st.headshots || 0, bs: st.bodyshots || 0, ls: st.legshots || 0,
      dmg: st.damage?.dealt || 0, dmgIn: st.damage?.received || 0,
      rounds: rounds.length || us + them, rw: 0,
      fb: 0, fd: 0, kast: 0, surv: 0, traded: 0, avenger: 0, plants: 0, flawless: 0,
      k3: 0, k4: 0, k5: 0, cw: [0, 0, 0, 0, 0], cl: [0, 0, 0, 0, 0],
      atk: side(), def: side(), wpn: {},
    };

    rounds.forEach((r, i) => {
      const ks = killsBy[i] || [];
      const won = same(r.winning_team, myTeam);
      const sd = attacker[i] == null ? null : same(attacker[i], myTeam) ? s.atk : s.def;
      const myKills = ks.filter(k => k.killer?.puuid === me && !same(k.victim?.team, myTeam));
      const myDeath = ks.find(k => k.victim?.puuid === me);
      const assisted = ks.some(k => (k.assistants || []).some(a => (a.puuid ?? a.assistant_puuid) === me));
      let traded = false;
      if (myDeath) {
        const killer = myDeath.killer?.puuid;
        traded = ks.some(k => k.victim?.puuid === killer && same(k.killer?.team, myTeam) && k.time_in_round_in_ms >= myDeath.time_in_round_in_ms && k.time_in_round_in_ms - myDeath.time_in_round_in_ms <= TRADE_MS);
      }
      for (const k of myKills) {
        const victim = k.victim?.puuid;
        if (ks.some(x => x.killer?.puuid === victim && same(x.victim?.team, myTeam) && x.victim?.puuid !== me && x.time_in_round_in_ms <= k.time_in_round_in_ms && k.time_in_round_in_ms - x.time_in_round_in_ms <= TRADE_MS)) s.avenger++;
        const w = k.weapon?.name;
        if (w && !/ability|ultimate/i.test(k.weapon?.type || '')) s.wpn[w] = (s.wpn[w] || 0) + 1;
      }
      const first = ks[0];
      const fb = first?.killer?.puuid === me ? 1 : 0, fd = first?.victim?.puuid === me ? 1 : 0;
      const kast = myKills.length || assisted || !myDeath || traded ? 1 : 0;

      // Dano do round, pelos eventos de dano.
      let dmg = 0;
      const rs = (r.stats || []).find(x => x.player?.puuid === me);
      for (const e of rs?.damage_events || []) dmg += e.damage || 0;

      // Clutch: ficou como último vivo do time com inimigo vivo.
      const alive = { mine: players.filter(p => same(p.team_id, myTeam)).map(p => p.puuid), theirs: players.filter(p => !same(p.team_id, myTeam)).map(p => p.puuid) };
      let clutch = 0;
      const check = () => { if (!clutch && alive.mine.length === 1 && alive.mine[0] === me && alive.theirs.length > 0) clutch = Math.min(alive.theirs.length, 5); };
      for (const k of ks) {
        const v = k.victim?.puuid;
        alive.mine = alive.mine.filter(x => x !== v);
        alive.theirs = alive.theirs.filter(x => x !== v);
        check();
      }
      if (clutch) (won ? s.cw : s.cl)[clutch - 1]++;

      const n = myKills.length;
      if (n === 3) s.k3++; else if (n === 4) s.k4++; else if (n >= 5) s.k5++;
      if (won) s.rw++;
      if (won && !ks.some(k => same(k.victim?.team, myTeam))) s.flawless++;
      if (r.plant?.player?.puuid === me) s.plants++;
      s.fb += fb; s.fd += fd; s.kast += kast; s.surv += myDeath ? 0 : 1; s.traded += traded ? 1 : 0;
      if (sd) { sd.r++; sd.rw += won ? 1 : 0; sd.k += n; sd.d += myDeath ? 1 : 0; sd.dmg += dmg; sd.kast += kast; sd.fb += fb; sd.fd += fd; }
    });
    out[id] = s;
  }

  return {
    id: meta.match_id, at: meta.started_at, season: meta.season?.id, short: meta.season?.short,
    map: meta.map?.name, len: meta.game_length_in_ms || 0, queue: meta.queue?.id || meta.queue?.name, p: out,
  };
}

/* ---------------- agregação do ato ---------------- */
function aggregate(list, id) {
  const ms = list.map(m => ({ m, s: m.p[id] })).filter(x => x.s);
  const sum = f => ms.reduce((a, x) => a + (f(x.s, x.m) || 0), 0);
  const n = ms.length;
  const W = sum(s => s.res === 'W'), L = sum(s => s.res === 'L'), T = sum(s => s.res === 'T');
  const R = sum(s => s.rounds), K = sum(s => s.k), D = sum(s => s.d), A = sum(s => s.a);
  const HS = sum(s => s.hs), BS = sum(s => s.bs), LS = sum(s => s.ls);
  const DMG = sum(s => s.dmg), DIN = sum(s => s.dmgIn), SC = sum(s => s.score);
  const FB = sum(s => s.fb), FD = sum(s => s.fd);
  const cw = i => sum(s => s.cw[i]), cl = i => sum(s => s.cl[i]);
  const sideStats = key => {
    const g = f => sum(s => f(s[key]));
    const r = g(x => x.r), d = g(x => x.d);
    return { kd: r3(div(g(x => x.k), d || 1)), win: r1(div(g(x => x.rw), r) * 100), adr: r1(div(g(x => x.dmg), r)), kast: r1(div(g(x => x.kast), r) * 100), fbpr: r3(div(g(x => x.fb), r)), fdpr: r3(div(g(x => x.fd), r)) };
  };
  const atk = sideStats('atk'), def = sideStats('def');
  const s = {
    matchesPlayed: n, matchesWon: W, matchesLost: L, matchesTied: T, matchesWinPct: r3(div(W, n) * 100),
    mVPs: sum(s => s.place === 1), roundsPlayed: R, roundsWinPct: r3(div(sum(s => s.rw), R) * 100),
    scorePerRound: r3(div(SC, R)), kills: K, deaths: D, assists: A,
    killsPerRound: r3(div(K, R)), deathsPerRound: r3(div(D, R)), assistsPerRound: r3(div(A, R)),
    kDRatio: r3(div(K, D || 1)), kDARatio: r3(div(K + A, D || 1)),
    damagePerRound: r3(div(DMG, R)), damageDeltaPerRound: r3(div(DMG - DIN, R)),
    headshotsPercentage: r3(div(HS, HS + BS + LS) * 100), dealtHeadshots: HS, dealtBodyshots: BS, dealtLegshots: LS,
    firstBloods: FB, firstDeaths: FD, firstBloodsPerRound: r3(div(FB, R)), firstDeathsPerRound: r3(div(FD, R)),
    survived: sum(s => s.surv), traded: sum(s => s.traded), tradesAvenger: sum(s => s.avenger),
    kAST: r3(div(sum(s => s.kast), R) * 100), mostKillsInMatch: ms.reduce((a, x) => Math.max(a, x.s.k), 0),
    flawless: sum(s => s.flawless), aces: sum(s => s.k5),
    clutches: [0, 1, 2, 3, 4].reduce((a, i) => a + cw(i), 0), clutchesLost: [0, 1, 2, 3, 4].reduce((a, i) => a + cl(i), 0),
    ...Object.fromEntries([1, 2, 3, 4, 5].flatMap(k => [[`clutches1v${k}`, cw(k - 1)], [`clutchesLost1v${k}`, cl(k - 1)]])),
    kills3K: sum(s => s.k3), kills4K: sum(s => s.k4), kills5K: sum(s => s.k5),
    esr: r3(div(FB, FB + FD)), plantsPerRound: r3(div(sum(s => s.plants), R)),
    attackKDRatio: atk.kd, attackRoundsWinPct: atk.win, attackDamagePerRound: atk.adr, attackKAST: atk.kast,
    attackFirstBloodsPerRound: atk.fbpr, attackFirstDeathsPerRound: atk.fdpr,
    defenseKDRatio: def.kd, defenseRoundsWinPct: def.win, defenseDamagePerRound: def.adr, defenseKAST: def.kast,
    defenseFirstBloodsPerRound: def.fbpr, defenseFirstDeathsPerRound: def.fdpr,
    timePlayed: Math.round(ms.reduce((a, x) => a + x.m.len, 0) / 1000),
  };
  return { s, ms };
}

function groupStats(ms, keyOf) {
  const g = new Map();
  for (const { s } of ms) {
    const k = keyOf(s); if (!k) continue;
    const o = g.get(k) || { m: 0, w: 0, l: 0, k: 0, d: 0, dmg: 0, score: 0, r: 0 };
    o.m++; o.w += s.res === 'W'; o.l += s.res === 'L'; o.k += s.k; o.d += s.d; o.dmg += s.dmg; o.score += s.score; o.r += s.rounds;
    g.set(k, o);
  }
  return [...g.entries()].map(([n, o]) => ({ n, ...o, wr: r1(div(o.w, o.m) * 100), kd: r3(div(o.k, o.d || 1)), adr: r1(div(o.dmg, o.r)), acs: r1(div(o.score, o.r)) }))
    .sort((a, b) => b.m - a.m);
}

/* ---------------- papéis e cores dos agentes ---------------- */
async function agentInfo(names, existing) {
  const info = {};
  for (const p of Object.values(existing?.players || {})) for (const a of p.agents || []) if (a.r) info[a.n] = { r: a.r, c: a.c };
  if (names.every(n => info[n])) return info;
  try {
    const j = await (await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true')).json();
    for (const a of j.data || []) {
      if (info[a.displayName]) continue;
      const c = (a.backgroundGradientColors || [])[0];
      info[a.displayName] = { r: a.role?.displayName, c: c ? '#' + c.slice(0, 6).toUpperCase() : '#888888' };
    }
  } catch (e) { console.log('   aviso: não consegui buscar os papéis dos agentes:', e.message); }
  return info;
}

/* ---------------- ponto de partida do Tracker.gg ---------------- */
const V = x => (Array.isArray(x) ? x[0] : x);
const SUM_KEYS = ['matchesPlayed', 'matchesWon', 'matchesLost', 'matchesTied', 'mVPs', 'roundsPlayed', 'kills', 'deaths', 'assists',
  'dealtHeadshots', 'dealtBodyshots', 'dealtLegshots', 'firstBloods', 'firstDeaths', 'survived', 'traded', 'tradesAvenger',
  'flawless', 'aces', 'clutches', 'clutchesLost', 'kills3K', 'kills4K', 'kills5K',
  ...[1, 2, 3, 4, 5].flatMap(k => [`clutches1v${k}`, `clutchesLost1v${k}`])];
const ROUND_KEYS = ['scorePerRound', 'damagePerRound', 'damageDeltaPerRound', 'kAST', 'roundsWinPct', 'plantsPerRound',
  ...['attack', 'defense'].flatMap(p => ['KDRatio', 'RoundsWinPct', 'DamagePerRound', 'KAST', 'FirstBloodsPerRound', 'FirstDeathsPerRound'].map(k => p + k))];

// Soma as partidas novas aos números do ponto de partida. Médias por round são ponderadas pelos rounds.
function mergeStats(bs, ns, baseSec) {
  const b = k => V(bs[k]) ?? 0;
  const o = {};
  for (const k of SUM_KEYS) o[k] = b(k) + (ns[k] || 0);
  const Rb = b('roundsPlayed'), Rn = ns.roundsPlayed, R = Rb + Rn;
  for (const k of ROUND_KEYS) o[k] = r3(div(b(k) * Rb + (ns[k] || 0) * Rn, R));
  Object.assign(o, {
    matchesWinPct: r3(div(o.matchesWon, o.matchesPlayed) * 100), mostKillsInMatch: Math.max(b('mostKillsInMatch'), ns.mostKillsInMatch),
    killsPerRound: r3(div(o.kills, R)), deathsPerRound: r3(div(o.deaths, R)), assistsPerRound: r3(div(o.assists, R)),
    kDRatio: r3(div(o.kills, o.deaths || 1)), kDARatio: r3(div(o.kills + o.assists, o.deaths || 1)),
    headshotsPercentage: r3(div(o.dealtHeadshots, o.dealtHeadshots + o.dealtBodyshots + o.dealtLegshots) * 100),
    firstBloodsPerRound: r3(div(o.firstBloods, R)), firstDeathsPerRound: r3(div(o.firstDeaths, R)),
    esr: r3(div(o.firstBloods, o.firstBloods + o.firstDeaths)), timePlayed: baseSec + ns.timePlayed,
  });
  return o;
}
// Junta listas por nome (agentes, funções): partidas somam, médias ponderadas pelas partidas.
function mergeGroups(base, add) {
  const map = new Map((base || []).map(x => [x.n, { ...x }]));
  for (const x of add) {
    const b = map.get(x.n);
    if (!b) { map.set(x.n, { ...x }); continue; }
    const m = b.m + x.m, w = (k, d) => (b[k] == null ? undefined : Math.round(div(b[k] * b.m + x[k] * x.m, m) * 10 ** d) / 10 ** d);
    map.set(x.n, { ...b, m, wr: w('wr', 1), kd: w('kd', 3), adr: w('adr', 1), acs: w('acs', 1) });
  }
  return [...map.values()].sort((x, y) => y.m - x.m);
}
const actKey = a => { const m = /^(E|V)(\d+):\s*A(\d+)/.exec(a || ''); if (!m) return 0; return m[1] === 'E' ? +m[2] * 10 + +m[3] : 100 + (+m[2] - 25) * 10 + +m[3]; };

if (process.argv.includes('--base')) {
  const d = readJSON('squad-data.json');
  const players = Object.fromEntries(Object.keys(SQUAD).map(id => {
    const p = d.players[id];
    return [id, { s: p.s, playtime: p.playtime, agents: p.agents, agentCount: p.agentCount, roles: p.roles, maps: p.maps, weapons: p.weapons }];
  }));
  writeJSON(BASE_FILE, { season: d.seasonId, act: d.act, at: d.updatedAt, players, teammates: d.teammates?.l4 || [] });
  console.log(`ponto de partida gravado em ${BASE_FILE}: ${d.act}, números de ${d.updatedAt}`);
  process.exit(0);
}

/* ---------------- execução ---------------- */
const cacheFile = 'match-cache.json';
const cache = readJSON(cacheFile) || { matches: {} };
const existing = readJSON('squad-data.json');
fs.mkdirSync(P('raw'), { recursive: true });

const accounts = {};
for (const [id, riot] of Object.entries(SQUAD)) {
  const a = (await get(`/valorant/v2/account/${riotPath(riot)}`)).data;
  accounts[id] = { riot, puuid: a.puuid, region: REGION, level: a.account_level };
  console.log(`conta ${id}: ${riot}, nível ${a.account_level}`);
}
const puuidToId = Object.fromEntries(Object.entries(accounts).map(([id, a]) => [a.puuid, id]));
const add = m => {
  if (!m?.metadata?.match_id) return false;
  if (m.metadata.is_completed === false) return false;
  cache.matches[m.metadata.match_id] = summarize(m, puuidToId);
  return true;
};

// 1) Partidas recentes com todos os detalhes, de 10 em 10, até achar uma que já está no cache.
// Para também quando chega numa partida de um ato anterior.
const listPage = (a, start) => get(`/valorant/v4/matches/${a.region}/${PLATFORM}/${riotPath(a.riot)}`, { mode: MODE, size: 10, start }).then(j => j.data || []);
const firstPages = {};
for (const [id, a] of Object.entries(accounts)) firstPages[id] = await listPage(a, 0);
const curSeason = Object.values(firstPages).flat().sort((x, y) => String(y.metadata?.started_at).localeCompare(String(x.metadata?.started_at)))[0]?.metadata?.season?.id;
let fetched = 0;
for (const [id, a] of Object.entries(accounts)) {
  for (let start = 0; start < 200; start += 10) {
    const page = start === 0 ? firstPages[id] : await listPage(a, start);
    let known = false;
    for (const m of page) {
      if (m.metadata?.season?.id !== curSeason) { known = true; continue; }
      const c = cache.matches[m.metadata?.match_id];
      if (c && c.p[id]) { known = true; continue; }
      if (add(m)) fetched++;
    }
    if (known || page.length < 10) break;
  }
}

// 2) Partidas antigas do ato que a API guardou e ainda não estão no cache.
const newest = Object.values(cache.matches).sort((x, y) => String(y.at).localeCompare(String(x.at)))[0];
const season = curSeason ?? newest?.season;
for (const [id, a] of Object.entries(accounts)) {
  let stored = [];
  try { stored = (await get(`/valorant/v1/stored-matches/${a.region}/${riotPath(a.riot)}`, { mode: MODE })).data || []; }
  catch (e) { console.log(`   aviso: lista de partidas guardadas de ${id} falhou: ${e.message}`); }
  const missing = stored.filter(x => x.meta?.season?.id === season && !cache.matches[x.meta.id]?.p[id]).map(x => x.meta.id);
  if (missing.length) console.log(`${id}: baixando ${missing.length} partidas antigas do ato`);
  for (const mid of missing) {
    if (cache.matches[mid]?.p[id]) continue; // veio junto com a de outro jogador
    try { if (add((await get(`/valorant/v4/match/${a.region}/${mid}`)).data)) fetched++; }
    catch (e) { console.log(`   aviso: partida ${mid} falhou: ${e.message}`); }
  }
}

// 2b) RR ganho ou perdido em cada partida. A API só guarda as mais recentes; no cache elas ficam para sempre.
let rrSet = 0;
for (const [id, a] of Object.entries(accounts)) {
  let hist = [];
  try { hist = (await get(`/valorant/v1/stored-mmr-history/${a.region}/${riotPath(a.riot)}`)).data || []; }
  catch (e) { console.log(`   aviso: histórico de RR de ${id} falhou: ${e.message}`); }
  // Partidas do ato que estão no histórico de RR mas não vieram nas listas de partidas.
  const missing = hist.filter(h => h.season?.id === season && h.match_id && !cache.matches[h.match_id]?.p[id]).map(h => h.match_id);
  if (missing.length) console.log(`${id}: baixando ${missing.length} partidas que só apareceram no histórico de RR`);
  for (const mid of missing) {
    if (cache.matches[mid]?.p[id]) continue;
    try { if (add((await get(`/valorant/v4/match/${a.region}/${mid}`)).data)) fetched++; }
    catch (e) { console.log(`   aviso: partida ${mid} falhou: ${e.message}`); }
  }
  for (const h of hist) {
    const s = cache.matches[h.match_id]?.p[id];
    if (!s || typeof h.last_mmr_change !== 'number') continue;
    if (s.rr !== h.last_mmr_change || s.elo !== h.elo) { s.rr = h.last_mmr_change; s.elo = h.elo; rrSet++; }
  }
}
if (rrSet) console.log(`RR por partida: ${rrSet} partidas atualizadas`);

// Grava o cache (uma partida por linha, para o diff do git ficar legível).
const ids = Object.keys(cache.matches).sort((x, y) => String(cache.matches[y].at).localeCompare(String(cache.matches[x].at)));
fs.writeFileSync(P(cacheFile), '{"matches":{\n' + ids.map(k => JSON.stringify(k) + ':' + JSON.stringify(cache.matches[k])).join(',\n') + '\n}}\n');

const seasonMatches = ids.map(k => cache.matches[k]).filter(m => m.season === season);
const act = actName(seasonMatches[0]?.short);
const baseRaw = readJSON(BASE_FILE);
const base = baseRaw && baseRaw.season === season ? baseRaw : null;
const cut = base ? Date.parse(base.at) : -Infinity;
const newMatches = seasonMatches.filter(m => Date.parse(m.at) > cut);
console.log(`ato ${act} (${season}): ${seasonMatches.length} partidas no cache, ${fetched} baixadas agora, ${calls} chamadas à API`);
if (base) console.log(`ponto de partida do Tracker.gg em ${base.at}: ${newMatches.length} partidas depois dele`);

// 3) Números do ato, elo atual, pico e histórico por ato.
const profile = {};
const allAgents = new Set(seasonMatches.flatMap(m => Object.values(m.p).map(s => s.agent)).filter(Boolean));
const agents = await agentInfo([...allAgents], existing);
for (const [id, a] of Object.entries(accounts)) {
  const mmr = (await get(`/valorant/v3/mmr/${a.region}/${PLATFORM}/${riotPath(a.riot)}`)).data || {};
  const all = aggregate(seasonMatches, id).ms;
  const fresh = aggregate(newMatches, id);
  const b = base?.players?.[id];
  if (!all.length && !b) { console.log(`${id}: nenhuma partida competitiva no ato`); continue; }
  const agNew = groupStats(fresh.ms, x => x.agent), rolesNew = groupStats(fresh.ms, x => agents[x.agent]?.r);

  let s, ag, roles, agentCount;
  if (b) {
    // Sem partida nova, os números do Tracker.gg ficam exatamente como estavam (com percentis e Tracker Score).
    s = fresh.ms.length ? mergeStats(b.s, fresh.s, (b.playtime || 0) * 3600) : { ...b.s, timePlayed: (b.playtime || 0) * 3600 };
    ag = mergeGroups(b.agents, agNew); roles = mergeGroups(b.roles, rolesNew);
    agentCount = Math.max(b.agentCount || 0, ag.length);
  } else {
    s = fresh.s; ag = agNew; roles = rolesNew; agentCount = ag.length;
  }
  profile[a.riot] = {
    season, seasonName: act, level: a.level,
    rank: mmr.current?.tier?.name, peak: mmr.peak?.tier?.name,
    // Mesmo pico que o site já mostra: mantém o ato de lá (as duas fontes às vezes discordam de qual ato foi).
    peakAct: existing?.players?.[id]?.peak === mmr.peak?.tier?.name && existing?.players?.[id]?.peakAct ? existing.players[id].peakAct : actName(mmr.peak?.season?.short),
    s, agentCount,
    agents: ag.slice(0, 6).map(x => ({ n: x.n, r: x.r || agents[x.n]?.r, c: x.c || agents[x.n]?.c, m: x.m, wr: x.wr, kd: x.kd, adr: x.adr, acs: x.acs })),
    roles: roles.map(x => ({ n: x.n, m: x.m, wr: x.wr, kd: x.kd })),
  };

  // Elo de cada ato: os atos que já estão no site ficam como estão (o Tracker.gg e a API medem o elo do ato de
  // jeitos diferentes); a API só acrescenta atos mais novos. O ato atual usa o elo de agora.
  const old = existing?.players?.[id]?.history || [];
  const last = Math.max(0, ...old.filter(h => h[0] !== act).map(h => actKey(h[0])));
  const hist = new Map(old.map(h => [h[0], h]));
  for (const x of mmr.seasonal || []) {
    const name = actName(x.season?.short), tier = x.end_tier?.name;
    if (!name || !tier || /unrated|unranked/i.test(tier) || !x.games || actKey(name) <= last || hist.has(name)) continue;
    hist.set(name, [name, tier, r1(div(x.wins, x.games) * 100)]);
  }
  if (act && mmr.current?.tier?.name && !/unrated/i.test(mmr.current.tier.name)) hist.set(act, [act, mmr.current.tier.name, r1(V(s.matchesWinPct))]);
  const history = [...hist.values()].sort((x, y) => actKey(x[0]) - actKey(y[0]));
  writeJSON(`raw/performance-${id}.json`, { ok: history.length > 0, kind: 'performance', source: 'henrikdev', history });

  // Mapas, armas e últimas partidas.
  // O Tracker.gg conta empate no win rate (w ÷ partidas); os empates do ponto de partida saem do próprio wr.
  const maps = new Map((b?.maps || []).map(o => [o.n, { n: o.n, w: o.w, l: o.l, t: o.wr ? Math.max(0, Math.round(o.w * 100 / o.wr) - o.w - o.l) : 0, wr: o.wr }]));
  for (const { s: x, m } of fresh.ms) {
    const o = maps.get(m.map) || { n: m.map, w: 0, l: 0, t: 0 };
    o.w += x.res === 'W'; o.l += x.res === 'L'; o.t += x.res === 'T'; o.wr = r1(div(o.w, o.w + o.l + o.t) * 100);
    maps.set(m.map, o);
  }
  const wpn = new Map((b?.weapons || []).map(w => [w.n, { ...w }]));
  for (const { s: x } of fresh.ms) for (const [n, k] of Object.entries(x.wpn)) { const w = wpn.get(n) || { n, k: 0 }; w.k += k; wpn.set(n, w); }
  // RR médio por vitória e por derrota no ato: a diferença entre os dois mostra se o MMR está acima ou abaixo do elo.
  // Derrota sem perda (proteção de queda) e empate ficam de fora.
  const avg = xs => (xs.length ? r1(xs.reduce((t, x) => t + x, 0) / xs.length) : null);
  const won = all.filter(({ s: x }) => x.res === 'W' && x.rr > 0).map(({ s: x }) => x.rr);
  const lost = all.filter(({ s: x }) => x.res === 'L' && x.rr < 0).map(({ s: x }) => -x.rr);
  const rrNow = typeof mmr.current?.rr === 'number' ? mmr.current.rr : all.find(({ s: x }) => x.elo != null)?.s.elo % 100;
  writeJSON(`raw/overview-${id}.json`, {
    ok: true, kind: 'overview', source: 'henrikdev', act,
    rr: { w: avg(won), l: avg(lost), nw: won.length, nl: lost.length, now: rrNow ?? null },
    maps: [...maps.values()].sort((x, y) => y.wr - x.wr).map(({ n, wr, w, l }) => ({ n, wr, w, l })),
    weapons: [...wpn.values()].sort((x, y) => y.k - x.k).slice(0, 3),
    recent: all.slice(0, 20).map(({ s: x, m }) => [m.map, x.us, x.them, ord(x.place), x.k, x.d, x.a,
      Math.round(div(x.dmg - x.dmgIn, x.rounds)), Math.round(div(x.hs, x.hs + x.bs + x.ls) * 100), Math.round(div(x.score, x.rounds)), x.rr ?? null]),
  });
  console.log(`${id}: ${mmr.current?.tier?.name}, ${V(s.matchesPlayed)} partidas no ato (${fresh.ms.length} da HenrikDev), K/D ${V(s.kDRatio)}`);
}
writeJSON('raw/profile.json', profile);

// 4) Parceiros de time do Marlon no ato.
const l4 = aggregate(newMatches, 'l4').ms;
const teammates = Object.keys(SQUAD).filter(id => id !== 'l4').map(id => {
  const [nick, tag] = SQUAD[id].split('#');
  const together = l4.filter(({ s, m }) => m.p[id] && same(m.p[id].team, s.team)).map(({ m }) => m.p[id]);
  const k = together.reduce((a, x) => a + x.k, 0), d = together.reduce((a, x) => a + x.d, 0);
  const n = together.length, b = base?.teammates?.find(t => t.nick === nick);
  const bm = b?.m || 0, m = bm + n;
  return {
    nick, tag, m,
    kd: Math.round(div((b?.kd || 0) * bm + div(k, d || 1) * n, m) * 100) / 100,
    place: r1(div((b?.place || 0) * bm + together.reduce((a, x) => a + x.place, 0), m)),
    wr: r1(div((b?.wr || 0) * bm + together.filter(x => x.res === 'W').length * 100, m)),
  };
}).filter(t => t.m > 0);
writeJSON('raw/matches-l4.json', { ok: teammates.length > 0, kind: 'matches', source: 'henrikdev', teammates });
console.log('pronto: agora rode  node tools/build-data.mjs');

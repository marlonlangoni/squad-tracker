// Carrega squad-data.json e calcula tudo que as telas precisam.
const BASE = import.meta.env.BASE_URL;

export const PLAYERS = [
  { id: 'l4', name: 'Marlon', nick: 'L4ngoni', tag: '1989', color: '#ff8a3d' },
  { id: 'mt', name: 'Henrique', nick: 'Mattin', tag: '1993', color: '#4fb3ff' },
  { id: 'sd', name: 'Douglas', nick: 'Snoop Dogglas', tag: '2908', color: '#c084fc' },
];

export const slug = n => {
  const s = String(n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return { sky: 'skye', 'kay-o': 'kayo' }[s] || s;
};
export const asset = {
  pose: a => `${BASE}assets/agents/pose/${slug(a)}.webp`,
  poseTrim: a => `${BASE}assets/agents/pose-trim/${slug(a)}.webp`,
  player: id => `${BASE}assets/players/${id}.webp`,
  portrait: a => `${BASE}assets/agents/portrait/${slug(a)}.webp`,
  role: r => `${BASE}assets/roles/${slug(r)}.webp`,
  rank: r => `${BASE}assets/ranks/${slug(r)}.webp`,
  map: m => `${BASE}assets/maps/${slug(m)}.webp`,
  mapThumb: m => `${BASE}assets/maps/thumb/${slug(m)}.webp`,
  weapon: w => `${BASE}assets/weapons/${slug(w)}.webp`,
};

const V = x => (Array.isArray(x) ? x[0] : x);
const P = x => (Array.isArray(x) ? x[1] : null);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const TIERS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant'];
const TIERS_PT = { Iron: 'Ferro', Bronze: 'Bronze', Silver: 'Prata', Gold: 'Ouro', Platinum: 'Platina', Diamond: 'Diamante', Ascendant: 'Ascendente', Immortal: 'Imortal', Radiant: 'Radiante' };
export const ROLES_PT = { Duelist: 'Duelista', Initiator: 'Iniciador', Controller: 'Controlador', Sentinel: 'Sentinela' };

export const rankPT = r => { const [t, d] = String(r || '').split(' '); return (TIERS_PT[t] || t) + (d ? ' ' + d : ''); };
const rIdx = r => { const [t, d] = String(r || '').split(' '); const ti = TIERS.indexOf(t); if (ti < 0) return null; if (t === 'Radiant') return 24; return ti * 3 + (+d || 1) - 1; };
const rName = i => { i = Math.floor(i); if (i >= 24) return 'Radiant'; i = Math.max(0, i); return TIERS[Math.floor(i / 3)] + ' ' + ((i % 3) + 1); };
const actKey = a => { const m = /^(E|V)(\d+):\s*A(\d+)/.exec(a || ''); if (!m) return 0; return m[1] === 'E' ? +m[2] * 10 + +m[3] : 100 + (+m[2] - 25) * 10 + +m[3]; };

function estimateMMR(p, act, d) {
  const base = rIdx(p.rank) + 0.5;
  const form = clamp((d.win - 50) * 0.15, -1, 1);
  const perf = clamp((((d.ddP ?? 50) + (d.kdP ?? 50)) / 2 - 50) / 50 * 0.6, -0.6, 0.6);
  const prev = (p.history || []).filter(h => h[0] !== act).sort((a, b) => actKey(a[0]) - actKey(b[0])).slice(-6)
    .map(h => rIdx(h[1])).filter(x => x != null).sort((a, b) => a - b);
  const med = prev.length ? (prev.length % 2 ? prev[(prev.length - 1) / 2] : (prev[prev.length / 2 - 1] + prev[prev.length / 2]) / 2) + 0.5 : base;
  const hist = clamp((med - base) * 0.25, -1, 1);
  const est = base + form + perf + hist;
  const diff = est - base;
  return {
    est, diff, rank: rName(est), rankPT: rankPT(rName(est)),
    verdict: diff >= 0.6 ? 'acima' : diff <= -0.6 ? 'abaixo' : 'perto',
    pos: (() => { const f = est - Math.floor(est); return f < 0.34 ? 'começo' : f < 0.67 ? 'meio' : 'final'; })(),
  };
}

function derive(p, act) {
  const s = p.s, v = k => V(s[k]);
  const d = {
    matches: v('matchesPlayed'), wins: v('matchesWon'), losses: v('matchesLost'), ties: v('matchesTied'),
    win: v('matchesWinPct'), winP: P(s.matchesWinPct),
    kd: v('kDRatio'), kdP: P(s.kDRatio),
    adr: v('damagePerRound'), adrP: P(s.damagePerRound),
    dd: v('damageDeltaPerRound'), ddP: P(s.damageDeltaPerRound),
    hs: v('headshotsPercentage'), hsP: P(s.headshotsPercentage),
    kast: v('kAST'), kastP: P(s.kAST),
    acs: v('scorePerRound'), acsP: P(s.scorePerRound),
    trn: v('trnPerformanceScore'),
    mvps: v('mVPs'), aces: v('aces'),
    kills: v('kills'), deaths: v('deaths'), assists: v('assists'),
    rounds: v('roundsPlayed'), rwin: v('roundsWinPct'), rwinP: P(s.roundsWinPct),
    kpr: v('killsPerRound'), fbpr: v('firstBloodsPerRound'), fdpr: v('firstDeathsPerRound'),
    fb: v('firstBloods'), fd: v('firstDeaths'),
    mostKills: v('mostKillsInMatch'), flawless: v('flawless'),
    k3: v('kills3K'), k4: v('kills4K'), k5: v('kills5K'),
    atkKD: v('attackKDRatio'), defKD: v('defenseKDRatio'),
    atkADR: v('attackDamagePerRound'), defADR: v('defenseDamagePerRound'),
    atkWin: v('attackRoundsWinPct'), defWin: v('defenseRoundsWinPct'),
    atkKAST: v('attackKAST'), defKAST: v('defenseKAST'),
  };
  const c = v('clutches') || 0, cl = v('clutchesLost') || 0;
  const tot = v('dealtHeadshots') + v('dealtBodyshots') + v('dealtLegshots');
  Object.assign(d, {
    esr: d.fb / (d.fb + d.fd) * 100,
    clutchesWon: c, clutchesLost: cl, clutch: c + cl ? c / (c + cl) * 100 : null,
    clutchBy: [1, 2, 3, 4, 5].map(n => ({ n, w: v('clutches1v' + n) || 0, l: v('clutchesLost1v' + n) || 0 })),
    multi: (d.k3 + d.k4 + d.k5) / d.matches,
    surv: v('survived') / d.rounds * 100,
    traded: v('traded') / d.deaths * 100,
    mvp: d.mvps / d.matches * 100,
    head: v('dealtHeadshots') / tot * 100, body: v('dealtBodyshots') / tot * 100, leg: v('dealtLegshots') / tot * 100,
  });
  d.mmr = estimateMMR(p, act, d);
  d.mmr.base = rIdx(p.rank);
  d.mmr.peak = rIdx(p.peak);
  return d;
}

// Métricas usadas no perfil, nas comparações e no glossário.
// low: menor é melhor. pk: chave do percentil no Tracker (quando existe).
export const METRICS = {
  trn: { l: 'Tracker Score', d: 0, g: 'Nota geral de desempenho do Tracker.gg (0 a 1000).' },
  win: { l: 'Vitórias', d: 1, u: '%', pk: 'winP', g: 'Porcentagem de partidas vencidas no ato.' },
  rwin: { l: 'Rounds vencidos', d: 1, u: '%', pk: 'rwinP', g: 'Porcentagem de rounds vencidos.' },
  kd: { l: 'K/D', d: 2, pk: 'kdP', g: 'Abates divididos por mortes.' },
  adr: { l: 'ADR', d: 1, pk: 'adrP', g: 'Dano médio causado por round.' },
  dd: { l: 'DDΔ', d: 1, pk: 'ddP', g: 'Dano causado menos dano recebido, por round. Positivo = ganha as trocas de dano.' },
  hs: { l: 'HS%', d: 1, u: '%', pk: 'hsP', g: 'Porcentagem dos acertos que pegam na cabeça.' },
  kast: { l: 'KAST', d: 1, u: '%', pk: 'kastP', g: 'Rounds em que teve abate, assistência, sobreviveu ou foi trocado.' },
  acs: { l: 'ACS', d: 0, pk: 'acsP', g: 'Pontuação média de combate por round.' },
  fbpr: { l: 'First Bloods/round', d: 3, g: 'Quantas vezes por round abre o confronto matando primeiro.' },
  fdpr: { l: 'First Deaths/round', d: 3, low: true, g: 'Quantas vezes por round é o primeiro a morrer.' },
  esr: { l: 'Sucesso na entrada', d: 1, u: '%', g: 'Dos duelos de abertura que participou, quantos venceu (FB ÷ (FB + FD)).' },
  clutch: { l: 'Clutches vencidos', d: 1, u: '%', g: 'Rounds vencidos quando era o último vivo do time.' },
  multi: { l: 'Multi-kills/partida', d: 2, g: 'Rounds com 3 ou mais abates, por partida.' },
  surv: { l: 'Sobrevivência', d: 1, u: '%', g: 'Rounds em que terminou vivo.' },
  mvp: { l: 'MVPs', d: 1, u: '%', g: 'Porcentagem das partidas em que foi o melhor do jogo.' },
  atkKD: { l: 'K/D no ataque', d: 2, g: 'K/D só nos rounds de ataque.' },
  defKD: { l: 'K/D na defesa', d: 2, g: 'K/D só nos rounds de defesa.' },
};

const pctText = p => (p >= 50 ? `top ${Math.max(1, 100 - p)}%` : `abaixo de ${100 - p}% dos jogadores`);
export const fmt = (v, d = 0) => (v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));

const SW_KEYS = ['trn', 'win', 'kd', 'adr', 'dd', 'hs', 'kast', 'acs', 'fbpr', 'fdpr', 'esr', 'clutch', 'multi', 'surv', 'mvp'];

// Pontos fortes e onde melhorar: percentil no Tracker + comparação com o trio.
function analyze(players, me) {
  const strengths = [], weaknesses = [];
  for (const k of SW_KEYS) {
    const m = METRICS[k], v = me.d[k];
    if (v == null || Number.isNaN(v)) continue;
    const vals = players.map(p => p.d[k]).filter(x => x != null && !Number.isNaN(x));
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const better = m.low ? v <= Math.min(...vals) : v >= Math.max(...vals);
    const worse = m.low ? v >= Math.max(...vals) : v <= Math.min(...vals);
    const rel = mean ? ((v - mean) / Math.abs(mean)) * (m.low ? -1 : 1) : 0;
    const pc = m.pk ? me.d[m.pk] : null;
    const item = { k, label: m.l, val: fmt(v, m.d) + (m.u || ''), pc };
    if (pc != null) {
      if (pc >= 70) strengths.push({ ...item, score: pc + (better ? 6 : 0), why: `${pctText(pc)} no Tracker.gg${better ? ' e o melhor do trio' : ''}.` });
      else if (pc <= 38) weaknesses.push({ ...item, score: 100 - pc + (worse ? 6 : 0), why: `${pctText(pc)} no Tracker.gg${worse ? ' e o mais baixo do trio' : ''}.` });
      else if (better && rel > 0.08) strengths.push({ ...item, score: 55 + rel * 100, why: `Melhor do trio (${pctText(pc)} no Tracker.gg).` });
      else if (worse && rel < -0.08) weaknesses.push({ ...item, score: 55 - rel * 100, why: `O mais baixo do trio (${pctText(pc)} no Tracker.gg).` });
    } else if (better && rel > 0.07) strengths.push({ ...item, score: 60 + Math.min(rel, 0.6) * 60, why: `Melhor do trio, ${Math.round(rel * 100)}% acima da média de vocês.` });
    else if (worse && rel < -0.07) weaknesses.push({ ...item, score: 60 + Math.min(-rel, 0.6) * 60, why: `O mais baixo do trio, ${Math.round(-rel * 100)}% abaixo da média de vocês.` });
  }
  const roles = (me.roles || []).filter(r => r.m >= 8).sort((a, b) => b.wr - a.wr);
  if (roles.length > 1) {
    const best = roles[0], worst = roles[roles.length - 1];
    if (best.wr >= 55) strengths.push({ k: 'role', label: `Função: ${ROLES_PT[best.n] || best.n}`, val: fmt(best.wr, 1) + '%', score: 58, why: `Melhor função em ${best.m} partidas (K/D ${fmt(best.kd, 2)}).` });
    if (worst.wr < 45) weaknesses.push({ k: 'role', label: `Função: ${ROLES_PT[worst.n] || worst.n}`, val: fmt(worst.wr, 1) + '%', score: 58, why: `Vitórias baixas em ${worst.m} partidas com essa função.` });
  }
  if (weaknesses.length < 2) {
    const low = SW_KEYS.filter(k => METRICS[k].pk && me.d[METRICS[k].pk] != null && me.d[METRICS[k].pk] < 62 && !weaknesses.some(w => w.k === k) && !strengths.some(s => s.k === k))
      .sort((a, b) => me.d[METRICS[a].pk] - me.d[METRICS[b].pk]).slice(0, 2 - weaknesses.length);
    for (const k of low) weaknesses.push({ k, label: METRICS[k].l, val: fmt(me.d[k], METRICS[k].d) + (METRICS[k].u || ''), pc: me.d[METRICS[k].pk], score: 40, why: `Percentil mais baixo dele (${pctText(me.d[METRICS[k].pk])}): o próximo degrau.` });
    if (me.d.atkKD < me.d.defKD * 0.93 && weaknesses.length < 3) weaknesses.push({ k: 'atkKD', label: 'K/D no ataque', val: fmt(me.d.atkKD, 2), score: 38, why: `Rende menos atacando do que defendendo (K/D ${fmt(me.d.defKD, 2)} na defesa).` });
  }
  strengths.sort((a, b) => b.score - a.score); weaknesses.sort((a, b) => b.score - a.score);
  return { strengths: strengths.slice(0, 4), weaknesses: weaknesses.slice(0, 4) };
}

// Grupos de métricas do Versus 1×1 (na ordem em que aparecem).
export const VS_GROUPS = [
  { t: 'Resultado', keys: ['win', 'rwin', 'trn'] },
  { t: 'Combate', keys: ['kd', 'adr', 'dd', 'acs', 'hs', 'kast'] },
  { t: 'Duelos', keys: ['fbpr', 'fdpr', 'esr', 'clutch', 'atkKD', 'defKD'] },
  { t: 'Impacto', keys: ['multi', 'mvp', 'surv'] },
];

// Quem vence uma métrica: 1 = a, -1 = b, 0 = empate (diferença menor que 0,5%).
export function cmp(k, a, b) {
  const m = METRICS[k], va = a.d[k], vb = b.d[k];
  if (va == null || vb == null || Number.isNaN(va) || Number.isNaN(vb)) return 0;
  if (Math.abs(va - vb) <= Math.max(Math.abs(va), Math.abs(vb)) * 0.005) return 0;
  return (va > vb) !== !!m.low ? 1 : -1;
}

// Títulos do squad: cada um vai para quem lidera a métrica.
export const TITLES = [
  { k: 'trn', t: 'Motor do time', ico: '◆', why: 'Maior Tracker Score do trio' },
  { k: 'kd', t: 'Exterminador', ico: '✕', why: 'Melhor K/D' },
  { k: 'hs', t: 'Rei do HS%', ico: '◎', why: 'Mais tiros na cabeça' },
  { k: 'adr', t: 'Canhão de dano', ico: '✹', why: 'Mais dano por round' },
  { k: 'dd', t: 'Dono das trocas', ico: '⇄', why: 'Melhor saldo de dano (DDΔ)' },
  { k: 'fbpr', t: 'Abre-alas', ico: '➤', why: 'Mais First Bloods por round' },
  { k: 'clutch', t: 'Sangue frio', ico: '❄', why: 'Mais clutches vencidos' },
  { k: 'kast', t: 'Presença constante', ico: '●', why: 'Maior KAST' },
  { k: 'win', t: 'Pé quente', ico: '▲', why: 'Maior taxa de vitórias' },
  { k: 'mvp', t: 'MVP de carteirinha', ico: '★', why: 'Mais partidas como MVP' },
  { k: 'multi', t: 'Multi-kill', ico: '≡', why: 'Mais rounds com 3+ abates' },
  { k: 'surv', t: 'Sobrevivente', ico: '♥', why: 'Termina mais rounds vivo' },
  { k: 'defKD', t: 'Muralha da defesa', ico: '▣', why: 'Melhor K/D defendendo' },
  { k: 'atkKD', t: 'Rolo compressor', ico: '▶', why: 'Melhor K/D atacando' },
];

const RANK_KEYS = [...new Set(VS_GROUPS.flatMap(g => g.keys))];

// Classificação geral: 3 pontos para o 1º de cada métrica, 2 para o 2º, 1 para o 3º.
export function standings(players) {
  const pts = Object.fromEntries(players.map(p => [p.id, { p, pts: 0, firsts: 0 }]));
  const byKey = {};
  for (const k of RANK_KEYS) {
    const m = METRICS[k];
    const order = players.filter(p => p.d[k] != null && !Number.isNaN(p.d[k]))
      .sort((a, b) => (m.low ? a.d[k] - b.d[k] : b.d[k] - a.d[k]));
    byKey[k] = order;
    order.forEach((p, i) => { pts[p.id].pts += 3 - i; if (i === 0) pts[p.id].firsts++; });
  }
  const table = Object.values(pts).sort((a, b) => b.pts - a.pts || b.firsts - a.firsts);
  return { table, byKey, keys: RANK_KEYS };
}

export const TIER_LIST = TIERS;
export { rIdx, rName };

export async function loadSquad() {
  const r = await fetch(`${BASE}squad-data.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  // fotos de perfil dos jogadores (opcional; ver scripts/optimize-assets.mjs)
  const photos = await fetch(`${BASE}assets/players/manifest.json`).then(x => (x.ok ? x.json() : [])).catch(() => []);
  const players = PLAYERS.map(meta => {
    const p = j.players[meta.id];
    const d = derive(p, j.act);
    const main = p.agents[0];
    return { ...meta, ...p, d, main, photo: photos.includes(meta.id), read: j.reads?.[meta.id], bestMap: [...p.maps].sort((a, b) => b.wr - a.wr)[0] };
  });

  // mapa do squad: melhor win rate somando as partidas dos três
  const agg = {};
  for (const pl of players) for (const m of pl.maps) { const a = (agg[m.n] ||= { n: m.n, w: 0, l: 0 }); a.w += m.w; a.l += m.l; }
  const squadMap = Object.values(agg).filter(m => m.w + m.l >= 8).sort((a, b) => b.w / (b.w + b.l) - a.w / (a.w + a.l))[0];

  for (const pl of players) pl.sw = analyze(players, pl);

  const duos = (j.teammates?.l4 || []).map(t => ({ ...t, with: PLAYERS.find(x => x.nick === t.nick) }));
  const bestDuo = [...duos].sort((a, b) => b.m - a.m)[0];

  return { act: j.act, updatedAt: j.updatedAt, players, squadMap, bestDuo, duos };
}

export function ago(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.round(ms / 36e5);
  if (h < 1) return 'agora há pouco';
  if (h < 24) return `há ${h} h`;
  const dd = Math.round(h / 24);
  return dd === 1 ? 'ontem' : `há ${dd} dias`;
}

export function go(hash) { if (location.hash !== hash) location.hash = hash; }

export const actLabel = a => { const m = /^V(\d+):\s*A(\d+)/.exec(a || ''); return m ? `V${m[1]} · Ato ${m[2]}` : a; };

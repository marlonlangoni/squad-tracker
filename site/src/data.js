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
  };
  d.mmr = estimateMMR(p, act, d);
  return d;
}

export async function loadSquad() {
  const r = await fetch(`${BASE}squad-data.json`, { cache: 'no-store' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const players = PLAYERS.map(meta => {
    const p = j.players[meta.id];
    const d = derive(p, j.act);
    const main = p.agents[0];
    return { ...meta, ...p, d, main, read: j.reads?.[meta.id], bestMap: [...p.maps].sort((a, b) => b.wr - a.wr)[0] };
  });

  // mapa do squad: melhor win rate somando as partidas dos três
  const agg = {};
  for (const pl of players) for (const m of pl.maps) { const a = (agg[m.n] ||= { n: m.n, w: 0, l: 0 }); a.w += m.w; a.l += m.l; }
  const squadMap = Object.values(agg).filter(m => m.w + m.l >= 8).sort((a, b) => b.w / (b.w + b.l) - a.w / (a.w + a.l))[0];

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

export const actLabel = a => { const m = /^V(\d+):\s*A(\d+)/.exec(a || ''); return m ? `V${m[1]} · Ato ${m[2]}` : a; };

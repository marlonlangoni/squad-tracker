import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { asset, rankPT, rIdx, rName, actKey, fmt } from './data.js';
import { CountUp } from './ui.jsx';

const EASE = [0.16, 1, 0.3, 1];
const TIER_PT = ['Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Ascendente', 'Imortal', 'Radiante'];

function Reveal({ className = '', children, delay = 0 }) {
  return (
    <motion.section className={'panel ' + className} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.8, ease: EASE, delay }}>
      {children}
    </motion.section>
  );
}

/* ---------------- histórico de elo ---------------- */
function EloChart({ players }) {
  const [hidden, setHidden] = useState(() => new Set());
  const acts = useMemo(() => [...new Set(players.flatMap(p => (p.history || []).map(h => h[0])))].sort((a, b) => actKey(a) - actKey(b)), [players]);
  const series = players.map(p => ({ p, pts: (p.history || []).map(h => ({ act: h[0], r: rIdx(h[1]), rank: h[1], wr: h[2] })).filter(x => x.r != null).sort((a, b) => actKey(a.act) - actKey(b.act)) }));
  const all = series.flatMap(s => s.pts.map(x => x.r));
  const lo = Math.max(0, Math.floor((Math.min(...all) - 1) / 3) * 3), hi = Math.min(24, Math.ceil((Math.max(...all) + 2) / 3) * 3);
  const W = 1000, H = 380, L = 96, R = 24, T = 18, B = 44;
  const x = a => L + (acts.length === 1 ? (W - L - R) / 2 : (acts.indexOf(a) / (acts.length - 1)) * (W - L - R));
  const y = r => T + (1 - (r + 0.5 - lo) / (hi - lo)) * (H - T - B);
  const ticks = []; for (let t = lo; t < hi; t += 3) ticks.push(t);
  const labelEvery = Math.ceil(acts.length / 10);

  return (
    <div className="elo">
      <div className="elo-legend" role="group" aria-label="Mostrar ou esconder jogador">
        {players.map(p => (
          <button key={p.id} type="button" className={hidden.has(p.id) ? 'off' : ''} style={{ '--pc': p.color }} aria-pressed={!hidden.has(p.id)}
            onClick={() => setHidden(h => { const n = new Set(h); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}>
            <i />{p.nick}<em>{rankPT(p.rank)} · pico {rankPT(p.peak)}</em>
          </button>
        ))}
      </div>
      <div className="elo-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} className="elo-svg" role="img" aria-label="Elo de cada jogador ao longo dos atos">
          {ticks.map(t => (
            <g key={t}>
              <rect x={L} y={y(t + 2.5)} width={W - L - R} height={y(t - 0.5) - y(t + 2.5)} className={(t / 3) % 2 ? 'band b' : 'band'} />
              <image href={asset.rank(rName(t))} x={8} y={(y(t - 0.5) + y(t + 2.5)) / 2 - 16} width="32" height="32" />
              <text x={46} y={(y(t - 0.5) + y(t + 2.5)) / 2 + 4} className="elo-tier">{TIER_PT[t / 3]}</text>
            </g>
          ))}
          {acts.map((a, i) => i % labelEvery === 0 || i === acts.length - 1 ? (
            <text key={a} x={x(a)} y={H - 14} textAnchor="middle" className="elo-act">{a.replace(': ', ' ')}</text>
          ) : null)}
          {series.map(({ p, pts }, si) => {
            if (hidden.has(p.id) || !pts.length) return null;
            const d = pts.map((q, i) => `${i ? 'L' : 'M'}${x(q.act).toFixed(1)} ${y(q.r).toFixed(1)}`).join(' ');
            return (
              <g key={p.id} style={{ color: p.color }}>
                <motion.path d={d} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
                  initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.8, ease: EASE, delay: si * 0.2 }}
                  style={{ filter: `drop-shadow(0 0 6px ${p.color})` }} />
                {pts.map((q, i) => (
                  <motion.circle key={q.act} cx={x(q.act)} cy={y(q.r)} r={i === pts.length - 1 ? 7 : 4.5} fill={i === pts.length - 1 ? 'currentColor' : '#0b0f1a'} stroke="currentColor" strokeWidth="2.5"
                    className="elo-pt" tabIndex={0}
                    data-tip={`${p.nick} · ${q.act}: ${rankPT(q.rank)}${q.wr != null ? ` · ${fmt(q.wr, 0)}% de vitórias` : ''}`}
                    initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 + si * 0.2 + (i / pts.length) * 1.4, type: 'spring', stiffness: 300, damping: 18 }} />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="note">Cada ponto é o maior elo alcançado no ato. Passe o mouse (ou toque) num ponto para ver o detalhe. Atos sem ranqueada não aparecem.</p>
    </div>
  );
}

/* ---------------- forma recente ---------------- */
function Arrow({ now, base, low }) {
  if (now == null || base == null) return null;
  const up = low ? now < base : now > base;
  const same = Math.abs(now - base) <= Math.abs(base) * 0.02;
  return <span className={'arrow ' + (same ? 'eq' : up ? 'up' : 'down')}>{same ? '＝' : up ? '▲' : '▼'}</span>;
}

function Form({ p }) {
  const f = p.form;
  if (!f) return null;
  const rows = [...f.rows].reverse(); // mais antiga -> mais recente
  return (
    <div className="form-row" style={{ '--pc': p.color }}>
      <div className="form-id">
        <img src={asset.portrait(p.main.n)} alt="" />
        <div><b>{p.nick}</b><small>{f.wins}V em {f.n} · {f.streak > 1 ? `${f.streak} ${f.streakRes === 'w' ? 'vitórias' : 'derrotas'} seguidas` : f.streakRes === 'w' ? 'venceu a última' : 'perdeu a última'}</small></div>
      </div>
      <motion.div className="form-dots" initial="h" whileInView="s" viewport={{ once: true }} variants={{ s: { transition: { staggerChildren: 0.035 } } }}>
        {rows.map((r, i) => (
          <motion.span key={i} className={'dot-' + r.res} tabIndex={0}
            data-tip={`${r.map} ${r.us}:${r.them} · ${r.k}/${r.dth}/${r.a} · ACS ${r.acs}`}
            variants={{ h: { opacity: 0, scaleY: 0.2 }, s: { opacity: 1, scaleY: 1, transition: { duration: 0.35, ease: EASE } } }} />
        ))}
      </motion.div>
      <dl className="form-stats">
        <div data-tip="ACS médio nas últimas partidas, comparado à média do ato"><dt>ACS</dt><dd>{fmt(f.acs, 0)}<Arrow now={f.acs} base={p.d.acs} /></dd><small>ato {fmt(p.d.acs, 0)}</small></div>
        <div data-tip="K/D nas últimas partidas, comparado ao do ato"><dt>K/D</dt><dd>{fmt(f.kd, 2)}<Arrow now={f.kd} base={p.d.kd} /></dd><small>ato {fmt(p.d.kd, 2)}</small></div>
        <div data-tip="HS% médio nas últimas partidas, comparado ao do ato"><dt>HS%</dt><dd>{fmt(f.hs, 1)}%<Arrow now={f.hs} base={p.d.hs} /></dd><small>ato {fmt(p.d.hs, 1)}%</small></div>
        <div data-tip="DDΔ médio nas últimas partidas, comparado ao do ato"><dt>DDΔ</dt><dd>{f.dd > 0 ? '+' : ''}{fmt(f.dd, 0)}<Arrow now={f.dd} base={p.d.dd} /></dd><small>ato {fmt(p.d.dd, 1)}</small></div>
      </dl>
    </div>
  );
}

/* ---------------- metas ---------------- */
function GoalRing({ value, color }) {
  const r = 30, c = 2 * Math.PI * r, v = value ?? 0;
  return (
    <div className="goal-ring">
      <svg viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r={r} className="ring-track" />
        <motion.circle cx="36" cy="36" r={r} stroke={color} strokeDasharray={c} className="ring-val"
          initial={{ strokeDashoffset: c }} whileInView={{ strokeDashoffset: c * (1 - v) }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE, delay: 0.3 }} />
      </svg>
      <b><CountUp value={Math.round(v * 100)} suffix="%" delay={0.3} /></b>
    </div>
  );
}

function Goals({ p, setAt }) {
  return (
    <Reveal className="goals" >
      <header className="goals-h" style={{ '--pc': p.color }}>
        <img src={asset.portrait(p.main.n)} alt="" />
        <div><small>Metas de</small><h3>{p.nick}</h3></div>
      </header>
      <div className="goal-list">
        {p.goals.map((g, i) => {
          const val = v => (v == null ? '—' : fmt(v, g.d) + g.u);
          const prog = g.recentProgress ?? g.progress;
          return (
            <motion.article key={g.k} className="goal" style={{ '--pc': p.color }} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}>
              <GoalRing value={prog} color={p.color} />
              <div className="goal-body">
                <span className="goal-title" data-tip={g.tip}>{g.low ? 'Baixar' : 'Subir'} <b>{g.label}</b> de {val(g.from)} para <b className="goal-target">{val(g.target)}</b></span>
                {g.rival && <small className="goal-rival">Meta: passar o {g.rival}</small>}
                <span className="goal-now">
                  <span>Ato agora: <b>{val(g.now)}</b></span>
                  {g.recent != null && <span>Últimas partidas: <b>{val(g.recent)}</b></span>}
                </span>
                <p className="goal-tip">{g.tip}</p>
              </div>
            </motion.article>
          );
        })}
      </div>
      <p className="note">O anel mostra quanto do caminho até a meta já foi feito{p.goals.some(g => g.recent != null) ? ', usando as últimas partidas quando possível' : ''}.{setAt ? ` Metas definidas em ${new Date(setAt).toLocaleDateString('pt-BR')}.` : ''}</p>
    </Reveal>
  );
}

export default function Evolucao({ squad }) {
  const { players } = squad;
  return (
    <motion.main className="evo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
      <div className="rk-head">
        <p className="eyebrow"><span className="eyebrow-line" /> Evolução · histórico, forma e metas</p>
        <h1 className="title rk-title">
          <span className="title-line"><motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.9, ease: EASE }}>DE ONDE VIEMOS,</motion.span></span>
          <span className="title-line"><motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}>PRA ONDE VAMOS</motion.span></span>
        </h1>
      </div>

      <Reveal className="evo-elo">
        <header className="panel-h"><h2>Histórico de elo</h2><span>pico de cada ato</span></header>
        <EloChart players={players} />
      </Reveal>

      <Reveal className="evo-form">
        <header className="panel-h"><h2>Forma recente</h2><span>últimas partidas, da mais antiga à mais recente</span></header>
        {players.map(p => <Form key={p.id} p={p} />)}
      </Reveal>

      <div className="evo-goals-h">
        <h2>Metas</h2>
        <p className="muted">Tiradas dos pontos fracos de cada um. Quando um amigo está logo à frente, a meta vira passar ele.</p>
      </div>
      <div className="evo-goals">
        {players.map(p => <Goals key={p.id} p={p} setAt={squad.goalsSetAt} />)}
      </div>
    </motion.main>
  );
}

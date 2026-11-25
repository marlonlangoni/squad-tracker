import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { asset, rankPT, METRICS, VS_GROUPS, cmp, fmt, go } from './data.js';
import { CountUp, Corners } from './ui.jsx';

const EASE = [0.16, 1, 0.3, 1];

function Fighter({ p, side, others, onPick }) {
  const dir = side === 'a' ? -1 : 1;
  return (
    <div className={'fighter ' + side} style={{ '--pc': p.color, '--ac': p.main.c }}>
      <AnimatePresence mode="wait">
        <motion.div key={p.id} className="fighter-in"
          initial={{ opacity: 0, x: 80 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 * dir, transition: { duration: 0.25 } }}
          transition={{ duration: 0.8, ease: EASE }}>
          <span className="fighter-glow" aria-hidden="true" />
          <span className="fighter-agent" aria-hidden="true">{p.main.n}</span>
          <img className="fighter-art" src={asset.pose(p.main.n)} alt="" draggable="false" />
          <div className="fighter-info">
            <span className="fighter-rank"><img src={asset.rank(p.rank)} alt="" />{rankPT(p.rank)}</span>
            <b className="fighter-nick">{p.nick}</b>
            <span className="fighter-name">{p.name} · {p.main.n}</span>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="fighter-pick" role="group" aria-label={`Trocar jogador do lado ${side === 'a' ? 'esquerdo' : 'direito'}`}>
        {others.map(o => (
          <button key={o.id} type="button" onClick={() => onPick(o.id)} style={{ '--pc': o.color }} title={`Trocar por ${o.nick}`}>
            <img src={asset.portrait(o.main.n)} alt="" /><span>{o.nick}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ k, a, b, onShow, index }) {
  const m = METRICS[k];
  const w = cmp(k, a, b);
  const va = a.d[k], vb = b.d[k];
  const max = Math.max(Math.abs(va || 0), Math.abs(vb || 0)) || 1;
  const bar = v => `${Math.max(4, (Math.abs(v || 0) / max) * 100)}%`;
  const val = v => fmt(v, m.d) + (m.u || '');
  return (
    <motion.div className={'vrow' + (w === 1 ? ' win-a' : w === -1 ? ' win-b' : ' tie')}
      initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.9 }}
      transition={{ duration: 0.55, ease: EASE, delay: (index % 3) * 0.05 }}
      onViewportEnter={() => onShow(k)} data-tip={m.g}>
      <span className="vval a">{val(va)}</span>
      <span className="vbar a"><motion.span style={{ background: a.color }} initial={{ width: 0 }} whileInView={{ width: bar(va) }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE, delay: 0.15 }} /></span>
      <span className="vlab">{m.l}{m.low ? <small>menor é melhor</small> : null}</span>
      <span className="vbar b"><motion.span style={{ background: b.color }} initial={{ width: 0 }} whileInView={{ width: bar(vb) }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE, delay: 0.15 }} /></span>
      <span className="vval b">{val(vb)}</span>
    </motion.div>
  );
}

export default function Versus({ squad, aId, bId }) {
  const players = squad.players;
  const a = players.find(p => p.id === aId) || players[0];
  const b = players.find(p => p.id === bId && p.id !== a.id) || players.find(p => p.id !== a.id);
  const [shown, setShown] = useState(() => new Set());
  const [run, setRun] = useState(0);

  const keys = useMemo(() => VS_GROUPS.flatMap(g => g.keys), []);
  const results = useMemo(() => Object.fromEntries(keys.map(k => [k, cmp(k, a, b)])), [keys, a, b]);
  const total = { a: keys.filter(k => results[k] === 1).length, b: keys.filter(k => results[k] === -1).length };
  const live = { a: [...shown].filter(k => results[k] === 1).length, b: [...shown].filter(k => results[k] === -1).length };
  const done = shown.size >= keys.length;

  const onShow = useCallback(k => setShown(s => (s.has(k) ? s : new Set(s).add(k))), []);
  const pick = (side, id) => {
    const na = side === 'a' ? id : a.id, nb = side === 'b' ? id : b.id;
    setShown(new Set());
    if (na === nb) go(`#/versus/${nb === a.id ? b.id : na}/${a.id}`);
    else go(`#/versus/${na}/${nb}`);
  };
  const replay = () => { setShown(new Set()); setRun(r => r + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // vantagens mais claras de cada lado
  const edge = side => keys.filter(k => results[k] === (side === 'a' ? 1 : -1)).map(k => {
    const x = side === 'a' ? a.d[k] : b.d[k], y = side === 'a' ? b.d[k] : a.d[k];
    return { k, gap: Math.abs(x - y) / (Math.abs(y) || 1) };
  }).sort((p, q) => q.gap - p.gap).slice(0, 3).map(e => METRICS[e.k].l);

  const winner = total.a > total.b ? a : total.b > total.a ? b : null;
  const duo = [a, b].some(p => p.id === 'l4') ? squad.duos.find(d => d.with && [a.id, b.id].includes(d.with.id)) : null;

  return (
    <motion.main className="versus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}
      style={{ '--ca': a.color, '--cb': b.color }}>
      <div className="vs-head">
        <p className="eyebrow"><span className="eyebrow-line" /> Versus 1×1 · métrica por métrica</p>
      </div>

      <section className="vs-stage">
        <Corners />
        <Fighter p={a} side="a" others={players.filter(p => p.id !== a.id)} onPick={id => pick('a', id)} />
        <div className="vs-mid">
          <motion.span className="vs-logo" key={a.id + b.id} initial={{ scale: 2.4, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.35 }}>VS</motion.span>
          <div className="vs-score" aria-live="polite">
            <b style={{ color: a.color }}>{live.a}</b><i>×</i><b style={{ color: b.color }}>{live.b}</b>
          </div>
          <small>{done ? 'resultado final' : `${shown.size} de ${keys.length} métricas`}</small>
        </div>
        <Fighter p={b} side="b" others={players.filter(p => p.id !== b.id)} onPick={id => pick('b', id)} />
      </section>

      <div className="vs-sticky">
        <span style={{ color: a.color }}>{a.nick}</span>
        <b><span style={{ color: a.color }}>{live.a}</span> × <span style={{ color: b.color }}>{live.b}</span></b>
        <span style={{ color: b.color }}>{b.nick}</span>
      </div>

      <div className="vs-rows" key={run + a.id + b.id}>
        {VS_GROUPS.map(g => (
          <section key={g.t} className="vgroup">
            <h2 className="vgroup-h"><span>{g.t}</span></h2>
            {g.keys.map((k, i) => <Row key={k} k={k} a={a} b={b} index={i} onShow={onShow} />)}
          </section>
        ))}
      </div>

      <motion.section className="vs-verdict panel" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.8, ease: EASE }}
        style={{ '--pc': winner ? winner.color : 'var(--text)' }}>
        <small>Veredito</small>
        <h2>{winner ? <><span style={{ color: winner.color }}>{winner.nick}</span> vence o duelo</> : 'Empate técnico'}</h2>
        <p className="muted">{winner ? `Leva ${Math.max(total.a, total.b)} de ${keys.length} métricas, contra ${Math.min(total.a, total.b)}.` : `${total.a} métricas para cada lado.`} {keys.length - total.a - total.b > 0 ? `${keys.length - total.a - total.b} ficaram empatadas.` : ''}</p>
        <div className="verdict-cols">
          {[['a', a], ['b', b]].map(([s, p]) => (
            <div key={s} style={{ '--pc': p.color }}>
              <b>{p.nick} leva vantagem em</b>
              <ul>{edge(s).map(l => <li key={l}>{l}</li>)}{!edge(s).length && <li className="muted">nenhuma métrica</li>}</ul>
            </div>
          ))}
        </div>
        {duo && (
          <div className="vs-duo">
            <small>Jogando juntos</small>
            <span><b><CountUp value={duo.m} /></b> partidas · <b className={duo.wr >= 50 ? 'w' : 'l'}>{fmt(duo.wr, 1)}%</b> de vitórias</span>
          </div>
        )}
        <div className="vs-actions">
          <button className="btn-ghost" onClick={replay}>↻ Rever o duelo</button>
          <a className="btn-ghost" href="#/ranking">Ver ranking do squad →</a>
        </div>
      </motion.section>
    </motion.main>
  );
}

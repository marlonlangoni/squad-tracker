import { motion } from 'motion/react';
import { asset, METRICS, TITLES, standings, fmt } from './data.js';
import { CountUp } from './ui.jsx';

const EASE = [0.16, 1, 0.3, 1];
const PLACE = ['1º', '2º', '3º'];
const HEIGHT = [46, 36, 28]; // altura do bloco do pódio, em % da área (igual ao --h do CSS)

function Podium({ table }) {
  const order = [table[1], table[0], table[2]].filter(Boolean); // 2º, 1º, 3º
  return (
    <section className="podium" aria-label="Pódio geral">
      {order.map(row => {
        const place = table.indexOf(row);
        const p = row.p;
        return (
          <div key={p.id} className={'pod pod-' + (place + 1)} style={{ '--pc': p.color, '--ac': p.main.c }}>
            <motion.img className={'pod-art' + (p.photo ? ' is-photo' : '')} src={p.photo ? asset.player(p.id) : asset.poseTrim(p.main.n)} alt="" draggable="false"
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.9 - place * 0.25 }} />
            <motion.div className="pod-block" initial={{ height: 0 }} animate={{ height: `${HEIGHT[place]}%` }} transition={{ duration: 1, ease: EASE, delay: 0.5 - place * 0.15 }}>
              <span className="pod-place">{PLACE[place]}</span>
              <b className="pod-nick">{p.nick}</b>
              <span className="pod-pts"><CountUp value={row.pts} delay={0.9} /> pts</span>
              <small>{row.firsts} métricas em 1º</small>
            </motion.div>
          </div>
        );
      })}
    </section>
  );
}

function Title({ t, byKey, i }) {
  const order = byKey[t.k] || [];
  const lead = order[0];
  if (!lead) return null;
  const m = METRICS[t.k];
  const vals = order.map(p => p.d[t.k]);
  const max = Math.max(...vals.map(Math.abs)) || 1;
  return (
    <motion.article className="title-card" style={{ '--pc': lead.color, '--ac': lead.main.c }}
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: EASE, delay: (i % 4) * 0.06 }} whileHover={{ y: -6 }}>
      <img className="tc-portrait" src={asset.portrait(lead.main.n)} alt="" loading="lazy" />
      <span className="tc-ico" aria-hidden="true">{t.ico}</span>
      <div className="tc-body">
        <small>{t.why}</small>
        <h3>{t.t}</h3>
        <span className="tc-lead"><b>{lead.nick}</b> {fmt(lead.d[t.k], m.d)}{m.u || ''}</span>
        <ul className="tc-bars">
          {order.map(p => (
            <li key={p.id}>
              <span>{p.nick}</span>
              <span className="tc-bar"><motion.span style={{ background: p.color }} initial={{ width: 0 }} whileInView={{ width: `${(Math.abs(p.d[t.k]) / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE, delay: 0.2 }} /></span>
              <em>{fmt(p.d[t.k], m.d)}{m.u || ''}</em>
            </li>
          ))}
        </ul>
      </div>
    </motion.article>
  );
}

export default function Ranking({ squad }) {
  const { table, byKey, keys } = standings(squad.players);
  const titlesOf = id => TITLES.filter(t => byKey[t.k]?.[0]?.id === id).length;
  return (
    <motion.main className="ranking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
      <div className="rk-head">
        <p className="eyebrow"><span className="eyebrow-line" /> Ranking do squad · {keys.length} métricas</p>
        <h1 className="title rk-title">
          <span className="title-line"><motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.9, ease: EASE }}>QUEM MANDA</motion.span></span>
          <span className="title-line"><motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}>NO SQUAD</motion.span></span>
        </h1>
        <p className="muted rk-rule">Cada métrica vale 3 pontos para o 1º, 2 para o 2º e 1 para o 3º.</p>
      </div>

      <Podium table={table} />

      <section className="rk-section">
        <header className="panel-h"><h2>Títulos</h2><span>{TITLES.length} títulos · {table.map(r => `${r.p.nick} ${titlesOf(r.p.id)}`).join(' · ')}</span></header>
        <div className="title-grid">
          {TITLES.map((t, i) => <Title key={t.k} t={t} byKey={byKey} i={i} />)}
        </div>
      </section>

      <motion.section className="rk-section panel" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: 0.8, ease: EASE }}>
        <header className="panel-h"><h2>Métrica por métrica</h2><span>quem fica em 1º, 2º e 3º</span></header>
        <div className="rk-table" role="table">
          <div className="rk-tr rk-th" role="row">
            <span role="columnheader">Métrica</span>
            {squad.players.map(p => <span key={p.id} role="columnheader" style={{ color: p.color }}>{p.nick}</span>)}
          </div>
          {keys.map(k => {
            const m = METRICS[k], order = byKey[k];
            return (
              <div className="rk-tr" role="row" key={k} title={m.g}>
                <span role="rowheader">{m.l}{m.low ? <small> · menor é melhor</small> : null}</span>
                {squad.players.map(p => {
                  const place = order.findIndex(o => o.id === p.id);
                  return (
                    <span key={p.id} role="cell" className={'rk-cell place-' + (place + 1)} style={{ '--pc': p.color }}>
                      <i aria-label={`${place + 1}º lugar`}>{place + 1}</i>{fmt(p.d[k], m.d)}{m.u || ''}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </motion.section>
    </motion.main>
  );
}

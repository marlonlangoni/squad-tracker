import { motion } from 'motion/react';
import { asset, rankPT, ROLES_PT } from './data.js';
import { CountUp, PctBar, Corners } from './ui.jsx';

const EASE = [0.16, 1, 0.3, 1];
const list = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.25 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } };

const METRICS = [
  ['kd', 'K/D', 2, '', 'kdP', 'Abates por morte'],
  ['adr', 'ADR', 1, '', 'adrP', 'Dano por round'],
  ['dd', 'DDΔ', 1, '', 'ddP', 'Dano dado menos dano recebido, por round'],
  ['hs', 'HS%', 1, '%', 'hsP', 'Tiros que acertam a cabeça'],
  ['kast', 'KAST', 1, '%', 'kastP', 'Rounds com abate, assistência, sobrevivência ou troca'],
  ['acs', 'ACS', 0, '', 'acsP', 'Pontuação de combate média'],
];

// Painel que sobe quando um jogador é selecionado: prévia do que vira o perfil completo na próxima fase.
export default function LockPanel({ p, onClose, onOpen }) {
  const d = p.d;
  const w = p.weapons?.[0];
  return (
    <>
      <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
      <motion.aside
        className="lock"
        role="dialog"
        aria-label={`Resumo de ${p.name}`}
        style={{ '--pc': p.color }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%', transition: { duration: 0.35, ease: [0.7, 0, 0.84, 0] } }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <Corners />
        <motion.div className="lock-flash" initial={{ opacity: 0.9, scaleX: 0 }} animate={{ opacity: 0, scaleX: 1 }} transition={{ duration: 0.9, ease: EASE }} />
        <button className="lock-close" onClick={onClose} aria-label="Fechar">✕</button>

        <motion.div className="lock-grid" variants={list} initial="hidden" animate="show" key={p.id}>
          <motion.div className="lock-id" variants={item}>
            <span className="lock-locked">Jogador travado</span>
            <h2>{p.nick}</h2>
            <p className="muted">{p.name} · #{p.tag} · nível {p.level} · {p.playtime} h no ato</p>
            <div className="lock-record">
              <span className="w"><CountUp value={d.wins} /> V</span>
              <span className="l"><CountUp value={d.losses} /> D</span>
              {d.ties ? <span className="t">{d.ties} E</span> : null}
              <span className="muted">em {d.matches} partidas</span>
            </div>
            {p.read && <p className="lock-read"><b>{p.read.role}.</b> {p.read.text}</p>}
          </motion.div>

          <motion.div className="lock-metrics" variants={item}>
            <h3>Desempenho <span className="muted">· percentil no Tracker</span></h3>
            {METRICS.map(([k, lab, dec, suf, pk, tip]) => (
              <div className="metric" key={k} data-tip={tip}>
                <span className="metric-lab">{lab}</span>
                <span className="metric-val"><CountUp value={d[k]} decimals={dec} suffix={suf} /></span>
                <PctBar value={d[pk]} color="var(--pc)" />
                <span className="metric-pct">{d[pk] ?? '—'}</span>
              </div>
            ))}
          </motion.div>

          <motion.div className="lock-side" variants={item}>
            <h3>Agentes</h3>
            <div className="lock-agents">
              {p.agents.slice(0, 3).map(a => (
                <div className="agent-chip" key={a.n} style={{ '--ac': a.c }}>
                  <img src={asset.portrait(a.n)} alt="" />
                  <span><b>{a.n}</b><small>{ROLES_PT[a.r] || a.r} · {a.m} partidas · {Math.round(a.wr)}% V</small></span>
                </div>
              ))}
            </div>
            <div className="lock-row">
              <div className="mini-map" style={{ backgroundImage: `url(${asset.mapThumb(p.bestMap.n)})` }}>
                <span><small>Melhor mapa</small><b>{p.bestMap.n}</b><small>{p.bestMap.wr}% · {p.bestMap.w}V {p.bestMap.l}D</small></span>
              </div>
              {w && (
                <div className="mini-weapon">
                  <img src={asset.weapon(w.n)} alt="" />
                  <span><small>Arma principal</small><b>{w.n}</b><small>{w.k} abates · {w.h}% cabeça</small></span>
                </div>
              )}
            </div>
            <div className="lock-mmr">
              <img src={asset.rank(d.mmr.rank)} alt="" />
              <span>
                <small>MMR estimado</small>
                <b>{d.mmr.rankPT}</b>
                <small>{d.mmr.pos} de {d.mmr.rankPT.replace(/ \d$/, '')} · elo atual {rankPT(p.rank)}</small>
              </span>
            </div>
            <button className="btn-primary" onClick={onOpen} autoFocus>
              Abrir perfil completo <i aria-hidden="true">→</i>
            </button>
          </motion.div>
        </motion.div>
      </motion.aside>
    </>
  );
}

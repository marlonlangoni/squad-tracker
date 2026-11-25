import { motion } from 'motion/react';
import { asset } from './data.js';
import { CountUp } from './ui.jsx';

const EASE = [0.16, 1, 0.3, 1];
const NAV = ['Evolução'];

export default function SquadBar({ squad, onProfile }) {
  const { squadMap: m, bestDuo: duo, players } = squad;
  const wins = players.reduce((a, p) => a + p.d.wins, 0);
  const games = players.reduce((a, p) => a + p.d.matches, 0);
  return (
    <motion.section className="squadbar" aria-label="Resumo do squad" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.9, ease: EASE }}>
      <div className="sb-item">
        <small>Vitórias somadas</small>
        <b><CountUp value={wins} delay={1.1} /></b>
        <span className="muted">de {games} partidas</span>
      </div>
      {m && (
        <div className="sb-item sb-map" style={{ backgroundImage: `url(${asset.mapThumb(m.n)})` }}>
          <small>Mapa do squad</small>
          <b>{m.n}</b>
          <span className="muted">{Math.round((m.w / (m.w + m.l)) * 100)}% somando os três</span>
        </div>
      )}
      {duo && (
        <div className="sb-item">
          <small>Duo mais frequente</small>
          <b>L4ngoni + {duo.nick}</b>
          <span className="muted">{duo.m} partidas · {duo.wr}% de vitórias</span>
        </div>
      )}
      <nav className="sb-nav" aria-label="Telas">
        <button type="button" className="sb-link" onClick={onProfile}>Perfil<em>abrir</em></button>
        <a className="sb-link" href="#/versus">Versus 1×1<em>duelo</em></a>
        <a className="sb-link" href="#/ranking">Ranking<em>títulos</em></a>
        {NAV.map(n => (
          <span key={n} className="sb-soon" title="Chega nas próximas fases">{n}<em>em breve</em></span>
        ))}
      </nav>
    </motion.section>
  );
}

import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { asset, rankPT, ROLES_PT } from './data.js';
import { CountUp, Corners } from './ui.jsx';

const EASE = [0.16, 1, 0.3, 1];
const SPRING = { stiffness: 220, damping: 22, mass: 0.6 };

export default function PlayerCard({ p, index, dim, locked, onHover, onLock }) {
  const ref = useRef(null);
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, SPRING), sy = useSpring(my, SPRING);
  const rotY = useTransform(sx, [-0.5, 0.5], [-9, 9]);
  const rotX = useTransform(sy, [-0.5, 0.5], [7, -7]);
  const artX = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const artY = useTransform(sy, [-0.5, 0.5], [-8, 8]);
  const glareX = useTransform(sx, [-0.5, 0.5], ['20%', '80%']);

  const fine = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

  const onMove = e => {
    if (!fine) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => { mx.set(0); my.set(0); onHover(null); };

  const d = p.d;
  const mmrUp = d.mmr.verdict === 'acima', mmrDown = d.mmr.verdict === 'abaixo';

  return (
    <motion.div
      role="listitem"
      className={'pcard' + (locked ? ' is-locked' : '') + (dim ? ' is-dim' : '')}
      style={{ '--pc': p.color, '--ac': p.main.c }}
      initial={{ opacity: 0, y: 60, clipPath: 'inset(100% 0 0 0)' }}
      animate={{ opacity: 1, y: 0, clipPath: 'inset(-40% -10% 0 -10%)' }}
      transition={{ delay: 0.45 + index * 0.13, duration: 1, ease: EASE }}
    >
      <motion.button
        ref={ref}
        type="button"
        className="pcard-btn"
        aria-pressed={locked}
        aria-label={`${p.name} (${p.nick}#${p.tag}), ${rankPT(p.rank)}. Abrir resumo.`}
        onPointerMove={onMove}
        onPointerEnter={() => onHover(p.id)}
        onPointerLeave={reset}
        onFocus={() => onHover(p.id)}
        onBlur={() => onHover(null)}
        onClick={() => onLock(p.id)}
        style={{ rotateX: rotX, rotateY: rotY }}
        whileHover={{ y: -10 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <span className="pcard-frame">
          <span className="pcard-glow" />
          <span className="pcard-agentname" aria-hidden="true">{p.main.n}</span>
          <motion.span className="pcard-glare" style={{ left: glareX }} aria-hidden="true" />
          <Corners />
        </span>

        <motion.img
          className="pcard-art"
          src={asset.pose(p.main.n)}
          alt=""
          draggable="false"
          style={{ x: artX, y: artY }}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 + index * 0.13, duration: 1.2, ease: EASE }}
        />

        <span className="pcard-top">
          <span className="pcard-slot">0{index + 1}</span>
          <span className="pcard-role">
            <img src={asset.role(p.main.r)} alt="" />
            {p.main.n} · {ROLES_PT[p.main.r] || p.main.r}
          </span>
        </span>

        <span className="pcard-info">
          <span className="pcard-rank">
            <img className="rank-ico" src={asset.rank(p.rank)} alt="" />
            <span>
              <span className="pcard-rank-name">{rankPT(p.rank)}</span>
              <span className={'pcard-mmr' + (mmrUp ? ' up' : mmrDown ? ' down' : '')}>
                MMR ≈ {d.mmr.rankPT}{mmrUp ? ' ▲' : mmrDown ? ' ▼' : ''}
              </span>
            </span>
          </span>
          <span className="pcard-nick">{p.nick}</span>
          <span className="pcard-name">{p.name} <span>#{p.tag}</span></span>
          <span className="pcard-stats">
            <span><b><CountUp value={d.kd} decimals={2} delay={0.9 + index * 0.13} /></b><small>K/D</small></span>
            <span><b><CountUp value={d.win} decimals={0} suffix="%" delay={0.9 + index * 0.13} /></b><small>Vitórias</small></span>
            <span><b><CountUp value={d.trn} delay={0.9 + index * 0.13} /></b><small>Tracker Score</small></span>
          </span>
          <span className="pcard-cta">{locked ? 'Selecionado' : 'Selecionar'}<i aria-hidden="true">→</i></span>
        </span>
      </motion.button>
    </motion.div>
  );
}

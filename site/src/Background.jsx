import { AnimatePresence, motion } from 'motion/react';
import { asset } from './data.js';

// Fundo: arte do mapa em foco com troca suave, grade de HUD, vinheta e partículas.
export default function Background({ map }) {
  return (
    <div className="bg" aria-hidden="true">
      <AnimatePresence initial={false}>
        {map && (
          <motion.div
            key={map}
            className="bg-map"
            style={{ backgroundImage: `url(${asset.map(map)})` }}
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1.04 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 0.9 }, scale: { duration: 8, ease: 'easeOut' } }}
          />
        )}
      </AnimatePresence>
      <div className="bg-tint" />
      <div className="bg-grid" />
      <div className="bg-scan" />
      <div className="bg-particles">
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} style={{ '--x': `${(i * 53) % 100}%`, '--d': `${9 + (i % 7) * 2.3}s`, '--delay': `${-i * 1.7}s`, '--s': `${1 + (i % 3)}px` }} />
        ))}
      </div>
    </div>
  );
}

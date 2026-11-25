import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GLOSSARY } from './data.js';

const EASE = [0.16, 1, 0.3, 1];

// Dica flutuante para qualquer elemento com data-tip="...": mouse, foco ou toque.
export function TipLayer() {
  const [tip, setTip] = useState(null);
  const timer = useRef(null);
  useEffect(() => {
    const show = el => {
      const r = el.getBoundingClientRect();
      const above = r.top > 120;
      setTip({ text: el.dataset.tip, x: Math.min(Math.max(r.left + r.width / 2, 150), window.innerWidth - 150), y: above ? r.top - 10 : r.bottom + 10, above });
    };
    const over = e => { const el = e.target.closest?.('[data-tip]'); if (el && e.pointerType !== 'touch') show(el); };
    const out = e => { const el = e.target.closest?.('[data-tip]'); if (el && !el.contains(e.relatedTarget)) setTip(null); };
    const down = e => {
      if (e.pointerType !== 'touch') return;
      const el = e.target.closest?.('[data-tip]');
      clearTimeout(timer.current);
      if (el) { show(el); timer.current = setTimeout(() => setTip(null), 3500); } else setTip(null);
    };
    const focus = e => { const el = e.target.closest?.('[data-tip]'); if (el) show(el); };
    const hide = () => setTip(null);
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerout', out);
    document.addEventListener('pointerdown', down);
    document.addEventListener('focusin', focus);
    document.addEventListener('focusout', hide);
    window.addEventListener('scroll', hide, { passive: true });
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerout', out);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('focusout', hide);
      window.removeEventListener('scroll', hide);
    };
  }, []);
  return (
    <AnimatePresence>
      {tip && (
        <motion.div key={tip.text} className={'tip' + (tip.above ? ' above' : '')} role="tooltip"
          style={{ left: tip.x, top: tip.y }}
          initial={{ opacity: 0, y: tip.above ? 6 : -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.18, ease: EASE }}>
          {tip.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Gaveta com o glossário completo e busca.
export function GlossaryDrawer({ open, onClose }) {
  const [q, setQ] = useState('');
  const input = useRef(null);
  useEffect(() => { if (open) setTimeout(() => input.current?.focus(), 250); else setQ(''); }, [open]);
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const list = GLOSSARY.filter(([t, d]) => !q || norm(t + ' ' + d).includes(norm(q)));
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="drawer" role="dialog" aria-label="Glossário" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%', transition: { duration: 0.3, ease: [0.7, 0, 0.84, 0] } }} transition={{ duration: 0.55, ease: EASE }}>
            <header className="drawer-h">
              <div><small>Siglas e métricas</small><h2>Glossário</h2></div>
              <button className="lock-close" onClick={onClose} aria-label="Fechar">✕</button>
            </header>
            <input ref={input} className="drawer-search" type="search" placeholder="Buscar: KAST, MMR, clutch…" value={q} onChange={e => setQ(e.target.value)} />
            <motion.dl className="gloss" initial="h" animate="s" variants={{ s: { transition: { staggerChildren: 0.025, delayChildren: 0.15 } } }}>
              {list.map(([t, d]) => (
                <motion.div key={t} variants={{ h: { opacity: 0, x: 16 }, s: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } } }}>
                  <dt>{t}</dt><dd>{d}</dd>
                </motion.div>
              ))}
              {!list.length && <p className="muted">Nada encontrado para “{q}”.</p>}
            </motion.dl>
            <p className="note">Passe o mouse (ou toque) em qualquer métrica do site para ver a explicação dela.</p>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

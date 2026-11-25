import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';

// Número que conta do zero até o valor quando aparece na tela.
export function CountUp({ value, decimals = 0, prefix = '', suffix = '', duration = 1.4, delay = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (!inView || value == null) return;
    if (reduce) { setShown(value); return; }
    const c = animate(0, value, { duration, delay, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => c.stop();
  }, [inView, value, reduce]);
  const txt = value == null ? '—' : prefix + Number(shown).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  return <span ref={ref} className="num">{txt}</span>;
}

// Cantoneiras de HUD nos quatro cantos do elemento pai.
export function Corners() {
  return (
    <span className="corners" aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  );
}

// Barra de percentil (0–100) que se preenche ao aparecer.
export function PctBar({ value, color }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <span ref={ref} className="pctbar" aria-hidden="true">
      <span style={{ transform: `scaleX(${inView ? (value ?? 0) / 100 : 0})`, background: color }} />
    </span>
  );
}

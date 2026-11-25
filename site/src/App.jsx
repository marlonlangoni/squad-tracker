import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { loadSquad, ago, actLabel, go } from './data.js';
import Background from './Background.jsx';
import PlayerCard from './PlayerCard.jsx';
import LockPanel from './LockPanel.jsx';
import SquadBar from './SquadBar.jsx';
import Profile from './Profile.jsx';

const EASE = [0.16, 1, 0.3, 1];

// Rotas por hash (funciona no GitHub Pages sem configuração): #/  e  #/perfil/<id>
function parseHash() {
  const m = /^#\/perfil\/(\w+)/.exec(location.hash);
  return m ? { page: 'perfil', id: m[1] } : { page: 'select' };
}

export default function App() {
  const [squad, setSquad] = useState(null);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(parseHash);
  const [hover, setHover] = useState(null);
  const [locked, setLocked] = useState(null);

  useEffect(() => { loadSquad().then(setSquad).catch(e => setError(String(e))); }, []);
  useEffect(() => {
    const on = () => { setRoute(parseHash()); setLocked(null); setHover(null); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const players = squad?.players || [];
  const profilePlayer = route.page === 'perfil' ? players.find(p => p.id === route.id) : null;
  const focus = profilePlayer || players.find(p => p.id === (locked || hover));
  const bgMap = focus ? focus.bestMap.n : squad?.squadMap?.n;

  const lock = useCallback(id => setLocked(cur => (cur === id ? null : id)), []);

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') { if (locked) setLocked(null); else if (route.page !== 'select') go('#/'); }
      if (!players.length || !locked) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const i = players.findIndex(p => p.id === locked);
        setLocked(players[(i + (e.key === 'ArrowRight' ? 1 : -1) + players.length) % players.length].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [players, locked, route.page]);

  if (error) return <div className="state-msg">Não consegui carregar os dados ({error}).</div>;

  const lockedPlayer = players.find(p => p.id === locked);
  const routeKey = route.page === 'perfil' ? 'perfil' : 'select';

  return (
    <div className="app" style={{ '--focus': focus?.color || 'var(--red)' }}>
      <Background map={bgMap} dim={route.page !== 'select'} />

      <header className="topbar">
        <motion.a href="#/" className="brand" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: EASE }}>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">SQUAD<span>//</span>TRACKER</span>
        </motion.a>
        {squad && (
          <motion.div className="topbar-meta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }}>
            <span className="chip"><span className="dot" /><span className="hide-sm">Competitivo · </span>{actLabel(squad.act)}</span>
            <span className="muted">Dados {ago(squad.updatedAt)}</span>
          </motion.div>
        )}
      </header>

      <AnimatePresence mode="wait">
        {routeKey === 'select' ? (
          <motion.main key="select" className="select" exit={{ opacity: 0, y: -24, transition: { duration: 0.35, ease: [0.7, 0, 0.84, 0] } }}>
            <div className="select-head">
              <motion.p className="eyebrow" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7, ease: EASE }}>
                <span className="eyebrow-line" /> Squad de 3 · temporada atual
              </motion.p>
              <h1 className="title" aria-label="Selecione o jogador">
                {['SELECIONE', 'O JOGADOR'].map((w, i) => (
                  <span className="title-line" key={w}>
                    <motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ delay: 0.2 + i * 0.12, duration: 0.9, ease: EASE }}>{w}</motion.span>
                  </span>
                ))}
              </h1>
            </div>

            <div className={'cards' + (locked ? ' has-lock' : '')} role="list">
              {!squad && [0, 1, 2].map(i => <div key={i} className="card-skel" />)}
              {players.map((p, i) => (
                <PlayerCard key={p.id} p={p} index={i}
                  dim={(hover && hover !== p.id && !locked) || (locked && locked !== p.id)}
                  locked={locked === p.id} onHover={setHover} onLock={lock} />
              ))}
            </div>

            {squad && <SquadBar squad={squad} onProfile={() => go(`#/perfil/${locked || hover || players[0].id}`)} />}
          </motion.main>
        ) : squad && profilePlayer ? (
          <Profile key="perfil" squad={squad} p={profilePlayer} />
        ) : squad ? (
          <motion.main key="404" className="state-msg">Jogador não encontrado. <a href="#/">Voltar</a></motion.main>
        ) : null}
      </AnimatePresence>

      {/* varredura diagonal a cada troca de tela */}
      <AnimatePresence initial={false}>
        <motion.div key={location.hash || '#/'} className="wipe" aria-hidden="true"
          style={{ background: focus?.color || 'var(--red)' }}
          initial={{ x: '-110%' }} animate={{ x: '110%' }} transition={{ duration: 0.85, ease: [0.65, 0, 0.35, 1] }} />
      </AnimatePresence>

      <AnimatePresence>
        {lockedPlayer && routeKey === 'select' && <LockPanel key="panel" p={lockedPlayer} onClose={() => setLocked(null)} onOpen={() => go(`#/perfil/${lockedPlayer.id}`)} />}
      </AnimatePresence>

      <footer className="legal">
        Squad Tracker é um projeto de fãs, sem fins lucrativos, e não é endossado pela Riot Games. Valorant e todas as artes relacionadas são marcas e propriedade da Riot Games, Inc. Dados: Tracker.gg.
      </footer>
    </div>
  );
}

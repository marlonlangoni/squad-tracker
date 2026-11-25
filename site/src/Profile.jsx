import { motion, AnimatePresence } from 'motion/react';
import { asset, rankPT, ROLES_PT, METRICS, fmt, rName, go } from './data.js';
import { CountUp, PctBar, Corners } from './ui.jsx';

const EASE = [0.16, 1, 0.3, 1];

function Reveal({ as = 'section', className = '', children, delay = 0, ...rest }) {
  const C = motion[as];
  return (
    <C className={'panel ' + className}
      initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.8, delay, ease: EASE }} {...rest}>
      {children}
    </C>
  );
}

function PanelHead({ title, hint }) {
  return <header className="panel-h"><h2>{title}</h2>{hint && <span>{hint}</span>}</header>;
}

/* ---------------- topo ---------------- */
function Hero({ p, squad }) {
  const d = p.d;
  return (
    <section className="hero" style={{ '--ac': p.main.c }}>
      <div className="hero-bg" style={{ backgroundImage: `url(${asset.map(p.bestMap.n)})` }} />
      <span className="hero-agentname" aria-hidden="true">{p.main.n}</span>
      <motion.img className="hero-art" src={asset.pose(p.main.n)} alt="" draggable="false"
        initial={{ opacity: 0, x: 60, scale: 1.05 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 1.1, ease: EASE, delay: 0.15 }} />
      <Corners />

      <div className="hero-info">
        <nav className="switcher" aria-label="Trocar jogador">
          <a href="#/" className="switch-back" aria-label="Voltar para o squad">←</a>
          {squad.players.map(o => (
            <a key={o.id} href={`#/perfil/${o.id}`} className={'switch' + (o.id === p.id ? ' on' : '')} style={{ '--pc': o.color }} aria-current={o.id === p.id ? 'page' : undefined}>
              <img src={asset.portrait(o.main.n)} alt="" />
              <span>{o.nick}</span>
            </a>
          ))}
        </nav>

        <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <span className="eyebrow-line" /> Perfil do jogador · {p.read?.role || 'Competitivo'}
        </motion.p>
        <h1 className="hero-nick">
          <span className="title-line"><motion.span initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}>{p.nick}</motion.span></span>
        </h1>
        <p className="hero-sub">{p.name} <b>#{p.tag}</b> · nível {p.level} · {p.playtime} h jogadas no ato</p>

        <div className="hero-record">
          <div><b className="w"><CountUp value={d.wins} /></b><small>Vitórias</small></div>
          <div><b className="l"><CountUp value={d.losses} /></b><small>Derrotas</small></div>
          {d.ties ? <div><b className="t"><CountUp value={d.ties} /></b><small>Empates</small></div> : null}
          {d.trn != null ? <div><b><CountUp value={d.trn} /></b><small>Tracker Score</small></div> : <div><b><CountUp value={d.acs} /></b><small>ACS</small></div>}
        </div>

        <div className="hero-agent">
          <img src={asset.role(p.main.r)} alt="" />
          <span>Agente principal: <b>{p.main.n}</b> · {ROLES_PT[p.main.r]} · {p.main.m} partidas</span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- visão geral ---------------- */
function Ring({ value, color }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="ring">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="ring-track" />
        <motion.circle cx="60" cy="60" r={r} className="ring-val" stroke={color}
          strokeDasharray={c} initial={{ strokeDashoffset: c }} whileInView={{ strokeDashoffset: c * (1 - value / 100) }}
          viewport={{ once: true }} transition={{ duration: 1.6, ease: EASE, delay: 0.2 }} />
      </svg>
      <span><b><CountUp value={value} decimals={1} suffix="%" /></b><small>Vitórias</small></span>
    </div>
  );
}

const TILES = ['kd', 'adr', 'dd', 'hs', 'kast', 'acs', 'rwin', 'esr'];
function Overview({ p }) {
  const d = p.d, total = d.wins + d.losses + d.ties;
  return (
    <Reveal className="span-8 overview">
      <PanelHead title="Visão geral competitiva" hint={`${d.matches} partidas · ${d.rounds} rounds`} />
      <div className="ov-top">
        <Ring value={d.win} color={p.color} />
        <div className="ov-wl">
          <div className="wl-bar" aria-label={`${d.wins} vitórias, ${d.losses} derrotas`}>
            <motion.span className="w" initial={{ width: 0 }} whileInView={{ width: `${(d.wins / total) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
            <motion.span className="t" initial={{ width: 0 }} whileInView={{ width: `${(d.ties / total) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
            <motion.span className="l" initial={{ width: 0 }} whileInView={{ width: `${(d.losses / total) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
          </div>
          <div className="ov-mini">
            <span><b><CountUp value={d.kills} /></b><small>Abates</small></span>
            <span><b><CountUp value={d.deaths} /></b><small>Mortes</small></span>
            <span><b><CountUp value={d.assists} /></b><small>Assistências</small></span>
            <span><b><CountUp value={d.mostKills} /></b><small>Mais abates num jogo</small></span>
            <span><b><CountUp value={d.aces} /></b><small>Aces</small></span>
            <span><b><CountUp value={d.mvps} /></b><small>MVPs</small></span>
          </div>
        </div>
      </div>
      <motion.div className="tiles" initial="h" whileInView="s" viewport={{ once: true, amount: 0.2 }}
        variants={{ s: { transition: { staggerChildren: 0.06 } } }}>
        {TILES.map(k => {
          const m = METRICS[k], pc = m.pk ? d[m.pk] : null;
          return (
            <motion.div key={k} className="tile" data-tip={m.g} variants={{ h: { opacity: 0, y: 14 }, s: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}>
              <small>{m.l}</small>
              <b><CountUp value={d[k]} decimals={m.d} suffix={m.u || ''} /></b>
              {pc != null ? <><PctBar value={pc} color="var(--pc)" /><em>{pc >= 50 ? `top ${100 - pc}%` : `percentil ${pc}`}</em></> : <em>{m.g.split('(')[0]}</em>}
            </motion.div>
          );
        })}
      </motion.div>
    </Reveal>
  );
}

/* ---------------- MMR ---------------- */
function MMR({ p }) {
  const d = p.d, m = d.mmr;
  const lo = Math.max(0, Math.floor(Math.min(m.base, m.est)) - 2), hi = Math.min(24, Math.max(lo + 6, Math.ceil(Math.max(m.base, m.est)) + 2));
  const steps = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  const pos = x => `${((x - lo) / (hi - lo + 1)) * 100}%`;
  const verdict = m.verdict === 'acima' ? 'MMR acima do elo: tendência de subir rápido' : m.verdict === 'abaixo' ? 'MMR abaixo do elo: ganha pouco RR por vitória' : 'MMR perto do elo atual';
  return (
    <Reveal className="span-4 mmr" delay={0.1}>
      <PanelHead title="Elo e MMR" hint="estimativa" />
      <div className="mmr-top">
        <motion.img src={asset.rank(m.rank)} alt="" initial={{ scale: 0.6, opacity: 0, rotate: -12 }} whileInView={{ scale: 1, opacity: 1, rotate: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.2 }} />
        <div>
          <small>MMR estimado</small>
          <b>{m.rankPT}</b>
          <span className={'verdict ' + m.verdict}>{verdict}</span>
        </div>
      </div>
      <div className="ladder" aria-hidden="true">
        {steps.map(i => (
          <span key={i} className={'step' + (i === m.base ? ' cur' : '')} style={{ left: pos(i) , width: `${100 / (hi - lo + 1)}%` }}>
            {(i % 3 === 0 || i === m.base) && <img src={asset.rank(rName(i))} alt="" />}
          </span>
        ))}
        <span className="ladder-track" />
        <motion.span className="ladder-dot" initial={{ left: pos(m.base + 0.5) }} whileInView={{ left: pos(m.est) }} viewport={{ once: true }} transition={{ duration: 1.6, ease: EASE, delay: 0.4 }} />
      </div>
      <ul className="mmr-facts">
        <li><span>Elo atual</span><b>{rankPT(p.rank)}</b></li>
        <li><span>Pico</span><b>{rankPT(p.peak)}</b><em>{p.peakAct}</em></li>
        <li><span>Posição estimada</span><b>{m.pos} de {m.rankPT.replace(/ \d$/, '')}</b></li>
      </ul>
      <p className="note">Estimativa feita com vitórias, desempenho em duelo e o histórico de elo. O Tracker não mostra o RR por partida.</p>
    </Reveal>
  );
}

/* ---------------- fortes e fracos ---------------- */
function SW({ p }) {
  const col = (list, kind) => (
    <motion.ul className={'sw-list ' + kind} initial="h" whileInView="s" viewport={{ once: true }} variants={{ s: { transition: { staggerChildren: 0.08 } } }}>
      {list.map(it => (
        <motion.li key={it.k} variants={{ h: { opacity: 0, x: kind === 'good' ? -16 : 16 }, s: { opacity: 1, x: 0, transition: { duration: 0.6, ease: EASE } } }}>
          <span className="sw-ico" aria-hidden="true">{kind === 'good' ? '▲' : '▼'}</span>
          <span><b>{it.label}</b> <em>{it.val}</em><small>{it.why}</small></span>
        </motion.li>
      ))}
    </motion.ul>
  );
  return (
    <Reveal className="span-7 sw">
      <PanelHead title="Pontos fortes e onde melhorar" hint="comparado ao Tracker e ao trio" />
      <div className="sw-cols">
        <div><h3 className="good">Pontos fortes</h3>{col(p.sw.strengths, 'good')}</div>
        <div><h3 className="bad">Onde melhorar</h3>{col(p.sw.weaknesses, 'bad')}</div>
      </div>
      {p.read && <p className="sw-read"><b>{p.read.role}.</b> {p.read.text}</p>}
    </Reveal>
  );
}

/* ---------------- duelos ---------------- */
function Duel({ p }) {
  const d = p.d;
  const maxKD = Math.max(d.atkKD, d.defKD, 1.4);
  const side = (lab, kd, win, cls) => (
    <div className={'side ' + cls}>
      <span className="side-lab">{lab}</span>
      <span className="side-bar"><motion.span initial={{ width: 0 }} whileInView={{ width: `${(kd / maxKD) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1.1, ease: EASE }} /></span>
      <b>{fmt(kd, 2)}</b>
      <small>{fmt(win, 0)}% rounds</small>
    </div>
  );
  const fbShare = (d.fb / (d.fb + d.fd)) * 100;
  return (
    <Reveal className="span-5 duel" delay={0.1}>
      <PanelHead title="Duelos" hint="ataque, defesa, entrada e clutch" />
      <h3 className="mini-h">K/D por lado</h3>
      {side('Ataque', d.atkKD, d.atkWin, 'atk')}
      {side('Defesa', d.defKD, d.defWin, 'def')}

      <h3 className="mini-h">Duelo de entrada <span className="muted">· quem abre o round</span></h3>
      <div className="entry">
        <div className="entry-bar">
          <motion.span className="fb" initial={{ width: '50%' }} whileInView={{ width: `${fbShare}%` }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }} />
        </div>
        <div className="entry-legend">
          <span><b className="w">{d.fb}</b> First Bloods</span>
          <span className="muted">{fmt(d.esr, 0)}% de sucesso</span>
          <span><b className="l">{d.fd}</b> First Deaths</span>
        </div>
      </div>

      <h3 className="mini-h">Clutches <span className="muted">· {d.clutchesWon} vencidos de {d.clutchesWon + d.clutchesLost}</span></h3>
      <div className="clutches">
        {d.clutchBy.map(c => {
          const t = c.w + c.l, pct = t ? (c.w / t) * 100 : 0;
          return (
            <div key={c.n} className="clutch" title={`1v${c.n}: ${c.w} de ${t}`}>
              <span className="clutch-col"><motion.span initial={{ height: 0 }} whileInView={{ height: `${Math.max(pct, t ? 4 : 0)}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE, delay: c.n * 0.06 }} /></span>
              <b>{t ? fmt(pct, 0) + '%' : '—'}</b>
              <small>1v{c.n}</small>
            </div>
          );
        })}
      </div>
    </Reveal>
  );
}

/* ---------------- agentes ---------------- */
function Agents({ p }) {
  return (
    <Reveal className="span-12 agents">
      <PanelHead title="Agentes" hint={`${p.agentCount || p.agents.length} jogados no ato`} />
      <motion.div className="agent-row" initial="h" whileInView="s" viewport={{ once: true, amount: 0.2 }} variants={{ s: { transition: { staggerChildren: 0.07 } } }}>
        {p.agents.map((a, i) => (
          <motion.article key={a.n} className={'agent' + (i === 0 ? ' main' : '')} style={{ '--ac': a.c }}
            variants={{ h: { opacity: 0, y: 24 }, s: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
            whileHover={{ y: -6 }}>
            <img className="agent-portrait" src={asset.portrait(a.n)} alt="" loading="lazy" />
            <div className="agent-body">
              <span className="agent-role"><img src={asset.role(a.r)} alt="" />{ROLES_PT[a.r] || a.r}</span>
              <b className="agent-name">{a.n}</b>
              <dl>
                <div><dt>Partidas</dt><dd>{a.m}</dd></div>
                <div><dt>Vitórias</dt><dd className={a.wr >= 50 ? 'w' : 'l'}>{fmt(a.wr, 0)}%</dd></div>
                <div><dt>K/D</dt><dd>{fmt(a.kd, 2)}</dd></div>
                <div><dt>ACS</dt><dd>{fmt(a.acs, 0)}</dd></div>
              </dl>
            </div>
            {i === 0 && <span className="agent-badge">Principal</span>}
          </motion.article>
        ))}
      </motion.div>
    </Reveal>
  );
}

/* ---------------- mapas ---------------- */
function Maps({ p }) {
  const maps = [...p.maps].sort((a, b) => b.w + b.l - (a.w + a.l));
  return (
    <Reveal className="span-7 maps">
      <PanelHead title="Mapas" hint="ordenados por partidas" />
      <div className="map-grid">
        {maps.map((m, i) => (
          <motion.article key={m.n} className="map" initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE, delay: i * 0.05 }}>
            <span className="map-img" style={{ backgroundImage: `url(${asset.mapThumb(m.n)})` }} />
            <span className="map-body">
              <b>{m.n}</b>
              <span className={'map-wr ' + (m.wr >= 50 ? 'w' : 'l')}>{fmt(m.wr, 0)}%</span>
              <small>{m.w}V · {m.l}D</small>
              <span className="map-bar"><motion.span initial={{ width: 0 }} whileInView={{ width: `${m.wr}%` }} viewport={{ once: true }} transition={{ duration: 1, ease: EASE, delay: 0.2 + i * 0.05 }} /></span>
            </span>
          </motion.article>
        ))}
      </div>
    </Reveal>
  );
}

/* ---------------- armas ---------------- */
function Weapons({ p }) {
  const [top, ...rest] = p.weapons || [];
  const d = p.d;
  if (!top) return null;
  return (
    <Reveal className="span-5 weapons" delay={0.1}>
      <PanelHead title="Armas e mira" />
      <div className="wpn-top">
        <motion.img src={asset.weapon(top.n)} alt="" initial={{ x: 40, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE }} />
        <div><small>Arma principal</small><b>{top.n}</b><span className="muted">{top.k} abates{top.h != null ? ` · ${top.h}% na cabeça` : ''}</span></div>
      </div>
      <ul className="wpn-list">
        {rest.map(w => (
          <li key={w.n}><img src={asset.weapon(w.n)} alt="" /><b>{w.n}</b><span className="muted">{w.k} abates</span>{w.h != null && <span>{w.h}% cabeça</span>}</li>
        ))}
      </ul>
      <h3 className="mini-h">Onde os tiros pegam <span className="muted">· ato inteiro</span></h3>
      <div className="hits">
        {[['Cabeça', d.head, 'head'], ['Corpo', d.body, 'body'], ['Pernas', d.leg, 'leg']].map(([l, v, c]) => (
          <motion.span key={c} className={'hit ' + c} initial={{ flexGrow: 0.0001 }} whileInView={{ flexGrow: v }} viewport={{ once: true }} transition={{ duration: 1.2, ease: EASE }}>
            <b>{fmt(v, 0)}%</b><small>{l}</small>
          </motion.span>
        ))}
      </div>
    </Reveal>
  );
}

/* ---------------- partidas ---------------- */
function Spark({ values, color }) {
  if (values.length < 2) return null;
  const w = 600, h = 80, min = Math.min(...values) - 20, max = Math.max(...values) + 20;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - min) / (max - min)) * h]);
  const dPath = pts.map((pt, i) => (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1)).join(' ');
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <motion.path d={dPath + ` L ${w} ${h} L 0 ${h} Z`} fill={color} initial={{ opacity: 0 }} whileInView={{ opacity: 0.12 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.8 }} />
      <motion.path d={dPath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"
        initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, ease: EASE }} />
    </svg>
  );
}

function Matches({ p }) {
  const rows = (p.recent || []).map(r => ({ map: r[0], us: r[1], them: r[2], place: r[3], k: r[4], dd: r[5], a: r[6], ddd: r[7], hs: r[8], acs: r[9] }))
    .map(r => ({ ...r, res: r.us > r.them ? 'w' : r.us < r.them ? 'l' : 't' }));
  const wins = rows.filter(r => r.res === 'w').length;
  const avg = rows.reduce((a, r) => a + r.acs, 0) / (rows.length || 1);
  return (
    <Reveal className="span-12 matches">
      <PanelHead title="Últimas partidas" hint={`${wins} vitórias em ${rows.length} · ACS médio ${fmt(avg, 0)} (no ato: ${fmt(p.d.acs, 0)})`} />
      <Spark values={[...rows].reverse().map(r => r.acs)} color={p.color} />
      <div className="match-list">
        {rows.map((r, i) => (
          <motion.div key={i} className={'match ' + r.res} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, ease: EASE, delay: (i % 6) * 0.04 }}>
            <span className="match-map" style={{ backgroundImage: `url(${asset.mapThumb(r.map)})` }}><b>{r.map}</b></span>
            <span className="match-score"><b>{r.us}</b><i>:</i><b>{r.them}</b></span>
            <span className={'match-place' + (r.place === 'MVP' ? ' mvp' : '')}>{r.place === 'MVP' ? 'MVP' : r.place.replace('th', 'º').replace('nd', 'º').replace('rd', 'º').replace('st', 'º')}</span>
            <span className="match-kda"><small>K / D / A</small><b>{r.k} / {r.dd} / {r.a}</b></span>
            <span className="match-stat"><small>DDΔ</small><b className={r.ddd >= 0 ? 'w' : 'l'}>{r.ddd > 0 ? '+' : ''}{r.ddd}</b></span>
            <span className="match-stat hide-sm"><small>HS%</small><b>{r.hs}%</b></span>
            <span className="match-stat"><small>ACS</small><b>{r.acs}</b></span>
          </motion.div>
        ))}
      </div>
    </Reveal>
  );
}

export default function Profile({ squad, p }) {
  return (
    <motion.main className="profile" style={{ '--pc': p.color }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
      <AnimatePresence mode="wait">
        <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
          <Hero p={p} squad={squad} />
          <div className="grid">
            <Overview p={p} />
            <MMR p={p} />
            <SW p={p} />
            <Duel p={p} />
            <Agents p={p} />
            <Maps p={p} />
            <Weapons p={p} />
            <Matches p={p} />
          </div>
          <div className="profile-foot">
            <button className="btn-ghost" onClick={() => go('#/')}>← Voltar para o squad</button>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.main>
  );
}

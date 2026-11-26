// Junta o que foi coletado em raw/ com o squad-data.json atual e grava o squad-data.json novo.
// Uso (na pasta do projeto):  node tools/build-data.mjs
// Os arquivos de raw/ vêm de tools/collect-henrik.mjs (automático) ou da coleta pelo navegador no Tracker.gg.
// Arquivos lidos (todos opcionais; o que faltar mantém o valor anterior):
//   raw/profile.json        saída de tools/collect-profile.js
//   raw/overview-<id>.json  saída de tools/parse-page.js na página /overview?...&season=<id>  (id = l4, mt, sd)
//   raw/performance-<id>.json  saída de tools/parse-page.js na página /performance
//   raw/matches-l4.json     saída de tools/parse-page.js na página /matches do L4ngoni (parceiros de time)
//   raw/reads.json          {"l4":{"role","text"},"mt":{...},"sd":{...}}  textos de leitura novos
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(root, ...a);
const readJSON = f => { try { const t = fs.readFileSync(P(f), 'utf8'); const j = JSON.parse(t); return typeof j === 'string' ? JSON.parse(j) : j; } catch { return null; } };
const IDS = { l4: 'L4ngoni#1989', mt: 'Mattin#1993', sd: 'Snoop Dogglas#2908' };

const data = readJSON('squad-data.json');
if (!data) { console.error('squad-data.json não encontrado ou inválido'); process.exit(1); }
const log = [];

const profile = readJSON('raw/profile.json');
let newSeason = null;
if (profile) {
  for (const [id, riot] of Object.entries(IDS)) {
    const p = profile[riot]; if (!p || !p.s) { log.push(`perfil ${id}: sem dados`); continue; }
    const cur = data.players[id];
    newSeason = p.season;
    Object.assign(cur, {
      rank: p.rank || cur.rank, peak: p.peak || cur.peak, peakAct: p.peakAct || cur.peakAct, level: p.level || cur.level,
      playtime: p.s.timePlayed ? Math.round(p.s.timePlayed / 3600) : cur.playtime,
      s: Object.fromEntries(Object.entries(p.s).filter(([k, v]) => k !== 'timePlayed' && v != null)),
      agents: p.agents?.length ? p.agents.map(a => ({ ...a, wr: +(+a.wr).toFixed(1), kd: +(+a.kd).toFixed(2), adr: +(+a.adr).toFixed(1), acs: +(+a.acs).toFixed(1) })) : cur.agents,
      agentCount: p.agentCount ?? cur.agentCount,
      roles: p.roles?.length ? p.roles.map(r => ({ ...r, wr: +(+r.wr).toFixed(1), kd: +(+r.kd).toFixed(2) })) : cur.roles,
    });
    log.push(`perfil ${id}: ${p.rank}, ${p.s.matchesPlayed} partidas`);
  }
  if (newSeason && newSeason !== data.seasonId) {
    log.push(`ATO NOVO: ${data.seasonId} -> ${newSeason}`);
    data.seasonId = newSeason;
  }
  const sn = Object.values(profile)[0]?.seasonName;
  if (sn) data.act = sn.replace(/\s*Competitive$/i, '');
}

for (const id of Object.keys(IDS)) {
  const cur = data.players[id];
  const ov = readJSON(`raw/overview-${id}.json`);
  if (ov && ov.ok) {
    if (ov.maps?.length) cur.maps = ov.maps;
    if (ov.weapons?.length) cur.weapons = ov.weapons;
    if (ov.recent?.length) cur.recent = ov.recent;
    if (ov.rr && (ov.rr.nw || ov.rr.nl)) cur.rr = ov.rr; // RR médio por vitória e derrota (só a HenrikDev tem)
    log.push(`overview ${id}: ${ov.maps?.length || 0} mapas, ${ov.recent?.length || 0} partidas`);
  } else if (ov) log.push(`overview ${id}: ignorado (página incompleta)`);
  const pf = readJSON(`raw/performance-${id}.json`);
  if (pf && pf.ok && pf.history?.length) { cur.history = pf.history; log.push(`histórico ${id}: ${pf.history.length} atos`); }
}

const mt = readJSON('raw/matches-l4.json');
if (mt && mt.ok) { data.teammates = { l4: mt.teammates.filter(t => ['Mattin', 'Snoop Dogglas'].includes(t.nick)) }; log.push('parceiros: atualizado'); }

const reads = readJSON('raw/reads.json');
if (reads && reads.l4 && reads.mt && reads.sd) { data.reads = reads; data.readsAt = new Date().toISOString().slice(0, 10); log.push('textos de leitura: atualizados'); }

const tz = -new Date().getTimezoneOffset(), sg = tz >= 0 ? '+' : '-', pad = n => String(Math.abs(n)).padStart(2, '0');
const now = new Date(Date.now() + tz * 60000).toISOString().slice(0, 19) + `${sg}${pad(Math.trunc(tz / 60))}:${pad(tz % 60)}`;
data.updatedAt = now;
fs.writeFileSync(P('squad-data.json'), JSON.stringify(data, null, 1));
console.log('squad-data.json atualizado em', now);
for (const l of log) console.log(' -', l);

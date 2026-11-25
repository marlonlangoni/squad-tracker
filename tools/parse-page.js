// Rodar com a ferramenta javascript do navegador integrado DEPOIS que a página do Tracker.gg terminou de carregar.
// Funciona em 3 tipos de página e devolve um JSON (string):
//   /overview?...&season=<id>  -> {kind:"overview", act, maps, weapons, recent, ...}
//   /performance?...           -> {kind:"performance", history:[[ato, elo, win%], ...]}
//   /matches?...               -> {kind:"matches", teammates:[...]}
(() => {
  const raw = (document.querySelector('main') || document.body).innerText;
  const L = raw.split('\n').map(s => s.trim()).filter(Boolean);
  const idx = (lab, from = 0) => { for (let i = from; i < L.length; i++) if (L[i] === lab) return i; return -1; };
  const num = s => { if (s == null) return null; const m = String(s).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
  const path = location.pathname;
  const out = { url: location.href, title: document.title };

  if (/\/performance/.test(path)) {
    out.kind = 'performance';
    const start = idx('Top Agent');
    out.history = [];
    for (let k = start + 1; k < L.length; k++) {
      if (/^(V\d+|E\d+): A\d+$/.test(L[k])) out.history.push([L[k], L[k + 1], num(L[k + 4])]);
    }
    out.history.reverse(); // do mais antigo para o mais recente
    out.ok = out.history.length > 0;
    return JSON.stringify(out);
  }

  if (/\/matches/.test(path)) {
    out.kind = 'matches';
    const a = idx('TEAMMATES'), b = idx('View Details');
    out.teammates = [];
    if (a >= 0 && b > a) for (let k = a; k < b; k++) {
      const m = /^(\d+) Matches$/.exec(L[k]);
      if (m) out.teammates.push({ nick: L[k - 2], tag: L[k - 1].replace('#', ''), m: +m[1], kd: num(L[k + 2]), place: num(L[k + 4]), wr: num(L[k + 6]) });
    }
    out.ok = out.teammates.length > 0;
    return JSON.stringify(out);
  }

  out.kind = 'overview';
  const actLine = L.find(l => /COMPETITIVE OVERVIEW$/i.test(l));
  out.act = actLine ? actLine.replace(/\s*COMPETITIVE OVERVIEW$/i, '') : null;
  const pm = actLine ? /(\d+)h Playtime\s+(\d+) Matches/i.exec(L[L.indexOf(actLine) + 1] || '') : null;
  if (pm) { out.playtime = +pm[1]; out.matches = +pm[2]; }
  const tw = idx('TOP WEAPONS'), vw = idx('View All Weapons');
  out.weapons = [];
  if (tw >= 0 && vw > tw) for (let k = tw + 1; k < vw; k++) if (L[k] === 'Kills') out.weapons.push({ n: L[k - 5], h: num(L[k - 3]), b: num(L[k - 2]), l: num(L[k - 1]), k: num(L[k + 1]) });
  const tm = idx('TOP MAPS'), vm = idx('View All Maps');
  out.maps = [];
  if (tm >= 0 && vm > tm) for (let k = tm + 1; k < vm; k++) { const m = /^(\d+)W\s*-\s*(\d+)L$/.exec(L[k]); if (m) out.maps.push({ n: L[k - 2], wr: num(L[k - 1]), w: +m[1], l: +m[2] }); }
  const lm = L.findIndex(x => /^LAST( 20)? MATCHES$/.test(x));
  out.recent = [];
  if (lm >= 0) for (let k = lm; k < L.length - 18 && out.recent.length < 20; k++) {
    if (L[k] === 'Competitive' && L[k + 4] === ':') {
      const f = lab => { for (let j = k; j < k + 24 && j < L.length; j++) if (L[j] === lab) return j; return -1; };
      const a = f('K/D/A'), d = f('DDΔ'), h = f('HS%'), c = f('ACS');
      if (a < 0 || c < 0) continue;
      out.recent.push([L[k + 1], num(L[k + 3]), num(L[k + 5]), L[k + 6], num(L[a + 1]), num(L[a + 2]), num(L[a + 3]), d >= 0 ? num(L[d + 1]) : 0, h >= 0 ? num(L[h + 1]) : 0, num(L[c + 1])]);
    }
  }
  out.ok = !!out.act && out.maps.length > 0;
  return JSON.stringify(out);
})()

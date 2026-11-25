// Gera a imagem de prévia do link (WhatsApp, Discord…) e os ícones do app.
// Uso: npm run share   (rodar de novo quando o elo de alguém mudar)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.resolve(here, '../public');
const data = JSON.parse(fs.readFileSync(path.resolve(here, '../../squad-data.json'), 'utf8'));
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');
const TIER_PT = { Iron: 'Ferro', Bronze: 'Bronze', Silver: 'Prata', Gold: 'Ouro', Platinum: 'Platina', Diamond: 'Diamante', Ascendant: 'Ascendente', Immortal: 'Imortal', Radiant: 'Radiante' };
const rankPT = r => { const [t, d] = r.split(' '); return (TIER_PT[t] || t) + (d ? ' ' + d : ''); };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const P = [
  { id: 'l4', nick: 'L4ngoni', color: '#ff8a3d' },
  { id: 'mt', nick: 'Mattin', color: '#4fb3ff' },
  { id: 'sd', nick: 'Snoop Dogglas', color: '#c084fc' },
];

/* ---------- imagem de prévia 1200x630 ---------- */
const W = 1200, H = 630;
const bg = await sharp(path.join(PUB, 'assets/maps', slug(data.players.l4.maps?.[0]?.n || 'bind') + '.webp'))
  .resize(W, H, { fit: 'cover' }).modulate({ brightness: 0.45, saturation: 0.8 }).blur(2).toBuffer();

const colW = 340, gap = 30, x0 = (W - (colW * 3 + gap * 2)) / 2, cardY = 300, cardH = 250;
const cards = P.map((p, i) => {
  const x = x0 + i * (colW + gap), pl = data.players[p.id];
  return `
    <g>
      <polygon points="${x},${cardY} ${x + colW - 22},${cardY} ${x + colW},${cardY + 22} ${x + colW},${cardY + cardH} ${x + 22},${cardY + cardH} ${x},${cardY + cardH - 22}" fill="rgba(11,15,26,0.82)" stroke="${p.color}" stroke-width="2"/>
      <rect x="${x}" y="${cardY}" width="60" height="4" fill="${p.color}"/>
      <text x="${x + 24}" y="${cardY + 150}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-style="italic" font-size="${Math.min(44, Math.floor((colW - 48) / (p.nick.length * 0.76)))}" fill="#ece8e1">${esc(p.nick.toUpperCase())}</text>
      <text x="${x + 24}" y="${cardY + 190}" font-family="Arial, sans-serif" font-weight="700" font-size="24" fill="${p.color}">${esc(rankPT(pl.rank).toUpperCase())}</text>
      <text x="${x + 24}" y="${cardY + 224}" font-family="Arial, sans-serif" font-size="20" fill="#9aa1b2">K/D ${(+pl.s.kDRatio[0]).toFixed(2).replace('.', ',')}  ·  ${Math.round(pl.s.matchesWinPct[0])}% vitórias</text>
    </g>`;
}).join('');

const overlay = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0f1a" stop-opacity="0.35"/><stop offset="1" stop-color="#0b0f1a" stop-opacity="0.95"/></linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#ece8e1" stroke-opacity="0.05"/></pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <polygon points="${x0 + 18},64 ${x0 + 36},82 ${x0 + 18},100 ${x0},82" fill="#ff4655"/>
  <polygon points="${x0 + 18},76 ${x0 + 24},82 ${x0 + 18},88 ${x0 + 12},82" fill="#0b0f1a"/>
  <text x="${x0 + 52}" y="92" font-family="Arial, sans-serif" font-weight="700" font-size="26" letter-spacing="6" fill="#ece8e1">SQUAD<tspan fill="#ff4655">//</tspan>TRACKER</text>
  <text x="${x0}" y="200" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-style="italic" font-size="72" fill="#ece8e1">QUEM MANDA NO SQUAD?</text>
  <text x="${x0}" y="250" font-family="Arial, sans-serif" font-size="26" fill="#9aa1b2">Perfis, versus 1×1, ranking e metas · Valorant competitivo · ${esc(data.act)}</text>
  ${cards}
</svg>`);

const icons = await Promise.all(P.map(async (p, i) => {
  const r = await sharp(path.join(PUB, 'assets/ranks', slug(data.players[p.id].rank) + '.webp')).resize(84, 84, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return { input: r, left: Math.round(x0 + i * (colW + gap) + colW - 108), top: cardY + 26 };
}));

await sharp(bg).composite([{ input: overlay }, ...icons]).png({ compressionLevel: 9 }).toFile(path.join(PUB, 'og.png'));
console.log('og.png gerado');

/* ---------- ícones do app ---------- */
const logo = size => Buffer.from(`
<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#0b0f1a"/>
  <polygon points="50,14 86,50 50,86 14,50" fill="#ff4655"/>
  <polygon points="50,36 64,50 50,64 36,50" fill="#0b0f1a"/>
</svg>`);
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(logo(size)).png().toFile(path.join(PUB, name));
}
fs.writeFileSync(path.join(PUB, 'manifest.webmanifest'), JSON.stringify({
  name: 'Squad Tracker', short_name: 'Squad', start_url: './', scope: './', display: 'standalone',
  background_color: '#0b0f1a', theme_color: '#0b0f1a',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
}, null, 2));
console.log('ícones e manifest gerados');

// Converte a pasta ../Assets (originais) em versões leves para a web em public/assets.
// Uso: npm run assets   (só precisa rodar de novo quando a pasta Assets mudar)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, '../../Assets');
const OUT = path.resolve(here, '../public/assets');

// nome do arquivo -> slug usado no app (minúsculas, sem espaços; casa com o nome que vem do Tracker)
const ALIAS = { sky: 'skye', 'kay/o': 'kayo' };
export const slug = n => {
  const s = String(n).toLowerCase().replace(/_artwork_full$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return ALIAS[s] || s;
};

const jobs = [
  { dir: 'Agents Portraits', out: 'agents/portrait', w: 320, q: 82 },
  { dir: 'Agents Pose', out: 'agents/pose', h: 1100, q: 80 },
  { dir: 'Classes icons', out: 'roles', w: 96, q: 90 },
  { dir: 'Ranks', out: 'ranks', w: 160, q: 90 },
  { dir: 'Weapons icons', out: 'weapons', w: 320, q: 85 },
  { dir: 'Maps/Art', out: 'maps', w: 1280, q: 72 },
  { dir: 'Maps/Art', out: 'maps/thumb', w: 480, q: 70 },
];

let total = 0, count = 0;
for (const j of jobs) {
  const src = path.join(SRC, j.dir), out = path.join(OUT, j.out);
  if (!fs.existsSync(src)) { console.warn('faltando', src); continue; }
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (!/\.(png|webp|jpe?g)$/i.test(f)) continue;
    const name = slug(path.parse(f).name);
    const dest = path.join(out, name + '.webp');
    const img = sharp(path.join(src, f));
    const meta = await img.metadata();
    const resize = j.w ? { width: Math.min(j.w, meta.width) } : { height: Math.min(j.h, meta.height) };
    await img.resize(resize).webp({ quality: j.q, alphaQuality: 90, effort: 5 }).toFile(dest);
    total += fs.statSync(dest).size; count++;
  }
  console.log(`${j.out}: ok`);
}
console.log(`${count} arquivos, ${(total / 1048576).toFixed(1)} MB no total`);

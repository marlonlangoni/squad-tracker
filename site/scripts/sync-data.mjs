// Copia ../squad-data.json (a fonte de verdade, atualizada por tools/build-data.mjs) para public/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../../squad-data.json');
const dest = path.resolve(here, '../public/squad-data.json');
if (fs.existsSync(src)) { fs.copyFileSync(src, dest); console.log('squad-data.json sincronizado'); }
else if (!fs.existsSync(dest)) { console.error('squad-data.json não encontrado'); process.exit(1); }

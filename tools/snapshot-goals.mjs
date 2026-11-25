// Grava em squad-data.json o ponto de partida das metas (goalsBase).
// As metas do site são calculadas a partir desse retrato e o progresso compara os números atuais com ele.
// Uso (na pasta do projeto):  node tools/snapshot-goals.mjs          -> cria só se ainda não existir para o ato atual
//                             node tools/snapshot-goals.mjs --novo   -> recomeça as metas com os números de hoje
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'squad-data.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const force = process.argv.includes('--novo');

if (data.goalsBase && data.goalsBase.act === data.act && !force) {
  console.log(`metas já definidas em ${data.goalsBase.setAt} para ${data.act}; nada mudou (use --novo para recomeçar)`);
  process.exit(0);
}

data.goalsBase = {
  act: data.act,
  setAt: data.updatedAt || new Date().toISOString(),
  players: Object.fromEntries(Object.entries(data.players).map(([id, p]) => [id, { s: p.s, rank: p.rank, history: p.history, roles: p.roles }])),
};
fs.writeFileSync(file, JSON.stringify(data, null, 1));
console.log(`ponto de partida das metas gravado: ${data.act}, dados de ${data.goalsBase.setAt}`);

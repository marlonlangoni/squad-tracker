# Como atualizar o Squad Tracker

Projeto: `D:\CLAUDE CODE\Squad Tracker Valorant` (repositório git `marlonlangoni/squad-tracker`, branch `main`)
Site: https://marlonlangoni.github.io/squad-tracker/ (GitHub Pages, republica sozinho a cada push na `main`)

- `squad-data.json` (na raiz) tem todos os números. Numa atualização normal, só ele muda.
- `site/` é o site (Vite + React). No build, `site/scripts/sync-data.mjs` copia o `squad-data.json` da raiz para `site/public/`.
- `tools/` tem os scripts de coleta e montagem. `raw/` guarda a coleta da última execução (não vai para o git).
- `index.html` na raiz é o app antigo (v1), mantido só como histórico.

Jogadores: Marlon `L4ngoni#1989` (id `l4`), Henrique `Mattin#1993` (id `mt`), Douglas `Snoop Dogglas#2908` (id `sd`).

## Passo a passo

Use o navegador integrado (ferramentas `mcp__Claude_Browser__*`).

1. Apague os arquivos antigos de `raw/`, menos o `.gitkeep`.
2. Abra `https://tracker.gg/valorant/profile/riot/L4ngoni%231989/overview?playlist=competitive&platform=pc` com `preview_start` (parâmetro `url`) e espere carregar.
3. Rode o conteúdo de `tools/collect-profile.js` com `javascript_tool`. Salve a string JSON devolvida, sem alterar, em `raw/profile.json`. Dela, anote o `season` (id do ato atual).
   - Se essa chamada for bloqueada, pule este passo: os números principais ficam como estavam e o resto continua.
4. Para cada jogador (`<riot>` com `#` virando `%23` e espaço virando `%20`):
   - `navigate` para `https://tracker.gg/valorant/profile/riot/<riot>/overview?playlist=competitive&platform=pc&season=<season>`, espere uns 4 segundos, rode `tools/parse-page.js` e salve em `raw/overview-<id>.json`. Se `ok` vier `false`, espere mais 4 segundos e rode de novo (no máximo 3 tentativas).
   - `navigate` para `https://tracker.gg/valorant/profile/riot/<riot>/performance?playlist=competitive&platform=pc`, espere, rode `tools/parse-page.js` e salve em `raw/performance-<id>.json`.
5. `navigate` para `https://tracker.gg/valorant/profile/riot/L4ngoni%231989/matches?playlist=competitive&platform=pc`, rode `tools/parse-page.js` e salve em `raw/matches-l4.json`.
6. Na pasta do projeto, rode `node tools/build-data.mjs` e leia o resumo que ele imprime.
7. Textos de leitura: só se o elo de alguém mudou ou se alguém jogou 10 ou mais partidas desde `readsAt`. Escreva `raw/reads.json` com um parágrafo curto por jogador, em português, com os números atuais (pontos fortes, o que melhorar, função e agente que mais rendem). Formato: `{"l4":{"role":"Motor do time","text":"..."},"mt":{...},"sd":{...}}`. Depois rode `node tools/build-data.mjs` de novo.
8. Rode `node tools/snapshot-goals.mjs` (só cria o ponto de partida das metas se ainda não existir um para o ato atual). Se o resumo do passo 6 mostrou `ATO NOVO`, rode `node tools/snapshot-goals.mjs --novo`.
9. Se o elo de alguém mudou, rode `npm run share` dentro de `site/` para refazer a imagem de prévia do link.
10. Publique:
    - `git add -A`
    - `git commit -m "Dados de <data de hoje>"` (termine a mensagem com a linha `Co-Authored-By: Claude <noreply@anthropic.com>`)
    - `git push`
    - Confira com `gh run list --limit 1` que o workflow "Publicar no GitHub Pages" terminou com sucesso.

## Se algo der errado

- Página do Tracker.gg pedindo verificação (captcha) ou fora do ar: pare, não faça commit nem push, e registre o motivo no resumo da execução.
- Um jogador falhou: siga com os outros. O `build-data.mjs` mantém os valores antigos de quem faltar.
- Nenhum número mudou (ninguém jogou): não faça commit. Registre "sem partidas novas" no resumo.
- Ato novo (o resumo mostra `ATO NOVO`): publique normalmente e avise no resumo. O histórico de elo vem da página de performance.
- `git push` recusado: rode `git pull --rebase` e tente de novo uma vez. Se falhar, pare e registre o erro.

## Fotos de perfil dos jogadores

O pódio do Ranking usa a arte do agente principal de cada um. Para trocar por fotos de vocês:

1. Coloque as fotos em `Assets/Players/` com o id no nome: `l4.png` (Marlon), `mt.png` (Henrique), `sd.png` (Douglas). PNG com fundo transparente fica melhor; o script corta a margem vazia e centraliza.
2. Na pasta `site`, rode `npm run assets`.
3. Faça commit e push. O site republica sozinho e o pódio passa a usar as fotos de quem tiver arquivo.

## Metas

As metas da tela Evolução partem de um retrato dos números salvo em `squad-data.json` (`goalsBase`). Cada atualização compara os números novos com esse retrato, e o anel de progresso avança.

- `node tools/snapshot-goals.mjs` só cria o retrato se ainda não existir um para o ato atual.
- Ato novo ou metas batidas: `node tools/snapshot-goals.mjs --novo` recomeça as metas com os números de hoje.

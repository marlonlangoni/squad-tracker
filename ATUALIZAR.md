# Como atualizar o Squad Tracker

Projeto: `D:\CLAUDE CODE\Squad Tracker Valorant`
Artifact publicado: https://claude.ai/artifact/59NuCmPxS2nmsQV4zCENfg

- `index.html` é a página. Ela não traz dados embutidos: carrega `squad-data.json` publicado junto.
- `squad-data.json` tem todos os números. Só ele muda numa atualização.
- `tools/` tem os scripts de coleta e montagem. `raw/` guarda a coleta da última execução.

Jogadores: Marlon `L4ngoni#1989` (id `l4`), Henrique `Mattin#1993` (id `mt`), Douglas `Snoop Dogglas#2908` (id `sd`).

## Passo a passo

Use o navegador integrado (ferramentas `mcp__Claude_Browser__*`).

1. Apague o conteúdo antigo de `raw/` (pode manter a pasta).
2. Abra `https://tracker.gg/valorant/profile/riot/L4ngoni%231989/overview?playlist=competitive&platform=pc` com `preview_start` e espere carregar.
3. Rode o conteúdo de `tools/collect-profile.js` com `javascript_tool`. Salve a string JSON devolvida, sem alterar, em `raw/profile.json`. Dela, anote o `season` (id do ato atual).
   - Se essa chamada for bloqueada, pule este passo: os números principais ficam como estavam e o resto continua.
4. Para cada jogador (`<riot>` com `#` virando `%23` e espaço virando `%20`):
   - `navigate` para `https://tracker.gg/valorant/profile/riot/<riot>/overview?playlist=competitive&platform=pc&season=<season>`, espere uns 4 segundos, rode `tools/parse-page.js` e salve em `raw/overview-<id>.json`. Se `ok` vier `false`, espere mais 4 segundos e rode de novo (no máximo 3 tentativas).
   - `navigate` para `https://tracker.gg/valorant/profile/riot/<riot>/performance?playlist=competitive&platform=pc`, espere, rode `tools/parse-page.js` e salve em `raw/performance-<id>.json`.
5. `navigate` para `https://tracker.gg/valorant/profile/riot/L4ngoni%231989/matches?playlist=competitive&platform=pc`, rode `tools/parse-page.js` e salve em `raw/matches-l4.json`.
6. Rode `node tools/build-data.mjs` na pasta do projeto e leia o resumo que ele imprime.
7. Textos de leitura (opcional, só se os números mudaram bastante): escreva `raw/reads.json` com um parágrafo curto por jogador, em português, com os números atuais (pontos fortes, o que melhorar, função e agente que mais rendem). Formato: `{"l4":{"role":"Motor do time","text":"..."},"mt":{...},"sd":{...}}`. Depois rode `node tools/build-data.mjs` de novo.
8. Publique com a ferramenta Artifact:
   - primeiro `action: "read"` com `url` = o artifact acima;
   - depois publique com `url` = o artifact, `file_path` = `D:\CLAUDE CODE\Squad Tracker Valorant\index.html` e `files` = `{"squad-data.json": "D:\\CLAUDE CODE\\Squad Tracker Valorant\\squad-data.json"}`. Não passe `capabilities` nem `icon`.

## Se algo der errado

- Página do Tracker.gg pedindo verificação (captcha) ou fora do ar: pare, não publique, e registre o motivo no resumo da execução.
- Um jogador falhou: siga com os outros. O `build-data.mjs` mantém os valores antigos de quem faltar.
- Ato novo (o resumo mostra `ATO NOVO`): publique normalmente e avise no resumo. O histórico de elo vem da página de performance.

## Fotos de perfil dos jogadores (site 2.0)

O pódio do Ranking usa a arte do agente principal de cada um. Para trocar por fotos de vocês:

1. Coloque as fotos em `Assets/Players/` com o id no nome: `l4.png` (Marlon), `mt.png` (Henrique), `sd.png` (Douglas). PNG com fundo transparente fica melhor; o script corta a margem vazia e centraliza.
2. Na pasta `site`, rode `npm run assets`.
3. Faça commit e push. O site republica sozinho e o pódio passa a usar as fotos de quem tiver arquivo.

## Metas (site 2.0)

As metas da tela Evolução partem de um retrato dos números salvo em `squad-data.json` (`goalsBase`). Cada atualização compara os números novos com esse retrato, e o anel de progresso avança.

- Depois de rodar `node tools/build-data.mjs`, rode `node tools/snapshot-goals.mjs`. Ele só cria o retrato se ainda não existir um para o ato atual.
- Ato novo ou metas batidas: `node tools/snapshot-goals.mjs --novo` recomeça as metas com os números de hoje.
- Para o site receber os dados novos: faça commit e push do `squad-data.json`. O site republica sozinho.
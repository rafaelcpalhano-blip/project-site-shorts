# Commits — refinamentos 7.6.11

Execute na raiz do repositório, nesta ordem. Cada arquivo aparece uma vez. Arquivos compartilhados foram agrupados por integração: AdminSections (remoção do fluxo anterior e nova aba) está em E; rest-store (aliases e campos de consulta) em C; public-api (paginação e rotas) em D. A sequência é um conjunto integrado; não publicar estados intermediários. Nenhum comando faz push ou deploy.

## 1. A — Interface e Clipper

```powershell
git add `
  src/components/clipper/messages.ts `
  src/components/layout/SiteFooter.module.css `
  src/features/admin/pages/AdminPage.module.css `
  src/features/shorts/components/FirestoreShortDialog.tsx `
  src/features/shorts/components/ShortSequenceDialog.module.css `
  src/features/shorts/pages/HomePage.tsx `
  src/features/shorts/pages/HomePage.module.css `
  src/features/shorts/services/publication-notice.ts `
  tests/clipper-interaction.test.mjs `
  tests/refinements-7-6-5-b.test.mjs `
  tests/publication-notice.test.mjs

git commit -m "feat(ui): refinar Clipper e organizacao do visualizador"
```

## 2. B — Pesquisa e inclusao manual

```powershell
git add `
  server/games/igdb.ts `
  server/http/game-search.ts `
  src/features/games/components/GameCombobox.tsx `
  src/features/games/components/OfficialGamePicker.tsx `
  src/features/games/components/OfficialGamePicker.module.css `
  src/features/games/services/catalog-api.ts `
  src/features/games/services/game-options.ts `
  tests/igdb.test.mjs `
  tests/game-search-refinements.test.mjs

git commit -m "feat(games): ampliar pesquisa e confirmar inclusao manual"
```

## 3. C — Identificadores compativeis

```powershell
git add `
  server/identifiers/public-identifiers.ts `
  server/admin/history.ts `
  server/comments/review-comment.ts `
  server/comments/submit-comment.ts `
  server/games/admin-catalog.ts `
  server/games/manual-game.ts `
  server/firestore/rest-store.ts `
  src/features/admin/components/CatalogGameRow.tsx `
  src/features/admin/components/CommentModerationPanel.tsx `
  src/features/admin/services/comment-moderation-api.ts `
  src/features/admin/services/game-catalog-api.ts `
  tests/public-identifiers.test.mjs `
  docs/refinamentos-7-6-11-impacto.md

git commit -m "feat(ids): adicionar aliases permanentes sem migrar registros"
```

## 4. D — Falhas e monitoramento seguro

```powershell
git add `
  server/admin/update-event.ts `
  server/playback/record-failure.ts `
  server/http/playback-failure.ts `
  server/http/public-api.ts `
  server/security/attempt-limit.ts `
  server/security/network-abuse.ts `
  src/features/players/components/OfficialPlayer.tsx `
  src/features/players/components/OfficialPlayer.module.css `
  src/features/players/components/PlayerFailure.tsx `
  src/features/players/components/PlayerFailure.module.css `
  src/features/players/services/playback-failure-api.ts `
  src/features/players/services/youtube-api.ts `
  tests/helpers/refinements-store.mjs `
  tests/playback-monitoring.test.mjs

git commit -m "feat(players): registrar falhas com deduplicacao e revisao segura"
```

## 5. E — Caixa administrativa

```powershell
git add `
  server/admin/updates.ts `
  server/http/admin-moderation.ts `
  server/moderation/review-short.ts `
  server/reports/report-short.ts `
  server/submissions/submit-short.ts `
  src/features/admin/components/AdminSections.tsx `
  src/features/admin/components/ModerationPanel.tsx `
  src/features/admin/components/UpdatesPanel.tsx `
  src/features/admin/services/updates-api.ts `
  src/features/admin/services/history-labels.ts `
  firestore/firestore.indexes.json `
  tests/admin-updates.test.mjs `
  tests/admin-stage-7-6-2-components.test.mjs

git commit -m "feat(admin): adicionar atualizacoes com leitura individual"
```

## 6. F — Validacao e continuidade

```powershell
git add `
  tests/firestore/refinements-7-6-11.test.mjs `
  docs/etapa-7-6-11.md `
  docs/commits-7-6-11.md `
  docs/continuidade.md

git commit -m "test: registrar validacao integrada dos refinamentos 7.6.11"
```

Após os seis blocos, confira `git status`. Próximo passo: conferência manual listada no relatório. Etapa8 permanece não iniciada.

## 7. Complemento autorizado — jogos manuais antigos locais

Após os seis blocos anteriores, execute este complemento. Os arquivos compartilhados de documentação/rótulos podem já ter entrado nos blocos anteriores caso todos sejam executados agora; git add dos mesmos caminhos continua seguro. Os arquivos novos de manutenção/testes precisam deste bloco. Não adicionar snapshots ou dados do emulador.

```powershell
git add `
  server/identifiers/legacy-manual-games.ts `
  scripts/prepare-manual-game-identifiers.mjs `
  src/features/admin/components/GameCatalogPanel.tsx `
  src/features/admin/services/history-labels.ts `
  tests/legacy-manual-game-identifiers.test.mjs `
  tests/firestore/legacy-manual-game-identifiers.test.mjs `
  tests/admin-catalog-row.test.mjs `
  docs/aliases-jogos-manuais-locais.md `
  docs/etapa-7-6-11.md `
  docs/refinamentos-7-6-11-impacto.md `
  docs/continuidade.md `
  docs/commits-7-6-11.md

git commit -m "fix(admin): atribuir codigos reduzidos aos jogos manuais antigos"
```

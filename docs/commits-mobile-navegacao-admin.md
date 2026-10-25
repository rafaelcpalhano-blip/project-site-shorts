# Commits — correções mobile, navegação e administração

Executar no terminal do repositório, nesta ordem. Conferir `git status` antes. Os comandos incluem somente esta rodada; não incluem .env, dados locais ou artefatos privados. Os grupos A/B compartilham um componente e formam um commit funcional conjunto.

## 1. Catálogo mobile, retorno contextual e regressões relacionadas

```powershell
git add -- `
  server/firestore/atomic-store.ts `
  server/firestore/rest-store.ts `
  server/http/public-api.ts `
  server/http/public-read.ts `
  server/public/read-games.ts `
  src/lib/firebase/public-read-api.ts `
  src/lib/firebase/public-repository.ts `
  src/features/games/services/load-public-games.ts `
  src/features/games/components/GamePageNavigation.tsx `
  src/features/games/pages/GamePage.tsx `
  src/features/shorts/services/feed-return.ts `
  src/features/shorts/components/FirestoreFeed.tsx `
  src/features/shorts/components/FirestoreShortDialog.tsx `
  src/features/shorts/components/ShortCard.tsx `
  src/features/shorts/pages/HomePage.tsx `
  src/components/layout/SiteLayout.tsx `
  tests/mobile-public-games.test.mjs `
  tests/firestore/mobile-public-games.test.mjs `
  tests/feed-return.test.mjs

git commit -m "fix(mobile): corrigir catalogo e preservar retorno ao feed"
```

## 2. Organização visual administrativa e link de origem

```powershell
git add -- `
  src/features/admin/components/CatalogGameRow.tsx `
  src/features/admin/components/CommentModerationPanel.tsx `
  src/features/admin/components/CommentSelectionModeration.tsx `
  src/features/admin/components/CommentSelectionModeration.module.css `
  src/features/admin/components/ModerationPanel.tsx `
  src/features/admin/components/ModerationPanel.module.css `
  src/features/admin/components/UpdatesPanel.tsx `
  src/features/admin/components/UpdateSourceLink.tsx `
  tests/admin-mobile-layout.test.mjs

git commit -m "fix(admin): alinhar listagens e organizar acoes responsivas"
```

## 3. Relatório e continuidade

```powershell
git add -- `
  docs/correcoes-mobile-navegacao-admin.md `
  docs/commits-mobile-navegacao-admin.md `
  docs/continuidade.md

git commit -m "docs: registrar correcoes mobile e validacoes pendentes"
```

Próxima ação: conferir no celular/PC na 5175, retomar checklist e enviar Lighthouse; Etapa 8 ainda não iniciada.

# Correção do seletor de jogos no celular — 24/10/2026

## Causas e correções

- Catálogo: o telefone tinha encaminhamentos USB de 5174 e 5175, mas não de 8080. O cliente Firebase local consulta diretamente o Firestore em 127.0.0.1:8080. Restaurado esse encaminhamento sem reiniciar API ou emulador e sem alterar dados ou credenciais.
- Posicionamento: o seletor calculava a abertura acima usando a altura máxima, mesmo quando a lista filtrada era menor. Agora ancora a borda inferior na posição do campo usando a altura efetiva e acompanha resize e scroll do visualViewport, inclusive deslocamentos do teclado.
- Falha de catálogo: sem jogos disponíveis, o seletor fica desabilitado e mantém a ação de recarregar catálogo. A opção de informar jogo continua disponível.

## Arquivos

- src/features/games/components/GameCombobox.tsx
- src/features/games/services/game-panel-position.ts
- src/features/submissions/components/PersistentSubmissionDialog.tsx
- tests/game-panel-position.test.mjs

Busca, seleção por ID, teclado e proteção dos gestos de toque foram preservados. Listeners e requestAnimationFrame são removidos no fechamento. Nenhuma biblioteca instalada.

## Validação

17 testes relacionados aprovados: game-panel-position, game-combobox, mobile-interactions e game-catalog-cache. ESLint dos três arquivos de implementação, build em modo firestore-emulator e git diff --check aprovados.

Navegador local: catálogo real com 26 opções, pesquisa TIBIA e seleção do ID igdb-9596. Lista completa e lista sem resultados mantiveram distância de 4 px do campo. Oito medições em larguras 320/375/390/430 e alturas 844/500 mantiveram painel dentro da área visível e sem overflow horizontal. Reduzir a altura no desktop não simula integralmente o teclado Android; deslocamento do visualViewport também foi coberto por teste unitário.

Confirmação física do proprietário no Motorola g53 5G, após reabrir/recarregar o formulário e testar a pesquisa com teclado aberto: “A lista carregou e ficou junto ao campo.” Isso valida os dois problemas relatados, sem encerrar o restante do checklist mobile.

Evidências locais fora do Git: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/mobile-game-panel/seletor-corrigido.png e medicoes.json.

## Próxima conexão USB

Com o aparelho autorizado e os servidores locais iniciados, executar no PowerShell:

```powershell
cd "C:\Users\rafae\Downloads\platform-tools-latest-windows\platform-tools"
.\adb.exe reverse tcp:5174 tcp:5174
.\adb.exe reverse tcp:5175 tcp:5175
.\adb.exe reverse tcp:8080 tcp:8080
.\adb.exe reverse --list
```

Abrir https://127.0.0.1:5174/ no celular. 8080 é necessário ao catálogo no ambiente local com emulador; não se trata de expor Firestore de produção. 5175 só atende quando o servidor de preview estiver iniciado; ele não estava em execução nesta validação. O build foi atualizado, mas não foi iniciado um serviço em 5175. Reconexão/reinício de ADB pode exigir recriar os encaminhamentos. Esses comandos não reiniciam os servidores do projeto nem alteram acessos da API do YouTube.

Sem deploy, infraestrutura, produção, reset/restauração de dados ou commit automático. Etapa 8 permanece suspensa; próximo passo é continuar as validações manuais pendentes.
# Etapa 7.6.9-B — estabilidade do layout

Concluída localmente em 23/10/2026, sob autorização do proprietário. Escopo: carregamento do feed, reserva do rodapé e estabilidade da barra vertical/modais. C–I e Etapa8 não iniciadas.

## Alteração

O feed antes substituía um parágrafo por filtros e grade, deslocando rodapé/paginação. Agora o fallback do módulo e o feed persistente usam a mesma área mínima de uma altura pequena do viewport (`100svh`). O feed é uma coluna flexível: a área de resultados cresce, mantendo paginação depois dela também nos estados carregando, erro e vazio. A grade pronta continua com todos os itens da página, sem altura máxima, cortes ou rolagem interna adicional.

A altura mínima permanece em resultados curtos/vazios: haverá espaço livre antes da paginação/rodapé. É uma escolha deliberada para evitar colapso de layout, não limitação de quantidade nem atraso artificial no produto. O leitor de tela continua recebendo os estados de carregamento/erro existentes; não foram adicionados cards fictícios ou controles desabilitados de skeleton.

O documento usa `scrollbar-gutter:stable`, preservando o espaço da barra clássica quando o conteúdo cresce e quando um modal bloqueia o body. Não houve mudança no ciclo de foco, Escape, bloqueio/restauração de overflow ou permissões de fechar. Navegadores com barras sobrepostas não precisam reservar esse espaço; navegadores antigos sem suporte ignoram a regra e podem manter o deslocamento horizontal anterior. [Referência da propriedade](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scrollbar-gutter).

No rodapé, o Clipper tem tamanho explícito112×168px, ou88×132px em telas até480px, com object-fit:contain. A reserva não depende da decodificação da imagem e conserva as dimensões visuais anteriores. Os PNGs e seu peso não foram alterados; isso pertence à etapaC.

## Arquivos de aplicação

- `src/features/shorts/components/FeedLoading.tsx` — novo fallback acessível com reserva de espaço.
- `src/features/shorts/pages/HomePage.tsx` — usa o fallback no Suspense do feed.
- `src/features/shorts/components/FirestoreFeed.tsx` — contêiner do feed/resultados; lógica de dados e interações intacta.
- `src/features/shorts/components/ShortFeed.module.css` — altura mínima e distribuição flexível.
- `src/components/layout/SiteFooter.module.css` — dimensões explícitas do Clipper.
- `src/styles/global.css` — gutter estável da barra vertical.

Sem alteração de backend/Firestore, ordem/cursores, catálogo, publicação, comentários, auth ou players YouTube/TikTok/Twitch. Não se tentou silenciar o timeout da auditoria nem reduzir JavaScript/imagens nesta etapa. O código anterior é recuperável pelo Git; nenhum commit executado.

## Validação e evidências

### Medição local relacionada ao CLS

Mesma build no modo firestore-emulator, HTTPS5175, catálogo existente. PerformanceObserver do coletor externo já utilizado em A; sem throttling móvel, DPR1, sem limpeza de armazenamento/cache. Sem nova execução do Lighthouse. Comparação exploratória, não nota de produção ou medição em Android físico.

| Cenário | Antes, auditoria/A | Depois B | Observação |
| --- | ---: | ---: | --- |
| Retorno390×844 | CLS0,3558566 | CLS0 | B com atraso de1,8s só na resposta do proxy de auditoria;25s de coleta. |
| Desktop1280×900 | CLS0,4760421 | CLS0 | Captura inicial B de~3s, suficiente para os deslocamentos iniciais anteriores, sem ensaio prolongado. |
| Primeira visita com boas-vindas | Referências anteriores em viewport diferente | CLS0 | B em1280×720; não comparar numericamente com a primeira visita móvel anterior. |

As larguras320,375,390,400 e430px, altura844px, exibiram15 cards sem overflow horizontal e sem deslocamentos nos intervalos coletados. Capturas390/400 duraram~1,1s/1,2s;320/375/430 aproximadamente14–16s. Não tratá-las como auditorias completas equivalentes. A evidência móvel mais longa é a de390px com resposta atrasada.

Na primeira visita isolada, shell x=72,5/largura1120px antes/depois do fechamento do Clipper; overflow hidden restaurado e foco em Compartilhar. Para não apagar preferências existentes, foi usada origem temporária5176; encerrada após a conferência. O arquivo dessa captura tem rótulo histórico `b-first-390`, mas viewport real gravado1280×720: o resumo registra expressamente que é teste desktop. Captura visual renomeada `b-welcome-desktop.png`.

### Estados e interações

- Vazio: filtro Adição jogo novo, zero cards, mensagem existente; desktop rodapé começa em~1214px/paginação~1107px, abaixo do viewport de900px. Retornar a Todos os jogos recuperou o feed.
- Paginação:15 cards na primeira página →4 na segunda →primeira página recuperada. Sem perda de opções/regras de elegibilidade.
- Erro: falha artificial apenas no proxy de auditoria, mensagem existente/Clipper/retry; em390px rodapé~1077px/paginação~975px, abaixo do viewport844px. Imagem de falha150×225px carregou.
- Recuperação: ao retirar a falha e tentar novamente,15 cards, zero alertas, zero iframes.
- Modal Compartilhar: shell desktop x72,5/largura1120; em390px shell375px/dialog341px, sem overflow horizontal. Botão fechar e Escape devolveram foco ao Compartilhar e restauraram overflow; nenhum envio.
- Não foi necessário abrir/reproduzir vídeos para uma alteração nos contêineres de layout. Testes existentes de sequência/player montado preservados; nenhuma publicação, curtida ou comentário criado.

Ferramentas externas restauradas: atraso/falha artificial removidos, servidor extra5176 encerrado, aba de teste fechada e viewport restaurado. API5174/Firestore8080 preservados, build corrigida disponível em5175. Origem simples5175 não injeta coletor.

### Verificações de código

- **8 testes relacionados aprovados**: `clipper-welcome.test.mjs`, `clipper-communication.test.mjs`, `short-sequence-components.test.mjs`.
- ESLint apenas nos3 arquivos TSX alterados: aprovado.
- Build TypeScript+Vite com `VITE_DATA_MODE=firestore-emulator`: aprovada.
- `git diff --check`: aprovado.
- Avisos conhecidos: teste Vite informa porta HMR24678 já ocupada, sem falha dos testes; build mantém chunk principal acima500kB (508,32kB), sem tentativa de otimizar JS em B.
- Sem testes novos que apenas espelhem regras CSS; o comportamento foi conferido no navegador com dados existentes, estados de falha e tamanhos reais de viewport.

## Evidências externas e limites

Pasta: `C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/`.

- `samples-7-6-9-b/` e `b-metrics-summary.json`: amostras congeladas antes das interações, com viewport/duração/CLS.
- `b-responsive.json`, `b-states.json`: medições DOM e interações.
- `b-home-390.png`, `b-home-desktop.png`, `b-welcome-desktop.png`: capturas visuais conferidas.
- `b-build-manifest.json`: hashes e tamanhos da build apósB. Manifesto/relatórios deA permanecem preservados.

Não há nova nota Lighthouse. CLS0 observado nessas amostras não garante zero em qualquer dispositivo/conexão ou em todas as rotas. A ficha de jogo tem outros estados assíncronos/capas fora desta correção; não alegar eliminação global de CLS. Toque/teclado virtual no Motorola físico, navegadores antigos e redes simuladas Lighthouse permanecem limitações explícitas. O timeout/IndexedDB deA não foi corrigido por B e continua uma ressalva de metodologia.

## Entrega e próxima etapa

Alterações acima prontas para avaliação local, sem dependências, infraestrutura de produção, dados remotos ou deploy. Nenhum commit automático.

Commit de aplicação sugerido: `fix: estabiliza layout do feed e dos modais` — os6 arquivos de aplicação listados acima. Documentação B: este arquivo e a nova entrada em `docs/continuidade.md`; a continuidade também contém registros pendentes anteriores, que devem ser revisados antes de qualquer commit conjunto.

Próxima proposta: **7.6.9-C — otimizar arquivos existentes do Clipper**, somente após nova autorização. A eventual comparação Lighthouse deve manter os ajustes e ressalvas deA; não repetir auditorias completas a cada verificação visual.

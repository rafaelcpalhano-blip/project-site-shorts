# Clipzone — auditoria de desempenho antes da Etapa 8

Data: 23/10/2026. Escopo: diagnóstico local, sem otimizações implementadas.

## Conclusão

Há dois problemas comprovados que merecem as primeiras correções: o espaço do feed não é reservado durante o carregamento, gerando CLS alto também na build de produção; e os PNGs do Clipper têm tamanho muito superior ao necessário para sua exibição. O JavaScript de desenvolvimento explica parte importante do peso observado no Lighthouse, mas a build de produção ainda carrega código administrativo na entrada pública. A consulta do feed tem leituras sequenciais adicionais que merecem otimização posterior, preservando suas verificações de visibilidade.

Os relatos móveis são compatíveis com falhas de transporte, reproduzidas de forma controlada apenas no proxy de auditoria. A causa dos episódios originais continua desconhecida; não há evidência para atribuí-los a alterações do Codex, ao HMR ou a vazamento de memória.

## 1. Método e limites das medições

- Dados locais preservados: emulador demo-clipzone, catálogo existente de 22 jogos, 21 shorts e 19 comentários. Sem seed/reset, nova publicação, edição de negócio ou acesso a dados de produção.
- Build executada uma vez com `VITE_DATA_MODE=firestore-emulator`, TypeScript e Vite aprovados. Sem essa variável, a configuração padrão usaria o modo demo e não seria comparável ao catálogo atual.
- Frontend compilado servido temporariamente em **https://127.0.0.1:5175/**, loopback, com certificado local existente e proxy HTTPS para a API local em 5174. Sem Vite/HMR no frontend compilado. A API continua sendo o runner local, não uma simulação de infraestrutura de produção.
- Ambiente de desenvolvimento medido separadamente com os módulos reais transformados pelo Vite, por uma página temporária removida ao concluir.
- PerformanceObserver registrou FCP, candidatos de LCP, layout shifts, long tasks e ResourceTiming. Uma amostra por cenário, navegador desktop com viewport móvel, DPR 1, **sem limitação simulada de rede/CPU nem limpeza de cache**. Não equivale a Android físico ou ao perfil móvel do Lighthouse.
- Script diagnóstico de 3.819 bytes usado somente nas URLs com `?audit=...`; não faz parte do produto. A URL simples em 5175 não injeta esse script.
- O servidor temporário entrega arquivos sem compressão e sem ETag. Portanto, seus bytes transferidos não representam a futura hospedagem. Valores gzip abaixo foram calculados offline, não observados na rede.
- Lighthouse não estava instalado entre as ferramentas locais identificadas; não foi instalado. **Não há nova nota Lighthouse, TBT Lighthouse ou medição móvel com throttling nesta auditoria.** Não é possível concluir que o LCP de 7,2 s relatado foi resolvido.
- Reutilizados os registros anteriores de 81 testes relacionados à 7.6.8-F e 29 testes da correção Twitch. Não foram repetidas suítes funcionais sobre código inalterado.

### Resultados disponíveis

Resultado informado pelo proprietário: página inicial sem vídeo aberto; Performance 35, acessibilidade 100, boas práticas 96, SEO 92; FCP 3,9 s, LCP 7,2 s, CLS 0,496, TBT 20 ms; aproximadamente 16,3 MB. Sem arquivo JSON/trace original. Perfil móvel e presença das boas-vindas não confirmados.

| Amostra local exploratória | Viewport | FCP | LCP observado* | CLS | Scripts** | Iframes iniciais |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Desenvolvimento | 390 × 844 | 400 ms | 400 ms | 0,299 | 137 | 0 |
| Build, primeira visita com boas-vindas | 390 × 844 | 192 ms | 192 ms | 0,408 | 4 | 0 |
| Build, retorno sem boas-vindas | 390 × 844 | 128 ms | 128 ms | 0,356 | 4 | 0 |
| Build, desktop sem boas-vindas | 1280 × 900 | 120 ms | 120 ms | 0,476 | 4 | 0 |

\* O candidato registrado foi um parágrafo, sem identificação suficiente de seu texto. Os números rápidos refletem as condições locais sem throttling; não validam o LCP original, as imagens do feed ou a experiência em conexão móvel lenta.

\** Inclui um script de diagnóstico: a entrada compilada real carregou três chunks da aplicação. Todas as amostras terminaram com 15 cards e sem erro do feed. Durações de captura variaram: aproximadamente 25 s para desenvolvimento/desktop e 61–68 s nas amostras móveis compiladas; não comparar contagens totais de requisições como se fossem janelas idênticas.

A documentação considera CLS até 0,1 como bom. Os valores locais acima comprovam instabilidade visual, mas não são métricas de campo no percentil 75. [Referência sobre CLS](https://web.dev/articles/optimize-cls).

## 2. Gargalos e evidências

### A. CLS: feed assíncrono substitui um parágrafo por toda a grade — comprovado

Arquivos: `src/features/shorts/pages/HomePage.tsx`, `src/features/shorts/components/FirestoreFeed.tsx`, `src/features/shorts/components/ShortFeed.module.css`, layout/rodapé e modal de boas-vindas.

O Suspense mostra apenas “Carregando fonte de dados...”; depois o feed mostra “Carregando shorts...”. Nenhum dos estados ocupa a área da grade pronta. Rodapé, balões e paginação ficam inicialmente perto do topo e são deslocados quando os controles/dados aparecem.

- Build móvel de retorno: shift de 0,186 em ~407 ms e 0,169 em ~876 ms, envolvendo rodapé/paginação. Total 0,356.
- Build desktop: shift de 0,116 em ~412 ms, com conteúdo central mudando de x=80 para x=72,5 quando surge a barra vertical; depois 0,360 em ~894 ms com a expansão do feed. Total 0,476.
- Primeira visita acrescentou shift de ~0,016 associado à mudança de largura útil de 375 para 390 px durante o bloqueio de rolagem do modal.
- As respostas do feed chegaram perto de 865–914 ms desde a navegação, coerentes com os maiores deslocamentos finais.

Correção proposta, ainda não feita: reservar uma área responsiva coerente para os estados iniciais do feed e estabilizar o espaço da barra vertical, incluindo abertura/fechamento de modais. Preservar foco, erros, vazio, filtros e paginação. Isso tende a ter benefício alto e verificável no CLS.

Não atribuir esse CLS principalmente à falta de atributos nas miniaturas: `ShortCard.module.css` já reserva proporção 16:9 e posiciona a imagem dentro da área. Na ficha, `GameCover.tsx` não reserva proporção/dimensões antes do carregamento: há oportunidade adicional, mas o CLS específico dessa capa ainda exige medição fria própria.

### B. Imagens do Clipper muito pesadas — comprovado

| Arquivo público | Bytes | Uso |
| --- | ---: | --- |
| `public/clipper/welcome.png` | 1.698.946 | Boas-vindas e rodapé |
| `public/clipper/image-unavailable.png` | 1.770.794 | Fallback dos cards |
| `public/clipper/load-failure.png` | 1.486.681 | Estado de falha |

Total dos três: 4.956.421 bytes. **Não significa que os três sejam baixados em toda visita.** Os dois primeiros somam 3.469.740 bytes quando necessários; reutilizar a mesma URL entre cards não significa um download completo por card.

A imagem de boas-vindas é 1024 × 1536, exibida em aproximadamente 100 × 150 no modal e 88 × 132/112 × 168 no rodapé. O fallback também usa resolução muito maior do que a área dos cards. O rodapé tem lazy loading e dimensões explícitas, mas começa visível antes de o feed crescer: a requisição de `welcome.png` pode iniciar mesmo com as boas-vindas já dispensadas.

Proposta: gerar versões menores/mais eficientes das imagens já aprovadas, mantendo aparência, transparência e fallback; escolher resolução suficiente para DPR móvel. Não substituir a identidade do mascote. Benefício potencial alto em bytes; redução exata depende da comparação visual dos arquivos gerados.

### C. Desenvolvimento infla o JavaScript; a build ainda inclui administração — comprovado

- Recursos JavaScript decodificados na amostra dev: **12.169.536 bytes**, entre eles Firestore ~4,49 MB, ReactDOM ~3,13 MB, Router ~1,43 MB, Firebase Auth ~1,15 MB e HMR ~222 kB.
- Recursos conhecidos decodificados totais dev: ~14,0 MB. Isso explica boa parte do peso local, mas não reconstitui exatamente os 16,3 MB do Lighthouse original.
- Entrada compilada: `index-D5W7r26Z.js` 508.192 bytes; `public-repository-C5sJXrOh.js` 461.356; `FirestoreFeed-2laAalfB.js` 33.001. Total real inicial **1.002.549 bytes de JS**, cerca de **303.756 bytes gzip calculados offline**. CSS inicial ~25,8 kB.
- O aviso de chunk acima de 500 kB apareceu na build. A build já é otimizada/minificada: não tratar sugestões de minificação vistas no dev como ausência de minificação em produção.
- `src/app/router/router.tsx` importa `AdminPage` estaticamente; `AdminSessionProvider` e `src/features/admin/services/admin-auth.ts` trazem Firebase Auth para o caminho público. Não houve inicialização de login/requisição administrativa na carga inicial observada, mas o código entra no bundle.
- Formulário e ficha já têm chunks sob demanda; isso deve ser preservado. Dividir arquivos sem retirar dependências da entrada não garante redução do JS inicial.

Proposta: estudar lazy loading da administração/painéis e carregamento de auth quando necessário, preservando a sessão e a moderação inline. Benefício médio/alto, risco médio/alto de regressão de autenticação. O SDK público Firestore ainda é usado pelo catálogo; removê-lo da entrada demandaria análise específica, não simples rearranjo de chunks.

Nas amostras iniciais compiladas não houve long tasks registradas; no dev houve uma de ~75 ms. Isso não é TBT Lighthouse. O TBT 20 ms informado não aponta CPU bloqueada como a primeira prioridade, embora celular real possa apresentar custo diferente.

### D. Consulta do feed tem leituras adicionais em sequência — comprovado no código

Arquivos: `server/ranking/read-feed.ts`, `server/firestore/rest-store.ts`, `server/public/read-content.ts`.

A consulta limita candidatos a 30 e entrega até 15 shorts. Após obter a página, faz `await store.get` de cada short e de cada jogo distinto em sequência; jogos são reutilizados em um Map por resposta. O adaptador REST usa batchGet com um documento em cada chamada individual.

O proxy mediu ~442, 445 e 456 ms nas respostas iniciais de `/api/feed/ordered`, com corpo ~10.035 bytes; ficha com três shorts teve ~84 ms/2.018 bytes. A serialização é uma oportunidade real, mas não há decomposição por chamada para atribuir toda a latência a ela, nem medida de latência de produção.

Proposta: avaliar leituras agrupadas/paralelismo limitado. **Preservar revalidação atual de moderação, jogo ativo, limites e cursores**; não eliminar essas leituras sem solução equivalente de consistência. Benefício provável médio; risco de regressão médio/alto.

O cliente usa `gameName` da API: no conjunto atual não há uma consulta de jogo por card para resolver nomes.

### E. Catálogo carregado novamente em contextos distintos — comprovado no código

Arquivos: `FirestoreFeed.tsx` (efeito `listGames`), `src/features/submissions/components/PersistentSubmissionDialog.tsx`, `src/lib/firebase/public-repository.ts`.

- O feed carrega catálogo mesmo recebendo `gameId` fixo na ficha, onde o filtro de jogos não aparece. Leitura dispensável nesse contexto.
- Ao abrir Compartilhar, o formulário faz sua própria carga completa paginada em lotes de 50, sem reutilizar o catálogo já consultado pela home. A pesquisa do combobox é local, não faz consulta por caractere.
- Navegar de volta pode remontar a home e repetir leituras; isso não prova duplicação simultânea ou vazamento.
- Na carga inicial de produção observada houve uma sessão bem-sucedida e uma consulta ordenada, sem duplicação da API do feed. No dev houve tentativa de sessão abortada e nova tentativa bem-sucedida, compatível com efeitos adicionais do StrictMode, que são de desenvolvimento. Não desativar StrictMode para mascarar isso. [React](https://react.dev/reference/react/StrictMode).
- Três respostas Listen/channel do Firestore não equivalem necessariamente a três consultas da aplicação: fazem parte do transporte do SDK. Não foi encontrado uso de `onSnapshot` na aplicação.

Proposta: dispensar catálogo oculto na ficha e avaliar cache compartilhado com atualização/invalidação explícita. Manter todos os jogos elegíveis disponíveis, regras de ocultos/banidos/provisórios e seleção por ID. Com 22 jogos, benefício atual modesto; maior importância para crescimento. Não limitar o catálogo a seis/dez registros.

### F. Miniaturas externas e LCP — fatos e hipóteses separados

Arquivos: `src/features/shorts/components/ShortCard.tsx`, `src/features/shorts/services/card-artwork.ts`, `server/videos/thumbnail.ts`, `server/videos/tiktok.ts`, adaptadores de verificação de vídeos.

- YouTube usa qualidade maxres quando disponível, antes de standard/high/medium; foram observadas imagens de 129.439 e 56.935 bytes. Há oportunidade de usar qualidade adequada ao card, preservando fonte oficial e DPR.
- Twitch: amostra HEAD da miniatura 480 × 272 retornou 200, 41.057 bytes e cache max-age=14400. Sem necessidade demonstrada de alterar seu player.
- TikTok: os oito shorts publicados existentes não têm thumbnail persistida. Não houve tentativa de buscar CDN TikTok nesses cards; capa do jogo ou Clipper são o fallback esperado. O verificador já aceita `thumbnail_url`, valida URL/expiração. Não foi reconsultado o provedor para descobrir se a ausência veio de resposta omitida, URL recusada ou registros anteriores; causa ainda aberta.
- Capa manual amostrada por HEAD: PNG 1200 × 800, 365.731 bytes, cache private. IGDB retornou 200 e cache público longo; Content-Length não informado. Hospedagens externas podem ser lentas, remover imagens ou impedir hotlink.
- `loading="lazy"` em todas as miniaturas, inclusive primeira linha, e transição de opacidade podem retardar uma imagem candidata a LCP. **Ainda é hipótese sobre o LCP original:** o candidato observado na medição rápida foi texto. Não mudar todas as imagens para eager ou dar prioridade alta indiscriminada.
- Parte dos recursos externos não expõe Timing-Allow-Origin para Clipzone. TransferSize zero nesses casos não prova cache ou download de zero bytes. Cache do navegador também não foi limpo. Totais de transferência conhecidos são limites parciais, não inventário completo da rede.

Antes de escolher preload/qualidade/prioridades, capturar o elemento LCP e sua decomposição no Lighthouse/trace móvel da build. [LCP](https://web.dev/articles/optimize-lcp) e [imagens/lazy loading](https://web.dev/learn/images/performance-issues).

## 3. Bugs relatados no Android e reprodução controlada

O proprietário relatou uma vez o campo de comentário ausente e outra vez o feed em falha, com “Failed to fetch” e possível imagem do Clipper ausente. Depois de atualizações voltou ao normal. Não houve reprodução espontânea confirmada durante as medições.

Teste isolado: no servidor temporário 5175, interromper apenas a resposta de uma rota de API. A aplicação e seus arquivos não foram modificados; 5174 e o emulador continuaram normais. Falhas removidas ao concluir.

| Teste | Resultado verificado |
| --- | --- |
| Interromper `/api/feed/ordered` | Feed sem cards; ClipperFailure exibiu “Não foi possível carregar” e texto bruto “Failed to fetch”. |
| Imagem do estado de falha | Carregou: complete=true, naturalWidth=1024. A imagem ausente relatada não foi reproduzida. |
| Restaurar API e clicar Tentar novamente | Os 15 cards reapareceram sem recarregar a página. |
| Interromper `/api/comments/list` ao abrir Twitch | Player independente; mensagem de falha e retry visíveis; campo de comentário ausente. |
| Restaurar consulta e tentar novamente | Campo “Seu comentário” reapareceu. Sem enviar comentário/curtir/publicar. |
| Fechar visualizador | Zero iframes e 15 cards na home. |

Em `src/features/shorts/components/FirestoreShortDialog.tsx`, `available` só vira true após sucesso da listagem de comentários; o formulário, curtidas e denúncia dependem dele. A falha coloca `available=false`. Portanto, esse sintoma não exige que o player tenha falhado e não prova regressão do cadastro de comentários.

A recuperação básica existe e funcionou. Oportunidade posterior: tornar estado de carregamento/erro/indisponibilidade mais claro e evitar texto técnico bruto no feed; avaliar preservação de rascunho e recuperação sem liberar interações em conteúdo indisponível ou moderado. Não habilitar formulário incondicionalmente.

A origem do episódio no Android requer nova captura com horário, URL, conectividade, status de autenticação USB/encaminhamento, logs do runner e requisição que falhou. Reinício da API, conexão USB, certificado e HMR são hipóteses, não diagnósticos. A ausência simultânea de imagem poderia decorrer de falha mais ampla da origem, mas isso não foi demonstrado.

## 4. Listeners, players, responsividade e IndexedDB

- Home observada: zero iframes. O player monta após seleção; ao fechar foi removido. Não há evidência de players ocultos baixando vídeos na entrada.
- `OfficialPlayer.tsx` contém limpeza de listeners/observers/polling; coordenador mantém um proprietário de reprodução. Não foi provado vazamento. Testes anteriores Twitch já cobrem navegação/remoção; sem motivo para alterar YouTube/TikTok nesta auditoria.
- Cada `ShortCard` cria um intervalo de 60 s para horário relativo e o limpa ao desmontar. São ~15 na página medida: oportunidade pequena de relógio compartilhado, não prioridade nem vazamento comprovado.
- Cleanup de visibilidade, foco/overflow de modal e unsubscribe de autenticação existem no código. Não foi executado ensaio prolongado de heap/retained nodes; isso permanece teste adicional se reaparecer lentidão ao navegar.
- Home e ficha de Tibia foram conferidas nas larguras **320, 375, 390, 400 e 430 px**, sem overflow horizontal da página. Não substitui toque, teclado virtual, orientação e memória do Motorola físico. Regras mínimas Twitch da correção anterior continuam fora do escopo de mudanças.
- `src/lib/firebase/client.ts` usa `memoryLocalCache`; autenticação administrativa usa `inMemoryPersistence`. O alerta de IndexedDB do Lighthouse não prova cache persistente ativo, defeito do Firestore ou necessidade de apagar dados do usuário.
- Um Listen/channel completou perto de 60 s nas capturas móveis longas, sem erro do feed. Pode contribuir para ferramentas que esperam ociosidade de rede, mas a relação com o timeout original ainda não foi provada. Verificar no trace original em vez de remover SDK/listeners sem necessidade.

## 5. Priorização proposta — depende de aprovação

| Prioridade | Correção proposta | Benefício esperado | Complexidade / risco | Validação necessária |
| --- | --- | --- | --- | --- |
| P1 | Reservar área do feed e estabilizar barra vertical/modais | Alto no CLS; menos saltos/toques deslocados | Baixa–média / médio | Filmstrip e layout shifts com dados lentos, primeira visita/retorno, erro/vazio, filtros/páginas e foco; 320–430 px + desktop. |
| P1 | Otimizar imagens existentes do Clipper | Alto em bytes e rede móvel; possível benefício no LCP | Baixa–média / baixo–médio | Comparação visual/transparência em DPR 1/2/3, bytes, cache e fallback; nenhuma imagem quebrada. |
| P2 | Melhorar clareza/recuperação de falhas móveis | Alto para estabilidade percebida; sem promessa de nota | Média / médio | Falha/retomada de feed, comentários e sessão; rascunhos, conteúdo oculto e troca de vídeo; Android real. |
| P2 | Adiar código administrativo/auth desnecessário na home | Médio–alto em JS inicial | Média–alta / médio–alto | Bundle real da home, login/logout, expiração, sessão, Google/TOTP e moderação inline. |
| P2 | Agrupar/paralelizar leituras do feed com limite | Médio na espera dos dados; medir ganho | Média–alta / médio–alto | Medir latência e número de leituras; cursores, quatro ordens, moderação/banidos, ranking e consistência. |
| P2 | Evitar catálogo oculto/reutilizar carga com política de atualização | Modesto agora; cresce com catálogo | Média / médio | Nenhum jogo elegível perdido; inclusão manual/seleção por ID, invalidação de moderação e todas as páginas. |
| P2 condicionado à medição | Reservar capa da ficha e adequar thumbnail/LCP | Variável | Baixa–média / médio | Capa fria/lenta/quebrada, proporções, DPR e elemento LCP identificado antes de mudar prioridade. |
| P3 | Compartilhar relógio dos cards | Baixo no catálogo atual | Baixa / baixo | Atualização relativa e cleanup após navegação. |

Não há estimativa honesta de nova nota Lighthouse antes de aplicar e medir as mudanças. Não priorizar minificação já feita, remover verificações de segurança ou instalar bibliotecas para perseguir pontuação.

## 6. Próxima validação objetiva

1. Executar Lighthouse na **build local em 5175**, página inicial sem vídeo. Registrar JSON/HTML, versão do Chrome, modo mobile, throttling, estado das boas-vindas e cache. Fechar outras tarefas pesadas; não comparar com perfil dev diferente. Separar contexto limpo de primeira visita e retorno, preservando a sessão original do usuário.
2. Capturar elemento/trace do LCP, filmstrip de CLS e lista de bytes de rede. Examinar o Listen/channel longo e o alerta de IndexedDB; guardar diagnóstico antes de limpar armazenamento.
3. Aprovar e implementar primeiro CLS/imagens; repetir o mesmo cenário após esse lote, não uma suíte completa a cada ajuste. Usar repetições controladas quando necessário para distinguir variação de ganho.
4. Para as intermitências, testar no Motorola por conexão estável e registrar a falha concreta. Exercitar rede lenta/desconexão/retorno, comentários, sessão, navegação e fechamento sem publicação de dados.
5. Antes de qualquer mudança backend/auth, executar somente as suítes focadas de cursor/visibilidade/moderação/sessão afetadas e comparar com os invariantes atuais.

## 7. Evidências e alterações desta entrega

Artefatos fora do Git, na pasta compartilhada `C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/`:

- `samples/`: capturas congeladas `dev-mobile.json`, `prod-mobile-first.json`, `prod-mobile-return.json`, `prod-desktop.json`.
- `summary.json`, `bundle-inventory.json`, `server-requests.jsonl`, `image-head-metadata.json`, `responsive.json`.
- `prod-home-390.png`, `feed-fault.png`, `fault-injection.jsonl`.
- `serve-production.mjs` e `probe.js`: ferramentas temporárias locais; não integram a aplicação nem a infraestrutura de deploy. `interactive-followup.json` não foi usado para alegar contagens de rede após interações, pois sua captura final não foi recebida.

Alterações versionáveis desta auditoria: este relatório e entrada em `docs/continuidade.md`. A documentação de preservação local já estava pendente e foi mantida. Fixture de medição dev removida. Sem alteração de código funcional, dependência, dados de produção, configuração de infraestrutura ou deploy. Servidores normais permanecem disponíveis; falhas artificiais foram desligadas.

Build de referência: [Vite — build de produção](https://vite.dev/guide/build.html). Para condições e diferenças de auditoria: [Chrome DevTools — Lighthouse](https://developer.chrome.com/docs/devtools/lighthouse).

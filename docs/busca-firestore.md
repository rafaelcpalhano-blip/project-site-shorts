> **Situação atual — 21/10/2026:** pesquisa textual temporariamente desativada por decisão de produto para a primeira versão pública. A descrição técnica abaixo documenta a implementação preservada, não uma funcionalidade pública ativa.
>
> Controle compartilhado: `src/lib/features/title-search.ts` = false. Campo oculto nos feeds persistente e demonstrativo; rota pública /api/shorts/search retorna 404 sem operações Firestore. Publicação e seed não geram novos fragmentos. Backfill bloqueado antes de acessar o banco. Adaptadores, validadores, cliente, testes e lógica de pesquisa preservados.
>
> Dois índices compostos exclusivos foram retirados somente da configuração local ativa e arquivados em `docs/title-search.indexes.dormant.json`, sem deploy. As isenções de indexação simples continuam vazias para evitar indexação automática dos campos antigos; elas não criam índices. Registros, fragmentos, prontidão e limites antigos não foram excluídos ou migrados. Nenhuma alteração em índices de serviços externos.
>
> Feed: mais recentes, até 15 itens por página, cursor existente e filtros por jogo. O repositório consulta até 16 documentos (15 mais um para detectar a próxima página), sem varrer a coleção. Fichas mantêm jogo fixo. Nenhuma busca textual, geração de fragmentos ou índice textual composto é necessário ao fluxo ativo.
>
> Reativação futura exige autorização, restaurar índices, validar prontidão e atualizar os fragmentos de publicações feitas durante a pausa; apenas trocar a flag não basta. Migrações/exclusões continuam exigindo autorização específica. A opção interna titleSearchEnabled na composição da API serve a testes isolados, não é parâmetro HTTP nem configuração exposta ao visitante.
>
> **Requisito futuro obrigatório antes de concluir o projeto:** curtidas próprias sem cadastro, contagem e proteção contra duplicidade/abuso, seguidas de ordenação por relevância nos feeds geral e por jogo. Considerar curtidas legítimas, recência e intensidade de interação. Fórmula, armazenamento, custos e índices serão aprovados posteriormente. Nenhum campo, coleção, índice de relevância ou dependência foi antecipado.

### Validação da desativação (21/10/2026)

36 testes relacionados aprovados: 22 de desativação/renderização, pesquisa preservada
e API/publicação; 6 de pesquisa/publicação no emulador isolado; 8 de acesso público,
paginação 15/15/4 e filtro por jogo no emulador. Lint e build aprovados. API HTTPS
local reiniciada e POST /api/shorts/search conferido com 404. Nenhuma suíte completa
ou deploy executado. Sessões administrativas em memória encerram com o reinício;
se necessário, verificar acesso novamente. Conferência visual final pelo proprietário
após atualizar a página; testes de renderização confirmam ausência do campo.

Arquivos alterados nesta decisão (alterações anteriores da Etapa 7 preservadas):
- src/lib/features/title-search.ts
- src/features/shorts/components/FirestoreFeed.tsx
- src/features/shorts/components/ShortFeed.tsx
- src/features/shorts/pages/HomePage.tsx
- server/http/public-api.ts
- server/submissions/submit-short.ts
- scripts/seed-firestore.mjs
- scripts/backfill-title-search.mjs
- firestore/firestore.indexes.json
- docs/title-search.indexes.dormant.json
- tests/title-search-disabled.test.mjs
- tests/title-search.test.mjs
- tests/firestore/title-search.test.mjs
- docs/busca-firestore.md
- docs/continuidade.md


# Pesquisa por trecho de título — Etapa 7

Implementada e validada no emulador em 21/10/2026. Estratégia autorizada: Firestore
existente, até 30 candidatos por chamada, até 15 shorts por resposta e cronologia
mais recente primeiro. Sem contratação, faturamento, edição Enterprise, D1, Algolia,
curtidas, fórmula de relevância, serviços adicionais ou deploy.

## Funcionamento

- Formulário Buscar por título no feed inicial e nas fichas de jogos. Pesquisa por
  botão/Enter, sem chamada por tecla. Limpar busca volta ao feed já existente.
  Combina com jogo selecionado, descarta/cancela respostas antigas e reinicia cursor
  ao mudar a consulta/filtro. A busca não recarrega o catálogo de jogos a cada envio.
- Normalização NFD, remoção de marcas diacríticas, caixa pt-BR e espaços consecutivos.
  Suporta trecho contíguo no início, meio ou fim; não exige início de palavra.
  Não reordena palavras da frase, não corrige grafia e não faz busca semântica.
- O servidor deriva searchFragments únicos de 1–3 pontos de código do título salvo,
  mais titleSearchVersion=1, na mesma transação da publicação. Cliente não pode
  fornecer esses campos. Description, jogo e outros campos não são pesquisados.
- POST /api/shorts/search recebe somente query, gameId opcional e cursor opcional.
  Corpo máximo 8 KiB, query até 500 caracteres UTF-16, origem HTTPS fixa, sessão
  assinada e limite separado titleSearchAttempts (configuração local 20/minuto).
  Erros internos são genéricos; nenhum segredo no cliente/resposta.
- Candidatos usam o primeiro fragmento de até 3 pontos de código da consulta,
  array-contains no Firestore, moderationStatus=published e gameId quando escolhido.
  Ordem createdAt desc / ID desc. Projeção devolve somente campos do short, sem
  carregar o array de fragmentos na resposta de pesquisa.
- Até dois lotes internos de 15 candidatos, somados no máximo 30 documentos lidos
  por chamada de busca. Servidor confirma a correspondência do trecho inteiro e
  os filtros, devolvendo no máximo 15 resultados. Sem varredura indefinida para
  preencher página e sem consulta extra de sentinela para procurar o candidato 31.
- Cursor usa o último candidato EXAMINADO, não o último registro buscado nem apenas
  o último resultado mostrado. Candidatos de um lote já lidos mas não examinados
  podem ser relidos na próxima página, para não perder resultados. Cursor valida
  termo normalizado, jogo, data/ID e order=recent. É uma posição, não uma credencial.
- Se o lote estiver cheio, pode haver continuação mesmo que seja o fim exato dos
  candidatos. Uma chamada adicional vazia pode ser necessária para confirmar o fim.
  Página com poucos/nenhum resultado pode oferecer Continuar busca. A interface não
  afirma ausência global quando só foi atingido o limite. Sem total global contado.
- Mudanças concorrentes não têm snapshot fixo entre páginas. Conteúdo novo anterior
  ao cursor aparece ao atualizar/reiniciar; remoções são filtradas nas novas consultas.

## Dados antigos e segurança de migração

scripts/backfill-title-search.mjs é fixo em demo-clipzone:8080, sem credenciais de
produção ou opções de alvo remoto. Parar a API local durante a migração e reiniciar
com a versão que indexa novas publicações. Script marca searchState/title-v1 como
não pronto, percorre IDs em páginas de 30, relê cada documento em transação e grava
somente campos de índice usando o título ATUAL e todos os demais dados preservados.
É retomável/idempotente para documentos já corretos. Em registro inválido/falha,
a busca continua bloqueada; o feed normal permanece disponível. Só marca pronta
após terminar todas as páginas. Uma nova execução pode recomeçar sem duplicar dados.

Nesta entrega: API parada, script local executado com examined=0/updated=0/ready=true
porque não havia shorts no emulador de desenvolvimento. API reiniciada, Firestore
mantido. Sessões administrativas expiram ao reiniciar a API. Conferência HTTPS real
com sessão retornou 200, zero resultados/candidatos, exhausted=true, order=recent.
Não foram criados shorts artificiais na base de desenvolvimento. Resultados
preenchidos e migração de registros antigos foram validados no emulador isolado.
O gerador seed-firestore existente foi atualizado para produzir os mesmos campos,
mas NÃO foi executado nesta tarefa.

Regras Firestore preservadas: privados negados, escritas negadas inclusive claims
admin e consultas públicas diretas limitadas a 16 shorts. searchState e
 titleSearchAttempts são privados. O orçamento da API não limita todos os acessos
diretos que as regras já permitiam ao SDK. Antiautomação/retencão de produção seguem
como requisitos posteriores, sem alterações automáticas nesta etapa.

## Impacto de leituras e índices

Duas composições locais para shorts, ambas com searchFragments CONTAINS:
moderationStatus + createdAt/ID, e a variante com gameId. Indexação automática de
campo único de searchFragments/titleSearchVersion foi desativada para evitar índices
redundantes. Nada foi publicado na nuvem; o emulador não comprova que todos os
índices de produção estejam provisionados ou seu custo/latência reais.

Com F fragmentos únicos, são aproximadamente 2F entradas nesses índices compostos,
além dos índices preexistentes. Fragmentos crescem linearmente (até 3N−3 posições,
antes de deduplicar, para N pontos de código normalizados). NFD pode expandir o
texto: título de 500 unidades UTF-16 pode chegar a 1.500 pontos de código, com limite
teórico conservador de 4.497 fragmentos/8.994 entradas compostas. Não usamos todos
os substrings, cujo crescimento seria quadrático.

Medições reproduzíveis, scripts/evaluate-title-search.mjs (1.000 títulos sintéticos,
sem banco/rede/credenciais; usa o algoritmo real com porta de consulta em memória):

| Consulta | Resultados únicos | Chamadas até esgotar | Documentos candidatos lidos |
| --- | ---: | ---: | ---: |
| virada | 100 | 7 | 100 |
| minha virada | 100 | 34 | 1.000 |
| minha vitória épica | 0 | 34 | 1.000 |
| a | 1.000 | 67 | 1.000 |
| ÉPICA | 100 | 7 | 100 |

Nesse conjunto: média de 60,191 fragmentos por título, aproximadamente 120 entradas
compostas por registro e 354,525 bytes de JSON dos dois campos auxiliares. Outro
exemplo sintético de 500 caracteres CJK únicos gerou 1.497 fragmentos, 2.994 entradas
compostas estimadas e 13.511 bytes de JSON. JSON não equivale ao tamanho faturado de
documentos/índices; não foi medido armazenamento real nem preço monetário.
Os arrays também ampliam o documento recebido pelo feed SDK já existente.

Medição REST no emulador: 47 correspondências comuns, 4 chamadas, 47 documentos
candidatos lidos, máximo 30 por chamada. A primeira versão com um único lote de 30
lia 79 para esses mesmos 47 resultados; lotes internos de 15 reduziram releituras,
sem aumentar o teto autorizado. Quando há falsos positivos, ainda pode haver releitura.

Cada chamada tem ainda uma leitura do marcador de prontidão e o controle de abuso
(atualmente uma leitura e uma gravação), além das consultas de nomes dos jogos já
usadas pelo feed, até 15 nomes distintos por página. Consultas vazias têm mínimo de
leitura; transações/repetições e index-entry reads aplicáveis podem acrescentar custo.
O limite de 30 NÃO é um teto de todo o consumo Firestore da requisição.
Backfill faz leitura paginada e releitura transacional por short, uma gravação por
registro desatualizado e duas gravações do marcador. Publicações novas não precisam
de escrita extra fora da transação existente. Limites gratuitos são compartilhados
com o resto do site; sem tráfego real não há estimativa monetária confiável.

Limitação relevante mantida: termo pouco seletivo pode precisar de muitas continuações.
O cenário de 1.000 candidatos sem correspondência exigiu 34 chamadas. Não aumentamos
o limite de 30 nem acrescentamos busca automática infinita, índices estatísticos ou
serviços para ocultar essa limitação.

## Validação

- node --test tests/title-search.test.mjs: 10 testes passaram, incluindo normalização,
  início/meio/fim, Unicode, similaridade/falsos positivos, jogos, estados, cronologia,
  datas iguais, paginação, teto 30, lote vazio com continuação, ausência final,
  cursores adulterados, origem/sessão/corpo, falhas redigidas, cliente/cancelamento,
  limite separado e backfill com título atual/idempotência.
- node scripts/firebase-local.mjs test title-search.test.mjs: 6 testes passaram no
  demo-clipzone-tests:8081, com REST real/SDK/regras, paginação/medições, backfill de
  35 registros em 30+5, privacidade, nova publicação indexada, cota e duplicatas.
- Regressões tests/submission-http.test.mjs e tests/public-api.test.mjs: 8 testes
  passaram. Total de 24 testes distintos; sem suíte completa.
- Lint/build completos passaram. Após otimização interna da consulta, testes de
  busca unitários/emulador e tipos/lint do servidor passaram novamente; sem repetir
  regressões não alteradas. Sintaxe dos scripts conferida. git diff --check aprovado.
- Navegador não foi automatizado nesta etapa: a ferramenta já havia bloqueado acesso
  local. Conferência visual da nova busca permanece com o proprietário.

## Preparação para ordenação futura

Fragmentos não contêm ranking, curtidas ou posição. DTO/cursor identificam order=recent,
e a consulta está isolada no servidor, permitindo acrescentar uma política futura de
ordenação com seus próprios cursores/índices após aprovação. Nenhum botão, contador,
coleção de curtidas, fórmula ou índice de relevância foi criado antecipadamente.
Não se presume que uma ordenação futura por relevância já funcione com estes índices.

## Arquivos alterados

- src/lib/validation/title-search.ts
- server/search/search-titles.ts
- server/search/backfill-titles.ts
- server/http/title-search.ts
- server/http/public-api.ts
- server/security/attempt-limit.ts
- server/submissions/submit-short.ts
- server/firestore/atomic-store.ts
- server/firestore/rest-store.ts
- src/features/shorts/services/title-search-api.ts
- src/features/shorts/components/FirestoreFeed.tsx
- src/features/shorts/pages/HomePage.tsx
- firestore/firestore.indexes.json
- scripts/backfill-title-search.mjs
- scripts/evaluate-title-search.mjs
- scripts/seed-firestore.mjs
- tests/title-search.test.mjs
- tests/firestore/title-search.test.mjs
- docs/busca-firestore.md
- docs/continuidade.md

## Referências oficiais

- https://firebase.google.com/docs/firestore/query-data/queries — array-contains e composição.
- https://firebase.google.com/docs/firestore/quotas — limites de indexação/documentos.
- https://firebase.google.com/docs/firestore/enterprise/text-search — outra edição, não ativada.

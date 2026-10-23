# Etapa 7.6.9-G — paralelismo limitado das leituras do feed

Concluída localmente em 23/10/2026, sob autorização do proprietário. Git iniciou limpo após F. Apenas backend do feed ordenado e testes relacionados foram alterados. Sem commit, deploy, produção, biblioteca nova ou mudança de infraestrutura.

## Problema e mudança

readOrderedFeed aguardava, para cada candidato, a leitura atual de shorts/{id} e depois a leitura atual de seu jogo. Na maioria das ordenações isso colocava cada latência de transporte em série. O cache anterior de jogos já evitava repetir documentos dentro da mesma requisição; não se atribui a esta etapa uma redução que já existia.

Agora o leitor resolve janelas de até quatro candidatos em paralelo e consome os resultados na ordem original do array, independentemente de qual leitura terminou primeiro. A janela tem tamanho min(4, candidatos restantes na página consultada, slots visíveis restantes). Quando faltam poucos cards, ela diminui: não antecipa shorts além do ponto em que a versão sequencial preencheria os 15 cards.

Jogos repetidos compartilham uma Promise dentro da requisição, evitando leituras duplicadas quando candidatos simultâneos pertencem ao mesmo jogo. Não há cache de shorts nem cache de jogos entre requisições. O limite é por requisição, não um novo limite global de conexões.

## Invariantes preservados

- latest, oldest, likes e relevant; empate e ordem originais preservados.
- Consulta de candidatos, campos, readTime e índices REST inalterados.
- Até 15 cards e até 30 candidatos lidos por resposta; candidatos examinados/limited mantidos.
- Cursor ancora o último candidato consumido, inclusive invisíveis; continuações, escopo, HMAC, expiração e geração de ranking não mudaram.
- Cada candidato ainda busca o short atual; snapshot/ranking não concedem visibilidade. Só published e jogo atual com status active entram na resposta, respeitando filtro gameId.
- Campos públicos, nomes/capas sanitizadas, miniaturas, contadores e datas continuam passando por publicShort sem novo DTO.
- Métricas/epoch e geração de relevância são validadas antes da coleta como antes.
- Falha rejeita a resposta inteira; nenhuma página parcial ou próxima janela é publicada/iniciada após falha.

O leitor legado server/public/read-content.ts e a pesquisa de títulos desativada não foram modificados. Não houve alteração de ranking, pontuação, cota, permissão, cookies, players ou validações de publicação.

## Medição antes/depois

Cópia congelada do leitor anterior guardada fora do Git, com imports resolvidos para as mesmas dependências. Comparação usa o mesmo conjunto de dados e verifica igualdade profunda do resultado e do total de get/candidatos, não apenas cronômetro.

Ensaio controlado: 45 fontes, cinco jogos ativos, 8ms de atraso configurado por get e por consulta de candidatos; três pares por ordenação. A resolução dos timers do host integra a duração observada. Valores abaixo são medianas arredondadas, não previsão de latência de produção.

| Ordenação | Sequencial | Paralelo | get antes/depois | Pico get simultâneos |
| --- | ---: | ---: | ---: | ---: |
| latest | 324ms | 109ms | 20 / 20 | 1 → 4 |
| oldest | 325ms | 109ms | 20 / 20 | 1 → 4 |
| likes | 325ms | 108ms | 20 / 20 | 1 → 4 |
| relevant | 356ms | 140ms | 22 / 22 | 1 → 4 |

Relevância inclui duas leituras prévias de estado/métricas. Uma query de candidatos por resposta nesse ensaio. O benefício é menor espera de I/O, não economia automática de leituras faturáveis.

Comparação adicional somente leitura no catálogo real do emulador local demo-clipzone:8080:

| Ordenação | Antes | Depois | get antes/depois | Consultas de candidatos antes/depois |
| --- | ---: | ---: | ---: | ---: |
| latest | 437ms | 77ms | 30 / 30 | 2 / 2 |
| oldest | 437ms | 124ms | 30 / 30 | 2 / 2 |
| likes | 482ms | 126ms | 30 / 30 | 2 / 2 |
| relevant | 436ms | 98ms | 30 / 30 | 1 / 1 |

As quatro comparações reais retornaram os mesmos 15 DTOs, contagens de candidatos e get. São pares exploratórios únicos, sujeitos a aquecimento, carga do host e à execução paralela dos testes isolados8081; não são benchmark estatístico nem percentual garantido de ganho no site. Não houve Lighthouse repetido ou nova nota/LCP alegada.

## Testes e funcionamento local

50 testes relacionados aprovados:

- tests/ordered-feed-concurrency.test.mjs: 13 novos testes. Quatro ordens com empates, filtro, cursores/paginação sem duplicação e respostas fora de ordem; pico de get até4; uma leitura por jogo na requisição e revalidação na seguinte; janela reduzida nos slots finais; invisíveis/limite30/continuação; revalidação atual após snapshot; falha sem página parcial; cursor/entrada/epoch inválidos antes de consultar candidatos.
- tests/ranking-generation.test.mjs, tests/ranking-engagement.test.mjs e tests/public-read.test.mjs: 31 existentes.
- tests/firestore/ranking-integration.test.mjs: 6 integrações existentes, executadas pelo runner em demo-clipzone-tests:8081, isolado do ambiente de cadastro8080. Quatro ordens e três escopos, moderação entre páginas, fontes ocultas, consistência de métricas, limites, origem/cookie/HMAC e negação de acesso SDK às métricas privadas. Mensagens PERMISSION_DENIED dos testes negativos eram esperadas; suíte concluiu exit0. Emulador8081 desligado pelo runner.

ESLint localizado aprovado, TypeScript/build VITE_DATA_MODE=firestore-emulator aprovados, git diff --check aprovado. Não foi executada suíte completa nem instaladas ferramentas.

A API5174 usa imports estáticos do backend e foi reiniciada para aplicar G, com o mesmo runner e arquivos de configuração. Certificados/segredos não foram alterados ou exibidos; persistência de identidade local mantida pelo mecanismo existente. Emulador8080 permaneceu no mesmo processo, sem seed/reset/export/import. Rotinas normais locais de ranking continuam como antes; nenhuma edição de jogos/shorts/comentários foi realizada para testar G.

Após reinício, cliente real da API HTTPS5174 validou as quatro ordens com15+4cards nas duas páginas, sem repetição e com respostas200; filtro Tibia retornou3shorts do jogo correto. Sessão204. Não houve publicação, comentário, curtida ou decisão administrativa real.

Navegador na build5175: home15cards, Mais Relevante15cards e página2com4, sem alertas, zero iframes e sem overflow horizontal. Não houve mudança frontend; build reexecutada para conferir tipos e compatibilidade. Sem novo teste físico no Motorola.

## Limitações e risco

As leituras atuais de documentos diferentes continuam não sendo uma transação/snapshot atômico conjunto. Moderação ou remoção concorrente pode ocorrer entre leitura e resposta, como já era possível; não prometer consistência instantânea. A mudança altera o momento de início de algumas leituras dentro da janela, sem substituir revalidação atual por dados antigos de ranking. O cache de jogo continua limitado à requisição, conforme comportamento anterior.

Se uma leitura falhar, outras da mesma janela já podem estar em andamento, incluindo a leitura de seu jogo. Não há cancelamento no contrato atual de store.get: elas podem concluir após a rejeição. Nenhuma próxima janela é iniciada, não se escreve dado e não se devolve resposta parcial. Em caminhos de erro, pode haver leituras adicionais dentro dessa janela em relação à falha sequencial imediata. Nos cenários de sucesso comparados, a contagem permaneceu igual.

Maior paralelismo aumenta pico de I/O por requisição; limite conservador4 mantém trabalho limitado. Em produção, latência/carga/quotas devem ser medidas antes de alterar esse valor. Nada foi exposto ou implantado.

## Arquivos e entrega

- server/ranking/read-feed.ts — única mudança funcional de backend.
- tests/ordered-feed-concurrency.test.mjs — novos testes focados.
- tests/helpers/ordered-feed-store.mjs — store determinístico de testes, com contadores/atrasos e snapshots simulados.
- docs/etapa-7-6-9-g.md e docs/continuidade.md — registro.

Evidências externas em C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-9-g/: read-feed-before.ts, comparison.json, api-checks.json, ui-checks.json e relevant-build.png. Scripts de comparação não entram no projeto ou deploy. Aba de teste fechada. API5174 e build5175 disponíveis; emulador8080 preservado;8081isolado encerrado.

Commits sugeridos, não executados:

1. perf: paraleliza leituras do feed com limite de concorrencia — backend e dois arquivos de testes acima.
2. docs: registra otimizacao das leituras do feed — este relatório e continuidade.

Próxima etapa conforme plano: 7.6.9-H — LCP e capas, conforme evidência. Avaliar apenas dimensões, qualidade e prioridade de imagens justificadas pelas medições, sem antecipar todas as miniaturas. Ainda não iniciada; aguarda autorização. Etapa8 não iniciada.

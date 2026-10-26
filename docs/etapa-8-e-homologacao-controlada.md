# Etapa 8-E — homologação controlada reaberta

26/10/2026. **Reabertura expressamente aprovada pelo proprietário, aceitando picos isolados e mantendo Workers Free/Firebase Spark. Não é aprovação de lançamento nem conclusão da Etapa 8 ou entrada na Etapa 9.** Endereço https://www.clipzone.workers.dev, versão de3954d1-9e10-4eb3-b09a-55d23e8572d1. workers_dev=true, preview_urls=false, jobs=false, diagnósticoTikTokfalse e observação sanitizada da homologação true. O endereço workers.dev é acessível a quem tiver a URL; não foi criado serviço de controle de acesso adicional e não foi anunciado como lançamento público.

## O que foi medido

Foram 74 chamadas HTTP controladas, em três coletas, com 44 registros de CPU válidos de quatro isolates. As chamadas sem evento de CPU não receberam valores estimados; os caminhos ausentes foram medidos posteriormente em lotes pequenos. Foram registrados somente routefixa/status/outcome/CPU/wallTime/marcadoresanonimizados; semcorpos,IP,UID,email,Authorization,cookies,chaves ouURLcomquery. Os IDsdeisolate deste relatório são aliases locais, não identificadores de usuário.

O código distingue primeiraAPIobservada no isolate, criação da composição de aplicação e primeiro uso de cada rota. Marcador de criação não é perfil de funçõesV8 completo nem prova isolada da causa do tempo. Aplicações novas observadas: sessão12ms,feed9ms,sessão8ms,sessão8ms. O pico12ms coincidiu com criação da aplicação e primeiraAPI; não se repetiu nas outras três inicializações. Não atribuir 100% do pico a criptografia ou JIT sem perfil correspondente.

| Endpoint | HTTP | Amostras de CPU | Criação da aplicação (ms) | Primeiro uso da rota em aplicação existente (ms) | Reuso da rota (ms) |
| --- | --- | --- | --- | --- | --- |
| /api/admin/comments/queue | 401 | 1 | — | 1 | — |
| /api/admin/config | 200 | 6 | — | 1, 0 | 0, 0, 0, 0 |
| /api/admin/games/catalog | 401 | 1 | — | 2 | — |
| /api/admin/queue | 401 | 1 | — | 2 | — |
| /api/admin/session | 401 | 1 | — | 2 | — |
| /api/comments | 400 | 1 | — | 2 | — |
| /api/comments/list | 404 | 1 | — | 2 | — |
| /api/feed | 200 | 8 | 9 | 5, 3 | 4, 3, 2, 2, 2 |
| /api/feed/ordered | 503 | 1 | — | 2 | — |
| /api/games/confirm | 400 | 1 | — | 2 | — |
| /api/games/list | 200 | 6 | — | 4, 2 | 3, 3, 3, 1 |
| /api/games/manual | 400 | 1 | — | 2 | — |
| /api/games/search | 200 | 1 | — | 4 | — |
| /api/likes/set | 400 | 1 | — | 3 | — |
| /api/likes/state | 404 | 1 | — | 4 | — |
| /api/playback/failure | 400 | 1 | — | 4 | — |
| /api/reports | 400 | 1 | — | 2 | — |
| /api/session | 204 | 5 | 12, 8, 8 | 0 | 0 |
| /api/session | 403 | 1 | — | — | 0 |
| /api/shorts | 400 | 1 | — | 0 | — |
| /api/shorts/detail | 404 | 1 | — | 2 | — |
| /api/shorts/preview | 200 | 2 | — | 4, 5 | — |

0 ms é o valor arredondado informado pela plataforma, não ausência absoluta de trabalho. São amostras pequenas, não teste de carga/percentil ou garantia contra interrupções futuras. Headers/origem/segurança e contadores continuam sendo verificados por requisição.

**Limite da cobertura:** /api/shorts400 é apenas rejeição de entrada inválida; likes/comments/reports e cadastros de jogos também usaram entradas inválidas ou referência ausente. /api/admin/*401 valida a recusa, não o caminho autorizado. Esses valores não certificam a CPU da publicação/curtida/comentário/moderação reais. Nenhum conteúdo fictício foi criado. A confirmação posterior de login e a leitura do conteúdo definitivo estão registradas ao final; a CPU das escritas válidas ainda não foi coletada. /api/feed/ordered503ranking-not-ready foi a resposta prevista porque o ranking remoto ainda não foi gerado e jobs continuam desligados; não é exceededCpu.

## Resultado e problemas separados

- **CPU/infra:** zero exceededCpu,zero erro 1102 e zero exceções nos eventos registrados. Todas as 74 respostasHTTP foram as esperadas, incluindo as recusas deliberadas. Não houve recorrência>10 ms nas execuções reutilizadas observadas. Um dos quatro eventos de criação da aplicação passou de10 ms(12ms), dentro da ressalva explicitamente aceita para homologação; insuficiente para afirmar taxa estatística de picos.
- **Provedores:** YouTube/Twitch retornaram título/canal e pesquisaIGDB respondeu. TikTok429 do endpoint oficial permanece uma pendência própria; nenhuma chamadaTikTok nesta rodada, sem bypass/proxy/novoIP/chave extra/tentativas excessivas.
- **Coletor:** primeiras duas coletas tiveram lacunas mesmo com espera limitada; guardas suspenderam a URL e confirmaram404. A coleta final usou lotes de6e4 chamadas, com ritmo reduzido e espera por cobertura. Ela registrou10de10eventos e completou todos os endpoints ausentes. Não se confirmou se a perda anterior foi amostragem, transporte, ritmo ou comportamentoCLI; não atribuir a falha à aplicação. Não mudar plano/ativar logs pagos para contornar.
- **Funcional:** ranking remoto ainda não pronto. O proprietário confirmou login e publicação; as leituras válidas foram verificadas posteriormente. Escritas válidas e moderação ainda não têm medição de CPU. Isso não certifica o conjunto da plataforma para lançamento.

## Otimizações e segurança preservadas

Mantidos cacheHMAC limitado/nãoextraível, transaçãoWorkers batchGet.newTransaction.readWrite e minificação. Perfil local anterior:450→0reimports e602→452chamadasREST/150consultas; mesmasleituras/gravações e proteções. Oportunidades já aplicadas atacam trabalho repetido e roundtrips; próximos perfis devem usar caminhos válidos medidos, sem reduzir verificações ou deslocar trabalho para chamadas artificiais de aquecimento. Nenhuma nova otimização especulativa de RSA, Auth, quotas ou dados foi aplicada nesta rodada.

650 testes Node sem falhas, 14 regressões específicas e 16 provas integradas no workerd sem acesso à rede externa; tipos e lint aprovados. Prova anterior de concorrência em8081 preservada; não repetida sem alteração transacional. Novas regressões verificam opt-in/desligamento, marcadores de inicialização, anonimização, URLarbitrárianãoregistrada e falha do logger sem alterar resposta. Nenhuma suíte ouLighthouse foi repetido depois dos últimos ajustes sem motivo.

Google/TOTP/1UID/revalidação backend, cookiesseguros,origem/CORS,ingressoCloudflare,quotas persistentes e fail-closed mantidos. Oito valoresprivados e a chaveYouTube local/7IPs não mudaram. Semregras/IAM/índices/billing/planos/serviços extras alterados. Nas coletas do agente, somente sessões e contadores técnicos foram escritos. O proprietário publicou conteúdo definitivo separadamente. Sem migração, reset ou reinício de 5174/5175/8080. A presença da observação não adiciona endpoint ou envia dados de autenticação ao navegador.

## Estratégia objetiva de suspensão

Durante os ensaios supervisionados, suspender imediatamente em exceededCpu/1102, exceção, resposta inesperada, falha de proteção ou falta de evidência necessária. Suspender e investigar CPUreutilizada do mesmoendpoint em2amostrasconsecutivas>10 ms ou3dasúltimas10>10 ms; separar inicialização/primeiro uso e nunca ocultar esses picos. Investigar se picos de inicialização se repetirem; duas das três próximas inicializações acima10 ms bloqueiam considerar essa margem como isolada. Não insistir em teste de carga ou repetir até obter nota melhor.

Suspensão: publicar a mesma composição/segredos com workers_dev=false e previewsfalse, conferir /e/api/admin/config404 após propagação, preservando recursos e banco. Essa guarda foi efetivamente exercitada nas duas coletas incompletas. Sem rollback incompatível, exclusão de credenciais ou upgrade. O manifesto atual reflete homologaçãoaberta, não lançamento.

**Escopo de monitoramento:** guardas automáticas operaram nas coletas delimitadas desta rodada. Não foi criado monitor24h, cron, job ou serviço pago. Fora de uma coleta ativa, observar métricas/erros no painel e iniciar nova coleta supervisionada para testes manuais; não prometer captura retrospectiva individual de todos os requests com WorkersLogsdesligado. Observação sanitizada continua habilitada para essas próximas coletas.

## Critérios para considerar a infraestrutura pronta para a Etapa9

- [x] Projeto/origem, plano gratuito, bindingsprivados, índices e domínioAuth conferidos; nenhuma permissão ampliada.
- [x] Catálogo/feed vazios, préviasYouTube/Twitch, IGDB, origemexterna recusada e adminsemtoken recusado emHTTPS.
- [x] Marcadores permitem separar inicialização/reuso e guardas de suspensão foram exercitadas.
- [ ] Google+TOTP com UIDautorizado entra; UIDnãoautorizado, tokenrevogado/fatorausente e sessãoinválida permanecem negados. Login/fator feitos pelo proprietário sem códigos pelo chat.
- [ ] Primeiro conteúdo definitivo escolhido pelo proprietário cadastrado; publicação, curtida, comentário, denúncia e moderação aprovados sem duplicação/consumo indevido. Nenhuma fixture no remoto.
- [ ] Por caminho crítico **válido**, pelo menos3execuções consecutivas reutilizadas, sem erroCPU/1102/5xxinesperado ou duasultrapassagensconsecutivas>10 ms; ampliar até10apenas se houver outlier que precise ser explicado. Registrar pelo menos3inicializações de aplicação antes da conclusão geral; para autenticação/operaçõesaindanãotestadas, primeiro uso precisa ser registrado próprio.
- [ ] Picos iniciais têm frequência/causa investigadas e risco residual explicitamente aceito; recorrência aciona suspensão. Os4isolates já observados não substituem os caminhos críticos autorizados ainda ausentes.
- [ ] TikTok: teste válido limitado após a restrição do provedor cessar, ou aceitação explícita e documentada da limitação temporária. Não declarar resolvido pelo simples sucesso de resolverURL.
- [ ] Ranking/ordenações necessários inicializados e homologados antes de afirmar que estão prontos; jobs/agendamento só após decisão própria e provaCPU/quotas. TraduçãoIAremota opcional continua sem ativação.
- [ ] ChecklistPC/mobile/player dos trêsprovedores e administração, mais Lighthouse representativo após estabilização/conteúdo, sem auditoria de feed vazio como certificação final.
- [ ] Procedimento de preservação/restauração de conteúdo definitivo e retomada/suspensão revisado; checklist fechado e proprietário autoriza separadamente avançoEtapa9 e qualquer lançamento. Aprovação de homologação não vale por aprovação de lançamento.

## Confirmação do proprietário e leituras de conteúdo definitivo

O proprietário confirmou acesso administrativo com Google e TOTP e publicou pessoalmente o clipe Twitch `HardRockyCarrotShadyLulu-gjG9Vv9aB6r15Uag`. A conferência posterior encontrou o clipe no feed com título e canal preenchidos, associado ao jogo `igdb-417164`. O banco passou a conter conteúdo definitivo: preservar esses registros. O agente não publicou nem alterou conteúdo nesta verificação.

O login e a publicação ocorreram fora da coleta; não há CPU retrospectiva atribuída a essas ações. A confirmação funcional do proprietário não substitui a medição dos caminhos autorizados nem uma prova remota de recusa de outro UID.

Coleta posterior: **12 respostas esperadas e 12 registros de CPU**, sem exceções, `exceededCpu` ou erro 1102. Somando as coletas descritas acima: 86 chamadas HTTP e 56 registros de CPU; as lacunas históricas continuam explicitadas.

| Caminho válido | CPU observada (ms) | Resultado |
| --- | --- | --- |
| Sessão de visitante | 15 | HTTP 204; criação da aplicação e primeira API observada |
| Feed com o clipe definitivo | 8 | HTTP 200; clipe encontrado |
| Detalhe do short, três leituras | 5, 4, 5 | HTTP 200 |
| Estado da curtida, três leituras | 8, 6, 3 | HTTP 200; sem curtir/descurtir |
| Lista de comentários, três leituras | 4, 3, 3 | HTTP 200; lista vazia válida, sem criar comentários |
| Detalhe do jogo | 2 | HTTP 200; associação conferida |

O detalhe do jogo usa o alias de observação `other`; sua CPU é válida, mas o marcador não identifica exclusivamente o primeiro uso dessa rota. Os três acessos por caminho não equivalem a três acessos reutilizados: alguns foram primeiros usos da rota. Não considerar o critério completo de estabilidade satisfeito apenas por esta amostra.

**Atenção à inicialização:** além dos 12 ms históricos, apareceu agora uma inicialização de 15 ms. As outras chamadas desta coleta ficaram entre 2 e 8 ms. Ainda não houve erro efetivo de limite nem recorrência acima de 10 ms nas rotas reutilizadas, mas já não se deve apresentar 12 ms como o único pico observado. Investigar a frequência dos picos iniciais antes de aprovar lançamento. A amostra não permite separar exatamente importação de chaves, composição da aplicação e trabalho do runtime.

- [x] Acesso administrativo com Google e TOTP confirmado pelo proprietário.
- [x] Primeiro clipe definitivo publicado pelo proprietário e encontrado no feed.
- [x] Leituras válidas de short, curtidas, comentários e jogo medidas sem gravações de conteúdo pelo agente.
- [ ] CPU de login/publicação reais, ações válidas de escrita e moderação ainda precisam de coleta supervisionada durante uso legítimo.

Não é necessário repetir o primeiro cadastro nem o login apenas para provar que existem. A próxima coleta de CPU dessas ações deve acompanhar uma nova ação legítima do proprietário; não criar registros fictícios ou colher tokens do navegador. Ranking, TikTok, checklist PC/mobile e Lighthouse representativo continuam pendentes. PWA 8.5/Etapa 9 não iniciadas. A homologação permanece aberta, sem aprovação para lançamento.


Evidência: [etapa-8-e-homologacao-controlada.json](evidencias/etapa-8-e-homologacao-controlada.json). [LimitesCPU/medição/tolerância do Workers](https://developers.cloudflare.com/workers/platform/limits/), [Firestore batchGet/readWrite](https://docs.cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/batchGet). Os limites externos não foram alterados pelo aceite da homologação.


## Continuação supervisionada — curtidas e painel

O proprietário confirmou que, sem fazer login, curtiu e retirou a curtida do clipe existente. As duas chamadas de alteração retornaram HTTP 200, com **8 e 6 ms de CPU**. O agente não fez chamadas de gravação, não inseriu conteúdo fictício e não alterou o clipe.

O proprietário confirmou a conclusão do acesso e das consultas solicitadas. Foi observada a sessão administrativa autorizada HTTP 200, em 9 ms. Isso mede a validação do token pelo backend; não permite afirmar que houve um novo desafio Google/TOTP, nem mede a interface do provedor de login. Não chegaram eventos individuais das abas de catálogo e comentários nesta janela: não atribuir CPU a elas nem afirmar se a ausência se deve a cache, tempo da ação ou perda no stream.

| Coleta | Caminho observado | HTTP | CPU (ms) |
| --- | --- | --- | --- |
| Curtida sem login | `/api/session` | 204 | 4, 0, 0, 0, 1, 0 |
| Curtida sem login | `/api/games/list` | 200 | 6 |
| Curtida sem login | `/api/feed/ordered` | 200 | 6 |
| Curtida sem login | `/api/comments/list` | 200 | 4 |
| Curtida sem login | `/api/likes/state` | 200 | 5 |
| Curtida sem login | `/api/likes/set` | 200 | 8, 6 |
| Painel administrativo | `/api/admin/config` | 200 | 3 |
| Painel administrativo | `/api/session` | 204 | 1 |
| Painel administrativo | `/api/admin/session` | 200 | 9 |

Os registros são eventos recebidos ao vivo, não um inventário independente de todas as requisições do navegador. O coletor descartou corpos, cabeçalhos, URLs com parâmetros, cookies, tokens e dados de usuários; os marcadores de isolate foram substituídos por aliases. O caminho `other`, se presente, não identifica uma rota individual e não certifica seu primeiro uso. Não transformar duas alterações válidas de curtida em três amostras de reuso: o critério ampliado ainda não está concluído.

A sessão inicial de 4 ms desta rodada criou a composição da aplicação, mas pode ter reaproveitado um cookie existente. Não equivale à emissão de uma nova identidade, e não invalida os picos anteriores de 12 e 15 ms.

### Investigação local da inicialização

Contagem de operações no workerd local, com chave RSA efêmera e respostas de banco/OAuth simuladas; nenhuma credencial de produção lida e nenhuma chamada externa:

| Fase | Importações criptográficas | Assinaturas | Chamadas externas simuladas |
| --- | --- | --- | --- |
| Construção da aplicação | Nenhuma | Nenhuma | Nenhuma |
| Primeira emissão de sessão | 2 HMAC e 1 RSA | 2 HMAC e 1 RSA | OAuth, leitura transacional e commit |
| Sessão existente | Nenhuma | 1 HMAC | Nenhuma |
| Feed, primeiro uso e reuso | Nenhuma | 1 HMAC por chamada | Leitura transacional, commit e consulta por chamada |

Isso identifica trabalho adicional na primeira emissão e confirma o aproveitamento das chaves já importadas. Não é medição de CPU do edge nem atribuição percentual dos picos. O cache HMAC limitado e o cache de chave/token do serviço já evitam repetir parte desse trabalho. Não antecipar chamadas artificiais de aquecimento, compartilhar decisões de autorização ou enfraquecer assinatura, revogação, UID/TOTP, quotas ou transações para reduzir o número.

O feed ordenado também respondeu HTTP 200 nesta coleta. Pelo código, as ordens `latest`, `oldest` e `likes` não exigem a geração materializada usada por `relevant`. Como o corpo das ações do proprietário não foi coletado, esse evento não comprova que o ranking de relevância foi inicializado. Jobs continuam desligados; nenhuma geração foi executada pelo agente.

Próximas verificações: concluir cobertura administrativa conforme os eventos, medir publicação/comentário/moderação durante uso legítimo com conteúdo escolhido pelo proprietário, resolver a decisão de ranking e a limitação TikTok, e então fechar checklist PC/mobile e Lighthouse representativo. Não há novo deploy nem aprovação de lançamento nesta continuação. O código de produção ficou inalterado; as provas locais de contagem são diagnósticas, não substituem os 650 testes Node e 30 provas workerd já aprovados. Não repetir a suíte ou o Lighthouse apenas por uma atualização documental.

# Etapa 8-B — homologação local para Workers Free + Firebase Spark

25/10/2026. Base limpa `456bb14`. Premissa aprovada: infraestrutura sem custos recorrentes, limites gratuitos aceitos, nenhuma ativação de cobrança, upgrade, recurso remoto ou deploy. Banco remoto futuro vazio; testes locais preservados. Esta entrega é o relatório pré-8-C solicitado. **Compatibilidade local parcial demonstrada; não é certificação de publicação ou de CPU faturada. 8-C não iniciada.**

## 1. Compatibilidade verificada

| Componente | Evidência local | Limite do resultado |
| --- | --- | --- |
| Entrada Request/Response e origem canônica | Casos de origem falsa, contexto ausente e API/SPA separados aprovados | Entrada ainda optativa, sem configuração publicada |
| Google + TOTP + UID backend | Regressões de assinatura, emissor, audiência, UID permitido, Google, fator TOTP, revogação, conta desativada e MFA removido aprovadas | Contas/configuração real e plano Firebase não consultados |
| Cookies e CSRF/CORS | Cookie __Host, Secure/HttpOnly/SameSite, sessão assinada, origem exata e recusa cross-site preservados | Não foi acrescentado CORS permissivo; same-origin permanece o modelo. Origem não substitui token/cookie |
| Static Assets | Contador de invocações provou JS estático sem execução do Worker; API vence asset conflitante e fallback SPA | Futuro roteamento deve reservar /api, /api/* e /images/games/*, sem worker-first global |
| Capas | Provas anteriores estáticos/IGDB e404 de imagem ausente reutilizadas | Outros domínios continuam fora da autorização; nenhum upload/proxy/Storage/R2 |
| Crypto/Node compat | Buffer, HMAC/WebCrypto, isIP e RSA aprovados no workerd instalado; X.509 já provado na evidência integrada anterior | Bibliotecas de dev/SDK web não devem ser carregadas como servidor; runner Vite/HTTPS local não é entrada de produção |
| HTTP de saída | Incompatibilidade redirect:error descoberta e adaptada; prova com fetch nativo enviou1 chamada ao redirect e0 ao destino | Clientes reais precisam usar o transporte injetado da invocação; OAuth real ainda não composto |
| Ranking integral | Lógica e preservação da geração atual testadas | Não compatível como execução monolítica no Free: excede50 subrequests |

Wrangler4.152.0/workerd1.20261019.1, ferramentas já autorizadas no laboratório externo; sem pacote novo.69 regressões Node aprovadas,6 casos de ingresso repetidos no workerd,8 caminhos críticos com10 execuções cada e prova de rede nativa somente loopback. Tipos/lint/build/diff-check aprovados. Evidência sanitizada: [JSON](evidencias/etapa-8-b-homologacao-free.json).

## 2. Estratégia de IP de origem

Novo adaptador optativo `server/runtime/cloudflare-direct-transport.ts`: usar somente a requisição ORIGINAL entregue ao fetch handler do Workers, com HTTPS e metadados cf de plataforma (colo/protocolo). Então utilizar CF-Connecting-IP como única fonte de endereço. X-Forwarded-For e X-Real-IP são ignorados. Sem metadados ou IP válido, falha fechada antes de criar a API. Não criar rota Node alternativa capaz de aceitar esses cabeçalhos como confiáveis.

Política conservadora: recusar CF-Worker, inclusive Worker da mesma zona; recusar o IP compartilhado documentado para subrequests entre zonas; não admitir Pseudo IPv4 overwrite. Sem fallback para IP fornecido no corpo, endereço aleatório ou endereço global compartilhado. Isso evita atribuir diversas pessoas ao mesmo IP sintético e contornar cotas por alterações de x-real-ip. Service bindings/proxies/Workers intermediários não fazem parte deste ingresso direto e precisam de desenho próprio se forem necessários no futuro.

O adaptador não autentica administradores: Google/TOTP/UID continuam obrigatórios, independentemente do IP. O endereço segue para a normalização existente (IPv6 por /64) e HMAC por finalidade/dia; sem logs de IP bruto. NAT continua sendo sinal de rede compartilhada, não identidade pessoal.

Os testes criam cf sintético em JavaScript: provam a lógica, não que Cloudflare sobrescreva cabeçalhos reais neste destino. cf não é atestação criptográfica independente e pode ser fabricado por código servidor; o contrato exige invocação direta na plataforma, sem reconstruir Request ou confiar em cf recebido por JSON/header. Homologação HTTPS futura deve tentar CF-Connecting-IP/XFF forjados por cliente comum, subrequests de Worker, IPv4/IPv6 e ausência de contexto. Se o destino não satisfizer esse contrato, API permanece indisponível; não enfraquecer a política. Nenhuma regra WAF, conta, binding ou segundo Worker foi criado.

## 3. Incompatibilidade de fetch corrigida sem remover proteção

O workerd instalado recusou `new Request(...,{redirect:'error'})`, confirmando a limitação documental. Antes, mocks aceitavam a opção e não expunham essa diferença. `server/runtime/worker-fetch.ts` transmite em modo manual; se a política solicitada for error e vier301/302/303/307/308, cancela o corpo e rejeita sem seguir Location. Follow é recusado antes de I/O; manual continua disponível aos resolvedores que revalidam destinos explicitamente.

A fábrica `createWorkerEntry` usa esse adaptador sob o orçamento por invocação. Prova nativa em127.0.0.1:8797 confirmou1 chegada ao redirect e0 ao destino, com credencial apenas fictícia. Não houve requisição externa. A contagem de orçamento continua incluindo a chamada recusada; não há redirect invisível ou reenvio de cookies/Authorization. Fábricas de store/auth/provedores futuras devem consumir esse orçamento; não reter fetcher ligado ao orçamento de uma invocação em singleton. Cache compartilhado pode guardar dados públicos válidos, não identidade/counter/closure de orçamento da requisição anterior.

## 4. CPU: medição local e operações de risco

Profiler V8, intervalo solicitado100µs;8 perfis,10 operações por perfil. Preparação das fixtures e emissão das sessões ficam fora do perfil. publication-cold também inclui construção da API/importação de chaves; auth-cold tem certificado frio, auth-warm certificado previamente carregado. Assinatura RSA real com chave pública sintética; lookup e certificado simulados, sem Google.

| Caminho | Média amostral não ociosa (ms/op.) | Média de parede (ms/op.) | Risco de ultrapassar10ms reais |
| --- | --- | --- | --- |
| Publicação com construção da API | 5,80 | 8,40 | Sim: crypto, serialização REST, OAuth e verificador real não integralmente medidos |
| Publicação com API preparada | 6,16 | 7,20 | Sim; diferença frio/quente desta amostra é ruído, não otimização demonstrada |
| Primeira curtida com ranking/rede | 4,98 | 7,21 | Não certificado; hashes, JSON REST, concorrência e retries aumentam trabalho |
| Primeiro comentário aprovado | 7,54 | 9,14 | Atenção elevada: maior média local, triagem, identificador e métricas |
| Autenticação com certificado frio | 6,11 | 8,61 | Sim: RSA, certificado e resposta de conta reais podem elevar CPU |
| Autenticação com certificado em cache | 5,39 | 6,95 | Não certificado; conta atual sempre reconsultada, sem cache de privilégio |
| Remoção administrativa | 5,86 | 6,81 | Não certificado; outras ações (aprovar/restaurar/lotes) podem custar mais |
| Ranking100 vídeos,1 jogo | 6,60 | 7,94 | Sim; além da CPU incerta, há impedimento comprovado de subrequests |

**Não comparar essas médias com10ms como prova de aprovação.** Houve apenas14–39 amostras por perfil agregado; o intervalo efetivo foi mais grosseiro que o solicitado. A estimativa exclui amostras rotuladas idle/program, podendo omitir trabalho nativo; inclui instrumentação/clone do store fictício. Não é contador exato de CPU, não traz p95 confiável nem máximo de CPU por invocação. Tempo de parede inclui espera e também não é CPU. Ausentes: serialização/decodificação REST real, assinador OAuth, variações de dados/provedores, todas as ações de moderação e startup de um isolate publicado. Perfis brutos ficaram somente no laboratório externo (`free-*.cpuprofile`).

Resultado: os caminhos foram exercitados e perfilados, mas **nenhum recebeu garantia de caber em10ms faturados**. A homologação remota autorizada posteriormente deverá usar métricas da plataforma e verificar erro1102. No Free, Cron também tem10ms de CPU; não transferir diretamente o loop local de manutenção. A interrupção da plataforma pode ocorrer após commit: refazer consulta e usar idempotência/revisão existentes, nunca presumir rollback global porque não chegou resposta.

## 5. Estimativa Firestore por operação

Contagem instrumentada do código real em AtomicStore fictício, sem retries, sem faturamento real. Inclui limitadores da operação e ranking ativo; exclui preparar fixtures/emitir sessão. Rdoc conta get/snapshotGet, inclusive ausentes. Rquery conta documentos retornados ou mínimo da consulta. W conta documentos gravados pelas transações confirmadas na fixture. Não confundir esses valores com chamadas REST.

| Operação | Rdoc + Rquery estimadas | W | Transações | Observação |
| --- | --- | --- | --- | --- |
| Publicação confirmada | 7+0 | 9 | 3 | Rede/tentativa/publicação; verificação de vídeo simulada positiva |
| Primeira curtida | 10+0 | 8 | 3 | Inclui nova contribuição de rede e ranking |
| Primeiro comentário aprovado | 13+1 | 12 | 2 | Com sequência do comentário preparada; legado sem sequência pode acrescentar consulta ou exigir preparação |
| Autenticação administrativa | 1+0 | 1 | 1 | Limiter; mais2 chamadas Auth frias ou1 quente, que não são leituras Firestore |
| Remover short | 3+0 | 4 | 2 | Inclui limiter e lookup atual Auth; aprovar/restaurar pode ler/gravar mais |
| Ranking100 vídeos/1 jogo | 115+100 =215 | 112 | 7 | Com100 jogos distintos, aproximadamente314R; sem retenção |
| Nova sessão anônima | aproximadamente1R | 1 | 1 | Estimativa pelo código de proteção de rede; sessão válida reaproveitada não gira identidade |

Estimativas pelo código do feed: primeira página latest com15 visíveis exige aproximadamente32R/1W se compartilham jogo, ou46R/1W se15 jogos distintos. Até30 candidatos com30 jogos distintos: cerca de91R/1W; relevant inicial acrescenta2 leituras de estado (até93R/1W). Cursor relevant usa outra combinação. Queries vazias têm mínimo; filtros e índices podem acrescentar consumo. Caches de cliente e sessões reaproveitadas mudam a frequência, não o preço de cada documento lido.

batchGet diminui solicitações de rede, **não torna15 documentos uma leitura**. Consultas podem ter leituras de entradas de índice, a confirmar por índices/Query Explain no alvo autorizado. Retentativas ABORTED podem repetir leituras até8 tentativas no store, mas o orçamento Worker deve interromper antes do teto de chamadas; falha do limiter pode impedir a operação de negócio e um limiter já confirmado pode permanecer consumido.

Ranking100 usa7 transações (14 chamadas begin/commit),115 get/snapshotGet e4 páginas de consulta: **cerca de133 chamadas REST**, sem OAuth/retries; com100 jogos distintos, cerca de232. Excede50. Precisa checkpoints/lotes na8-D com lease, orçamento e promoção só ao concluir. Não remover verificações ou publicar ranking parcial.24 gerações diárias no caso de1 jogo consomem aproximadamente5160R/2688W, além de retenção e demais tráfegos; é exemplo, não compromisso de agendamento ou capacidade de visitantes. Reservas internas atuais são762R/124W por tentativa de geração, teto diário20000R/4000W; não substituem a quota compartilhada do projeto.

## 6. Planos, recursos pagos e verificações pendentes

Workers Free:100000 requisições/dia,50 subrequests/invocação,10msCPU HTTP e Cron. Static Assets diretos gratuitos; /api e as capas reservadas para Worker consomem franquia. Servir todo asset pelo Worker não é necessário e não será adotado. Usuários de rede compartilhada não devem perder proteções para economizar leituras.

Firestore gratuito:1GiB,50000leituras/dia,20000escritas/dia,20000exclusões/dia,10GiB saída/mês, apenas1 banco gratuito por projeto. Quotas diárias reiniciam aproximadamente à meia-noite do Pacífico; Workers e AI usam calendário próprio, e cotas de contribuição do Clipzone usam São Paulo. TTL gerenciado, PITR, backups/restauração/clones gerenciados não têm gratuidade; não ativar. Rotinas próprias de retenção/backup precisam desenho gratuito e controles separados, sem prometer recuperação cloud gerenciada já disponível.

Google/TOTP: documentação exige Identity Platform para TOTP; a documentação do Auth prevê Spark com limite3000 usuários ativos diários para provedores comuns. Isso sustenta estudar o caminho gratuito, **não prova elegibilidade/configuração da conta atual**. Antes de8-C/HTTPS, verificar por consulta autorizada ou pelo proprietário: plano realmente Spark, ausência de Cloud Billing vinculado, Identity Platform/TOTP habilitados sem mudança paga, Google ativo, email verificado, UID allowlist, MFA/revogação e domínios autorizados futuros. Se a configuração exigir cobrança, parar e relatar; nunca trocar TOTP por SMS ou remover fator/UID.

Vincular Cloud Billing ao projeto pode convertê-lo automaticamente em Blaze. Não aceitar trial/crédito/cartão como equivalente a custo zero. Alertas de orçamento não bloqueiam despesas. Cloud Functions/Cloud Run/PubSub/billing não fazem parte da solução autorizada; nenhuma dessas dependências será introduzida para autenticar ou agendar. Service account/OAuth de Firestore continua a preparar somente após autorização8-C, com IAM mínimo e sem confundir regras SDK com permissões de servidor.

Tradução existente usa Workers AI opcional (`@cf/qwen/qwen3-30b-a3b-fp8`). AI tem franquia10000neurons/dia no Free; alguns modelos exigem pagamento. Não ativar/conectar essa função ao destino por inferência; revisar modelo/conta e usar texto original/fallback quando indisponível. Modelo e orçamento precisam confirmação antes de ativação remota. Não alterar a configuração local atual. YouTube/Twitch/IGDB/TikTok mantêm quotas e termos próprios, não medidos nesta prova; nenhuma compra ou ampliação de quota autorizada. Domínio próprio, Storage e proxy seguem fora do escopo.

## 7. Interrupção controlada: existente e proposta

| Situação | Comportamento existente/provado | Preparação ainda necessária |
| --- | --- | --- |
| Origem/IP/UID/MFA inválidos | Negar antes de operação privilegiada, sem fallback de autorização | Provar metadados e overwrite de headers no edge real |
| Limite de abuso da aplicação |429 com limites persistidos; sem bypass por apagar cookie | Não remover limiter para reduzir custo |
| Orçamento de saída | Interromper chamadas; reserva de cleanup; erro privado503; provas anteriores de rollback reutilizadas | Conectar TODOS os provedores/OAuth/store ao mesmo orçamento |
| Firestore quota/indisponibilidade | Store propaga erro; handlers retornam erro controlado, sem autorização concedida; não faz retry de RESOURCE_EXHAUSTED (retry só ABORTED) | UX específica de quota/circuit breaker não implementados; evitar refresh/polling agressivo e retry cego |
| Quota da plataforma Workers | Plataforma pode devolver429 nas rotas worker-first | A página/JS estáticos podem continuar disponíveis; API e capas roteadas ao Worker podem ficar indisponíveis. Mensagem personalizada não é garantida porque Worker pode nem executar |
| CPU excedida | Plataforma pode encerrar com1102 | Não é exceção recuperável garantida; reconciliar operações já confirmadas e medir no destino |
| Job falha ou orçamento esgota | Ranking anterior preservado; staging não é público | Dividir ranking/retenção na8-D, sem agendamento remoto agora |

Não existe controle global preciso de quotas cloud implementado, nem promessa de disponibilidade ilimitada. O mecanismo primário contra cobrança é **permanecer nos planos gratuitos e sem billing**, a confirmar no projeto/conta; limitadores do app ajudam estabilidade/consumo, mas não são teto de faturamento se alguém mudar o plano. Nenhum upgrade automático será programado.

## 8. Parecer e decisões antes da8-C

Entrega local de auditoria concluída com limitações explícitas. O conjunto está **apto a continuar preparação**, não apto a publicar: falta composição de credencial OAuth real, confirmação Spark/Identity Platform, ensaio real de ingresso e CPU, além de jobs segmentados na8-D. Nenhum requisito de segurança foi retirado, e não se presume que a plataforma inteira caiba no Free com o código de jobs atual.

Pendências de decisão/revisão: aceitar ingresso direto sem Workers intermediários/PseudoIPv4; confirmar planos/contas sem habilitar faturamento; manter tradução remota pendente até revisão; autorizar separadamente8-C (somente preparação do banco remoto vazio) e homologação HTTPS. O uso remoto dos jobs precisa aguardar8-D. A presente autorização não libera8-C nem cria recursos. Não exigir CPU de ambiente publicado como condição impossível de uma prova exclusivamente local, mas também não marcá-la como aprovada sem medir.

Dados8080 e backups locais preservados; nenhum conteúdo de teste migrado. Servidores5174/5175/8080 não reiniciados; portas isoladas8797/8798/8799 encerradas. Não houve deploy, conta consultada, plano alterado, biblioteca instalada ou agendamento remoto. Lighthouse não repetido porque esta análise é de runtime/backend.

## Referências oficiais verificadas nesta rodada

- [Workers: limites e CPU](https://developers.cloudflare.com/workers/platform/limits/).
- [Request: metadados e redirect:error não suportado](https://developers.cloudflare.com/workers/runtime-apis/request/).
- [Cabeçalhos Cloudflare e diferenças em Worker subrequests](https://developers.cloudflare.com/fundamentals/reference/http-headers/).
- [Static Assets: cobrança e429 no Free](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/).
- [Firestore: quotas gratuitas e recursos sem franquia](https://firebase.google.com/docs/firestore/quotas).
- [Firestore: documentos, consultas e entradas de índice](https://firebase.google.com/docs/firestore/pricing).
- [Firebase: Spark, vínculo de billing e upgrade](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).
- [Auth: limites Identity Platform no Spark](https://firebase.google.com/docs/auth?hl=en) e [TOTP](https://firebase.google.com/docs/auth/web/totp-mfa?hl=en).
- [Workers AI: franquia e modelos pagos](https://developers.cloudflare.com/workers-ai/platform/pricing/).

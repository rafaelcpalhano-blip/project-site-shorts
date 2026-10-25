# Etapa 8 — plano de integração

Iniciada em25/10/2026 por autorização do proprietário.8-A concluída em inventário;8-B iniciada com provas locais e bloqueios demonstrados;8-C–F ainda não executadas. Nada publicado.

Decisões: homologação primeiro em endereço gratuito (a escolher); banco remoto sem conteúdo de teste; locais preservados; não habilitar serviços pagos ou infraestrutura sem aprovação específica. Diagnóstico do repositório e fontes: [8-A](etapa-8-a-inventario-integracao.md).

| Fase | Entrega | Critério de avanço | Complexidade |
| --- | --- | --- | --- |
|8-A — Inventário e decisões|Mapa real de módulos, ambientes, credenciais, riscos e plano|Decisões registradas, recursos externos não presumidos|Média|
|8-B — Runtime e API|Provas locais de entrada HTTP/Worker, criptografia, rede, capas e orçamento de chamadas|Proteções/contratos preservados e compatibilidade demonstrada, sem banco real|Alta|
|8-C — Banco e ambientes|Configuração isolada, credencial de servidor, índices/regras e preparação mínima de banco vazio|Dry-run/allowlist de alvos, privilégio mínimo, dados locais intactos; operações remotas só após aprovação|Alta|
|8-D — Operação autônoma|Ranking/retenção por lotes, execução agendada, orçamento, recuperação e observabilidade|Idempotência, falha parcial sem publicação incorreta, plano de backup/restauração e custos revisados|Alta|
|8-E — Origem e publicação controlada|Assets/API, HTTPS/domínio, login, cookies, cabeçalhos/cache e roteiro de rollback|Pacote revisável; DNS/deploy/recursos só com autorização específica|Alta|
|8-F — Homologação integrada|Fluxos PC/celular no destino, fontes externas, autorização e leitura de desempenho|Bloqueios resolvidos, evidências e limitações aceitas pelo proprietário|Alta|

## 8-B: trabalho e gate de compatibilidade

1. Confirmar o candidato Workers com Static Assets a partir das limitações documentadas, sem criar recurso.
2. Ferramenta autorizada pelo proprietário e instalada somente no laboratório externo: Wrangler4.152.0/workerd1.20261019.1. Provas locais iniciais concluídas; manter ferramentas fora das dependências da aplicação. Não confundir checks parciais aprovados com composição pronta para deploy.
3. Provar caminhos/erros com Request/Response, origem/cookie, IPv4/IPv6 e extração confiável de endereço; manter APIs administrativas protegidas.
4. Provar RS256/certificados públicos/Buffer/WebCrypto com os testes existentes e fixtures; sem login real ou credencial de produção.
5. Resolver o adaptador de capas externas com defesa equivalente ao DNS/IP pinado. Se incompatível, apresentar alternativa antes de escolher outro runtime, introduzir serviço pago ou reduzir funcionalidade.
6. Contabilizar subrequests/CPU no pior caso do feed/autorização/jobs. Projetar batch/checkpoints apenas se os testes indicarem necessidade, sem mudar visibilidade/ordenação/cotas.
7. Demonstrar composição local sem emulador dentro do Worker por acidente, com endpoints fictícios/8081 explicitamente isolados e sem leitura8080 para fixtures.

8-B pode resultar em um adaptador aprovado ou em decisão arquitetural pendente devidamente demonstrada. Não publicar uma composição sabidamente incompatível apenas para cumprir a sequência.

## Testes por fase

-8-B: testes existentes de admin-auth, network-security, remote-game-cover, submission-http e leituras; acrescidos só dos ensaios de runtime afetados. Incluir spoof de IP/origem, redirects, endereços privados, falha de credencial e limites de runtime.
-8-C: credencial ausente/expirada/renovada, API não aponta banco real por padrão, isolamento de ambientes, regras/índices e inicialização vazia; ensaios locais antes de autorizar alvo remoto.
-8-D: concorrência de jobs, lease, orçamento, retomada, ranking antigo válido durante falha e retenção sem apagar dados de negócio; restauração controlada em alvo de teste.
-8-E: /api não vira index.html, rotas internas por acesso direto, cache privado, headers/OAuth/iframe, segredo não aparece no bundle, ausência de loopback na composição remota; validar rollback antes do deploy.
-8-F: checklist funcional noPC/celular, inclusive rede móvel sem USB; erro/queda de provedor e autorização negada; uma rodada Lighthouse comparável após estabilizar o destino. Reutilizar evidências quando código/ambiente relevante não mudou.

## Não antecipar

Etapa8.5: PWA/manifesto/ícones/instalação depois da8 concluída, aprovação em aparelho real. Etapa9: auditoria final de estabilidade/segurança/desempenho e decisão de lançamento. Não criar PWA, migração de dados locais ou deploy de produção nesta8-A.

## Pendências transportadas, sem bloquear o inventário

A02-MOB não executado, A07-EXTRA quando houver segundo administrador autorizado, revisão estética anterior e oportunidadesCLS/SDK/imagens permanecem rastreadas. A correção de contenção foi confirmada no uso real; não reabrir como bug não resolvido. Homologação final não deve marcar não executados como aprovados.

## Progresso 8-B — 25/10/2026

Checkpoint restaurável do commit9782f90 criado e verificado. Relatório: [etapa-8-b-runtime-api.md](etapa-8-b-runtime-api.md).58 testes existentes+4 novos de orçamento aprovados;14 verificações do runtime local concluídas. Baseline não publicável: transporte de capas rejeita maxHeaderSize e feed sem lote exigiu65 chamadas REST contra50 do Free; leituras corrigidas na continuação abaixo, sem certificar orçamento de retries/OAuth. DNS lookup observado diverge da limitação documental inicial. Continuar8-B com decisão de transporte e orçamento sem enfraquecer proteções; não avançar banco/deploy. Nenhuma ação manual necessária agora; commits podem aguardar o retorno do proprietário.

## Continuação 8-B — leituras em lote implementadas

Relatório [etapa-8-b-leituras-em-lote.md](etapa-8-b-leituras-em-lote.md). Lotes opcionais de até4 documentos atuais preservam o fallback, a visibilidade e a paginação. Medições sem retries/OAuth:20→9,34→12,65→21; combinação mista43/latest e45/relevant.66 testes Node relacionados+1integração real8081 aprovados, lint/build/diff-check aprovados. Serviços em uso não reiniciados; testes manuais e carregamento do código novo da API podem aguardar o proprietário.

Transporte de capas não alterado. Além do maxHeaderSize, HTTP Workers não aceita lookup/createConnection e sockets bloqueiam IPs Cloudflare, impedindo presumir equivalência para todos os domínios públicos permitidos. Recomendação de candidata Node local enviada ao proprietário para decisão; não escolher hospedagem/alterar infraestrutura.8-B continua aberta por transporte, entrada confiável, credenciais fictícias, retry/OAuth/CPU e jobs;8-C–F ainda não executadas.

## 25/10/2026 — decisão: somente Workers, revisar alternativas

Proprietário respondeu à proposta Node: “Manter apenas Workers e revisar as alternativas primeiro”. Isso substitui a recomendação anterior como direção autorizada; nenhuma entrada Node foi preparada. Relatório [etapa-8-b-alternativas-workers.md](etapa-8-b-alternativas-workers.md) compara fetch, compatibilidade Node dentro do Workers, sockets, resolveOverride, fontes confiáveis, upload/armazenamento controlado e Static Assets. Não há equivalência comprovada para URLs arbitrárias+mesmo pinning apenas com as opções examinadas. Upload/R2 exigiria novo fluxo e recurso/custos aprovados; fontes confiáveis reduziriam o contrato atual. Nenhuma alternativa implementada ou selecionada automaticamente.

Corrigida apenas fixture do probe: hostname permitido e contador de resolução demonstram recusa efetiva de DNS privado, sem depender de rejeição sintática prévia.14 checks workerd novamente concluídos; deployReady=false, evidência sanitizada atualizada. Lint/diff-check aprovados; sem mudanças funcionais, build/Lighthouse/suíte completa desnecessários.8-B permanece aberta. Pode continuar com provas independentes do restante da API Workers; decisão sobre capas antes de habilitar/publicar essa funcionalidade. Sem ação manual no computador necessária agora, sem deploy/infraestrutura/dados remotos/commits automáticos.

## 25/10/2026 — 8-B: provas independentes integradas no Workers

Base limpa516c74c, trabalhos anteriores commitados pelo proprietário. Mantida decisão Workers; nenhuma entrada Node/infraestrutura/credencial real preparada. Novos tests/runtime/worker-integration-probe.ts e run-worker-integration.mjs concluíram17 checks no workerd e8 de assets/API nativos. X.509 sintético, conta desativada/revogada/MFA removido recusados com token antes aceito; fornecedor de credencial relido e falha impede fetch; feed em lote validado no runtime. API não vira SPA nem é sombreada por asset; header de IP forjado sem contexto confiável falha fechado.

Relatório [etapa-8-b-provas-integradas-workers.md](etapa-8-b-provas-integradas-workers.md) e evidência sanitizada docs/evidencias/etapa-8-b-integracao-workers.json. Ferramentas existentes reutilizadas, certificado/chave de teste e assets só no laboratório externo.17+8 verificações aprovadas, tipos/lint/sintaxe/diff-check aprovados. Sem mudança funcional; build/Lighthouse/suíte completa/manuais não repetidos. Instância8798 encerrada;5174/5175/8080 não reiniciados.

Não confundir credencial trocada na fixture com fornecedor OAuth real implementado, nem503 para header forjado com atestação do IP no edge.8-B segue aberta por orçamento retry/OAuth/CPU, composição de entrada/contexto confiável e decisão de capas. OAuth/IAM reais8-C e jobs8-D continuam pendentes. deployReady=false, sem avanço de banco/deploy/PWA. Próximo trabalho independente: orçamento de saída e falhas controladas; nenhuma ação manual necessária agora.

## 25/10/2026 — 8-B: orçamento de saída preparado e provado

Base limpa20a3c34. Novo server/runtime/outbound-budget.ts: escopo por invocação, contagem síncrona de disparos inclusive erros/retries, teto compartilhado, reserva de cleanup e redirects automáticos recusados. REST recebe fetcher/cleanupFetcher opcionais; comportamento padrão e cotas preservados. Módulo só conectado nas composições de teste, não à API em uso. Não guardar orçamento em singleton nem separar um teto por provedor na composição futura.

50 testes Node relacionados+7 cenários workerd+1integração real8081 aprovados. Ensaio48=47comuns+1cleanup: caso frio46/200;2 retries no caso misto47/503 sem feed parcial;2 retries com jogo compartilhado18/200 e contador confirmado uma vez; interrupção no teto6 usa rollback, incluindo falha de cleanup privada; falha de credencial1/503 sem Firestore;10 disparos paralelos com teto4 enviam4. Integração real provou rollback sem contador confirmado e próximo escopo normal com contador1. Limiter já confirmado pode permanecer após503 posterior: não prometer reversão global ou estorno de tentativas.

Relatório [etapa-8-b-orcamento-saida.md](etapa-8-b-orcamento-saida.md), evidência docs/evidencias/etapa-8-b-orcamento-workers.json. Tipos/lint/build/sintaxe/diff-check aprovados;8798/8081 encerrados,5174/5175/8080 não reiniciados. Sem pacote/infraestrutura/credencial real/produção/deploy ou mudança de capas. Não confundir fornecedor OAuth fictício com implementação real, nem contador de fetch com CPU/DNS/sockets/bindings ou quota cloud homologada.

8-B aberta por entrada completa/origem/IP confiável, CPU e transportes não contados e decisão de capas. Próxima parte: composição local Workers e avaliação desses limites. OAuth/IAM8-C, jobs8-D e PWA8.5 permanecem posteriores. Nenhuma ação manual no computador necessária nesta rodada; commits manuais podem aguardar.

## 25/10/2026 — 8-B: composição local de entrada e perfil

Base limpa5f301a2. Entrada optativa server/runtime/worker-entry.ts exige origem HTTPS e contexto confiável injetados, separa API/assets, preserva cookie/JSON e isola orçamento/endereço entre invocações. Não confia automaticamente em CF-Connecting-IP/X-Forwarded-For. Não ativada em5174/5175 nem publicada. Relatório [etapa-8-b-entrada-origem-cpu.md](etapa-8-b-entrada-origem-cpu.md), resumo docs/evidencias/etapa-8-b-entrada-workers.json.

32 testes Node relacionados+12 casos workerd+4 rotas reais locais aprovados; tipos/lint/build aprovados. Perfil V8 capturado:72 amostras/5 fixtures, tempo de parede12,89–22,44ms. Inclui idle/I/O/geração fictícia; não certifica CPU faturada ou limiteFree. Perfil bruto só no laboratório externo. Bridge com origem reescrita/IP fixo não prova ingresso real; worker-first-all é apenas configuração de laboratório. Serviços5174/5175/8080 preservados, sem pacote/infraestrutura/produção/deploy ou teste manual necessário nesta rodada.

Prova local de entrada/perfil concluída;8-B continua aberta por decisão de capas e desenho concreto de confiança no ingresso. Próximo passo: consolidar essas decisões, sem retomar proposta Node rejeitada nem adotar R2/upload/allowlist automaticamente. OAuth/IAM8-C e jobs8-D seguem posteriores. CPU/ingresso reais serão homologados após autorização de ambiente remoto; não exigir essa medição como condição circular da prova local. Nenhum commit automático; comandos manuais serão entregues.

## 25/10/2026 — 8-B: preservar capas existentes; armazenamento recusado

Decisão expressa do proprietário nesta rodada: preservar fluxo atual e deixar publicação desta parte pendente; arquivos estáticos /images/games/ e HTTPS de fontes autorizadas, sem upload administrativo/R2/Firebase Storage/outro serviço, sem arquitetura/infraestrutura/deploy novos. Essa decisão substitui a recomendação anterior de estudar upload como próxima direção. Diante de incompatibilidade, propor adaptação mínima antes de implementar.

Relatório [etapa-8-b-compatibilidade-capas-existentes.md](etapa-8-b-compatibilidade-capas-existentes.md), evidência docs/evidencias/etapa-8-b-contrato-capas-workers.json. Confirmado: caminho estático e caminho IGDB específico editam sem inspeção externa; outros hosts HTTPS públicos não têm allowlist configurável e continuam dependentes do transporte pinado incompatível no Workers. Não acrescentar fontes autorizadas por inferência. public/images/games/ ausente nesta base: suporte a caminho não significa arquivo publicado.

16 testes Node relacionados+7 checks workerd aprovados; PNG fictício servido corretamente. Limitação reproduzida: imagem inexistente no fallback SPA retorna200HTML, não404. Ensaio registra explicitamente o comportamento indesejado; nenhuma correção funcional aplicada. Tipos/lint aprovados; sem build/Lighthouse/suíte completa desnecessários. Proposta mínima: rota de imagens estáticas impedir HTML e retornar404 quando arquivo ausente; aprovação pendente. Fontes externas adicionais exigem hosts/caminhos exatos e aceitação explícita da diferença de confiança entre fetch e pinning. Nenhuma implantação, reinício, dado real ou armazenamento alterado.

Desenho de ingresso/IP e matriz de homologação registrados, sem adapter que confie cegamente em cabeçalhos ou criação de WAF/Worker.8-B aberta e publicação pendente; não iniciar8-C por inferência. Próximo passo depende da aprovação da adaptação mínima proposta. Checkpoint externo de fontes/testes/docs será verificado; commits permanecem manuais.

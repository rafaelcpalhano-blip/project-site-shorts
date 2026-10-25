# Etapa 8 — plano de integração

Iniciada em25/10/2026 por autorização do proprietário.8-A concluída em inventário;8-B–F ainda não executadas. Nada publicado.

Decisões: homologação primeiro em endereço gratuito (a escolher); banco remoto sem conteúdo de teste; locais preservados; não habilitar serviços pagos ou infraestrutura sem aprovação específica. Diagnóstico do repositório e fontes: [8-A](etapa-8-a-inventario-integracao.md).

| Fase | Entrega | Critério de avanço | Complexidade |
| --- | --- | --- | --- |
|8-A — Inventário e decisões|Mapa real de módulos, ambientes, credenciais, riscos e plano|Decisões registradas, recursos externos não presumidos|Média|
|8-B — Runtime e API|Provas locais de entrada HTTP/Worker, criptografia, rede, capas e orçamento de chamadas|Proteções/contratos preservados e compatibilidade demonstrada, sem banco real|Alta|
|8-C — Banco e ambientes|Configuração isolada, credencial de servidor, índices/regras e preparação mínima de banco vazio|Dry-run/allowlist de alvos, privilégio mínimo, dados locais intactos; operações remotas só após aprovação|Alta|
|8-D — Operação autônoma|Ranking/retenção por lotes, execução agendada, orçamento, recuperação e observabilidade|Idempotência, falha parcial sem publicação incorreta, plano de backup/restauração e custos revisados|Alta|
|8-E — Origem e publicação controlada|Assets/API, HTTPS/domínio, login, cookies, cabeçalhos/cache e roteiro de rollback|Pacote revisável; DNS/deploy/recursos só com autorização específica|Alta|
|8-F — Homologação integrada|Fluxos PC/celular no destino, fontes externas, autorização e leitura de desempenho|Bloqueios resolvidos, evidências e limitações aceitas pelo proprietário|Alta|

## 8-B: próximo trabalho concreto

1. Confirmar o candidato Workers com Static Assets a partir das limitações documentadas, sem criar recurso.
2. Definir e justificar ferramenta local para executar o runtime real de teste; Wrangler não está instalado. Não confundir tsc/Node verde com Workers validado, nem instalar automaticamente novos pacotes.
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

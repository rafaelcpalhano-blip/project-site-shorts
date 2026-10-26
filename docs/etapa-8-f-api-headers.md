# Etapa8-F — cabeçalhos das respostas dinâmicas

26/10/2026. **Pacote posteriormente autorizado, publicado e verificado na homologação**, conforme registro ao final. A confirmação de uso administrativo e demais gates8-F permanecem separados; as seções de preparação preservam o histórico.

## Problema e mudança

`public/_headers` cobre assets; não aplica automaticamente suas regras às respostas produzidas pelo Worker. A entrada da API já aplicava no-store/nosniff/no-referrer nas respostas usuais, mas não emitia HSTS, e o catch externo de inicialização não incluía no-referrer. A recusa de origem externa anterior à composição também não tinha a política uniforme. Não foi demonstrado vazamento ou bypass; trata-se de completar a política deliberadamente existente.

`server/runtime/worker-api-headers.ts` reúne a política dinâmica. `worker-entry.ts` usa essa política nas respostas JSON/204 e em recusas/falhas. `cloudflare-main.ts` usa a mesma função nos erros externos de origem/inicialização, antes de a aplicação conseguir responder.

- Cache-Control:no-store; X-Content-Type-Options:nosniff; Referrer-Policy:no-referrer.
- Strict-Transport-Security:max-age=86400 somente quando a URL da requisição é HTTPS, igual à duração da política estática. Sem includeSubDomains ou preload. Não confiar em X-Forwarded-Proto fornecido pelo cliente.
- Corpos, status, cookies, Allow, Retry-After e demais headers preservados. Não adicionar CORS permissivo, CSP de scripts/frames, COOP ou COEP que possam afetar Google/players.
- Origens, verificação de IP, Google/TOTP/UID, CSRF quando aplicável, quotas, limites de saída e regras de publicação não mudam. HTTP continua recusado na origem canônica; HSTS não é apresentado como substituto de redirect ou como correção da primeira visita HTTP. Preload do TLD.dev permanece avaliação separada já registrada.
- Assets normais não passam pelo helper: cache do bundle/ícones/HTML e roteamento static-first preservados. Nenhuma chamada extra, biblioteca, consulta Firestore ou ao TikTok, job ou cache de autenticação.

Fontes oficiais: [Cloudflare _headers e respostas do Worker](https://developers.cloudflare.com/workers/static-assets/headers/) e [semântica HTTPS do HSTS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security).

## Provas realizadas

Oito casos em `tests/helpers/worker-api-header-cases.ts`, executados por `tests/worker-api-headers.test.mjs`: JSON202/corpo/status, sessão204/cookie seguro, falhas de origem/transporte/construção/HTML/redirect, códigos401/403/404/405/413/422/429/500 preservados com Allow/Retry-After, HTTP sem confiar no header forwarded, assets sem alteração e erros da entrada Cloudflare anterior à construção. Rede real bloqueada no arquivo Node; fixtures não usam credenciais ou serviços remotos.

Os12 contratos de entrada anteriores e os8 novos passaram no Node e no workerd:20 casos locais. Runner: `node tests/runtime/run-worker-api-headers.mjs <laboratório externo aprovado>`, usando Wrangler4.152.0 já instalado, sem dependências novas. Probe é exclusivo de testes e não pode ser publicado como entrada do site.

Suíte completa704 testes/0falhas, tipos servidor e lint global aprovados. Dry-run do Worker aprovado. Sem alteração de frontend:43 assets do pacote PWA anterior copiados e conferidos byte a byte; ausência dos valores privados conhecidos conferida nos assets. Checkpoint local do diff e arquivos novos preparado. Rollback de referência:5b2a243b-9c90-4fd0-94e0-592772f91b1d. Nenhuma CPU edge foi medida; testes locais não certificam ganho nem regressão percentual de CPU.

## Próxima ação concreta

Solicitar autorização específica para aplicar somente esse pacote na homologação; não realizar deploy por inferência. Antes, conferir versão ativa/segredos/roteamento e pacote congelado. Depois, checar por leitura HSTS/no-store/referrer em configuração pública e erros controlados, assets com política anterior, e confirmar acesso administrativo somente no site. Não criar conteúdo fictício remoto ou provocar falhas de autenticação em sequência para testar headers.

Continuam pendentes CPU de ações válidas/inicializações, consultas administrativas, ranking/jobs, recuperação real sob aprovação e TikTok. A matriz9-A segue para uso real PC/mobile/players/PWA/Lighthouse. Nenhum resultado desta entrega resolve o429 ou autoriza o lançamento público.

## 26/10/2026 — cabeçalhos dinâmicos publicados com autorização específica

O proprietário autorizou publicar exclusivamente o pacote testado de cabeçalhos da API. Versão `a0d58723-b19c-4439-a2d2-85a402571691`, na homologação https://www.clipzone.workers.dev; anterior `5b2a243b-9c90-4fd0-94e0-592772f91b1d` conferida ativa antes da execução e preservada como referência de rollback. Bundle congelado do dry-run enviado,43assets idênticos ao pacote PWA, mesmos oito valores de segredos fornecidos e arquivo privado intacto; roteamento preservado, jobs/diagnósticos desligados. Não houve alteração de dados, Firebase, planos ou permissões.

Treze verificações remotas passaram: home/admin, bundle com hash, manifesto e cinco ícones iguais ao pacote, cache e tipos corretos; APIconfig200 no projeto correto, rota inexistente404, método inadequado405 com Allow preservado e POST de comentário sem Origin recusado403 antes do handler. Respostas da API com HSTS1dia/no-store/nosniff/no-referrer; nenhum cookie emitido nessas requisições. Não houve emissão de sessão, escrita editorial, consulta de validação ao TikTok, nova medição deCPU ou teste deGoogle/TOTP. Falha503 de bootstrap foi comprovada apenas nos fixtures, sem forçar erro de configuração remoto.

A primeira checagem parou por uma suposição do verificador local: aceitava somente application/javascript; o asset retorna text/javascript válido. Corrigido apenas o verificador para aceitar ambos; rodada final aprovada sem mudança no site ou novo deploy. Registro inicial preservado no workspace privado. A suíte local anterior704/0 e20provas workerd continuam evidências do mesmo pacote, sem repetição desnecessária depois do deploy.

Próximo: proprietário confirma abertura/continuidade normal do painel/admin na sessão habitual, sem forçar logout/login ou enviar códigos. Evidência: etapa-8-f-api-headers-homologacao.json. Este gate de cabeçalhos foi aplicado e verificado no escopo descrito; demais pendências8-F, resposta técnica TikTok e lançamento continuam abertos.

## 26/10/2026 — painel confirmado após deploy dos cabeçalhos

O proprietário confirmou: “Sim, o painel abriu normalmente”, na sessão habitual após o deploy autorizado de cabeçalhos. Concluída a checagem de continuidade administrativa desse pacote, somada às13verificações HTTP e provas locais anteriores. Não interpretar como medição independente de novo desafio Google/TOTP, todos os fluxos administrativos ouCPU. Nenhum código, teste, deploy ou consulta ao TikTok adicional nesta rodada. Este ajuste de cabeçalhos está verificado no escopo descrito; demais gates8-F e lançamento permanecem abertos.

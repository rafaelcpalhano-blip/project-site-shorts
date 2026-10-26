# Etapa 8-E — otimização de CPU e diagnóstico dos provedores

Atualização posterior: proprietário aceitou a ressalva de picos isolados e autorizou somente homologação controlada. Endereço reaberto, sem aprovação de lançamento. Estado atual e CPU por endpoint em [homologação controlada](etapa-8-e-homologacao-controlada.md); o restante preserva a rodada histórica.

26/10/2026. Base9c53dda. **Otimizações entregues e verificadas; endereço público permanece suspenso.** Última versão e310298a-d45e-4a07-b97a-fee12a5ccbb3, workers_dev=false, preview_urls=false, jobs=false e diagnóstico do provedor desligado. Página e /api/admin/config retornaram404. Sem custo/upgrade, novas permissões, migração ou conteúdo de teste remoto. Etapa8 ainda aberta; não iniciar8.5/9.

## Ajustes e motivo

1. Cache limitado a8chaves HMAC não extraíveis por isolate, separado por segredo/usos. Sessão/cursor/rede reutilizam somente a chave importada; assinatura, validade/expiração, UID/TOTP, verificação de conta e contadores persistentes continuam por requisição. Rotação usa nova chave; cache com limite e remoção após falha, sem reter request/transporte ou resultado de autorização. Nenhum segredo sai do backend.
2. REST do Workers inicia a transação read/write junto com a primeira leitura usando batchGet.newTransaction.readWrite. Elimina um roundtrip sem eliminar leituras, commit, create-only, rollback ou retryABORTED/8tentativas. Inícios concorrentes compartilham a mesma transação; consulta inicial ou transação sem leitura mantém beginTransaction explícito. Opt-in apenas na composição Workers; defaultNode permanece igual.
3. Minificação do Worker ativada nos dois manifestos. Worker181,13KiB/gzip49,97KiB; frontend/assets não alterados. Não confundir tamanho/startup do Worker com CPU por requisição ou Lighthouse.
4. Diagnóstico TikTok opcional, sem rota adicional, limitado a statusHTTP, formato válido/identidade correspondente e classe genérica de falha. Não registra URL, HTML, cabeçalhos, cookies, canal/título, IP, token ou segredo. Falha do observador não altera a decisão. Última implantação está com a opção desligada.

## Evidências e testes

Perfilamento CDP/workerd com fixtures e chave descartável, sem rede externa: para150consultas, reimportações HMAC caíram450→0 depois da inicialização, e chamadas REST602→452. A contagem tem duas renovaçõesOAuth no relógio sintético. **A redução é de chamadas HTTP, não de leituras/gravações faturáveis do Firestore**: mesmos registros e limites. O perfilamento local não certifica CPUedge ou ganho percentual de tempo; tempos de amostra locais variam.

-648testesNode aprovados/0falhas, tiposfrontend/backend, lint e diff-check aprovados.
-12regressões específicas e16provas integradas no workerd, com0tentativas externas.
-1integração real somente demo-clipzone-tests/8081: primeirobatchGet inicia transação; leituras iniciais concorrentes compartilhamID; create-only impede sobrescrita; somente uma das duas tentativas concorrentes consegue a oitava sessão da rede. Banco/emulador8080 eFirebase remoto não usados nessa prova.
-Quatro falhas da suíte inicial foram reproduzidas no commit anterior isolado: teste cancelava antes de iniciar sessão, contagem antiga de filtros, frase removida e ordem antiga canal/título. Atualizados somente os testes ao comportamento vigente; nenhum componente de interface modificado. Avisos de portaHMR24678 em testesSSR não derrubaram a suíte; nenhum servidor existente foi parado.

## Medição remota controlada

Três rodadas com guardas, poucas requisições técnicas e suspensão em finally. Mesmo Worker/conta/projeto/8segredos, sem novo recurso. Nenhum jogo/short/comentário/curtida publicado. Sessões e contadores técnicos reais foram usados conforme autorização. Tail filtrado por cabeçalho das chamadas controladas; salvos apenas path/status/outcome/CPU/wallTime e diagnóstico sanitizado.

| Rodada | Configuração | Sessão | Feed primeira/seguintes | YouTube preview | Twitch preview |
| --- | --- | --- | --- | --- | --- |
| Chaves reutilizadas + diagnóstico |6ms|6ms|13ms|não repetido|não repetido|
| Transação com primeira leitura |3ms|5ms|15/4/2ms|4ms|3ms|
| Mesmo código minificado |9ms|9ms|12/6/4ms|6ms|5ms|

As consultas retornaram200, sessão204 e previewsYouTube/Twitch com título/canal. Todos os eventos observados tiveram outcomeok/0exceções. **Nenhum exceededCpu ou1102 foi registrado.** São poucas amostras; não representam percentis/carga nem garantem todos os caminhos. Primeiras consultas continuam ultrapassando a meta10ms; não atribuir definitivamente o pico a cold start/JIT sem um perfil específico dessa execução. A minificação reduz o pacote, mas as amostras não demonstram redução consistente de CPU. Publicação, loginGoogleTOTPUID, curtidas, comentários, moderação e ranking de conteúdo definitivo ainda não medidos.

A Cloudflare documenta10ms noFree e alguma flexibilidade por isolate para ultrapassagens infrequentes; exceder consistentemente pode encerrar a execução. Isso explica por que resposta200 e CPU12/15ms podem coexistir; não torna a margem garantida e não autoriza mudar nosso critério por suposição. Em falha de recurso/quota, manter interrupção controlada e nunca ativar billing ou reduzir segurança.

## TikTok: causa observada e limite da conclusão

O link curto resolve normalmente. No preview originado do Workers, **o endpoint oficial www.tiktok.com/oembed retornouHTTP429**. Esse é o motivo observado para a evidência inconclusiva e metadata-unavailable; não era erro da chaveYouTube nem exceçãoCPU. A causa específica da limitação do provedor/IP compartilhado/região não foi confirmada e não foi inventada.

Node local retornou anteriormente formato válido/identidade correta, sem título/autor; oEmbed pode omitir esses campos. Essa diferença não confirma disponibilidade global nem oferece credencialTikTok para corrigir. Não houve repetição do TikTok nas duas rodadas seguintes ao429, troca de origem/IP, scraping, proxy, credencial nova, APIpaga ou flexibilização de validação. Resolver URL não autoriza publicação sem evidência técnica suficiente. O código continua falhando de forma controlada quando o provedor não responde adequadamente.

## Estado final e decisão concreta

As duas primeiras suspensões tiveram breve propagação desigual: /api/admin/config já404 e raiz ainda200. Leitura posterior confirmou ambos404; a última rodada já terminou com ambos404. Worker, assets, domínioAuth, segredos e banco preservados, semregras/IAM/índices/billing alterados e sem reinício5174/5175/8080. A última versão foi implantada com minificação e otimizações, mas sem acesso público ou diagnóstico ativo.

Não reabrir silenciosamente: a suspensão acima da metaCPU foi aprovada, e o primeirofeed ainda mediu12ms. A próxima decisão é escolher o critério de continuidade, com os fatos já disponíveis:

1. **Recomendação para continuar gratuito:** homologaçãoHTTPS controlada aceitando picos isolados semerrodeesgotamento e indisponibilidade temporária de provedores; acompanhamento por outcome/CPU, mantendo todas as proteções e sem declarar produção pronta. Depois testar Google/TOTP/UID com proprietário e conteúdo definitivo escolhido, decidir TikTok se429persistir e medir demais caminhos. Isso aceita risco de interrupção noFree, não garante12ms como franquia.
2. **Critério estrito:** manter suspenso até todas as amostras controladas ficarem≤10ms. Não prometer prazo ou viabilidade com esse runtime/funcionalidades; otimizações adicionais exigem perfil direcionado e regressões, sem repetição arbitrária de testes, mudança de arquitetura ou serviço extra por conta própria.

Publicação geral continua autorizada, mas aceitar a ressalva de CPU não é inferido desse consentimento. Nenhum plano pago é proposto ou necessário para os ajustes já entregues. TikTok429 e homologação integral continuam abertos em qualquer escolha.8.5/PWA e9posteriores;Lighthouse após estabilização,sem rodada repetida agora.

Evidência: [etapa-8-e-cpu-provedores.json](evidencias/etapa-8-e-cpu-provedores.json). Fontes primárias: [batchGet/newTransaction](https://docs.cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/batchGet), [CPU/limites e tolerância do Workers](https://developers.cloudflare.com/workers/platform/limits/), [minificação do Worker](https://developers.cloudflare.com/workers/wrangler/configuration/), [TikTok oEmbed](https://developers.tiktok.com/docs/en/embed-videos).

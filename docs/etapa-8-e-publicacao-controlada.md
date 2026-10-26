# Etapa 8-E — primeira publicação e suspensão controlada

26/10/2026. **O Worker foi publicado e respondeu em HTTPS; o acesso público foi suspenso preventivamente após o gate de CPU.** Estado final: workers_dev=false, preview_urls=false, jobs=false. Página e /api/admin/config retornam404 após a suspensão. Worker, assets, segredos, banco e domínio Auth preservados. Etapa8 não concluída; não avançar para8.5/9.

## O que foi realizado

- Nova chave YouTube salva pelo proprietário, ACL usuário+SYSTEM conferida, projeto818748049569/clipzone-db02a e API youtube.googleapis.com exclusiva confirmados por GET oficial. Sem restrição de aplicação conforme autorizado; distinta da local. SeteIPs/chave local intactos. Oito bindings completos, HMACs/UID anteriores preservados e enviados privadamente à Cloudflare.
- Somente www.clipzone.workers.dev acrescentado a authorizedDomains, com updateMask explícita; GET posterior confirmou domínios anteriores e configurações MFA/signIn preservados, TOTP ENABLED/intervalo1. Nenhum usuário/fator, OAuthclient ou permissão adicional criado.
- BaseGit1624f3a limpa antes do manifesto. Dist existente posterior às alterações de frontend, modoAPI já preparado. Novo wrangler.jsonc é configuração pública; nenhum segredo dentro. Dry-run final com8bindings e varredura dos35arquivos públicos aprovados. Wrangler conta exata confirmada.37entradas reconhecidas pelo pipeline de assets,35arquivos enviados; Worker287,21KiB/gzip61,90KiB/startup8ms. Startup não é CPU por requisição.
- Primeira versão8b6a9fa6-cb30-49de-9875-67c5fb1d6d9c publicada em https://www.clipzone.workers.dev; mesma composição API/assets, sem cron/preview/serviço adicional. Source maps não enviados; logs de disco e métricas de uso do Wrangler desativados. Nenhuma dependência nova no repositório.

## Resultados reais

| Caminho/cenário | Resultado |
| --- | --- |
| Página inicial | HTTPS200, interface abriu e feed vazio esperado |
| /api/admin/config | 200, somente configuração pública prevista |
| Sessão | 204, cookie __Host- com Secure/HttpOnly/SameSite=Strict/Path=/ |
| Catálogo/feed | 200, zero jogos/shorts, sem erro de consulta |
| Origem externa na sessão | 403 invalid-origin |
| Administração sem token | 401 invalid-token |
| Pesquisa IGDB/Twitch | 200, cinco resultados para Tibia |
| Preview YouTube | 200, título e canal presentes |
| Preview Twitch | 200, título e canal presentes |
| Link curto TikTok | 200, resolvido para URL canônica |
| Preview TikTok do exemplo | 503 metadata-unavailable; pendente |

API conferida com no-store/nosniff e sem CORS wildcard. HTML inicial não retornou nosniff nessa amostra; não declarar auditoria completa dos cabeçalhos estáticos. Sessão/limites criaram somente registros técnicos esperados; comprovam também transações reais do runtime no Firestore. Nenhum jogo, short, comentário ou curtida cadastrado, nenhuma fixture ou migração. Regras deny-all/IAM/índices/billing e ambiente local preservados. Não foram feitos login Google/TOTP ou publicação de conteúdo pelo proprietário.

## CPU e motivo da suspensão

Tail oficial temporário filtrado por cabeçalho exclusivo das chamadas controladas; somente path/status/outcome/CPU/wallTime/contagem de exceções persistidos, sem requests, cabeçalhos, cookies, IPs, corpos ou logs brutos.

| Operação | CPU real (ms) | Wall time (ms) | Resultado |
| --- | --- | --- | --- |
| Configuração pública administrativa | 3 | 4 | 200/outcome ok |
| Sessão | 3 | 188 | 204/outcome ok |
| Feed vazio | 11 | 435 | 200/outcome ok |
| Preview TikTok | 15 | 1509 | 503/outcome ok |

Uma amostra por caminho, não benchmark de carga, percentil ou garantia para outras operações. **Não houve outcome exceededCpu, erro1102 ou exceção de runtime nesses quatro eventos.** O503 do TikTok é resposta da aplicação, não evidência de esgotamentoCPU. Cloudflare admite alguma tolerância a picos; isso não garante orçamento estável. Suspensão foi decisão preventiva pelo alvo10ms do projeto e pela interrupção já aprovada, não um bloqueio imposto pela Cloudflare. Não atribuir o consumo a Firestore, criptografia ou TikTok sem perfilamento. Publicação/curtidas/comentários/moderação/ranking/login real continuam sem medição remota.

Aplicada versão d6a92e2b-b15b-401b-a2c9-2dff62960c84, mesmo código/assets/8segredos e apenas workers_dev=false. Preview continua false, sem alvos públicos. GET / e /api/admin/config confirmaram404. Não apagar Worker, banco, marcadores ou credenciais; não fazer upgrade. A autorização de publicação anterior permanece registrada; retomada exige resolver gates e conferir o novo pacote, sem presumir aceite de custo ou redução de proteção.

## TikTok: limite da investigação

O mesmo link curto fornecido foi resolvido no Workers. Comparação local Node do endpoint oficial oEmbed retornou200, tipo/video/versão/provedor esperados e embed_product_id correspondente, mas sem autor/título. Isso demonstra resposta diferente entre transportes; não confirma a causa no egress Cloudflare, nem prova disponibilidade ou reprodução atual do vídeo. Nenhum fallback inseguro, bypass de bloqueio do provedor ou alteração de validação implementado. Próxima investigação deve capturar somente motivo/status sanitizado do transporte em ambiente controlado, preservar host/redirect/timeout/budget e não registrar URL privada ou HTML do provedor.

## Retomada

1. Perfilar localmente os caminhos observados no workerd, preservando limites persistentes, transações, assinatura, Google/TOTP/UID e validações. Criar regressões direcionadas para qualquer ajuste funcional; repetir suítes pertinentes somente se houver alteração.
2. Isolar o erro TikTok no transporte real, sem concluir que uma chave Google ou nova credencial TikTok o resolve. Não depender de API paga ou contornar controles do provedor.
3. Conferir novo pacote e repetir rodada pequena de CPU controlada antes da liberação; manter suspensão enquanto gates abertos. Amostras de outros caminhos críticos dependem de conteúdo definitivo e login acompanhados.
4. Depois: Google/TOTP/UID, publicação e players dos três provedores em PC/mobile, ranking/jobs sob decisão própria e Lighthouse comparável. Sem reiniciar5174/5175/8080 ou migrar conteúdo local.

Evidência: [etapa-8-e-publicacao-controlada.json](evidencias/etapa-8-e-publicacao-controlada.json). [Limites e CPU do Workers](https://developers.cloudflare.com/workers/platform/limits/), [configuração Auth por updateMask](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/projects/updateConfig).

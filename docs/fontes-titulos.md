# Fontes e títulos — política vigente (21/10/2026)

## Configuração real YouTube concluída (21/10/2026)

YouTube Data API v3 ativada em clipzone-db02a após participação do proprietário.
Chave dedicada criada por ele, restrita somente à API e IPs de saída IPv4/IPv6.
YOUTUBE_API_KEY guardada no ambiente privado ignorado pelo Git, sem prefixo VITE.
Nenhuma alteração na chave Firebase, ativação de faturamento ou deploy.

Primeira consulta foi bloqueada por IP; o backend utiliza IPv6. Após o proprietário
salvar esse endereço exato nas restrições, a consulta retornou HTTP 200.
Short fornecido N2sTV8SekIs: duração PT36S, público/processado e embeddable=true.
Decisão automática publicada com jogo declarado, sem afirmar análise audiovisual.
Submissão com metadados reais em memória isolada preservou originalTitle e title editado,
contabilizando uma vaga. Vídeo longo Im69kzhpR3I foi confirmado e recusado como not-a-short.
Nenhuma gravação no Firestore de desenvolvimento/nuvem durante esses testes.

API local reiniciada para carregar a chave; navegador preencheu título pela Data API.
Primeiro envio cancelado por catálogo vazio. Depois, proprietário publicou o Short pelo
formulário e informou Dimraeth como jogo. Não foi criada outra publicação pelo agente.
Conferência por leitura no emulador demo-clipzone:8080: registro published, Dimraeth
ativo (igdb-249202), identidade permanentemente reservada e uma publicação na cota diária.
originalTitle preservado. Feed manteve o registro após recarregar. Player oficial foi
encontrado aberto no navegador; não iniciada reprodução pelo agente.
Aceitação local YouTube concluída. Nenhuma escrita adicional nesta conferência.
Evidências no workspace do chat: youtube-data-api-titulo-real.png e
youtube-dimraeth-publicado.png.
Nenhum código alterado nem suíte já aprovada repetida nesta configuração.

## Publicação automática aprovada

O visitante seleciona obrigatoriamente um jogo ativo do catálogo. A categoria é sua
declaração, não comprovação pela API da fonte. gameMatch é apenas informativo;
ausência ou divergência não bloqueia isoladamente publicação, aprovação ou restauração.
Não implementar OAuth obrigatório, confiança por criador ou listas de canais aprovados.
A proposta em politica-origens-avaliadas.md é histórica e foi superada.

Vídeos tecnicamente elegíveis publicam automaticamente. Sinais preventivos já existentes
(ameaças, discriminação, violência real, inconsistência de nomes) mantêm a revisão.
Combate fictício normal do jogo não equivale a esses sinais.
Não há alegação de análise audiovisual automática: os adaptadores consultam metadados.

## YouTube

- Parser seguro: HTTPS, host exato permitido e caminho /shorts/ID de 11 caracteres.
  Rejeita /watch, youtu.be, hosts falsos, credenciais e portas não aceitas.
  A mensagem orienta abrir o Short e copiar seu link pelo menu Compartilhar.
- ID canônico preserva duplicatas entre variantes de domínio e parâmetros.
- Data API videos.list requer a chave YOUTUBE_API_KEY privada do servidor.
  Consulta identidade, título, privacyStatus, uploadStatus, embeddable e duração.
- Exige ID correspondente, vídeo público/não listado processado, duração positiva válida
  até 180 segundos e embeddable=true. Não existe tolerância de um segundo.
- Duração acima de 180 segundos e incorporação explicitamente proibida são recusadas,
  sem gravar vídeo nem bloquear sua identidade para uma tentativa futura.
- Duração ausente/inválida, permissão de incorporação ausente, fonte inacessível,
  falta de configuração, erros de quota, timeout e falhas do provedor não autorizam
  publicação. Retornam HTTP 503 com orientação de nova tentativa, sem reserva/cota.
- Resultado vazio da API pode representar vídeo privado ou inacessível: não é tratado
  como prova permanente de exclusão.
- oEmbed permanece disponível para prévia de título sem chave; sozinho nunca publica.
  Quando a chave está configurada, a composição seleciona a Data API, sem fallback
  que permita contornar falha ou quota esgotada.

URL /shorts/ e duração até 180 segundos são critérios de elegibilidade do Clipzone,
não uma certificação universal da classificação oficial Shorts. Um vídeo tradicional
curto pode satisfazer esses critérios. A API pública não fornece um campo universal isShort;
dimension significa 2D/3D e fileDetails com resolução é restrito ao proprietário.
O limite é aplicado ao valor informado pela API, mesmo diante de pequena diferença
de codificação. Incorporação pode falhar posteriormente por região, política ou
restrições da plataforma mesmo quando embeddable=true.

Referências: [recurso videos](https://developers.google.com/youtube/v3/docs/videos),
[Shorts](https://support.google.com/youtube/answer/15424877),
[videos.list e quota](https://developers.google.com/youtube/v3/docs/videos/list).

## Twitch e TikTok

Exceção de duração TikTok aprovada e implementada; decisão e avaliação em
[validacao-tiktok.md](validacao-tiktok.md). O proprietário aceita temporariamente vídeos
TikTok disponíveis na fonte oficial sem comprovar duração. Isso não certifica que
sejam curtos; o refinamento fica para atualização futura, sem bloquear a primeira versão.

Twitch reutiliza o adaptador oficial de clips; o runner não consulta mapeamento
Twitch/IGDB para autorizar publicação. O resolver existente permanece disponível,
sem recriar ou apagar código funcional.

TikTok usa URLs canônicas /@usuario/video/ID e resposta oEmbed oficial válida
(version 1.0, type video e fornecedor esperado); se embed_product_id vier na resposta,
deve corresponder ao ID solicitado. A ausência de duração não bloqueia publicação.
A exceção formatPolicy é gerada exclusivamente no servidor e só aceita para TikTok
pela plataforma derivada da URL. Não pode vir do JSON do visitante nem liberar YouTube.
shortFormat continua unknown, e a auditoria registra tiktok-platform-policy.
Fonte inacessível/resposta inválida continuam sem publicar/reservar/consumir cota.
Sinais de moderação existentes, jogo ativo, limite diário, duplicatas permanentes,
denúncias e autorização administrativa permanecem. Aprovação/restauração usam a mesma
exceção, sem nova cota na restauração. Nenhum OAuth ou lista de criadores foi adicionado.
Título ausente na fonte permite edição manual ou título padrão; não bloqueia por duração.
44 testes relacionados, lint/build e consulta real do vídeo fornecido passaram.

## Títulos, segurança e dados

Prévia retorna somente título validado. O formulário permite edição, descarta respostas
antigas e mantém preenchimento manual quando a fonte não oferece título.
O envio reconsulta a fonte e guarda originalTitle separado de title.
Consultas oficiais fixas, redirects recusados, timeout e validação de identidade/fornecedor.
HTML/scripts/URLs auxiliares do oEmbed não são executados nem repassados ao navegador.
Credenciais e respostas privadas não são registradas ou devolvidas.

Dados técnicos inconclusivos retornam antes da transação, inclusive se houver sinais
de moderação. Tentativas continuam sujeitas ao limite antiabuso independente.
Transações preservam jogo ativo, reserva permanente, cota de cinco publicados por
dia em São Paulo, autoria privada e histórico. Remoção mantém bloqueio de republicação;
restauração do registro original exige autorização administrativa e nova verificação técnica.
Pendências antigas permanecem intactas; nenhuma migração ou publicação em massa.

A implementação de código original não ativou serviços nem criou credenciais.
Posteriormente, a configuração YouTube foi autorizada e concluída com participação
do proprietário, conforme registro acima. Testes automatizados usam respostas controladas;
a validação real é registrada separadamente. Nenhuma dependência instalada ou deploy.

## Validação desta implementação

70 testes distintos passaram: 53 localizados de adaptadores/composição, decisão,
HTTP/cliente, títulos, parser/entradas e validação administrativa; 17 no emulador
isolado demo-clipzone-tests:8081 de submissões e revisão/restauração.
Testes do cliente foram executados novamente somente após adicionar o novo caso
de erro recuperável. Não executada a suíte geral do projeto.
Lint, build e git diff --check passaram. Nenhum teste dependeu de chave real YouTube.
API HTTPS local reiniciada para carregar o backend; sessões em memória anteriores expiram.

Arquivos desta alteração:
- Servidor: server/videos/{youtube,twitch,configured}.ts,
  server/submissions/{decision,submit-short}.ts, server/moderation/review-short.ts,
  server/http/submissions.ts e scripts/dev-api.mjs.
- Interface/validação: src/lib/validation/video-url.ts,
  src/features/submissions/services/submission-api.ts,
  src/features/admin/services/moderation-api.ts.
- Testes: tests/{youtube-video,youtube-publication,configured-videos,publication-decision,
  metadata-publication,submission-http,submission-client,tiktok-video,twitch-video}.test.mjs
  e tests/firestore/{submissions,admin-moderation}.test.mjs.
- Documentação: docs/{fontes-titulos,politica-origens-avaliadas,continuidade,
  api-local,painel-administrativo}.md.

Alterações anteriores não commitadas preservadas e continuadas. Sem staging, commit ou push.

## Evidência anterior de formulário

YouTube N2sTV8SekIs preencheu título automaticamente via oEmbed.
TikTok 7697764250873269525 não retornou título na consulta realizada; o aviso e a edição
manual foram preservados. Formulários cancelados sem publicar ou gastar cota.
Evidências no workspace do chat: titulo-youtube-2026-10-21.png e
titulo-manual-preservado-2026-10-21.png. Essas verificações não comprovam a nova Data API.

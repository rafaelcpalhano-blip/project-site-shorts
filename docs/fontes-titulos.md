# Fontes e títulos — política vigente (21/10/2026)

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

Twitch reutiliza o adaptador oficial de clips; o runner não consulta mapeamento
Twitch/IGDB para autorizar publicação. O resolver existente permanece disponível,
sem recriar ou apagar código funcional.

TikTok oEmbed fornece metadados/título, mas não comprova duração curta.
A fonte permanece conectada para títulos e player; publicação automática de links
arbitrários ainda não é liberada sem evidência técnica suficiente. Novas tentativas
inconclusivas não criam uma fila de aprovação manual nem bloqueio permanente.
Esta limitação requer decisão específica antes de ampliar a política; não implementar
OAuth obrigatório ou confiança por criador como alternativa sem autorização.

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

Nenhuma API/conta/chave foi criada, serviço ativado, dependência instalada ou deploy
realizado nesta implementação. A validação real da Data API aguarda configuração
autorizada com participação do proprietário; os testes usam respostas controladas.

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

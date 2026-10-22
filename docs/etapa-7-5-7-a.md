# Etapa 7.5.7-A — miniaturas oficiais

Implementação local autorizada em 21/10/2026. Sem dependência/serviço novo, cobrança,
deploy, download ou armazenamento de vídeos/imagens no backend.

## Implementado

- Adaptadores existentes selecionam URL oficial de thumbnail na resposta já usada
  para verificar o vídeo. YouTube usa snippet.thumbnails (melhor variante válida),
  Twitch thumbnail_url e TikTok thumbnail_url do oEmbed. YouTube oEmbed permanece
  insuficiente para publicar, mesmo quando fornece imagem. HTML/scripts externos
  continuam descartados. Nenhuma consulta adicional na publicação.
- Campo opcional thumbnail no short: URL, obtainedAt e expiresAt como timestamps.
  Origem exclusivamente do verificador do servidor; formulário não aceita esse campo.
  Ausência, URL rejeitada ou expiração não impede publicação nem altera cota, moderação,
  identidade canônica, duplicatas, data, título, jogo, curtidas ou ranking.
- Parser exige HTTPS, sem credenciais, fragmento ou porta não padrão. YouTube limita
  host e caminho ao ID solicitado; Twitch permite hosts CDN específicos; TikTok
  permite somente domínios CDN conhecidos com fronteira de subdomínio. URLs são
  novamente validadas na persistência, leitura e navegador. Host novo não permitido
  resulta em fallback, sem ampliar lista automaticamente.
- URL vale até sete dias; x-expires de URL assinada pode encurtar esse prazo. Imagem
  malformada/vencida é omitida do DTO, sem derrubar o feed. O cliente e o card também
  descartam metadados inválidos/vencidos. No card a checagem acompanha o timer de
  um minuto já existente. Falha de carregamento mostra fallback sem loop de tentativas.
- Feed antigo, detalhe e quatro ordenações recebem o mesmo DTO opcional. Projeções
  Firestore incluem thumbnail quando necessárias. Campo dispensado de indexação no
  manifesto local; nenhuma alteração de índices na nuvem ou nova consulta de ranking.
- Card conserva estrutura/min-height de 212px, identificação da fonte/jogo, título,
  comentários e navegação. Imagem inteira com object-fit:contain, carregamento lazy,
  decoding async e referrer omitido. Fade e ampliação discreta de 96% a 100% da área
  reservada, sem cortar/distorcer a imagem ou aumentar o card. Movimento reduzido
  desativa animação; hover aplica apenas com ponteiro apropriado.
- Não há player, autoplay ou prévia em vídeo no card nesta A. Imagem abre o diálogo
  existente; reprodução principal permanece voluntária. Marca da fonte permanece
  visível; não se sobrepõe nenhum elemento aos controles de player.

## Atualização limitada e custos

Manutenção manual local, projeto fixo demo-clipzone:8080:

    node scripts/refresh-thumbnails.mjs inspect
    node --env-file=.env.server.local scripts/refresh-thumbnails.mjs apply

Opcional último argumento AFTER_ID continua o próximo lote. Inspect não chama
plataformas nem grava. Cada execução examina no máximo 30 shorts, sem percorrer a
coleção inteira. Apply consulta apenas publicados sem imagem válida, uma vez por
candidato, com timeout do adaptador. Revalida identidade/status em transação, preserva
alterações concorrentes e modifica somente thumbnail. Falha de metadado descarta
apenas imagem anterior inválida/vencida; nunca remove ou republica short. Comandos
imprimem contagens/cursor, sem chaves, tokens, URLs assinadas ou HTML.

Na publicação: até ~4KB de URL + duas datas por short, sem leitura/escrita adicional
no Firestore, pois integra o documento/transação existentes. Navegação usa os mesmos
documentos e nenhuma API de vídeo adicional; navegador solicita a imagem diretamente
à CDN, expondo conexão/IP ao provedor, com referrer omitido. Não há proxy de mídia.
Manutenção: até 30 leituras da consulta + uma releitura e uma escrita por alteração,
fora retentativas; até 30 verificações oficiais por chamada. YouTube amplia os campos
da consulta atual, sem criar chamada extra. Não foi prometida franquia ilimitada.

Prazo de exibição não é TTL nem exclusão automática de documentos. Nesta entrega
local, apply remove metadados vencidos quando não consegue atualizá-los. Antes de
produção, rotina limitada de renovação/remoção deve receber runtime/frequência e
monitoramento na Etapa 8, para que o site não dependa de manutenção manual nem retenha
API Data além das condições da fonte. Nenhum agendamento/serviço externo foi criado.
URLs TikTok podem vencer antes do prazo informado ou não estar disponíveis; fallback
é previsto. Não se tenta scraping, proxy, extração de frames ou CDN arbitrária.

## Validação e situação local

45 testes distintos relacionados aprovados: 11 novos unitários de miniaturas,
23 regressões de adaptadores/leitura pública, 8 de composição/preview e 3 REST/regras
no emulador isolado 8081. Incluem parser malicioso, identidade, expiração, ausência de
metadados, limite/cursor de manutenção, idempotência, concorrência com remoção,
persistência/timestamps, quatro ordenações, negação de escrita SDK, cinco publicações
e duplicatas. Suítes sem alteração relacionada não foram repetidas.
Build completo aprovado. Lint completo encontrou somente no-control-regex no novo
validador; substituído por comparação de códigos de caracteres, sem desativar regra.
Lint localizado e teste correspondente aprovados após correção. diff --check aprovado.

8080: 10 shorts inspecionados, 8 miniaturas obtidas (6 YouTube/2 Twitch), 2 TikToks com
fallback, sem apagar/publicar conteúdos ou criar interações fictícias. Hashes dos
metadados, excluindo apenas o campo novo, confirmaram preservação integral. API
reiniciada; sessões locais anteriores expiram. HTTPS: quatro ordens HTTP 200 com
10 shorts, 8 miniaturas válidas e 2 fallbacks em cada. Nenhum endpoint público extra.

Conferência visual pelo proprietário pendente: atualizar https://127.0.0.1:5174/,
observar imagens/fallback e passar o mouse. Clicar deve abrir o diálogo habitual.
Próxima 7.5.7-B: avaliar prévias por plataforma, mediante autorização. Não prometer
player em cards incompatíveis com dimensões/controles oficiais.

## Fontes oficiais consultadas

- YouTube thumbnails: https://developers.google.com/youtube/v3/docs/videos
- Políticas de exibição: https://developers.google.com/youtube/terms/developer-policies-guide
- Retenção API Data: https://developers.google.com/youtube/terms/developer-policies
- Twitch clips: https://dev.twitch.tv/docs/api/reference/#get-clips
- TikTok oEmbed: https://developers.tiktok.com/docs/en/embed-videos
- Dimensões/players: https://developers.google.com/youtube/terms/required-minimum-functionality
  e https://dev.twitch.tv/docs/embed/video-and-clips/

# Etapa 7.6.6-B — Metadados TikTok

Concluída em 22/10/2026. Somente investigação e ajustes do caminho TikTok/prévia. Blocos C–E e produção não iniciados; nenhuma dependência, serviço, OAuth ou custo ativado.

## Evidências reais

Consulta direta do backend ao oEmbed oficial, sem reprodução nem publicação:

| URL canônica | HTTP | Identidade | title | thumbnail_url |
|---|---|---|---|---|
| https://www.tiktok.com/@jogatinadovini/video/7695508739616492821 | 200 | confirmada pelo adaptador | ausente | ausente |
| https://www.tiktok.com/@furiagg/video/7697649270337326356 | 200 | confirmada pelo adaptador | ausente | ausente |
| https://www.tiktok.com/@jogatinadovini/video/7697764250873269525 | 200 | confirmada pelo adaptador | ausente | ausente |

Campos retornados: version, type, width, height, html, provider_url, provider_name, embed_product_id, embed_type. Na conferência adicional do primeiro vídeo, embed_type foi video e o HTML representava um iframe. O ID retornado conferiu com o solicitado. Não executamos nem extraímos títulos/imagens do HTML.

Causa comprovada nestas consultas: os campos opcionais não foram enviados pelo TikTok. Não é erro de domínio rejeitado no CDN, CORS ou expiração de imagem nestes três casos, pois não houve URL de miniatura para carregar. Isso não prova que todos os vídeos ou regiões tenham o mesmo comportamento. Não foi investigada a lógica interna da plataforma que determina quais campos ela retorna.

## Ajustes implementados

- Título oficial presente: normalização NFC, quebras de linha/tabulação e separadores de linha convertidos em espaços, sem perder acentos/emoji/pontuação. Demais controles são recusados. Limite final de 500 preservado, sem truncamento ou título inventado. Texto bruto acima de 4096 não é processado como título. Títulos extensos/inutilizáveis permanecem opcionais.
- Prévia TikTok com identidade confirmada e título ausente passa a responder 200 com title null. Falhas de transporte, identidade incerta e respostas inválidas continuam inconclusivas; não são falsamente apresentadas como metadados disponíveis. Outras plataformas mantêm o contrato anterior e seus requisitos.
- Formulário informa que o TikTok não forneceu título utilizável e orienta preenchimento manual. Texto digitado pelo visitante é preservado; título disponível só preenche quando não editado. A prévia não publica, não reserva vídeo e não consome cota; o envio revalida a fonte. Regras de publicação, duração dispensada apenas para TikTok, seleção de jogo, moderação, quota, duplicatas e autorização permanecem.
- Ferramenta de diagnóstico somente leitura: node scripts/check-tiktok-metadata.mjs URL [URL2 URL3]. Até três URLs completas, normalizadas e deduplicadas; consulta somente oEmbed oficial, sem HTML no log, conteúdo audiovisual, credenciais ou URLs assinadas de CDN. Nunca chamada por visitantes ou automaticamente pelo feed.

## Miniaturas e alternativas oficiais

O [oEmbed oficial](https://developers.tiktok.com/docs/en/embed-videos) documenta title e thumbnail_url no exemplo, mas esses campos não vieram nos casos acima. O validador existente já aceita apenas HTTPS e domínios CDN permitidos; imagens opcionais inválidas não bloqueiam publicação. A validade armazenada é de até sete dias, reduzida quando x-expires informa prazo menor. Não ampliar domínios sem evidência de origem confiável.

Já existe manutenção explícita em scripts/refresh-thumbnails.mjs e server/videos/refresh-thumbnails.ts, limitada a 30 candidatos por lote, que reconsulta a integração oficial. Foi reaproveitada e coberta por regressões; não foi recriada nem executada para modificar publicações. Uma consulta nova pode receber outra URL oficial se o TikTok a fornecer, mas não há garantia de disponibilidade/prazo. Falhas opcionais não justificam substituir uma imagem ainda válida. Não fazer atualização externa por visita nem repetição automática ilimitada.

O [player oficial](https://developers.tiktok.com/docs/en/embed-player) oferece autoplay=0, que desativa início automático. Continua sendo um iframe, com recursos e interação próprios; a documentação consultada não oferece ali uma exportação pública de imagem estática para o card. Não usar players adicionais como thumbnails, pois isso conflita com os limites de players e custo já aprovados. Nenhum frame foi extraído, vídeo baixado ou scraping implementado.

URLs encurtadas vm.tiktok.com, vt.tiktok.com e /t/ continuam não resolvidas; usar /@usuario/video/ID. Formas encurtadas/host falsificado/credenciais foram testadas por fixtures sem consulta externa, não por seguir redirecionamentos reais. Identidade canônica por ID e prevenção de duplicatas preservadas. Falhas temporárias e limites HTTP da fonte continuam permitindo nova tentativa sem publicação/cota.

Recomendação para os casos sem imagem: aplicar capa do jogo no bloco 7.6.6-C, após autorização. Não implementado neste bloco. Quando não houver capa, manter o visual sem imagem existente. O usuário continua responsável pela categoria; não criar confiança por criador/OAuth.

## Verificação

29 testes relacionados distintos aprovados: adaptador/roteamento TikTok (9), publicação TikTok (8), prévia HTTP/cliente (6) e seis regressões selecionadas de validação/expiração/manutenção de thumbnails. Casos de título presente com quebras/acentos são fixtures controladas; não alegar que vieram nos três vídeos reais. Incluem origem/JSON/sessão, URL canônica, ID divergente, campos ausentes, falhas HTTP, cota/duplicatas, remoção/restauração e distinção entre título nulo TikTok e resposta inválida em outras fontes. Sem repetição de testes Firestore não modificados. Lint/build e diff aprovados.

Na aba temporária local, o primeiro vídeo mostrou o aviso específico; o título manual de conferência permaneceu preenchido e nenhum iframe foi criado. Formulário cancelado e aba fechada sem enviar. Captura fora do Git no workspace da conversa: tiktok-previa-7-6-6-b.png. A aba/formulário do proprietário não foi alterada. API reiniciada com os segredos persistentes existentes; emulador preservado.

Custos: nenhuma leitura/escrita de banco nova por card/visita. O fluxo de prévia e de validação continua com uma consulta ao provedor em cada operação existente, sujeita aos limites do servidor. Diagnóstico é manual, até três consultas por execução. Nenhum refresh em massa, publicação, comentário, curtida ou denúncia criado pelo agente.

Próximo bloco: 7.6.6-C — padronização dos cards e fallback pela capa IGDB, aguardando autorização individual.

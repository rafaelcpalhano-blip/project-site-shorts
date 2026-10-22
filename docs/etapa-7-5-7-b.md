# Etapa 7.5.7-B — compatibilidade de prévias oficiais

Avaliação autorizada e concluída em 21/10/2026. Resultado para o layout atual:
manter miniatura com zoom/fade da A nas três fontes. Nenhum player de hover ativado.

## Evidência e decisão

- ShortCard reserva áreas distintas para fonte, imagem, jogo e legenda. Os 212px
  mínimos do botão inteiro não são 212px livres para um iframe: artwork ocupa uma
  linha compacta, com base de 96px. Não confundir dimensões do card com viewport do
  player. O feed mantém cinco/três/duas/uma colunas conforme os breakpoints aprovados.
- YouTube requer viewport mínimo de 200x200 e controles inteiramente visíveis;
  proíbe encobrir player/controles. Não cabe na área compacta preservada.
- Twitch Clips requer ao menos 400x300; iframe de clips não oferece a API interativa
  de lives/VODs. Não cabe na área de imagem. Não atribuir eventos da API de lives a
  clips nem afirmar que onLoad comprova reprodução.
- TikTok documenta autoplay, muted, mensagens de estado/erro e restrições do navegador.
  Não foi encontrado mínimo oficial explícito na página do player. O limite 200x200
  do buildEmbed para TikTok é precaução de legibilidade já existente no Clipzone,
  não uma exigência oficial demonstrada. Área atual não atende nem esse limite;
  não o reduzir sem validar controles/branding/reprodução em outra proposta de layout.

A especificação aprovada determina: quando incompatível com dimensões, plataforma,
autoplay, desempenho ou segurança, usar thumbnail com zoom/fade, sem contorno das
restrições. Aplicado esse ramo, já implementado na A. Não ampliar cards, cortar
iframe, ocultar controles, montar player invisível ou inserir iframe interativo dentro
do botão para produzir efeito ornamental. Não criar código de reprodução inativo
ou infraestrutura adicional para um espaço em que não pode ser usado.

## Comportamento preservado

- Card conserva imagem/fallback, navegação e efeito visual; celular não inicia autoplay.
- Nenhum iframe pré-carregado ou montado por hover. Logo não há reprodução simultânea,
  loop, timer de cinco segundos ou requisições de player disparadas pelos cards.
- Prévia em vídeo de até cinco segundos NÃO foi implementada nem validada como
  reprodução real. Esse recurso condicional fica indisponível no layout atual.
- Player principal continua dependendo de ação voluntária no diálogo, com controles,
  validação de origem/identidade/dimensões e coordenador de reprodução já existentes.
- Nenhuma alteração em backend, Firestore, métricas, cache, cotas, serviços ou dados.

## Verificação

node --test tests/official-player.test.mjs: seis testes existentes aprovados. Cobrem
URLs oficiais, ausência de autoplay/loop no principal, identidade/origem maliciosa,
dimensões, parent Twitch, mensagens TikTok autenticadas e exclusão entre players.
Sondagem Node adicional: três fontes x quatro larguras (140/200/300/400) x três
alturas compactas (96/120/160), 36 combinações, todas recusando src de iframe e
preservando fonte. É prova do validador com dimensões fornecidas, não medição de DOM
ou teste de reprodução/autoplay nos provedores. Nenhuma reprodução foi simulada.

Sem lint/build: somente documentação alterada, sem mudança de implementação.
Sem repetir suítes de publicação/ranking/miniaturas. diff --check aprovado.
A conferência visual da A pelo proprietário continua separada desta análise.

7.5.7 encerrada para o layout atual com o fallback aprovado. Habilitar vídeo no hover
exigiria avaliar/aprovar espaço e interação diferentes; não é bloqueador da primeira
versão. Próxima etapa geral: 8, preparação e integração de produção. Primeiro fazer
levantamento de pendências/custos/segurança e plano; implementação e deploy dependem
de autorizações específicas, mantendo Firestore único e sem faturamento.

## Documentação oficial consultada

- https://developers.google.com/youtube/terms/required-minimum-functionality
- https://dev.twitch.tv/docs/embed/video-and-clips/
- https://developers.tiktok.com/docs/en/embed-player

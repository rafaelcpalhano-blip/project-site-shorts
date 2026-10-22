# Reprodução com áudio — complemento da 7.6.7-A

Implementação local aprovada em 22/10/2026. Não inicia a 7.6.7-B.

## Comportamento

- Preferência compartilhada somente em memória, inicialmente ligada. Não usa cookies, localStorage, dados pessoais, Firestore ou métricas. Recarregar a página reinicia a preferência.
- Player continua restrito ao visualizador aberto por interação. Feed sem iframe; coordenador mantém apenas uma instância. Trocas/fechamento liberam API, timers, observadores e mensagens.
- YouTube: API oficial carregada uma vez sob demanda; enablejsapi e origin; unMute/mute, volume positivo preservado (zero recuperado para 50, sem forçar 100), onReady/onStateChange e onAutoplayBlocked. Preferência reaplicada uma vez ao primeiro PLAYING, pois foi observado que a inicialização pode restaurar volume. Leitura de mute/volume a cada 750 ms somente no player ativo, visível e após PLAYING; sem requisições ao backend.
- TikTok: /player/v1, controles de volume, sem loop; comandos oficiais mute/unMute/play via postMessage com origem de destino exata. Origem, janela emissora, marcador, tipo e valor recebidos são validados. Eventos onPlayerReady/onMute e erro 3002 são tratados. Sem wildcard, cliques artificiais ou extração de HTML.
- Mute inicial imposto pelo provedor não altera sozinho a preferência. Eventos iniciais incompatíveis com a preferência e eventos atrasados enquanto uma escolha explícita aguarda confirmação são ignorados. Mudanças sonoras posteriores observáveis podem atualizar a preferência; não há prova universal da intenção humana por esses eventos.
- Preferência silenciosa usa autoplay=0 em YouTube/TikTok para não iniciar áudio antes da aplicação de mute; ao receber prontidão, solicita reprodução silenciada. Se o player/navegador não aceitar, permanece o Play nativo.
- Botões acessíveis indicam preferência, sem afirmar que o player efetivamente está audível. Reproduzir com som solicita uma tentativa voluntária, sem repetição automática.
- Twitch Clips continua iframe oficial não interativo, parent e limites 400 × 300 preservados. Preferência passa pelo parâmetro muted. Mudar a preferência do Clipzone recarrega o clipe, com aviso visível; alterações internas do player não são observáveis pela API de lives/VODs.

## Evidências e limites

- YouTube real: reprodução com botão nativo Desativar som, escolha por silêncio, troca de vídeo mantendo mute após ajuste da inicialização e unmute nativo refletido na preferência. Troca para Twitch por ArrowLeft preservou só um iframe.
- Twitch real: mesmo com muted=false, apareceu Clique para restaurar o som. Botão nativo Tirar do mudo mudou para Mudo e volume 0,5. Outro clipe não carregou no prazo: fallback e navegação permaneceram funcionais, sem retry automático.
- TikTok real: vídeos com Mute/volume 100; eventos oficiais onPlayerReady e onMute confirmados. Mute nativo durante reprodução mudou a preferência para desligada. Trocas entre TikToks e por scroll funcionaram. Em uma abertura com preferência silenciosa, ficou em Play/volume zero; a solicitação remota de som não iniciou a reprodução naquele caso, mas Play nativo funcionou. Não se promete que postMessage contorne exigência de interação no iframe.
- Viewport 390 × 844: YouTube e TikTok exibiram controles sem overflow horizontal. Twitch exibiu alternativa na fonte e nenhum iframe por não atingir 400 px. Isso não comprova funcionamento em celular físico ou Safari.
- Fixture temporária, API YouTube simulada e frame-src none: bloqueio mostrou aviso; Reproduzir com som recuperou estado; trocar manteve uma instância e encerrou a anterior; fechar deixou zero instâncias/iframes. Fixture removida ao concluir.
- Diagnóstico temporário de eventos retirado; sem logs de áudio permanentes.
- Título TikTok: sem alteração nesta rodada. Consulta anterior ao link 7691368077665078549 confirmou identidade, mas não trouxe title, description ou caption. Descrição visível no site não garante texto no oEmbed. Mantido preenchimento manual, sem scraping/OAuth.

## Validação localizada

Testes: official-player, player-audio, refinements-7-6-7-a, short-sequence e short-sequence-components. Build TypeScript/Vite, ESLint dos arquivos de players/testes alterados e git diff --check. Não houve suíte completa, dependências, deploy, alteração de credenciais nem escrita no Firestore.

## Fontes oficiais

- https://developers.google.com/youtube/iframe_api_reference
- https://developers.tiktok.com/docs/en/embed-player
- https://developers.tiktok.com/docs/en/embed-videos
- https://dev.twitch.tv/docs/embed/video-and-clips/

# Players oficiais e elegibilidade — Etapa 3

Implementação local concluída em 21/10/2026, autorizada pelo proprietário.
Sem novas dependências, serviços, deploy, publicações ou alterações nas cotas.

## Comportamento

OfficialPlayer é compartilhado pelos diálogos demo e Firestore.
Abrir o diálogo não cria iframe nem inicia conexão com o player externo.
O visitante escolhe Carregar player; o botão nativo da plataforma inicia o vídeo.
Autoplay e repetição ficam desativados; controles, atribuição e links oficiais são preservados.
Não há cópia/hospedagem de mídia, execução de HTML oEmbed ou contagem de views pelo Clipzone.

Um coordenador mantém somente um player ativo na página. Fechar/trocar/desmontar,
ocultar a aba ou tirar o player inteiramente da área visível libera a reprodução.
Iframes, observadores, timers e listeners são removidos com o componente.
Não há comando programático para iniciar playback ou contornar restrições.

## Elegibilidade

O link é validado pelo parser canônico existente: YouTube Shorts, vídeo TikTok ou Twitch Clip.
Plataforma e identidade armazenadas devem corresponder à URL; metadados inconsistentes não geram embed.
URLs de iframe são construídas internamente, sem query/HTML arbitrários do usuário.

A origem do site deve ser HTTPS. Twitch usa parent com o hostname real, sem porta ou domínio inventado.
Twitch exige área útil mínima 400×300; bordas não contam. Confirmados 508×300 no Modal real.
YouTube exige 200×200; o mesmo mínimo é aplicado pelo Clipzone ao TikTok como proteção local dos controles.
Se o espaço não comportar o player, há aviso e link para a plataforma. Aumentar a tela não inicia playback sozinho.

YouTube usa referrerPolicy strict-origin-when-cross-origin para identificação do cliente.
TikTok usa mensagens oficiais de ready/erro, aceitas apenas da origem exata e contentWindow do iframe atual.
Não são recebidas métricas nem executadas mensagens arbitrárias de outras janelas.

Esta elegibilidade trata da incorporação, não aprova publicação, jogo ou moderação.
A composição das APIs reais de YouTube/TikTok permanece na etapa seguinte.

## Falhas e limites

Há link original permanente, tratamento de erro de carregamento, timeout sem retry automático e
botão Vídeo indisponível? que encerra o iframe e oferece nova tentativa voluntária/fonte.
onLoad confirma somente carregamento do documento, não reprodução ou disponibilidade da mídia.
Twitch Clips não oferece aqui API interativa de erros; YouTube usa iframe sem SDK.
Erros privados/restrições dentro dessas duas plataformas podem exigir o fallback manual.
Não se tenta ler DOM cross-origin, ignorar bloqueios de idade/país/embed ou prometer reprodução universal.
Não há promessa de que cada reprodução incorporada aumente contadores oficiais.

## Validação

Seis testes focados passaram: URLs/parâmetros, dados hostis/inconsistentes, HTTPS, dimensões,
parent correto, mensagens de outra origem/janela e coordenação/limpeza.
Lint e build completos passaram após integração dos dois diálogos.
Ajuste final de bordas CSS conferido localmente no Modal real; não repetidas suítes sem relação.

Os três links enviados pelo proprietário foram reproduzidos uma vez pelos controles nativos:
- YouTube: https://www.youtube.com/shorts/N2sTV8SekIs
- TikTok: https://www.tiktok.com/@jogatinadovini/video/7697764250873269525
- Twitch: https://clips.twitch.tv/BlatantHelpfulKimchiRiPepperonis-Mq_X7otazmw_SXCZ

Conferência com o componente real em página temporária local, sem gravar posts ou consumir cota.
Verificados: zero iframes antes do clique, troca/fechamento com zero residual,
um iframe ao ativar outro componente, fallback estreito e manual.
Modal real confirmou 508×300 úteis na Twitch e zero iframes após fechar.
Páginas/arquivos temporários removidos; nenhuma reprodução em massa.
Não foram validadas todas as possíveis restrições regionais/etárias das plataformas.

Evidências no workspace do chat: player-youtube-2026-10-21.png, player-tiktok-2026-10-21.png,
player-twitch-2026-10-21.png e player-modal-2026-10-21.png.

## Fontes oficiais consultadas

- https://developers.google.com/youtube/player_parameters
- https://developers.google.com/youtube/terms/required-minimum-functionality#embedded-player-api-client-identity
- https://dev.twitch.tv/docs/embed/
- https://dev.twitch.tv/docs/embed/video-and-clips/
- https://developers.tiktok.com/docs/en/embed-player

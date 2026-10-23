# Correção — Twitch Clips em telas estreitas

23/10/2026. Implementação local autorizada, sem deploy ou alteração de infraestrutura. Git limpo ao iniciar.

## Diagnóstico e solução

OfficialPlayer mede o espaço real antes de chamar buildEmbed, que rejeita corretamente a Twitch abaixo de 400 × 300 px. O CSS anterior reduzia a caixa para a largura do modal em celular; por isso o iframe não era montado e aparecia a alternativa de assistir na fonte.

Mantida integralmente a validação de tamanho, origem HTTPS, identidade e parâmetros no adaptador. A caixa .wide agora tem largura max(100%, 402px) e altura mínima 302px: os dois pixels extras são as bordas existentes, assegurando área efetiva mínima do iframe de 400 × 300 px. Em espaços largos, ocupa toda a largura disponível e mantém a proporção responsiva existente.

Somente a Twitch recebe contêiner externo com overflow-x:auto, sem largura mínima propagada ao modal/página. A medição continua usando a caixa interna real, e não dimensões simuladas. ResizeObserver observa também o contêiner para atualizar a necessidade de rolagem. Não há scale, zoom, redução artificial, edição do documento remoto ou sobreposição de controles. A rolagem permite alcançar os dois lados; não há recorte permanente de controles nem overflow horizontal global.

Quando precisa rolar, o contêiner tem foco de teclado, nome acessível, dica breve e data-short-interactions para que as setas usadas nessa região não sejam confundidas com troca de short. A dica fica fora do iframe. Dimensões e navegação não mudam nos players YouTube/TikTok; eles não recebem o novo contêiner.

## Revisão oficial

- https://dev.twitch.tv/docs/embed/video-and-clips/#non-interactive-iframes-for-clips — Clips usam iframe não interativo; mínimo width 400 e height 300, parent obrigatório, autoplay/muted disponíveis. Clips não oferecem a API JS interativa de lives/VODs.
- https://dev.twitch.tv/docs/embed/ — HTTPS, parent, elementos oficiais sem sobreposição e dimensões mínimas.

Iframe permanece em https://clips.twitch.tv/embed. parent vem exclusivamente de origin.hostname, sem porta, caminho ou parâmetro fornecido pelo vídeo; no teste local foi 127.0.0.1. HTTPS continua obrigatório. allow permanece autoplay; fullscreen; encrypted-media; picture-in-picture, com allowFullScreen e referrerPolicy strict-origin-when-cross-origin. Link externo canônico permanece abaixo do player, com noopener noreferrer.

Não há promessa de autoplay em mobile. Parâmetro autoplay=true existente foi preservado; políticas da Twitch/navegador podem exigir Play. Não foram usadas simulações de clique nem a API de lives para controlar Clips.

## Testes executados

29 testes relacionados aprovados:

```powershell
node --test --test-concurrency=1 tests/twitch-mobile-layout.test.mjs tests/official-player.test.mjs tests/player-audio.test.mjs tests/short-sequence.test.mjs tests/short-sequence-components.test.mjs
```

Cobrem contêiner exclusivo, link oficial, URLs/identidade/HTTPS/parent, rejeição efetiva abaixo do mínimo, permissões de áudio, player único e navegação/rascunhos/gestos. ESLint localizado e npm run build aprovados. Aviso de bundle >500 kB permanece conhecido (515,34 kB / 159,08 kB gzip). git diff --check aprovado.

## Medições no site real

Uma instância de clip Twitch já cadastrado foi aberta no feed local. A janela foi redimensionada sem recarregar o iframe entre as larguras; sem loops de replay ou simulação de visualizações. O iframe real carregou controles da Twitch e chegou à tela de encerramento/recomendações.

| Viewport | Largura útil do contêiner | Iframe real | Overflow da página/modal | Quantidade de iframes |
|---|---:|---|---|---:|
| 320px | 221px | 400 × 300px | Não / Não | 1 |
| 375px | 276px | 400 × 300px | Não / Não | 1 |
| 390px | 291px | 400 × 300px | Não / Não | 1 |
| 400px | 301px | 400 × 300px | Não / Não | 1 |
| 430px | 331px | 400 × 300px | Não / Não | 1 |
| Desktop 1280px | 591px | 589 × 330,44px | Não / Não | 1 |

A largura útil difere do viewport devido às margens/padding e bordas existentes do modal. Por isso até o viewport 430px ainda exige rolagem neste visualizador. Desktop ocupa a largura útil toda; diferença de 2px corresponde à borda da caixa.

Em 320px: setas horizontais com foco no contêiner rolaram o player sem trocar o short. Rolagem até scrollLeft 181px (máximo) deixou a borda direita do iframe dentro do contêiner e permitiu visualizar controles de configurações/compartilhamento/fullscreen/Twitch. Link externo permaneceu disponível. Não foi acionado fullscreen real. Botão Próximo vídeo removeu a Twitch e abriu somente o TikTok seguinte, preservando sua URL e layout. Fechar removeu todos os iframes.

Medições JSON das seis larguras e capturas móveis fora do repositório, na pasta de trabalho do chat. Viewport restaurado e somente a aba de teste fechada. Sem novas fixtures, dados de negócio, likes/comentários ou publicação.

## Limites

Verificação responsiva realizada no navegador em larguras móveis, sem emular que o desktop seja um aparelho físico. Teste de toque, teclado de acessibilidade e autoplay em Android/iOS reais ainda é necessário; a conexão ADB do proprietário permanece uma questão separada.

A Twitch documenta os mínimos e requisitos, mas não promete reprodução/autoplay para todo cenário de iframe parcialmente visível por rolagem. Esta implementação mantém o tamanho verdadeiro e acesso por rolagem conforme solicitado; não a apresenta como aprovação específica da Twitch. O link para assistir na plataforma é preservado para restrições de origem, domínio, privacidade, indisponibilidade ou autoplay.

Sem alterações em adaptadores/serviços de YouTube/TikTok, backend, banco, autenticação, infraestrutura, certificados ou rede. Sem dependências, commit ou deploy. Aguardar avaliação do proprietário.

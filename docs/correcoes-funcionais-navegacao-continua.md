# Correções funcionais, navegação contínua e refinamentos
24/10/2026 — implementação local autorizada nos grupos A–D. Etapa 8 suspensa. Commits a cargo do proprietário; sem deploy, instalação de dependências, alteração de infraestrutura ou de credenciais.

## Grupo A — YouTube, overflow e sensores
### Metadados
Diagnóstico real sem exposição de segredos: YOUTUBE_API_KEY configurada no arquivo privado existente; chamada pública videos.list devolveu HTTP403, reason forbidden. Não foi determinada a restrição específica, e nenhuma configuração do Google/Firebase foi alterada.
Falha adicional comprovada no código: oEmbed extraía título, mas ignorava author_name.
Agora oEmbed valida e copia o canal original. A composição exclusiva da prévia tenta recuperação pública quando faltam metadados; a publicação e a revisão administrativa continuam usando exclusivamente o verificador técnico original. Fallback limitado a4s (consulta técnica existente até10s), sem chave no frontend, sem consumir HTML retornado pela fonte.
Prévia real confirmada após reinício local: https://www.youtube.com/shorts/s9tw4x7gqng → “DEMON vs paladin 17 o revanche no TIBIA #shorts”, canal “Bigodezerah Tibia”.
Formulário mantém debounce600ms, cancelamento/active guard e proteção dos campos editados manualmente. Botão de nova tentativa após falha. Ensaio de serviço fictício confirmou preservação de edição durante resposta assíncrona e payload com URL/gameId/título/canal; segundo envio fictício confirmou campos automáticos. Nenhum vídeo foi publicado nesses ensaios.
**Pendência de configuração:** o403 da Data API continua impedindo a validação técnica de novas publicações YouTube. A recuperação da prévia não elimina nem contorna esse bloqueio. Requer revisão da configuração da chave pelo proprietário; não prometer publicação real normal enquanto isso persistir.
Referência: [campos oficiais snippet/channelTitle e contentDetails/duration](https://developers.google.com/youtube/data/reference/rest/v3/videos). Duração máxima180s e aceitação exclusiva de /shorts/ preservadas.

### Overflow
Reprodução concreta na home com viewport430px/pointer fino: hover scale1.12 da miniatura produzia limites -5,86→420,86px; largura útil415px, scrollWidth421px (+6px). .artwork permitia que a imagem escalada escapasse.
Correção localizada: overflow:hidden apenas na área de imagem .artwork, mantendo tooltip/foco/card e zoom dentro da caixa. Sem overflow-x:hidden global.
Após ajuste, mesma miniatura ampliada manteve limites visuais internos e scrollWidth415px. Home com15cards passou320/375/390/430/1280px: scrollWidth305/360/375/415/1265 respectivamente, sem overflow. Esse ensaio comprova a causa nessa condição de hover; não equivale a reprodução de todas as condições do Android físico.

### Sensores
Hook use-motion-navigation.ts removido; calibração, inclinação, permissões, timers e listeners exclusivos eliminados de mobile-navigation.ts. Interface experimental retirada e testes exclusivos removidos. Apenas detector de swipe preservado. Busca em src/server confirmou ausência de DeviceOrientation/DeviceMotion e código de sensores. Decisão atual substitui qualquer sugestão antiga de testar ou retomar sensores: recurso abandonado.

## Grupo B — Visualizador e continuidade
Somente duas setas visíveis, nomes acessíveis preservados, área central de gesto sem borda/fundo/texto. Sem contador de posição, instruções permanentes ou explicação da rolagem Twitch.
Ordem DOM: player → nav/setas → links da fonte/indisponibilidade → informações/interações. Conteúdo e links dos players preservados. Altura superior reduzida por variante viewer do Modal, sem alterar os demais diálogos; título semântico permanece para leitores de tela, fechar44px e safe-area preservados.
Twitch real medido em320px: iframe400×300, HTTPS/parent127.0.0.1/permissões originais, rolagem interna, sem overflow da página e sem escala. Em desktop709×397,94; playerTop69, navTop476,94 e linksTop544,94 no ensaio anterior ao redimensionamento. Requisitos oficiais mantidos: [Twitch Video & Clips](https://dev.twitch.tv/docs/embed/video-and-clips/). Reprodução física/autoplay por plataforma ainda requer avaliação do proprietário.

Novo cursor-pages.ts mantém somente páginas visitadas e requisições em andamento por contexto de consulta. Limite15 e cursores existentes preservados; nenhuma antecipação/prefetch, armazenamento persistente ou consulta de todos os shorts. cache compartilhado entre paginação e visualizador; counts atualizados também nas páginas visitadas.
Ao cruzar fronteira, mantém vídeo atual até sucesso, bloqueia trocas concorrentes, troca página/short juntos; falha exibe orientação e permite tentar novamente sem perder vídeo. Fecha durante leitura não reabre modal nem muda página por resposta atrasada. Guarda de rascunho continua antes de qualquer troca. Ordem/filtro/refresh recriam contexto; rotas continuam como antes, sem entradas de histórico por vídeo.
Páginas vazias ou contendo só duplicatas da fronteira são atravessadas progressivamente; cursor circular é recusado. Último short não circula ao primeiro. Sem registro novo para vídeo inexistente.
Ao fechar, feed mantém a página correspondente; card recebe scroll nearest e foco. Metadados de páginas visitadas são uma fotografia em memória até refresh/mudança de contexto; não é sincronização realtime entre visitantes. Comentários, ações e backend continuam validando disponibilidade atual; indisponibilidade do player tem links e navegação preservados.

Ensaio integrado isolado com35shorts, sem APIs reais de escrita:
- 15→16: página2;30→31: página3;31→30: página2.
- Somente cursores0/15/30 consultados na travessia inicial; retorno não consultou novamente.
- Fechar em30 manteve página2,15cards e foco no card30.
- Último35: próximo desativado.
- Falha de página2 manteve15; retry abriu16.
- Rascunho/confirmar/cancelar preservou texto e página.
- Fechar durante atraso manteve página1 e zero diálogos após a resposta.
- Ordenação oldest mudou primeiro item para35 e reiniciou página1; troca de jogo reiniciou contexto e solicitou o gameId correto.
- Teclado avançou15→16; roda do mouse16→17. Detector de swipe e sua guarda foram testados diretamente; toque físico permanece pendente.

## Grupo C — Clipper
Balões discretamente menores: máximo720px, padding reduzido e mínimo88pxdesktop/132pxmobile, mantendo fonte/legibilidade e crescimento pelo conteúdo. Puff agora oculta o balão inteiro, reservando seu espaço.
Troca individual e coletiva após2s. Cada clique válido avança exatamente1→2→3→1, sem timer de avanço automático. Um único timer de retorno2s após último clique; novo clique cancela o retorno anterior.
A cada10cliques, contador volta0 e todos os balões são renovados juntos; cancela substituições individuais/grupais anteriores, sem duplicatas simultâneas. Banco original14frases preservado; sem Firestore, áudio ou assets novos.
prefers-reduced-motion remove wiggle/puff/transições; mantém mudança estática de frame por clique e espera2s. Removidas classes sem uso do antigo frame fixo. Imagens existentes continuam após primeira interação, fallback original em erro. Preferência real do sistema e apreciação visual física ainda pendentes.

## Grupo D — Administração
Removidos dois textos indicados. Botão Login Administrativo. Título, mascote, frase existente e botão centralizados; fluxos TOTP continuam responsivos.
Verificações visuais320/375/390/430/1280 sem overflow; configuração pública de login carregou e botão apareceu. Nenhum login real foi executado nesta rodada. Sete testes de autenticação/autorização passaram, incluindo assinatura, UID, Google/TOTP obrigatório, sessão e recusa antes de leituras privadas. Segurança e handlers não alterados. Aprovação de Google/TOTP real continua pendente.

## Verificações finais
85 testes relacionados distintos aprovados, em lotes:
- 60: continuous-navigation, youtube-preview-recovery, mobile-interactions, clipper-interaction, short-sequence-components, video-preview, channel-metadata, youtube-video, youtube-publication, submission-client, admin-auth, short-sequence, twitch-mobile-layout.
- 23: clipper-communication, configured-videos, public-api, mobile-recovery, player-audio.
- 2 adicionais: clipper-community.
Repetidos apenas14 e depois6 afetados pelos ajustes finais. Aviso de porta HMR24678 em testes SSR não provocou falhas; não foi parado o servidor normal por esse aviso.
Lint direcionado, TypeScript e build local aprovados, git diff --check aprovado. Sem suíte completa/Lighthouse novo.
Build final5175:15cards,0iframes na home, sem alertas/erros de console/overflow. JavaScript emitido do feed37,89kB/gzip12,09kB; sem alegar nova nota de desempenho ou ganho medido de LCP.
Fixture isolada5178 e seus dois arquivos retirados. API5174 reiniciada com mesma configuração privada para aplicar backend;5175 continua servindo dist atualizado; emulador8080 não foi parado/resetado/semeado. Sem alteração de dados reais, produção, deploy ou commit.

## Arquivos
Metadados: server/videos/youtube.ts; server/videos/preview.ts; server/http/public-api.ts; src/features/submissions/components/PersistentSubmissionDialog.tsx; tests/youtube-preview-recovery.test.mjs.
Overflow: src/features/shorts/components/ShortCard.module.css.
Continuidade/UI: src/features/shorts/services/cursor-pages.ts; src/features/shorts/components/FirestoreFeed.tsx; ShortCard.tsx; ShortSequenceDialog.tsx/.module.css; FirestoreShortDialog.tsx; src/features/players/components/OfficialPlayer.tsx/.module.css; src/components/ui/Modal.tsx/.module.css; mobile-navigation.ts; remoção de use-motion-navigation.ts; tests/continuous-navigation.test.mjs, mobile-interactions.test.mjs e short-sequence-components.test.mjs.
Clipper: src/components/clipper/ClipperCommunity.tsx/.module.css, interaction.ts; tests/clipper-interaction.test.mjs.
Login: src/features/admin/pages/AdminPage.tsx/.module.css; tests/clipper-communication.test.mjs.
Documentação: este relatório e docs/continuidade.md.

## Evidências e próximo passo
C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/functional-refinements/: youtube-preview.png, submission-auto.json, continuous-pages.json, overflow-after.json, viewer-320.png, admin-layout.json, admin-desktop.png, clipper-final.png. Dados fictícios dos ensaios ficam fora do repositório.
Próximo passo: proprietário avaliar localmente UI/mobile e revisar a configuração403 do YouTube. Permanecem também pendências anteriores de Lighthouse comparável e login real; não marcar definitivamente aprovado nem avançar Etapa8.


## Ajuste posterior — pose original durante renovação coletiva (24/10/2026)
Ao completar10cliques, a limpeza coletiva agora cancela o timer de retorno e define laughing=false/frame0 imediatamente. HaHaHA some e o original permanece visível enquanto os balões aguardam2s. Um marcador hasInteracted mantém os frames montados depois do primeiro clique, sem depender do contador que volta0; isso corrige a imagem ausente observada pelo proprietário.
Nove testes específicos passaram (incluindo novo teste de dois ciclos completos), lint e build aprovados. Navegador conferiu original visível durante limpeza, ausência de risada, retorno dos quatro balões e frame1 no próximo clique. Captura clipper-reset-during-clear.png na pasta de evidências acima. Integra o grupoC ainda não commitado. Nenhuma nova pendência além das já registradas.


## Diagnóstico complementar da publicação YouTube — 24/10/2026
Confirmado em dois Shorts públicos e em conexões separadas IPv4/IPv6: HTTP403 com ErrorInfo API_KEY_IP_ADDRESS_BLOCKED. Os IPs públicos atuais de saída não são aceitos pela restrição da chave. Prévia pública recupera título/canal, mas não substitui duração/permissão de incorporação. Sem alteração de código, credenciais ou restrições. Proprietário deve revisar a chave de YOUTUBE_API_KEY no GoogleCloud e permitir os endereços de saída necessários, preservando restrição à YouTubeDataAPIv3; depois revalidar. Arquivo local youtube-ips-locais.json na pasta de evidências contém os endereços atuais sem chave e não está no Git; IPs podem mudar. Evitar novas tentativas de publicação até a consulta técnica deixar de responder403.

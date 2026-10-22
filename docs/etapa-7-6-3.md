# Etapa 7.6.3 — vídeos e navegação

Implementação autorizada e concluída em 22/10/2026; conferência interativa pelo proprietário pendente. Base Git limpa, commit 92679f0. Sem dependências, serviços, deploy, alterações em dados ou configurações remotas.

## Players

- OfficialPlayer mede o espaço real e carrega automaticamente o iframe após abrir explicitamente um short. Não espera os comentários para começar. Fontes/IDs/origem HTTPS, dimensões mínimas, marca e controles oficiais preservados.
- Parâmetro autoplay somente nos players do visualizador; controles habilitados, loop desabilitado, permissão autoplay no iframe. Bloqueios do navegador não são contornados por cliques artificiais, mute forçado ou tentativas automáticas repetidas. Play permanece disponível.
- Mensagens TikTok continuam exigindo origem exata e janela do iframe atual. Erro oficial 3002 significa autoplay bloqueado: mantém o iframe com controles em vez de tratar como vídeo inválido. Outros erros conhecidos oferecem fallback.
- Lease global existente garante um dono. Trocar/fechar desmonta o player anterior e limpa observers, listeners e timers. Aba oculta ou player que sai da área visível libera a lease; retomar exige ação explícita. A entrada por slide tem tolerância inicial de 350ms para aparecer, evitando descarregar o iframe ainda entrando na área recortada.
- onLoad comprova carregamento do iframe, não reprodução nem disponibilidade universal. Mantidos timeout de rede, ação Vídeo indisponível?, nova tentativa manual e link seguro para a fonte. Erros internos cross-origin que o provedor não comunica não podem ser classificados universalmente.
- Não registra métricas de visualização externas, não reproduz em massa, não baixa nem hospeda mídia. Reproduzir pode ser contabilizado pela plataforma segundo seus próprios critérios; nenhum número de views é prometido.

## Sequência local

- Até os 15 shorts da página atual, na sequência recebida. Não recalcula relevância, não altera filtro/jogo/ordenação e não faz consulta extra de feed, prefetch ou varredura de coleção. Comentários/interações seguem suas consultas normais para cada short aberto.
- Setas laterais no desktop; controles equivalentes acima do player em telas pequenas, com alvos de 44px. Teclas esquerda/direita desde a abertura, fora de edição/forms/interações. Sem captura das teclas de dentro de iframes cross-origin.
- Wheel somente na faixa identificada da sequência. Não captura scroll dos comentários, campos ou player. Ignora zoom/gesto horizontal; acumula intenção e faz uma única troca por gesto, rearmando após 300ms sem eventos. Tecla pressionada repetidamente não dispara novas trocas.
- Limites desabilitam setas, sem circular nem atravessar páginas. Seleção ausente da página não inventa sequência.
- Operações de comentário/denúncia/curtida/moderação e seleção administrativa bloqueiam troca/fechamento até concluir ou cancelar. Texto não enviado exige confirmação para descartar antes de navegar. O modal único continua montado, preservando seu gerenciamento de foco; corpo por ID reinicia estado/comentários com isolamento de respostas antigas.
- Slide horizontal de 240ms: sai apenas um poster estático (miniatura/título); o iframe anterior já foi descarregado. Entra só o novo corpo. Movimento reduzido elimina animações. Nenhum segundo player executa durante a transição.
- Após trocar, retorna ao topo do visualizador e ao foco do conteúdo. Escape/fechar e foco de retorno continuam usando Modal existente.

## Miniaturas e prévia

Diagnóstico de um lote local, sem alterar documentos:

- Seis miniaturas YouTube verificadas por HEAD: cinco 200 e uma 404.
- Caso mAYJQqU5O6I: ID correto, URL canônica, Data API 200 e vídeo público/incorporável. API oferece default/medium/high; as três URLs oficiais retornaram 404 no momento da consulta. Não há evidência de uma resolução funcional para substituir. Não concluir que o vídeo foi removido apenas por falha da imagem.
- Dois TikToks (7698819268518874389 e 7682449069960105224): oEmbed 200, sem thumbnail_url. Não é rejeição de domínio nem prova de expiração, pois a URL não foi fornecida. Não ampliar allowlist sem evidência nem extrair frames.
- ShortCard existente já valida URL/identidade/validade, usa lazy/contain e troca erro de imagem pelo fallback, sem novas tentativas em loop no mesmo card. Reaproveitado. Poster da transição também oculta imagem que falhar.
- Preservada a decisão 7.5.7-B: cards compactos usam miniatura com zoom/fade. Área da imagem não comporta controles oficiais com os mínimos já adotados; não criar preview invisível, loop ou timer de cinco segundos sem um player compatível. Twitch Clips não oferece a API interativa de lives/VODs. Nenhuma prévia de vídeo foi ativada no hover neste bloco.

Documentação oficial conferida:
- YouTube: https://developers.google.com/youtube/player_parameters (autoplay, controles e mínimo 200x200).
- TikTok: https://developers.tiktok.com/docs/en/embed-player (autoplay, erro 3002 e mensagens); https://developers.tiktok.com/docs/en/embed-videos (oEmbed).
- Twitch: https://dev.twitch.tv/docs/embed/video-and-clips/ (Clips, mínimo 400x300, parent e limitações de autoplay/mobile).

## Validação

27 testes relacionados distintos aprovados: official-player (8), short-sequence (5), componentes SSR (3), thumbnails (11). Um teste novo identificou parâmetro TikTok ainda em zero; corrigido e repetido somente o teste afetado. Demais suites aprovadas não foram repetidas.

Cobertos URLs hostis, identidade/origem, tamanhos mínimos, mensagens falsas, lease única/liberação antiga, parâmetros autoplay sem loop, limites da sequência, ordem recebida, entrada/edição/modificadores, inércia do wheel, rótulos e fallback de metadados. SSR não executa efeitos/cliques reais nem reproduz vídeos.

Lint e build completos aprovados por alteração estrutural. Diagnóstico externo usou HEAD e consultas oficiais de metadados limitadas, sem baixar imagens ou reproduzir vídeos. Página HTTPS local 200; backend não precisou reiniciar (mudanças de frontend via Vite). Nenhum dado local de publicação foi alterado; credenciais e URLs assinadas não foram impressas.

## Conferência do proprietário

1. Atualizar https://127.0.0.1:5174/ e abrir um short de cada plataforma disponível. Player deve carregar sem segundo botão; se autoplay bloqueado, usar Play. Twitch em espaço inferior a 400x300 mantém link/fallback, sem encolher controles.
2. Testar setas laterais, esquerda/direita e scroll na faixa indicada; confirmar primeiro/último e ordem do feed. Rolar comentários e operar o player não deve trocar de vídeo.
3. Digitar comentário e tentar trocar: confirmar descarte ou permanecer. Durante envio/decisão administrativa não deve trocar; cancelar seleção administrativa libera controles. Não moderar conteúdo real só para testar.
4. Conferir slide/movimento reduzido, fechamento, parada do áudio anterior e versão estreita/mobile. Reabrir o short confirma novo carregamento por ação explícita.
5. Miniatura YouTube 404 e TikToks sem imagem devem mostrar fallback, sem ícone de imagem quebrada.

## Proposta separada — atravessar páginas (não implementada)

Ao chegar ao limite, oferecer ação explícita para carregar a próxima página pela API/cursor já existentes, preservando jogo e ordem. Guardar somente a página anterior em memória para retorno; trocar o player apenas após resposta válida. Tratar expiração de cursor/ranking sem mudar silenciosamente a consulta. Custo: uma chamada da paginação existente por avanço solicitado, com seus limites atuais; nenhum novo índice, contador, prefetch ou banco. Exige autorização própria antes de implementar.

Próxima etapa geral: 7.6.4 — revisão integrada, após conferência e autorização individual.

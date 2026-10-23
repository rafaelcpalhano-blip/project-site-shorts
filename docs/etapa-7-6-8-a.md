# Etapa 7.6.8-A — metadados e visualizador

Concluída localmente em 23/10/2026. Git iniciou limpo. Escopo limitado ao bloco A aprovado; B–F não iniciados.

## Implementação

Canal opcional obtido das consultas oficiais existentes: YouTube snippet.channelTitle (adicionado ao fields da mesma chamada videos.list), Twitch broadcaster_name (não creator_name) e TikTok author_name do mesmo JSON oEmbed. Normalização NFC, limite de 80 caracteres e rejeição de controles conforme o campo público existente. Nome ausente ou inválido é omitido sem invalidar a evidência técnica. Não há segunda consulta ou scraping para canal.

Prévia HTTP mantém origem, sessão, limite de tentativas e validação de vídeo; acrescenta somente channelName opcional. TikTok confirmado sem título pode retornar title:null junto do canal disponível. Cliente valida o contrato conjunto. Não há escrita adicional nem autorização de publicação pela prévia.

Formulário preenche título/canal sem sobrescrever edição manual, inclusive durante resposta atrasada. Troca de URL cancela/ignora prévia anterior e limpa canal obtido automaticamente; canal editado é preservado. Campo segue opcional e editável. A publicação continua usando o texto declarado/validado pelo visitante; não há reescrita de canais em shorts antigos.

Visualizador apresenta canal roxo no tamanho do título (1,1rem), Fonte menor/branca e Jogo com link React interno para a ficha existente. Curtidas e player preservados. Removida somente a frase solicitada sobre limpar cookies/expirar sessão; comportamento das curtidas intacto. Nenhuma mudança de Firestore, regras, índices, serviços ou dependências.

## Validação

41 testes focados aprovados: channel-metadata (4), video-preview (6), youtube-video (5), twitch-video (5), tiktok-video (10), refinements-7-6-7-a (2), refinements-7-6-6-d (1), refinements-7-6-5-b (4), short-sequence-components (4). Adaptados contratos e contexto de router dos testes afetados pelo novo link. Não executada suíte completa ou testes Firestore sem alteração de persistência.

Cobertura: uma chamada por fonte, transmissor Twitch, ausência/invalidez do canal sem bloqueio técnico, TikTok canal sem título, validação cliente/servidor, origem e limites, título editado, estrutura do visualizador e navegação/players preservados. Consultas de provedores nesses testes simuladas, sem uso de credenciais.

UI isolada com formulário real e serviços simulados: preenchimento YouTube/Twitch, TikTok sem título com canal, edição durante consulta preservada e alternativa manual sem nome. Nenhum envio; fixtures removidas.

UI real com dados locais: canal/título ambos 17,6px, canal roxo, fonte/jogo 13,6px; desktop e 390px sem overflow. Link Tibia abriu ficha, foco main-content e zero iframes após navegação. Uma reprodução oficial YouTube foi aberta na conferência; nenhum like, comentário ou publicação. Captura fora do Git.

ESLint localizado, build e git diff --check aprovados. Avisos conhecidos: porta HMR de testes concorrentes ocupada, sem falhas; chunk principal 506,19 kB minificado (156,09 kB gzip), acima de 500 kB.

API local reiniciada para carregar os adaptadores, emulador 8080 e segredos preservados. Pode exigir nova verificação administrativa. Sem deploy ou Firebase remoto.

## Referências oficiais verificadas

- https://developers.google.com/youtube/data/reference/rest/v3/videos — snippet.channelTitle.
- https://dev.twitch.tv/docs/api/reference/#get-clips — broadcaster_name e creator_name distintos.
- https://developers.tiktok.com/docs/en/embed-videos — author_name na resposta oEmbed. A documentação sinaliza futura descontinuação de Embed Videos, sem prazo nesta página; player atual já usa /player/v1. A disponibilidade futura de metadados deve ser acompanhada antes de produção, sem migração não autorizada neste bloco.

## Próxima

7.6.8-B — catálogo e administração, aguardando autorização. Imagens externas/upload, Clipper/rodapé e seletor permanecem nos blocos C/D/E previstos, sem implementação antecipada.

# Etapa 7.6.6-C — cards e fallback

Concluída localmente em 22/10/2026, após autorização. Bloco D e produção não iniciados.

- Títulos de até três linhas visuais, reticências e texto completo por hover/foco; visualizador/dados continuam com título integral, sem truncamento no Firestore.
- Jogo discretamente maior e roxo, até duas linhas, com nome completo no atributo title. Miniatura 16:9 sem distorção, canal de até duas linhas, áreas de título/canal/tempo/interações consistentes e Ver jogo centralizado. Grade responsiva evita colunas menores que 190px quando houver espaço; em telas menores usa uma coluna. Zoom existente de 1,12 preservado; movimento reduzido desativa transições.
- Miniatura oficial válida → capa IGDB → Clipper com alerta, conforme complemento visual aprovado. Nenhum player, vídeo baixado ou frame extraído. Imagem local faltante mantém mensagem textual. Capa não vira thumbnail persistida e não altera o vídeo.
- Capa é validada por parser HTTPS, domínio exato images.igdb.com, sem credenciais/portas e caminho/formato de imagem reconhecido. Normalização t_cover_big_2x compartilhada com ficha; fontes manuais não ganham imagem inventada. Expiração/identidade da miniatura oficial continuam verificadas.
- Cache de URLs falhas em memória compartilhada entre cards/remontagens, até 256 entradas, sem persistir nem repetir tentativas por render. Entrada antiga pode ser descartada ao ultrapassar o limite ou recarregar a página; uma URL nova pode ser tentada. Miniatura expirada não é requisitada. Nenhuma atualização externa por visita.

Custos: capa opcional incluída na projeção pública usando o jogo que o backend já lê para visibilidade/nome. Nenhuma leitura adicional de Firestore por card, escrita, coleção, índice ou chamada nova à API IGDB. Há download da imagem CDN quando usado o fallback. Não há backfill/migração; registros sem capa usam Clipper. Títulos, cota, ordenações, cursores, likes, denúncias, moderação e autorização inalterados.

42 testes relacionados passaram: preferência Clipper (2), seleção/cache/segurança/projeção de capas (4), thumbnails (11), leitura pública (9), cliente catálogo (3), catálogo/solicitações (10) e apresentação (3). Build e lint localizado passaram. Navegador com nove shorts reais: alturas iguais (411px na largura conferida), capas IGDB nos três TikToks sem thumbnail, miniaturas Twitch/YouTube preservadas, zero iframes e sem overflow horizontal. Tela de 390px também conferida: uma coluna de 343px, alturas consistentes e sem overflow. Boas-vindas/404 conferidos separadamente. Nenhuma publicação de teste ou alteração dos dados foi feita nesta etapa. API local reiniciada preservando emulador e segredos; sessão administrativa pode exigir nova verificação.

Próximo: 7.6.6-D — sequência persistente dos comentários, organização do visualizador e navegação, mediante autorização individual. Otimização dos PNGs Clipper antes de produção permanece documentada.

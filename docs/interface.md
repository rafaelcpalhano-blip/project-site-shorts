# Interface demonstrativa — etapa 3

## Implementado

- Feed com 20 registros fictícios, quatro jogos e 15 cards por página.
- Busca local por trecho do título, filtro por jogo e estado sem resultados.
- Cards com prévia CSS ilustrativa; nenhuma imagem ou mídia externa é carregada.
- Formulário de link, exatamente um jogo e Nome do canal opcional.
- Validação de formato de links completos de Shorts, TikTok e Twitch Clips.
- Identidade canônica e rejeição local de duplicatas.
- Consulta ao catálogo simulado com confirmação de jogo e solicitação pendente
  para jogos não encontrados, sem fechar ou limpar o formulário.
- Diálogo de prévia com link oficial normalizado para conteúdos enviados.
- Comentários sempre pendentes e ocultos, já que não existe serviço de análise.
- Página de jogo com feed restrito ao jogo e aviso de metadados indisponíveis.
- Contexto React em memória: navegar mantém dados; recarregar reinicia a sessão.
- Administração continua sem autenticação, remoção ou revisão, reservadas à etapa 6.

## Limites explícitos

A validação é exclusivamente demonstrativa no cliente. Não comprova existência,
incorporação, duração ou conteúdo do vídeo. Links encurtados não são resolvidos.
Títulos enviados usam fallback, sem consulta de metadados.
Não há Firestore, endpoints, limite diário, antiautomação ou garantia de
unicidade entre usuários. A busca local não define a futura estratégia do banco.
Não simulamos carregamento ou falhas de uma rede que ainda não existe.
O protótipo não oferece aprovação administrativa de comentários ou jogos.

## Verificação

- npm run lint
- npm run build (inclui TypeScript)
- node --test tests/video-url.test.mjs (Node 24, sem dependências adicionais)
- Navegador: paginação, busca vazia, filtro por jogo, publicação, duplicata
  por variante de URL, revisão de jogo com preservação do formulário,
  comentário oculto, fechamento por Escape e navegação à ficha do jogo.
- Grade CSS: cinco colunas em telas amplas, três até 700px, duas até 520px
  e uma até 340px. A conferência visual usa o viewport disponível no navegador;
  não equivale a uma validação completa em dispositivos físicos.

## Continuidade

Etapa 4 depende de aprovação do modelo de dados, consultas, índices e regras.
A configuração de serviços externos não foi realizada.
README e histórico Git permanecem preservados.

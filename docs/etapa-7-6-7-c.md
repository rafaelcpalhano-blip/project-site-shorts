# 7.6.7-C — Catálogo administrativo e fichas

Concluída localmente em 22/10/2026. Git iniciou limpo, com B commitada. Reutilizados catálogo, autorização UID/TOTP, validação/revisão por versão, reservas de nomes e ficha pública. Nenhuma mudança nos players, comentários, ranking ou regras de publicação.

## Entrega

- Consultar jogo IGDB ativo agora é Link React para /jogos/ID. Detalhes administrativos continuam em ação separada; jogos ocultos/banidos não ganham link público indevido.
- Consultar jogo manual abre detalhes e formulário administrativo com nome, descrição, capa, data, gêneros, modos, plataformas e aliases existentes no modelo. Motivo e confirmação obrigatórios; cancelar restaura o formulário. Durante envio, campos e ações do catálogo ficam bloqueados. Não há retry automático.
- Novo POST /api/admin/games/edit usa o mesmo middleware: cookie assinado/limite de abuso, origem, JSON/tamanho de corpo e autorização do servidor antes de qualquer leitura ou edição. Revisão desatualizada não escreve nem duplica auditoria. A edição de fonte IGDB é recusada.
- Transação altera apenas metadados permitidos e sua revisão/updatedAt. Preserva ID, source/externalId, status/reviewStatus, createdAt, vínculos de shorts e cotas. Mesmo banido continua banido; mantém a revisão de restauração quando já existia um estado de moderação correspondente.
- Reservas antigas ficam preservadas em reservedNames e nas chaves de nomes. Novos nomes/variantes já reservados por outro registro são recusados. O nome anterior reutiliza o mesmo jogo; não cria duplicata. Até 20 nomes anteriores, sem impedir edição dos demais campos com nome mantido. A validação de referências reconhece explicitamente nomes anteriores do mesmo jogo manual.
- Histórico privado registra UID administrativo, motivo, revisão e campos antes/depois. Nada de UID/motivo é gravado no documento público do jogo.
- Ficha manual exibe descrição e metadados cadastrados, com identificação Informações cadastradas pela comunidade Clipzone. Não atribui esses dados à IGDB nem os envia à tradução. Ausência de dados mantém justificativa e suporte existente.
- Fichas oficiais mantêm apresentação anterior. Navegação da ficha inclui início e, somente com conta autorizada, Link interno Voltar ao painel administrativo; provider de sessão existente não foi alterado. Retorno também disponível em erro de ficha.

## Capas e limites

Sem upload, downloads no backend, Firebase Storage ou serviços novos. Para imagem própria, incluir previamente PNG/JPG/JPEG/WebP em public/images/games/nome.ext e informar /images/games/nome.ext. O caminho aceita somente um nome de arquivo simples, sem query/traversal/SVG. Também aceita o domínio de capas IGDB já permitido e normalizado. Endereços arbitrários, IPs locais, data URLs, scripts e credenciais na URL são rejeitados. Arquivo inexistente não é buscado no servidor; a ficha oculta a imagem em erro.

Descrição manual até 2.000 caracteres, nome até 100, listas até 20 itens de 100 caracteres cada, data real YYYY-MM-DD opcional, texto sem HTML/controles indevidos. Mantido limite HTTP de 8 KiB para o conjunto. Dados antigos incompatíveis precisam ser ajustados no formulário antes do envio. Edição não aprova automaticamente cadastros provisórios.

## Validação

- 42 testes locais relacionados: manual-game-edit (5), manual-game-presentation (3), game-catalog-admin (10), manual-game (11), game-catalog-stage (11), game-presentation (2). Segurança, colisões, versões concorrentes, reserva/reuso de nomes, banimento, cotas e apresentação.
- 8 testes reais no Firestore isolado demo-clipzone-tests:8081. Novo caso de edição concorrente, dados públicos, reservas e vínculos, auditoria única e escrita direta recusada tanto anônima quanto com claim administrativa no SDK. O emulador de desenvolvimento não foi limpo.
- Um fixture antigo de comentário no teste de catálogo não possuía publicationNumber, exigido pela ordenação já aprovada. Corrigido somente o fixture para número 1; nenhuma mudança na leitura ou numeração de comentários.
- Build TypeScript/Vite, ESLint localizado e git diff --check aprovados. Não executada suíte completa.
- Conferência de UI com dados e chamadas inteiramente simulados, sem token real nem acesso ao banco: link de consulta oficial/retorno, formulário manual, salvamento único simulado, recusa de HTML sem novo envio, cancelar e exibição pública dos dados, 390px sem overflow. Fixtures temporárias removidas. Captura fora do Git. Não substitui teste de salvamento pela conta real do proprietário, cuja autorização não foi alterada.

API local reiniciada para carregar o novo endpoint. Sessão administrativa em memória pode exigir nova verificação; dados/emulador preservados. Sem deploy, Firebase remoto, faturamento ou novas dependências.

Próxima: 7.6.7-D — ações administrativas em lote, somente após autorização individual.

# Busca por títulos — avaliação sem novos serviços

Decisão: Cloudflare D1 não autorizado. Firestore permanece como banco principal.
Nenhum índice auxiliar, biblioteca ou serviço foi adicionado.

A consulta atual usa operações Core, ordenação por data/ID e cursores. Essas
operações não oferecem um operador de substring arbitrária sobre um campo string.
A documentação atual também apresenta busca textual na edição Enterprise;
isso exige outra edição e avaliação própria, não uma troca automática.

| Alternativa | Vantagem | Custo e impacto |
| --- | --- | --- |
| Prefixo normalizado no Firestore atual | Implementação simples, sem novo serviço | Não encontra trechos no meio do título; não atende ao requisito confirmado. |
| Fragmentos de 1–3 caracteres em campo indexado | Permanece no Firestore; quantidade de fragmentos cresce linearmente com o título | Mais armazenamento e entradas de índices. Buscar um fragmento gera candidatos: servidor precisa conferir o trecho completo. Termos comuns/curtos podem exigir muitas leituras. Exige índices compostos e medição da paginação. |
| Todos os substrings pré-calculados | Correspondência direta por array-contains | Crescimento quadrático: título de 500 caracteres pode gerar até 125.250 substrings antes de eliminar repetidos. Inadequado aos títulos permitidos e aos limites de indexação. |
| Filtrar apenas a página carregada | Sem índice adicional | Resultados incompletos; não atende à pesquisa global. Não será usado como substituição silenciosa. |

Candidato para experimento futuro: fragmentos no próprio Firestore, validação
final no servidor e orçamento limitado de leituras por chamada. O cursor deve
representar o último candidato examinado, não apenas o último resultado mostrado.
Se o orçamento terminar antes de reunir 15 resultados, informar continuação sem
fingir que a busca acabou. Deve preservar o filtro de publicação e de jogo.

Ainda não implementado. Primeiro medir volume de candidatos, leituras por busca,
armazenamento e comportamento de termos curtos/comuns. Sem tamanho real do catálogo
e frequência de pesquisas, não há estimativa monetária confiável. Nenhuma migração
de edição ou contratação está proposta para execução automática.

Fontes oficiais consultadas em 19/10/2026:
- https://firebase.google.com/docs/firestore/query-data/queries
- https://firebase.google.com/docs/firestore/enterprise/text-search

Prioridade atual: formulários/servidor, verificação real e administração.

# Códigos reduzidos dos jogos manuais antigos — 25/10/2026

O proprietário autorizou explicitamente atribuir aliases aos jogos manuais já cadastrados na base local, após esclarecer que a etapa anterior só os criava para novos registros. Essa autorização não inclui produção, comentários antigos, troca de IDs internos ou migração de vínculos.

## Resultado aplicado

- Destino fixo: demo-clipzone, Firestore local127.0.0.1:8080. O runner não aceita substituição de host/projeto por argumento ou ambiente.
- Diagnóstico inicial:30jogos,13manuais sem alias e36shorts. Antes da aplicação já existia mais um cadastro manual com alias válido: a aplicação relê o estado e usa o mesmo contador transacional das criações normais.
- Aplicação:31jogos no total,14manuais;13aliases atribuídos,1existente preservado. Verificação posterior:14/14manuais com código e0pendentes. Sem trocar ou reutilizar códigos.
- Exjanitor: mn0008. Jogo em Desenvolvimento: mn0002. Teste de jogo: mn0007.
- Comparação antes/depois confirmou igualdade dos demais campos de todos os31jogos e dos36vínculos existentes shorts.gameId. Jogos IGDB não foram alterados. Nenhuma escrita em shorts, comentários, cotas ou reservas de vídeo.
- Cada atribuição reservou o alias, avançou contador, acrescentou publicId ao mesmo documento e criou log assign-public-id na mesma transação. Ações e links continuam usando o ID interno. Histórico administrativo aceita o alias.
- Cópia anterior à gravação: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/backups/manual-game-aliases-20261025T041228049Z/before.json. verification.json e assignments.jsonl registram os resultados. Esses arquivos ficam fora do Git. É snapshot dos documentos de jogos/contador/reservas existentes e referências, não substitui uma exportação integral do emulador para desligamento.

## Implementação e operação segura

server/identifiers/legacy-manual-games.ts reutiliza preparePublicIdentifier. Relê cada documento dentro da transação; preserva modificações concorrentes e recusa alias inválido, reserva conflitante ou relógio inválido. Replay de um registro com alias válido só lê, sem novo contador/log. Uma interrupção deixa as transações já confirmadas válidas e permite retomada pelo mesmo runner. Nunca restaura contador nem recicla reservas automaticamente.

scripts/prepare-manual-game-identifiers.mjs oferece diagnose (leitura) e apply --backup-dir=CAMINHO_ABSOLUTO_NOVO. apply exige diretório novo, grava before.json antes da primeira atribuição e verifica campos e referências ao terminar. Não criar rota pública nem executar automaticamente em inicialização. Aplicação já realizada nesta sessão: não é preciso repetir.

O painel já apresentava publicId quando disponível. Acrescentado também aos detalhes do catálogo e incluído rótulo de auditoria. Clique em “Atualizar catálogo de jogos” ou recarregue a página; a lista mantém o estado carregado até atualização explícita, sem novo polling.

## Validações direcionadas

-5/5 testes de aliases/backfill: reserva, concorrência, replay, preservação de campos/vínculos, IGDB e falhas fechadas.
-7/7 no conjunto de backfill e linhas do catálogo, incluindo ID visível curto e href mantendo o ID interno.
-1/1 no Firestore real descartável demo-clipzone-tests:8081, encerrado após o teste: concorrência, alias anterior, projeção na lista e consulta de histórico por alias.
-Lint e build de produção local aprovados. Sem nova dependência, deploy, infraestrutura, alteração de permissões ou dados de produção. Código de manutenção é independente da API em execução; não requer outro reinício.

Próximo passo: atualizar o catálogo na interface e conferir visualmente os códigos. A revisão visual/mobile pendente permanece; Etapa8 não foi iniciada.

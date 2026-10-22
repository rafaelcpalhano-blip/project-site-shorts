# Etapa 7.6.5-C — Comentários

Concluída em 22/10/2026, somente o bloco autorizado.

## Apresentação

Comentários anônimos separados por espaçamento/divisor e identificados por posição: Comentário #1, #2 etc. O deslocamento soma os itens das páginas percorridas (20 por consulta pública); atualizar ou publicar volta à primeira página/posição. A ordem de criação decrescente existente foi preservada. Os números são locais à listagem, não identificadores permanentes: podem mudar com atualização ou moderação. Texto continua escapado pelo React, com quebras de linha preservadas. Mesmo componente usado na demonstração e na seleção administrativa; checkboxes e revisão existente preservados.

## Primeiro comentário

Resposta da publicação inclui firstPublished, calculado na transação do servidor. Quando não há marco histórico, consulta de existência retorna até um comentário aprovado/removido, usando os campos e a ordenação do índice de comentários já definido. O campo hasPublishedComments no short marca que já houve publicação; não é um contador. Aprovação/restauração administrativa também estabelece o marco e não dispara celebração.

Concorrência disputa o mesmo documento do short e recebe no máximo um evento. Pendências não reivindicam o primeiro evento; registros antigos aprovados/removidos impedem falsa primeira publicação. Reenvio idempotente sempre recebe firstPublished=false. Adaptador sem suporte à consulta suprime o efeito conservadoramente. Nenhuma coleção, índice ou regra nova.

A interface usa exclusivamente o evento aprovado, não repetido, e só anima depois que a atualização normal da listagem contém o ID confirmado. Não adiciona consulta de contagem ou polling. Se a resposta inicial for perdida e houver reenvio, a celebração é omitida; prefere-se não repetir. Se o registro deixar de estar visível antes da consulta, não anima. Reabrir/atualizar não dispara efeito.

Seis emojis decorativos, sem áudio ou captura de cliques, CSS com transform/opacity, término em 2,4 segundos e limpeza do timer ao sair. Movimento reduzido desliga os emojis; confirmação textual acessível mantida. Não há inferência de primeiro comentário no modo demonstrativo sem servidor.

## Impacto e validação

Na primeira publicação aprovada de um short sem marco: uma consulta limitada a um registro (leitura mínima aplicável) e uma gravação adicional no documento do short, dentro da transação; conflitos podem repetir leituras. Após o marco, não há essa consulta/gravação adicional. Aprovação administrativa estabelece o marco com no máximo uma gravação adicional. Sem custo/serviço externo ativado; validação somente nos emuladores. Disponibilidade do índice remoto fica para preparação de produção, sem deploy nesta etapa.

33 testes relacionados distintos aprovados: comments.test.mjs (16), firestore/comments.test.mjs (8), admin-selected-comments.test.mjs (6), refinements-7-6-5-c.test.mjs (3). Incluem concorrência real REST, reenvio, histórico aprovado/removido, pendências, aprovação administrativa, moderação, sessão/origem, bloqueio de escrita pública, deduplicação, contrato do cliente, offset, escape de HTML e seleção administrativa. Mock antigo atualizado para o campo obrigatório. Lint/build aprovados; últimos ajustes de markup e consulta receberam testes/checks localizados. Nenhuma suíte geral.

Navegador local: um comentário de teste criado em plau pra q? (texto: Teste local da apresentação dos comentários.), efetivamente listado e celebrado após confirmação. Atualizar não repetiu; tela de 390x844 sem overflow. Modal fechado e viewport restaurado. Capturas no workspace da conversa fora do Git: celebracao-7-6-5-c.png e comentarios-7-6-5-c.png. Não foram feitas moderações reais nem novas alterações de curtidas. Conferência positiva Google/TOTP/seleção administrativa e preferência de movimento reduzido no sistema não foram reexecutadas no navegador nesta etapa; contratos/estilos e testes localizados foram conferidos.

API local reiniciada para o novo contrato; sessão administrativa em memória exige login novamente. Sem publicação remota, dependência ou modificação de serviços externos.

Próxima: 7.6.5-D — administração e apresentação, aguardando autorização individual. E e etapas de produção continuam pendentes.

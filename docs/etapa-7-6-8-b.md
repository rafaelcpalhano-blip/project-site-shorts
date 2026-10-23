# Etapa 7.6.8-B — catálogo e administração

Concluída localmente em 23/10/2026. Git iniciou limpo. Somente bloco B; C–F não iniciados.

## Catálogo

CatalogGameRow organiza cada item em quatro colunas: checkbox de 44px; nome e metadados alinhados à esquerda; Consultar jogo; Detalhes administrativos. Grid usa colunas comuns entre registros e quebra de nomes extensos. Em até 760px, checkbox/nome ficam na primeira linha e os controles seguem abaixo, alinhados com o nome. Demais listas administrativas não recebem esse grid.

Todos os jogos ativos, oficiais/manuais/provisórios, usam link React para /jogos/ID. Jogos manuais deixaram de usar Consultar jogo como sinônimo de abrir o editor. Detalhes administrativos permanecem separados para ambos os tipos e reutilizam a consulta autorizada atual, incluindo o formulário manual existente.

Ocultos/banidos não recebem link público: Consultar jogo abre os detalhes administrativos existentes e exibe Somente na administração. Nenhum novo endpoint, permissão ou exposição pública. Páginas provisórias e atualização dos metadados na mesma identidade já funcionavam; não houve migração ou reconstrução. Fichas seguem indicando dados não informados e respeitando o estado público do jogo.

## Ações

Área de seleção passa a se chamar Ações: e o botão Confirmar ação. Inicialmente ausente, aparece somente com registros selecionados e desaparece ao desmarcar todos/cancelar/limpar contexto. Indicadores de preparação/erro continuam acessíveis fora do card quando ainda não há seleção.

Resultados ficam em uma seção própria, sem seleção obrigatória: assim, não desaparecem depois de todos os sucessos ou ao desmarcar os restantes de uma falha parcial. Atualizar ou mudar contexto continua limpando resultados conforme comportamento existente. Mantidos limite cinco, motivo, confirmação, ações comuns, execução sequencial, parada na primeira falha, ausência de retry, estados/permissões/revisões e auditoria individual pelos endpoints existentes.

## Validação

43 testes focados aprovados: admin-catalog-row (3), admin-stage-7-6-2-components (7), admin-bulk (9), manual-game-presentation (3), manual-game (11), game-catalog-admin (10). Cobrem ativos/manuais/provisórios com link, ocultos/banidos sem link público, dados ausentes, nomes escapados, montagem inicial sem card de ações, autorização, criação provisória, reserva/cota, transições, revisão e falha parcial. Sem suíte completa ou repetição de testes Firestore sem alteração de persistência.

ESLint localizado, build e git diff --check aprovados. Avisos conhecidos: HMR de testes concorrentes ocupando 24678 sem falhas; chunk principal 507,44 kB minificado /156,30 kB gzip acima do limiar de 500 kB.

UI com componentes reais e transporte/dados simulados, sem token real nem escrita no banco: colunas com coordenadas iguais nas cinco linhas, consulta privada sem link público, ficha provisória com dados ausentes, seleção/desmarcação/cancelamento, foco restaurado ao checkbox, falha parcial e sucesso completo mantendo resultados. Desktop e 390px sem overflow; capturas fora do Git. Não substitui inspeção autenticada do proprietário em dados reais. Fixtures removidas; abas temporárias encerradas e viewport restaurado.

Sem novos serviços, dependências, índices, coleções, backend, Firebase remoto ou deploy. API não exige reinício nesta etapa; emulador e dados preservados.

## Próxima

7.6.8-C — avaliar URLs públicas e upload para capas manuais, apresentar recomendação e obter autorização da alternativa antes de implementar. Não ativar Storage/R2 nem armazenar imagens em base64 no Firestore.

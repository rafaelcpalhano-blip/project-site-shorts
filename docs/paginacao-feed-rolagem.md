# Feed — rolagem e numeração compacta — 25/10/2026

## Resultado

Trocar uma página pelos números, Anterior, Próxima ou saltos disponíveis move a tela ao título do feed (Últimos Postados ou título da ordenação atual), com margem superior de16px. A ação ocorre depois da renderização da página solicitada e também atende uma consulta que termine em erro, para manter sua mensagem visível. Foco acessível vai ao título; o botão de paginação que mudou de lugar não deve puxar a tela para baixo.

O navegador mantinha a posição/foco próximo da paginação enquanto o carregamento substituía cards por um estado menor e depois por uma nova grade. Sem um destino explícito de rolagem, a mudança de altura provocava os deslocamentos percebidos.

A correção atende o feed persistente e o demonstrativo. Somente paginação explícita solicita esse alinhamento: carregamento inicial, navegação do player e retorno contextual de uma ficha continuam com suas regras próprias. Não alterar catálogo, autenticação, moderação, players, persistência de registros ou endpoints.

## Planejamento de crescimento aplicado

- Página atual e até duas anteriores/duas posteriores: no máximo cinco números.
- Exemplo no meio: …18 19 [20]21 22… (quando esses destinos estiverem disponíveis).
- Nas bordas, mostrar apenas os números disponíveis; não inventar páginas para preencher cinco posições.
- Manter Anterior/Próxima.
- Mostrar −5 somente quando o índice atual permitir voltar cinco páginas.
- Mostrar +5 somente quando o destino cinco páginas à frente tiver cursor disponível.
- Reticências indicam números conhecidos fora da janela; não são botões de navegação.
- Controles com pelo menos44px, rótulos acessíveis e aria-current na página atual; quebra de linhas no celular, sem impor uma linha longa à página inteira.

### Limitação deliberada dos cursores

O feed persistente não conhece o total de páginas antecipadamente. A primeira leitura normalmente conhece a página1 e o cursor da2; a3 aparece ao se descobrir seu cursor. Após visitar páginas mais adiante, os cursores permanecem disponíveis no contexto atual e permitem saltar de volta/avançar novamente. Há no máximo duas posições conhecidas de cada lado: não prometemos mostrar duas futuras ainda desconhecidas.

Nenhuma leitura automática, contagem global, prefetch ou varredura foi adicionada só para montar botões. O salto usa diretamente o cursor disponível e o cache existente. Um cursor disponível permite consultar o destino; não garante cards se a visibilidade dos registros mudar ou o snapshot expirar. Os erros existentes continuam tratados.

Se futuramente for necessário saltar +5 para destinos ainda desconhecidos, será preciso decidir entre percorrer explicitamente as páginas intermediárias, com custo/latência de consultas, ou projetar outra forma de indexação da paginação. Essa mudança não foi implementada nesta rodada e não é necessária para as três páginas atuais.

## Validação

11 testes direcionados aprovados:4 de janela/limites/controles/saltos sem prefetch,5 de navegação contínua/cache/cancelamento e2 de retorno contextual. Cenários sintéticos incluem1,3 e1000páginas, início/fim, saltos exatos e indisponíveis, desativação durante carregamento e manutenção do cache. Não foram criados shorts ou jogos para simular volume.

Lint, tipos cliente/servidor, build local em modo firestore-emulator e diff-check aprovados. A build5175 foi atualizada; nenhuma alteração de servidor exige reinício da API. Dados8080 preservados, sem novas dependências/deploy/produção/Etapa8.

Navegador desktop5174: alternância2→3→1→2 mediu topo do título em15,609375px e foco H2 após as trocas, inclusive respostas em cache; sem overflow global na largura testada. Conferido retorno da ficha mantendo a página2; não concluímos medição exata da restauração de scroll pelo teste automatizado de navegação, pois o clique do navegador também pode rolar o link de origem para a área visível.

O Vite reteve uma transformação intermediária durante a edição. Renovada a leitura dos arquivos finais e repetida a conferência antes de aceitar o resultado; a build foi gerada a partir do conteúdo final.

Confirmação do proprietário no celular/5175: Sim, agora alinha no título ao alternar páginas1,2 e3. Saltos5 e grande volume permanecem cobertos por fixtures automatizados, pois o banco atual não tem seis ou mais páginas. Lighthouse não repetido nesta rodada; segue para a rodada completa do proprietário.

## Conferências restantes

- [x] PC: troca entre páginas1/2/3 alinha o título.
- [x] Celular físico/5175: proprietário confirmou alinhamento nas páginas1/2/3.
- [x] Janela e saltos em grande volume: testes sintéticos aprovados sem gravar dados reais.
- [ ] PC/celular: retomar checklist geral, especialmente retorno contextual, navegação do player e filtros/ordenações.
- [ ] Revisão visual administrativa da rodada anterior.
- [ ] Lighthouse Mobile/Desktop após fechar a rodada funcional, sem repetir auditorias completas a cada ajuste.

Etapa8 não iniciada. Entregar commits de código/testes e documentação separadamente; não executar commits/push automaticamente.

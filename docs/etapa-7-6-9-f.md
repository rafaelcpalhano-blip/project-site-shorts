# Etapa 7.6.9-F — consultas do catálogo de jogos

Concluída localmente em 23/10/2026, sob autorização do proprietário. Retomada do ponto de interrupção após indisponibilidade da revisão automática por limite de uso; revisão final posteriormente liberada. Git iniciou limpo, após os três commits de D/E. Nenhum commit executado nesta etapa.

## Mudanças e limites de escopo

1. FirestoreFeed não consulta a lista de jogos quando recebe gameId fixo na ficha: o filtro de catálogo não existe nessa tela. A consulta individual dos metadados do jogo permanece.
2. createPublicRepository compartilha o cache público por instância de Firestore (WeakMap). Home e formulário deixam de fazer consultas duplicadas da mesma página enquanto ela estiver válida, inclusive se os pedidos ocorrerem simultaneamente.
3. Cache exclusivamente em memória, contendo nomes/IDs públicos e cursores existentes. Validade de reutilização de 30 segundos a partir do primeiro resultado da geração. Expiração é verificada no próximo acesso, sem timer, polling, listener remoto ou persistência adicional. Ao expirar, a próxima leitura renova a geração. Erros não são armazenados como resultados e cada consumidor recebe cópias dos jogos para não alterar o cache.
4. Inclusão manual, confirmação oficial e solicitação vinculada invalidam o catálogo após resposta válida. Edição e moderação administrativa também invalidam após sucesso, inclusive nas ações em lote que usam o mesmo serviço. Atualizar feed na home e Recarregar catálogo forçam atualização explícita.
5. Consumidores montados observam a versão via useSyncExternalStore. Enquanto revalidam, não oferecem a lista antiga para seleção nem permitem confirmar envio sem o catálogo pronto. Respostas iniciadas antes de uma invalidação não repopulam o cache. Seleção continua por ID: após leitura completa válida, é mantida se o jogo ainda estiver elegível; caso contrário é retirada. Título, canal e URL não são reiniciados pela revalidação.
6. Consulta continua com status active, ordenação officialName/documentId e páginas de 50 com cursor. Nenhuma alteração de regras de ocultos, banidos ou provisórios ativos. Formulário percorre todas as páginas e pesquisa local permanece independente de caixa/acentos, organizada por pt-BR. A altura de seis itens não limita o catálogo. Home mantém sua paginação de jogos existente.

Sem backend, infraestrutura, dependências, credenciais, produção ou deploy. Não foram alterados players, ranking, ordenação de shorts, protocolo de envio, autorização administrativa ou validações do servidor.

## Evidências e benefício

Contador temporário, inserido apenas pelo servidor de teste 5178 no ponto de chamada getDocsFromServer, observou consultas reais ao emulador. Não é contagem de todos os pacotes WebChannel nem alegação de leituras faturáveis em produção.

| Cenário | Consultas à lista completa |
| --- | ---: |
| Home + primeira abertura do formulário | 1 no total |
| Invalidação explícita com home montada + nova abertura | mais 1; acumulado 2 |
| Reabertura imediata do formulário | nenhuma adicional; acumulado 2 |
| Entrada direta na ficha Tibia | 0; apenas consulta individual de metadados |

A ficha no teste de desenvolvimento fez duas chamadas de detalhe; estas não são páginas de catálogo e não foram otimizadas nesta etapa. O código anterior iniciava a lista tanto na home quanto em cada abertura do formulário e na ficha. O benefício comprovado é eliminação dessas consultas redundantes dentro da validade do cache, não uma nova nota Lighthouse ou percentual de ganho de carregamento total.

O proxy de API do servidor temporário 5178 não iniciou o feed de shorts porque o processo Node de teste não reconheceu a cadeia do certificado local (unable to verify the first certificate); por isso ele foi usado somente para medir a consulta independente de catálogo do SDK Firestore e a ficha. Nenhuma conclusão de funcionamento do feed deriva desse proxy. A build real no servidor habitual 5175 confirmou separadamente home com 15 cards, 21 jogos elegíveis (22 opções incluindo Todos os jogos), zero iframes, ausência de overflow e atualização manual bem-sucedida. Não foi modificada a API para contornar o problema do proxy temporário.

Na build 5175: combobox mostrou 21 jogos; busca POKEMON localizou Pokémon Brilliant Diamond; ArrowDown/Enter selecionaram igdb-144051 e avançaram o foco ao canal. Campos de título/canal mantidos, sem alertas e sem publicação. Abrir, cancelar e atualizar feed conferidos.

## Testes executados

48 testes relacionados aprovados, sem suíte completa desnecessária:

- tests/game-catalog-cache.test.mjs: 7 novos testes de compartilhamento/concorrência, cópias independentes, catálogo de 120 jogos em três páginas, reutilização de todas as páginas, expiração, falhas não armazenadas, resposta obsoleta, assinatura/cleanup, inclusão e invalidação administrativa.
- tests/game-catalog-client.test.mjs
- tests/game-combobox.test.mjs
- tests/title-search-disabled.test.mjs: simulador SSR atualizado para o novo serviço de versão, sem habilitar pesquisa de títulos.
- tests/game-catalog-stage.test.mjs
- tests/manual-game.test.mjs
- tests/admin-bulk.test.mjs

ESLint localizado nos arquivos alterados aprovado; TypeScript e build de produção com VITE_DATA_MODE=firestore-emulator aprovados; git diff --check aprovado. Últimas alterações funcionais já estavam na build conferida. Sem novo Lighthouse completo, teste físico no Motorola, login administrativo ou inclusão/moderação real de dados. Inclusão/edição/moderação foram verificadas por testes com respostas simuladas, não por mutações no emulador.

## Limitações de atualização

O cache é por aba/runtime. Não sincroniza mudanças de outros usuários/abas em tempo real. A validade de 30s limita reutilização em novas consultas, mas não transforma listas já exibidas em assinaturas remotas: elas se atualizam por invalidação nesta aba, nova abertura/remontagem ou ação manual. Uma alteração externa pode continuar visível como opção até revalidação, assim como os seletores anteriores não eram listeners em tempo real. As consultas de catálogo novas continuam exigindo status active, e o servidor revalida o jogo ao publicar, independentemente do que foi mostrado pelo cliente. Não prometer remoção instantânea entre usuários nem usar cache como autorização.

Se uma modificação no servidor tiver resultado de rede ambíguo, não se anuncia sucesso local automaticamente; atualizar/reabrir renova o catálogo conforme a política acima. Nenhuma tentativa de escrita é repetida automaticamente. Expiração/invalidação durante uma leitura pode exigir recarregar o catálogo; respostas obsoletas são rejeitadas de forma segura.

## Arquivos e entrega

Aplicação:

- src/features/games/services/catalog-cache.ts (novo)
- src/lib/firebase/public-repository.ts
- src/features/shorts/components/FirestoreFeed.tsx
- src/features/submissions/components/PersistentSubmissionDialog.tsx
- src/features/games/services/catalog-api.ts
- src/features/admin/services/game-catalog-api.ts

Testes: tests/game-catalog-cache.test.mjs (novo) e tests/title-search-disabled.test.mjs.
Documentação: este relatório e docs/continuidade.md.

Evidências externas: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-9-f/, com query-checks.json, build-checks.json, refreshed-build.json e form-build.png. Scripts de implementação e observação permanecem fora do repositório e não entram na build. Servidor temporário 5178 encerrado; abas de teste fechadas. API5174, build5175 e emulador8080 preservados, sem reset/seed ou alteração dos dados locais.

Commits sugeridos, não executados:

1. perf: reutiliza catalogo e evita consultas desnecessarias — seis arquivos de aplicação e dois testes listados acima.
2. docs: registra otimizacao das consultas de catalogo — este relatório e docs/continuidade.md.

Preferência do proprietário: sempre entregar os commits em blocos PowerShell separados, git add com arquivos em linhas continuadas e git commit -m, seguidos da próxima etapa. Não substituir por script de automação com condições nem executar commits por conta própria.

Próxima etapa conforme plano aprovado: 7.6.9-G — leituras do feed: avaliar agrupamento ou paralelismo limitado, preservando moderação, cursores, quatro ordenações e ranking; comparar latência e leituras antes de alterar backend. Não iniciada; aguarda autorização. Etapa 8 não iniciada.

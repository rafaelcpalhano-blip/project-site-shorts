# Correção da contenção nas leituras públicas — 25/10/2026

Implementação autorizada após diagnóstico da latência inicial. Antecedente: [validacao-carregamento-inicial-2026-10-25.md](validacao-carregamento-inicial-2026-10-25.md).

## Mudança

Criada uma coordenação compartilhada pelos clientes de leitura pública e feed ordenado. Leituras que usam o mesmo transporte na aba são atendidas em sequência; assim, catálogo e feed não iniciam juntos as transações sobre o contador public-read da mesma identidade no bootstrap normal.

Cada operação continua chamando /api/session e seu endpoint, com POST, credenciais da mesma origem, validação de resposta e contagem no servidor. Não elimina chamadas obrigatórias nem agrupa duas leituras em uma só contagem. Autenticação administrativa, permissões, cotas e limitadores do servidor não foram modificados.

A fila abrange apenas esses clientes de leitura: não envolve envio de shorts, publicação de comentários, curtidas ou operações administrativas. Cache de jogos de30s, invalidações, filtros, ordenação, paginação, retorno contextual e players preservados. Sem prefetch ou consulta adicional.

Cancelamento enquanto aguarda rejeita imediatamente ao solicitante e impede envio da operação cancelada. Uma leitura cancelada em andamento não libera a fila enquanto sua promise de transporte ainda está pendente. Falhas não envenenam a fila nem provocam retry automático; a próxima ação manual continua possível. O prazo original de20s inclui a espera; ele não foi ampliado. Referências de filas encerradas são liberadas.

## Limites desta solução

Coordenação local ao contexto JavaScript/transporte, não trava global de todas as abas ou instâncias do servidor. Requisições de outros contextos ainda podem disputar transações; o Firestore continua responsável pela consistência/proteção distribuída. Uma leitura lenta pode adiar outra leitura dessa mesma fila até resolver/falhar, dentro do prazo existente. Não prometer ausência de toda contenção em produção nem uma redução fixa de segundos em qualquer máquina.

## Testes e resultado

42 testes direcionados aprovados:6 novos de coordenação/falha/cancelamento/isolações/proteção, mais regressões relacionadas de catálogo, leituras públicas, cache, recuperação mobile, navegação contínua e retorno.

1 teste adicional aprovado com clientes, API e Firestore reais em demo-clipzone-tests:8081. Duas operações solicitadas por Promise.all entregaram15shorts e1jogo sem sobreposição das leituras protegidas. Cada sessão teve contador2; uma terceira consulta, com limite de teste2, retornou429 e manteve contador2. Não alterou o limite real do servidor.

| Evidência isolada | Resultado |
| --- | --- |
| Antes: par de leituras concorrentes, diagnóstico anterior |2,25–4,4s|
| Depois: bootstrap pelos clientes/API corrigidos, amostra1 |471ms|
| Depois: bootstrap pelos clientes/API corrigidos, amostra2 |219ms|
| Máximo de leituras protegidas simultâneas pelo mesmo transporte |1|

Tempos locais de fixtures; o experimento posterior inclui clientes e sessão da API, diferente do ensaio anterior por funções. É evidência da remoção da disputa no fluxo coordenado, não um novo Lighthouse ou comparação estatística de campo. Medições salvas fora do Git em audit-performance/public-read-queue-after.json no workspace.

Lint, tipos cliente/servidor, build firestore-emulator e diff-check aprovados. Build5175 atualizada; somente frontend alterado, não exige reinício da API. Não repetido Lighthouse, não gravado no8080, não criados shorts/jogos de uso, sem alterações de produção, dependências ou infraestrutura. Emulador de teste8081 encerrado ao terminar.

## Validação manual e próximo passo

- [x] Proprietário confirmou na5175: carregamento melhorou e feed/catálogo continuam funcionando após a atualização solicitada no PC e celular.
- [ ] Confirmar que pesquisa/seleção de jogo, paginação e reabertura de comentários continuam funcionando.
- [ ] Retomar pendências do checklist (A02-MOB não executado; A07-EXTRA quando aplicável).

Não é necessário repetir Lighthouse agora. CLS pequeno, SDK Firestore ainda carregado e oportunidades de imagens são achados separados; não foram misturados nesta correção autorizada. Avaliar próximo ajuste somente após a conferência desta correção. Etapa8 não iniciada.

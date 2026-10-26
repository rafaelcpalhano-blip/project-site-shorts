# Etapa8-F — ensaio isolado do novo formato de snapshot

26/10/2026. **Preparação de recuperação avançou; não é backup remoto realizado nem ferramenta de restauração de produção.** Foram usados somente dados fictícios em demo-clipzone-tests:8081. O código publicado e os dados remotos não foram alvos.

## Implementação de teste

- `tests/helpers/snapshot-recovery-fixture.ts`: constrói quatro documentos fictícios pelo núcleo captureFirestoreSnapshot com leituras injetadas, incluindo documento vazio, vínculo por referência e subcoleção sob pai ausente. Metadados e campos preservam o formato wire. Nenhuma leitura Firestore remota.
- `tests/helpers/snapshot-recovery-rehearsal.ts`: harness sem transporte padrão, credenciais, CLI, arquivo de entrada, rota ou import na aplicação. Recusa host diferente de127.0.0.1:8081 e projeto diferente de demo-clipzone-tests; exige intenção explícita de fixture e declaração de escritores parados. Esses flags não provam origem nem travam escritores externos.
- Antes de I/O: clona o snapshot para evitar alteração durante awaits, confere integridade/alvo/topologia e valida o subconjunto conservador de tipos usado no ensaio. Rejeita campos reservados, valores contraditórios, referências externas ao projeto de teste, arrays diretamente aninhados e precisão de timestamp não armazenável.
- Até100documentos/1MiB por lote de teste, sem paginação de gravação. Inspeciona destino vazio, envia um único `commit` atômico com `exists:false` em todos os documentos e faz batchGet para comparar os campos brutos. Não usa batchWrite, update-mask, merge, overwrite, delete ou retry.
- Referências e campos int64 permanecem strings; sem conversão para Number/Date. Pais ausentes não viram documentos inventados. `createTime` e `updateTime` originais ficam no snapshot, não são enviados como metadados graváveis. O Firestore atribui novos metadados; campos de negócio como datas persistidas devem ser preservados como dados.

Pré-inspeção não é lock global. O ensaio de colisão insere concorrencialmente um dos caminhos planejados entre inspeção/commit: o precondition rejeita o lote inteiro, mantendo o documento concorrente e sem gravar os demais. Isso não certifica restauração de um banco ativo ou aplicação de snapshots arbitrários.

## Falha descoberta e correção

A primeira integração passou3casos e recusou2na verificação pós-gravação; o harness não declarou sucesso indevido. A fixture usava timestampValue com nanossegundos não múltiplos de microssegundo. A revisão da especificação confirmou que o Firestore armazena esse campo com precisão de microssegundos e descarta precisão adicional. O ensaio agora **recusa valores submicrossegundo antes de gravar**, sem arredondamento silencioso, e utiliza fixture compatível para o round-trip. Metadados originais com nanossegundos continuam íntegros no snapshot e não são regravados como metadata.

Referências oficiais: [tipos Value e precisão de timestamp](https://firebase.google.com/docs/firestore/reference/rest/v1/Value), [commit atômico](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/commit). Essa política conservadora de fixture não é um serializador universal de todos os formatos aceitos pela API, nem prova de todos os dados de negócio.

## Resultados

30testes Node relacionados sem falhas:20anteriores da captura/transporte/composição e10novos do ensaio. Cobrem alvo/flags inválidos, alteração de hash, tipos/limites, destino ocupado, dados precisos e referências, conflito, confirmação ambígua, divergência na releitura e mutação do input durante await. Rede real bloqueada nos testes unitários.

5integrações no Firestore Emulator real, usando Java e emulador já instalados:

1. Restaurar/verificar quatro documentos, int64 nos limites, timestamps com microssegundos, tipos aninhados, referência, vazio e subcoleção sem recriar pai ausente; metadados de saída novos.
2. Repetição com destino ocupado recusa antes de outro commit e não altera registros.
3. Colisão concorrente rejeita todo o lote, preservando o registro existente e os demais caminhos ausentes.
4. Snapshot alterado recusa antes de qualquer requisição ao emulador.
5. Commit real seguido de confirmação perdida resulta em `outcome-unknown`, sem retry, rollback ou exclusão automática. Os documentos realmente gravados permanecem para inspeção.

O fluxo só declara verificação após comparação do lote completo. Uma confirmação perdida não prova ausência de gravação; erro de verificação não autoriza apagar registros. Todos os dados limpos entre casos eram fixtures descartáveis do emulador dedicado. Porta8080, servidores5174/5175 e dados locais de uso normal preservados. A inicialização/encerramento dessa execução isolada não reiniciou os servidores existentes.

Execução reproduzível: `node scripts/firebase-local.mjs test snapshot-recovery.test.mjs`. Recusa execução se FIRESTORE_EMULATOR_HOST divergir de127.0.0.1:8081; antes do ensaio desta rodada, as portas de teste livres e ferramentas já instaladas foram conferidas. Tipos dos helpers e lint dos quatro arquivos aprovados. A primeira tentativa do comando TypeScript exigiu a flag ignoreConfig do compilador existente; corrigido o comando local, sem mudança de dependência/configuração. Não houve razão para repetir a suíte global, cujo último resultado permanece704/0, ou a build/CPU/Lighthouse: só código de testes mudou.

Tempo local do runner ficou em8,8segundos na rodada final; não é RTO de produção. Evidência sanitizada: `evidencias/etapa-8-f-recuperacao-ensaio.json`. Logs iniciais/finais ficam no workspace privado, sem dados remotos.

## Próximos gates

- Preparar fonte de autenticação e escritor de arquivo privado com ACL, orçamento e destino revisados antes de pedir autorização de cópia real. Não usar este helper como comando de produção.
- Aprovar separadamente captura real consistente, acesso/escopo de dados privados, destino e teto de leituras. Não ler credenciais ou copiar banco por inferência de autorização de testes.
- Revisar tipos, vínculos de negócio, escopo e limites para uma ferramenta operacional. Não extrapolar quatro fixtures/um lote para migração completa ou recuperação de milhares de registros.
- Recuperação de Auth/TOTP/segredos/IAM permanece separada; não está no snapshot Firestore.
- Restauração remota, exclusões, reset, agendamento, jobs, billing e lançamento continuam não autorizados.

Nenhum deploy, recurso externo, dependência ou serviço pago criado; nenhuma nova consulta TikTok.

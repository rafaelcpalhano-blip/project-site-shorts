# Ranking Mais Relevante — primeiro piloto

## Estado em 27/10/2026

Inspeção remota exclusivamente de leitura em `clipzone-db02a/(default)`, concluída às 03:26:42 de Brasília: métricas aptas, nove documentos fonte elegíveis e sete jogos. Foram 24 requisições Firestore e 24.845 bytes de respostas, sem escrita ou inferência. Os 32 documentos contabilizados pelo modelo da inspeção não constituem medição de leituras faturadas.

A consulta relevante depende de uma geração completa e recente. A inspeção valida fontes e estado, mas não gera o resultado nem reserva a franquia Spark. Esse estado deve ser conferido novamente imediatamente antes de qualquer piloto autorizado.

## Código e verificações locais

- `server/ranking/readiness.ts`: inspeção somente leitura, sem reparação de métricas; valida epoch, orçamento interno, concorrência, fontes, jogos e limites. Nunca apresenta uma lista truncada como pronta.
- `server/ranking/controlled-generation.ts`: composição de operador, sem rota HTTP ou scheduler; usa o gerador segmentado existente. Recusa trabalho ativo de outro operador, mudança de geração e exclusões. Permite somente documentos derivados de ranking, com limites de 8 passos, 60 tentativas de gravação, 30 fontes e 15 vídeos. Confere dois minutos e mudança de dia entre passos; o limite global de rede deve ser aplicado pelo executor, não é garantido por essa verificação entre passos.
- Dez testes de inspeção e seis de piloto: geração completa, ordenação real do leitor, exclusão imediata de vídeos removidos/jogos ocultos, concorrência, atomicidade do limite de gravações, interrupção, tempo e ausência de reinício indevido.
- Suíte Node: 785 aprovados, zero falhas e zero ignorados. O custo de CPU no Node local não certifica CPU no Workers.

## Escopo proposto, ainda NÃO executado

Uma geração pontual por operador local, sem hospedar API Node, criar endpoint ou fazer deploy. Usar a identidade runtime já existente, apenas após autorização específica para abrir sua credencial privada. Conferir projeto exato, Spark e margem de quota antes da escrita; divergências interrompem.

No estado observado: quatro passos e 22 gravações auxiliares esperadas, sem retries. O orçamento interno reserva 900 leituras/180 gravações; reserva interna não é consumo faturado, nem reserva exclusiva da quota do Firebase. Leituras efetivas podem incluir documentos ausentes, consultas vazias, transações, retries e entradas de índice. Não tratar número de requisições HTTP como leituras debitadas.

Únicos destinos de escrita permitidos: `rankingState/build`, `rankingState/lease`, `rankingState/current`, `rankingBudgets/{dia UTC}`, `rankingRuns/{geração}` e `rankingItems/{geração}_{short}`. Sem exclusões ou alteração de shorts, jogos, comentários, curtidas, métricas primárias, usuários ou credenciais. Publicar o ponteiro somente depois de todas as fontes e itens estarem completos.

Executor operacional preparado fora do repositório, sem execução real: limite global de 120 segundos, 200 chamadas Firestore e 1 MiB de respostas, recibo exclusivo antes da escrita e nenhuma repetição automática após resultado ambíguo. O executor passou em quatro simulações sem rede: ausência de autorização não abre credencial, nove itens completam com 22 gravações, métricas incompletas não iniciam escrita e recibo existente impede nova execução. Isso não certifica rede ou ACL reais; falhas nessas verificações devem interromper. Em falha, parar e inspecionar o estado; não apagar staging ou reiniciar reservas automaticamente.

Depois: verificar a integridade da geração e medir a leitura relevante no Worker existente. Esse piloto não certifica geração em Workers Free e não ativa renovação. A geração vence após 90 minutos do snapshot; a solução contínua exige avaliação separada de CPU, periodicidade, retenção e consumo diário. Jobs e cron permanecem desligados.

## Pendências independentes

Tradução de Tibia ainda sem sucesso confirmado; diagnóstico privado publicado, nenhuma terceira inferência autorizada por este piloto. TikTok ainda aguarda suporte. Nenhum lançamento público ou mudança de plano autorizado.

## Piloto remoto autorizado e concluído — 27/10/2026

Spark reconfirmado no painel de clipzone-db02a/(default). Contadores exibidos de zero leituras/gravações, com picos em sete dias de cerca de 5 mil leituras/936 gravações; indicadores podem ter atraso e não são garantia de saldo instantâneo.

A primeira pré-conferência parou sem iniciar a fase de escrita: snapshot Firestore cerca de 1,35 segundo à frente do relógio local excedeu a tolerância de um segundo da inspeção. Diagnóstico somente leitura confirmou nove fontes com IDs e ordem válidos. Calibração restrita ao executor, ancorada no readTime autenticado do Firestore e relógio monotônico local, aceita diferença de no máximo cinco segundos e mesmo dia UTC; divergência excessiva interrompe. Não altera relógio da máquina ou tolerâncias do site. Recibo inicial preservado; nova entrada exige comprovação de que o anterior não iniciou escrita e usa outro recibo exclusivo. Seis simulações de executor aprovadas, incluindo diferença de 1,4 segundo aceita e de sete segundos recusada sem escrita.

A única geração autorizada terminou ready às 13:13:29 de Brasília: nove itens, quatro passos e 22 tentativas de gravação auxiliar, sem edição de dados primários ou inferência. Foram 78 requisições Firestore, uma OAuth e 136.247 bytes contabilizados de respostas, dentro dos tetos. Recibos privados impedem repetir a operação. Nenhuma exclusão, mudança de plano, deploy ou cron.

UI confirmou nove cards em Mais Relevante e dois ao filtrar Tibia; atualização do feed também funcionou. Worker permaneceu 6910fddf-8d39-4129-a289-f60ce08be37c. Coleta limitada: quatro leituras ordenadas HTTP200, CPU 21/12/6/10ms, sem exceções/exceededCpu. Primeiro acesso da rota no isolate consumiu 21ms, sem criar aplicação; não é prova de inicialização totalmente fria. As duas leituras gerais seguintes mediram 12/10ms; consulta de Tibia, 6ms. Não houve inspeção de corpo para descartar erro1102 independentemente. Amostra pequena, ainda sem aprovação de CPU para operação contínua. A geração em Node não certifica CPU da geração em Workers.

A geração expira 90 minutos após seu snapshot (aproximadamente 14h43 de Brasília neste dia). A UI já existente fala em próxima geração horária, mas a rotina não foi ativada; não prometer essa atualização nesta homologação. Ranking/jobs/cron continuam desligados. Próximo trabalho: revisar custo da leitura e preparar validação da geração no Workers e renovação limitada, com autorização própria para qualquer deploy/rotina remota. Tradução e TikTok permanecem pendentes. Evidência sanitizada em docs/evidencias/etapa-9-a-ranking-primeira-geracao.json; recibos completos e captura de tela fora do Git.

## 27/10/2026 — intervalo de ranking de 30 minutos, somente local

Proprietário descartou mudar a fórmula e solicitou apenas reduzir a janela de atualização para 30 minutos. generationLimits.intervalMs passou de 3.600.000 para 1.800.000; readiness, geração segmentada e gerador legado usam o limite compartilhado. Pesos, decaimento 24/12/6, métricas de interação, validade de leitura de 90 minutos, retenção, quotas e proteções intactos. Texto do feed deixou de prometer geração horária e informa que novas interações entram na próxima atualização; não promete rotina que ainda está desligada.

Quatro regressões novas verificam 29m59,999s sem publicação/escrita, liberação aos 30 minutos, preservação do ponteiro até conclusão, cadência pela idade do snapshot apesar de publicação tardia e interrupção sem escrita quando o orçamento está esgotado. Contrato workerd de 300 fontes/100 itens também verifica os 30 minutos: 28 passos, snapshot de 26 minutos ao publicar, continuidade limitada. Suíte Node789/0/0, build/tipos/lint e 16 contratos workerd locais aprovados, zero acessos externos no runtime de teste. Isso não certifica CPU da geração no edge.

Modelagem: até 48 gerações/dia contra 24 anteriores. Com nove itens e22 gravações por geração segmentada concluída, 1.056 gravações/dia só de geração; limpeza, tentativas falhas, leituras e interações são adicionais. Não converter requisições HTTP em leituras debitadas. Com100 itens,48 ciclos podem ultrapassar o teto interno atual de4.000 gravações/dia; nesse caso o sistema interrompe, sem elevar quota ou relaxar proteção. A cadência exige capacidade e margem; 30 minutos define quando pode começar nova geração a partir do snapshot, não garante conclusão instantânea ou disponibilidade contínua em qualquer volume.

Nenhum deploy, cron, escrita remota ou nova geração executado nesta alteração. Worker remoto permanece6910fddf-8d39-4129-a289-f60ce08be37c, rotina desligada. Antes da ativação: revisar leitura21/12/6/10ms, CPU da geração e manutenção/limpeza e custo global; preparar pacote congelado e pedir autorização específica. Evidência sanitizada: docs/evidencias/etapa-9-a-ranking-30min.json. Tradução/TikTok seguem pendentes.

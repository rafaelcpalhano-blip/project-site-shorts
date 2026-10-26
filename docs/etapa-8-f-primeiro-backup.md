# Etapa 8-F — primeira cópia privada real verificada

26/10/2026. **Primeiro backup de documentos Firestore realizado e verificado após autorização específica do proprietário.** A autorização incluiu leitura da credencial existente, criação de uma pasta privada nova e captura limitada. Não incluiu restauração, escrita no banco, deploy ou serviços pagos.

## Conferências anteriores

Console Firebase autenticado: projeto clipzone-db02a, banco (default), plano Spark e custo exibido sem custos financeiros. Painel de cotas exibiu pico aproximado de 1,2 mil leituras/dia nos últimos sete dias (2,4% de 50 mil/dia), 338 gravações (1,7% de 20 mil/dia) e zero exclusões. Trata-se do indicador do Console, com arredondamento/atraso possíveis; não é leitura instantânea exata da quota. O volume exibido apresentou margem ampla para a captura limitada aprovada.

GETs de gerenciamento confirmaram Project ID, Project Number e nome esperados e banco projects/clipzone-db02a/databases/(default), FIRESTORE_NATIVE/STANDARD em southamerica-east1. Nenhum documento ou chave runtime foi lido nessa conferência. A rota de quota App Engine indicada pelo Console redirecionou para início do produto e não forneceu quota; nenhum App Engine foi criado ou ativado. Os indicadores utilizáveis vieram do próprio painel Firebase.

## Resultado da captura

| Item | Resultado |
| --- | --- |
| Origem | clipzone-db02a/(default) |
| Instante consistente readTime | 2026-10-26T23:26:28.074Z |
| Documentos salvos | 148 |
| Requisições Firestore | 178, diante do teto de 250 |
| Trocas OAuth | 1 |
| Arquivo | 71.607 bytes, aproximadamente 70 KiB, diante do teto de 8 MiB |
| Confirmação | Releitura, integridade e recibo privado aprovados |
| Parciais remanescentes | Nenhum |
| Pasta | Nova pasta privada em %LOCALAPPDATA%/Clipzone/backups |

O número de requisições não equivale ao número de leituras debitadas. Não foi feita medição contábil pós-operação nem promessa de consumo exato. Os limites aprovados permaneceram: até 500 caminhos enumerados, 250 chamadas Firestore, 5 MiB de JSON contabilizado pelo núcleo, 1 MiB por resposta no transporte, arquivo de 8 MiB e sinal de cancelamento global em 120 segundos. A execução ficou dentro desses tetos e não repetiu falhas nem aumentou limites.

ACL foi configurada somente na pasta **nova**, criada exclusivamente pela execução, com usuário atual e SYSTEM. Nenhuma ACL existente foi alterada. ACL e identidade da credencial existente foram conferidas antes de usá-la; seu conteúdo, tokens e registros não foram impressos. O arquivo da credencial não foi incluído no snapshot. Assinatura e troca OAuth usaram a identidade runtime existente, sem criar chave ou ampliar IAM.

O runner privado vive no workspace de trabalho, não no código publicado. Exige modo explícito e recusa reexecução depois de um resultado; não há cron ou nova tentativa automática. Arquivo de dados e recibo com caminho permanecem somente na pasta privada, fora do Git. Documentação recebe apenas este resumo sanitizado.

## Verificação final independente, offline

Após a captura, outro verificador sem rede e sem reabrir a credencial conferiu: ACL do snapshot e do recibo, tamanho, alvo, checksum, contagem, readTime e correspondência do recibo. Todas passaram. Nenhum arquivo parcial encontrado. O hash detecta alterações, mas não prova autenticidade independente da fonte nem substitui custódia segura.

Não houve inserção, atualização, exclusão, restauração ou migração no Firestore. Nenhum serviço foi ativado, plano alterado, API/credencial criada ou deploy realizado. Nenhuma consulta TikTok foi feita. Não foi repetida a suíte automatizada: o pacote local anterior tem 64 testes relacionados aprovados e a suíte global histórica permanece 704/0; esta execução é prova operacional de captura/verificação, não novo resultado de testes automatizados.

## Proteção alcançada e pendências

A cópia protege os documentos presentes no instante indicado; alterações posteriores não estão incluídas. Não inclui recuperação de Firebase Auth, Google, TOTP, IAM ou credenciais. Cópia no mesmo computador não protege contra perda física/comprometimento desse computador. Frequência e custódia adicional ainda precisam de decisão, sem serviço pago ou agendamento automático.

Não restaurar esses dados privados em testes por inferência da autorização de captura. O ensaio anterior de restauração continuou restrito a fixtures no emulador isolado; uma restauração com dados reais exige alvo/escopo e autorização separados. Não foi realizada restauração remota ou medida de RTO real.

O gate da **primeira cópia privada real verificada** está concluído. Etapa 8-F continua aberta por outras pendências, incluindo TikTok, cobertura de CPU e revisão de recuperação/custódia de Auth/TOTP. É possível avançar na homologação 9-A e auditorias independentes, preservando os bloqueios de lançamento.

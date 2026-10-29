# Etapa 9-B — backup atualizado e segunda cópia verificada

## Resultado de 29/10/2026

Captura real de `clipzone-db02a/(default)` concluída, após autorização específica para uma nova tentativa com até750 requisições. Plano Spark e margem observada foram reconferidos no Console Firebase autenticado: aproximadamente3,3mil leituras/50mil por dia (6,6%),335gravações e0exclusões. Indicadores do painel podem ter atraso; não são um medidor instantâneo de consumo.

| Item | Resultado |
| --- | --- |
| Instante consistente do banco | 29/10/2026 às02h56min09s de Brasília (`2026-10-29T05:56:09.174Z`) |
| Documentos capturados | 371 |
| Requisições Firestore na tentativa concluída | 412 de750 autorizadas |
| OAuth | Uma troca, resposta de1.083bytes |
| Tamanho do snapshot | 204.841bytes, aproximadamente200KiB |
| Cópias | SSD privado e subpasta privada do HD autorizada |
| Integridade | Checksum interno, igualdade exata dos bytes e recibos conferidos nos dois destinos |
| Conferência independente | Aprovada apenas por releitura local, sem nova consulta ao banco ou abertura da chave |
| Alterações remotas | Zero gravações/exclusões; sem deploy, plano, índice, cron ou GitHub alterado |

## Tentativa anterior e orçamento

A primeira tentativa, autorizada para250 requisições, foi interrompida com250 chamadas e uma troca OAuth, sem snapshot concluído ou cópia no HD. O núcleo consulta subcoleções em cada documento; a estrutura atual exigiu mais chamadas. A nova tentativa foi preparada separadamente e autorizada antes da execução; nenhum marcador anterior foi removido ou autorização reutilizada.

As duas tentativas somaram662 requisições Firestore e duas trocas OAuth. Esses valores não equivalem à quantidade de leituras debitadas. Não houve repetição automática ou aumento de limites durante uma execução.

## Proteções e alcance

Os dois diretórios tiveram ACL usuário/SYSTEM revalidada. A pasta principal do HD manteve suas permissões. Arquivos e recibos novos foram criados sem sobrescrever a captura de26/10 ou outros backups. Conteúdo e credenciais não foram incluídos neste relatório nem no Git; as cópias reais permanecem fora do repositório.

A captura preserva documentos, links e dados operacionais do Firestore no instante indicado. Não inclui arquivos de vídeo, credenciais, contas Firebase Auth, TOTP ou configurações IAM/Cloudflare. A igualdade das cópias comprova integridade, não é um teste de restauração real nem garantia de recuperação de todos os serviços. ACL não comprova criptografia do HD.

O executor privado reutilizou as bibliotecas existentes com teto revisado de750 requisições,500caminhos de documentos,5MiB de respostas Firestore contabilizadas,1MiB por resposta, arquivo8MiB, uma troca OAuth de até16KiB e sinal geral de cancelamento120s. Preparação aprovada em54 testes existentes e ensaio com300 documentos fictícios/302chamadas; teto antigo250 e proposta acima de750 recusados nos testes. Código publicado da aplicação não foi alterado.

## Próximos cuidados

A segunda cópia está verificada e o proprietário pode desconectar o HD pelos cuidados normais do sistema, após concluir outras atividades na unidade. Nenhum desligamento/desmontagem foi executado automaticamente.

A política continua sendo backup no lançamento e depois a cada15dias. Considerando esta captura como referência, a próxima revisão é13/11/2026. Se o lançamento ocorrer em outra data ou houver mudança importante de conteúdo, revisar a referência com o proprietário. Lembrete no celular ainda depende de horário e canal; não foi criado automaticamente.

A conclusão do backup não altera a condição de homologação, a política de indexação ou a autorização separada para lançamento. A conferência final Lighthouse e a atualização do README permanecem previstas após a publicação e política de indexação aprovadas.

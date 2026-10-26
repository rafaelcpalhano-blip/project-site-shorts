# Etapa 8-C — índices, identidade e marcadores preparados

26/10/2026, America/Sao_Paulo. Execução remota autorizada no projeto **clipzone-db02a**, número **818748049569**, banco **(default)**, Standard/Native em southamerica-east1. O identificador clipzone-db02a2 não foi utilizado. Esta atualização substitui o estado anterior de índices ausentes; as auditorias datadas anteriores permanecem como histórico.

## Resultado confirmado

| Item | Resultado |
| --- | --- |
| Plano | Spark, US$0/mês no Console; projeto sem conta de faturamento vinculada |
| Compostos | 37 criados, 37 READY, 0 em construção, 0 extras |
| Configurações de campo | 15 correspondentes ao manifesto; expiresAt crescente/coleção READY; demais isenções conforme definição |
| Identidade | clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com criada e ativada |
| Papel | projects/clipzone-db02a/roles/clipzoneRuntimeDatastore, seis permissões exatas |
| Política IAM | Vínculo exclusivo desse papel à identidade; demais vínculos preservados e conferidos |
| Inicialização | Três marcadores criados atomicamente, sem sobrescrita nem importação |
| Credencial privada runtime | Não criada; autenticação real dessa identidade ainda não testada |

Fonte dos índices: firestore/firestore.indexes.json, SHA256 `644d824beca0a7a375f4aade3cd74f75cbb57fee4631e0844124a5620a7b2eec`. Mesmo arquivo revisado: 37 consultas/15 configurações. A conferência final paginou as respostas e comparou coleções, campos, ordens, escopos e isenções. Nenhum índice remoto foi excluído; nenhuma pesquisa dormente/TTL foi ativada. Configurações globais automáticas preservadas.

## Segurança e inicialização

A concessão IAM recebeu confirmação específica no momento da operação. Permissões: datastore.databases.get (iniciar/reverter transação), datastore.entities.get/list/create/update/delete. Nenhum papel Owner/Editor ou de administração de Auth, IAM, índices ou faturamento concedido ao runtime. A correspondência dos métodos está documentada na [referência oficial IAM do Firestore](https://docs.cloud.google.com/firestore/native/docs/security/iam). Alteração de política com etag e comparação dos demais vínculos antes/depois. Nenhuma chave criada, token registrado, credencial copiada ao repositório ou segredo exposto.

Antes da inicialização, a listagem autenticada de IDs de coleções na raiz retornou vazia. API Workers/jobs ainda não publicados/ativados nesta preparação; nenhum seed/import/editor de conteúdo ativo no fluxo. Mesmo alvo para inspector e store. Usado o executor existente server/runtime/empty-database.ts com createRestStore, época e data novas, leituras antes de escritas, transação e precondição exists=false em cada documento. A inspeção da raiz foi repetida antes do commit; isto não constitui bloqueio global contra um escritor externo desconhecido.

Criados somente gameNameState/v1 (version1/ready), adminQueueState/reportTitles (version1/ready) e rankingState/metrics (version1, ready, epoch/data novas, shorts0/signals0/unverifiedComments0). Leitura posterior confirmou todos os campos e exatamente essas três coleções na raiz. Nenhum jogo, short, comentário, usuário ou conteúdo local foi copiado. Não executar a inicialização novamente: ela deve recusar banco não vazio/marcadores existentes. Não apagar marcadores para contornar a recusa.

Inicialização efetuada com a sessão do **operador autenticado no CLI**, sem criar chave de serviço. Isso não certifica OAuth/IAM do runtime real, que segue pendente de custódia/credencial e teste próprio.

## Execução e limites

Usadas bibliotecas da ferramenta oficial já instalada, fora do caminho de deploy geral; escrita Firestore restrita a POST de índices e PATCH indexConfig dos 15 caminhos aprovados. Sem ensure/ativação de API, criação de banco ou publicação de regras. A API de faturamento retornou500; a ausência de faturamento foi reconfirmada diretamente no Console autenticado, não inferida da falha. A primeira consulta de índices recebeu400 por pageSize; corrigida apenas a paginação da leitura antes de qualquer escrita. A primeira concessão IAM recebeu400 após criar identidade/papel; retomada conferiu os recursos exatos e concluiu o vínculo, verificado por nova leitura; causa inicial não confirmada. Sem ampliação de permissões para contornar falhas.

Evidência sanitizada em [etapa-8-c-preparacao-remota.json](evidencias/etapa-8-c-preparacao-remota.json). Registros operacionais e screenshots fora do Git em Project-Site-Shorts/auditorias. Conferência de JSON/diff; não repetidos testes completos, build, Lighthouse ou consultas de conteúdo. Não houve mudança de código funcional, reinício de5174/5175/8080, seed/reset local ou migração. Nenhum deploy de site/API, regra, domínio Auth, cron, plano, billing ou serviço pago alterado.

## Próximo passo

Índices/IAM/metadados desta preparação estão concluídos. A8-C ainda tem custódia e teste de credencial do runtime pendentes; não declarar a Etapa8 inteira concluída. A chave privada requer participação do proprietário, destino privado definido e aprovação própria; nunca enviar pelo chat, screenshot, VITE_* ou Git. Depois: endereço/origem HTTPS, bindings, domínio Auth e publicação sob autorização separada; validar Google/TOTP/UID, provedores e CPU real antes de ativar jobs/agendamento. A geração inicial do ranking não foi executada no remoto. Backups operacionais antes de conteúdo definitivo, elegibilidade gratuita da tradução IA e validações PC/mobile permanecem no checklist existente. Sem upgrades automáticos.

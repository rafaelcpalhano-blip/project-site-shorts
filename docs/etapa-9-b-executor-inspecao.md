# Etapa 9-B — executor privado para inspeção única de rede

29/10/2026. Preparado localmente após autorização de continuidade; leitura real ainda não executada. Este pacote não publica código no site nem ativa manutenção.

## Escopo fechado da primeira operação proposta

- Projeto/banco fixos: clipzone-db02a/(default).
- Apenas collection networkAbuse, até30 documentos cuja expiração seja menor ou igual ao instante capturado.
- Projeção exclusiva do campo expiresAt. Nomes/IDs retornados pelo Firestore só são usados em memória para validar a resposta e não entram no resumo salvo.
- Uma consulta POST runQuery. Sem transações, commits, exclusões, paginação automática, outra coleção ou repetição.
- Uma troca OAuth com a identidade runtime existente; sem nova chave/conta/permissão.
- Até128KiB na resposta Firestore e16KiB na resposta OAuth, total144KiB. Transporte de consulta com sinal de30s; operação geral com sinal de cancelamento de120s. Chamadas ACL existentes têm timeout próprio e podem terminar antes de observar o cancelamento global.

Uma resposta com até30 documentos não equivale a garantia de30 leituras debitadas; consulta/índices e contabilização do provedor são separados. Qualquer falta de índice, recusa, divergência, excesso ou falha interrompe a operação, sem ativar serviço ou repetir.

## Arquitetura e proteções

server/maintenance/network-inspection-transport.ts é uma fábrica opt-in, sem fetch padrão ou carga de credencial. Alvo/query/projeção/limite são constantes; provedor do token e HTTP são injetados. A instância é de uso único, inclusive em falha ou chamada concorrente. Valida status, MIME, redirect, tamanho declarado/real, JSON, alvo de cada documento, campo retornado e data. Erros não devolvem corpo do provedor nem token. Não é importada pela entrada Workers/HTTP.

Executor operacional fica somente no workspace privado, fora do repositório. Reutiliza loadSnapshotSigner e verificação Windows de arquivo/pasta; valida a identidade fixa e a chave existente sem alterá-la. A chave não é enviada ao Firestore; assinatura/token seguem o fluxo OAuth já revisado. Não há leitura de .env nem descoberta de credenciais alternativas. Nenhum acesso ao HD de backup ou alteração de permissões do computador faz parte desta operação.

Modo real exige autorização específica e recibo prévio de alvo/Spark/margem, com no máximo15minutos de idade, e hashes do código congelado. O recibo não é prova independente dos planos: a conferência efetiva deve ocorrer antes da execução. Um marcador criado com exclusividade antes da abertura da credencial impede repetir a mesma operação, mesmo se falhar. Recibo de execução grava só contagens/estado sanitizado; nenhum payload, ID ou segredo. Não muda ACL de arquivos ou pastas existentes.

Modo self-test usa chave RSA nova de fixture, confirma a assinatura JWT, intercepta OAuth/Firestore e nunca abre o arquivo runtime real. Os limites do CLI e a verificação ACL foram revistos; a nova simulação não é uma autenticação real nem prova de elegíveis no banco.

## Evidências locais

Onze testes novos do transporte, incluindo uso único/concorrência/falhas, projeção, limites de resposta, coleção/projeto divergentes, campos extras, tokens inválidos, cancelamento e ausência de retry. Com o inspetor anterior:22 testes direcionados aprovados. Suíte geral em série:911/0; tipos de servidor, lint, sintaxe do executor, verificação local de segredos e diff aprovados. Suíte geral e demais checks na [evidência sanitizada](evidencias/etapa-9-b-executor-inspecao.json).

A configuração versionada mantém índice ascendente expiresAt para networkAbuse; não foi conferido ou alterado remotamente nesta preparação. Nenhum plano de índices ou publicação está incluído. O executor é ferramenta manual local, não substitui a hospedagem Workers por Node nem adiciona serviço pago.

## Autorização ainda necessária

Proposta pronta: abrir somente a credencial runtime existente após verificação ACL, reconferir alvo/Spark/margem e fazer uma inspeção única de networkAbuse nos limites acima. Não inclui criar backup, copiar ao HD, excluir registros, alterar contadores/conteúdo, IAM/regras/índices, cron, deploy ou contato com provedores de vídeo. Sem autorização, não criar o recibo de execução real nem executar esse modo.

O resultado será uma página observada, não o total do banco ou aprovação para apagar dados. Uma futura limpeza exigirá proposta separada, limite pequeno e revalidação transacional. Recuperação TOTP, backup no lançamento/a cada15dias, custódia no HD e lembrete futuro permanecem decisões/ações separadas.

## Inspeção real autorizada e concluída — 29/10/2026

Após autorização específica, Console Firebase autenticado confirmou Clipzone, banco(default), Spark/sem custos financeiros e margem exibida: cerca de2,6mil leituras/50mil por dia(5,2%),304gravações/20mil e zero exclusões; indicadores podem atrasar. Somente leitura do painel, sem acionar upgrade. Os122hashes congelados e ACL da chave/pasta conferiram; credencial existente foi aberta pelo carregador revisado, sem alterar permissões ou expor seu conteúdo.

Executada uma vez às00h58 de Brasília: query de networkAbuse projetando expiresAt retornou0documentos,0examinados/0elegíveis e nenhuma continuação. Uma troca OAuth(1.083bytes) e uma consulta Firestore(50bytes), total1.133bytes, dentro de144KiB. Nenhuma escrita/exclusão, retry, backup, acesso ao HD, outra coleção, alteração de plano/índice/regra/IAM ou deploy. Releitura independente do recibo sanitizado confirmou alvo, orçamento e zero writes. Não houve necessidade de repetir testes, pois o código congelado aprovado em911casos não foi alterado para executar.

O resultado significa ausência de documentos vencidos encontrados por essa query naquele instante; não significa que a coleção esteja vazia, que outras coleções estejam limpas ou que datas futuras não vencerão. Não existe proposta de exclusão a aplicar a partir dessa observação. Aprovação de execução única consumida; marcador de tentativa preservado e nenhuma segunda leitura autorizada por ela. Operações futuras devem ter escopo/orçamento e autorização próprios. O procedimento manual de leitura está validado no escopo da rede; outras coleções continuam com cobertura local e não foram consultadas.

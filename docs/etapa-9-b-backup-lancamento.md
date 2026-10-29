# Etapa 9-B — plano do backup de lançamento e segunda cópia

29/10/2026. Plano concreto de procedimento; nenhuma nova captura, leitura de backup existente ou cópia para HD foi executada. Destino no HD ainda será informado pelo proprietário.

## Confirmações recebidas

O proprietário identificou Google Authenticator como aplicativo TOTP e informou conseguir recuperá-lo por sua conta Google, cujo e-mail tem alternativas de recuperação. Registrar como confirmação humana, não teste independente de sincronização/restauração. Não sair da conta, remover fator ou pedir códigos/QR/chaves para comprovar.

Frequência escolhida: backup no lançamento e a cada15dias. Segunda cópia em HD separado do SSD, mantido desconectado quando não usado. Caminho ainda pendente; não enumerar, montar, ler ou modificar a unidade por inferência. Pedido de lembrete móvel permanece condicionado à data inicial, horário e canal combinados.

## Sequência proposta

1. Proprietário informa a pasta exclusiva no HD quando puder conectá-lo. Conferir somente o destino autorizado: caminho real, tipo de unidade/sistema de arquivos e controles de acesso suportados. Não presumir criptografia, formatar, alterar BitLocker ou ACL de pastas existentes.
2. Preparar a entrada operacional atualizada a partir das bibliotecas já existentes. O runner da primeira captura é de uso único já consumido e tem verificações de quota históricas; não executá-lo novamente ou editar recibos antigos para contornar essa restrição.
3. Apresentar autorização específica de captura e de segunda cópia com origem/destinos/tetos definidos. Se o HD ainda não estiver disponível, não prometer que a custódia independente esteja concluída; combinar se a captura local será feita antes ou somente junto da transferência.
4. Imediatamente antes da captura, reconferir clipzone-db02a/(default), plano Spark, margem observada e ACL da credencial runtime e do diretório privado no SSD. Falha, quota ou divergência interrompe sem elevar planos/limites/permissões.
5. Capturar um instante consistente com as bibliotecas existentes. Proposta preserva os tetos da primeira operação:500caminhos de documentos,250requisições Firestore,5MiB de respostas contabilizadas,1MiB por resposta no transporte, arquivo de8MiB e sinal de cancelamento em120s. Uma troca OAuth é separada das requisições de dados. Esses números não garantem leituras debitadas; o crescimento pode exceder os tetos e exigir revisão, sem aumento automático.
6. Criar arquivo novo e recibo na pasta privada existente do SSD, sem sobrescrever a cópia de26/10 ou outras. Verificar integridade/checksum, readTime, alvo, contagem, tamanho e ACL. Não imprimir conteúdo, tokens ou caminhos privados no relatório público.
7. Copiar somente o snapshot verificado e o recibo necessários à pasta escolhida do HD, após aprovação do destino e de sua proteção. Credenciais/chaves e dados fora do snapshot não acompanham essa cópia. Usar nomes novos, sem substituir arquivos existentes; reler e comparar checksum no HD antes de declarar a segunda cópia verificada.
8. Proprietário pode desconectar a unidade após concluir a verificação e os cuidados normais do sistema. Não desligar/montar/desmontar a unidade automaticamente. Registrar data e próxima revisão; configurar o lembrete apenas quando a data inicial e o canal móvel estiverem definidos.

Se a proteção do HD não atender ao procedimento, parar e propor adaptação mínima. Não criar um esquema de criptografia caseiro, instalar ferramenta ou escolher nova senha/chave sem participação do proprietário. Arquivo em HD separado não é prova de criptografia ou recuperação completa.

## Escopo e limites

Snapshot inclui documentos de cadastro, links de postagens, comentários e dados operacionais privados do Firestore no instante capturado. Não baixa os vídeos dos provedores, não contém cópia das contas Firebase Auth/Google/TOTP, IAM ou segredos e não substitui o histórico do código no GitHub.

Uma cópia de documentos não autoriza restauração, exclusão, migração ou alteração do banco. A autorização anterior de inspeção networkAbuse foi consumida e não inclui esse backup. A restauração real continua com alvo, escopo e aprovação próprios; não foi demonstrado tempo de recuperação de produção.

A pasta do HD e a proteção do destino são informações indispensáveis antes de propor/aplicar a segunda cópia. Até recebê-las, a tarefa pode avançar nas conferências independentes, mas não está autorizada a gravar em uma unidade por suposição.

## Código e CI

Checkout limpo no início, HEAD a6b8d3f. A página Actions confirmou a [execução automática nº12](https://github.com/rafaelcpalhano-blip/project-site-shorts/actions/runs/40815315804), push do SHA a6b8d3f4fb695455d1b963bb6f0bcbbc5b55a4f3, concluída com sucesso em1m39s. Consulta somente de leitura, sem rerun ou mudança de configurações. Esse resultado vale para o SHA observado, não para alterações posteriores deste plano. Não há motivo para repetir testes da aplicação por editar somente documentação; as bibliotecas de captura/verificação já possuem evidências anteriores e nenhuma delas foi alterada nesta preparação.

## Estado atual

- Google Authenticator/recuperação: relatados como disponíveis pelo proprietário.
- Frequência/destino físico: definidos; pasta/proteção do HD ainda pendentes.
- Backup atual efetivamente verificado: permanece a captura de26/10, sem os cadastros posteriores.
- Nova autorização de captura/cópia: ainda não solicitada, pois falta fechar o destino.
- Site/planos/contas/dados: preservados; sem deploy ou acesso remoto de conteúdo nesta rodada.

## Atualização: captura e custódia concluídas em29/10/2026

O plano histórico acima foi executado após o proprietário definir o HD e autorizar a subpasta privada usuário/SYSTEM. Primeira tentativa250chamadas não concluiu; nova preparação/autorização750 resultou em371documentos/412chamadas, arquivo204.841bytes e duas cópias privadas verificadas com recibos e releitura independente. Instante do banco02h56min09s de Brasília. Captura26/10 preservada, zero writes/deletes remotos. Relatório atual: [backup verificado](etapa-9-b-backup-verificado-2026-10-29.md). Destino e segunda cópia deixam de estar pendentes; nenhuma autorização de captura é reutilizável. Próxima revisão13/11 se esta captura for referência; horário/canal de lembrete e autorização de lançamento continuam separados.

# Etapa 8-F — recuperação compatível com Firebase Spark

26/10/2026. **Procedimento proposto e limites registrados; não é backup do banco remoto nem restauração de produção executada.** Nenhum dado privado foi copiado nesta rodada. Não ativar billing, Cloud Storage, PITR, backup gerenciado, agendamento ou serviço adicional por inferência.

## O que já está provado

A evidência local anterior em `evidencias/etapa-8-pacote-local.json` registra restauração de 157 documentos de fixture no alvo isolado `demo-clipzone-tests`, porta 8081, checksum e writes create-only. O banco 8080 e o remoto não foram alvos desse ensaio. Os 16 casos integrados de finalização foram executados novamente durante a revisão TikTok, sem alterar a implementação de restauração.

Isso comprova propriedades de fixtures/contratos, não posse de uma cópia atual de produção, completude de todas as coleções, recuperação de Firebase Auth/TOTP ou tempo de recuperação em desastre.

## Separar três tipos de proteção

| Objeto | Proteção necessária | Estado |
| --- | --- | --- |
| Código/configurações versionáveis | Commit identificado, bundle/checkpoint local e pacote de deploy verificável | Checkpoints existentes; não tornam o GitHub público |
| Dados Firestore definitivos | Cópia privada consistente, esquema/IDs/tipos e integridade conferidos | Backup remoto completo ainda não realizado |
| Auth, TOTP, IAM, regras/índices e segredos | Custódia e procedimento de recuperação separados; segredos fora do Git | Não estão incluídos em um dump de documentos |

Voltar uma versão do Worker não restaura documentos removidos. Restaurar documentos não recupera credenciais, contas Google ou fatores TOTP. `.emulator-data` não é cópia do banco remoto.

## Caminho sem upgrade — proposta para aprovação posterior

A exportação/importação **gerenciada** do Firestore exige billing/Blaze e bucket Cloud Storage; está excluída da premissa atual. Não usar o botão Exportar ou comandos de exportação gerenciada como se fossem backup gratuito do Spark. Fonte: [documentação oficial](https://firebase.google.com/docs/firestore/manage-data/export-import).

Proposta: ferramenta local explícita de leitura por REST, usando somente permissões já existentes, gravando fora do repositório em pasta privada do proprietário. Essa ferramenta ainda precisa ser implementada e revisada; não apresentar simples paginação como snapshot atômico. Antes de uma execução real:

1. Confirmar exatamente `clipzone-db02a/(default)`, conta/identidade, Spark e margem de quota; não mudar projeto ativo nem ampliar IAM.
2. Delimitar coleções e subcoleções, incluir metadados de integridade junto dos dados de negócio e verificar como manter uma visão consistente durante a leitura. Abortos e inconsistências não produzem backup marcado como completo.
3. Estimar leituras/tamanho antes de copiar e fixar um teto de execução. Cada documento lido consome franquia; não confundir REST calls com leituras faturáveis. Não oferecer backup ilimitado ou monitoramento contínuo.
4. Separar dados privados: proprietários, limites, hashes de rede, moderação e identificadores administrativos não entram em docs, logs públicos ou evidências Git. Preservar jogos, shorts, identidades, comentários e integridade entre eles; uma lista de links públicos não é backup completo.
5. Confirmar destino privado fora do Git, ACL do usuário/SYSTEM, espaço disponível, manifesto com schema/project/database, contagem, escopo, intervalo e checksum. Não usar a pasta de credenciais como nome de arquivo de backup nem misturar chave privada no arquivo exportado.
6. Verificar o conteúdo salvo e a completude do manifesto sem imprimir registros. Não contar um arquivo parcial como proteção pronta.

## Restauração: primeiro isolada, remoto só por decisão específica

- Teste automático continua usando somente fixtures em `demo-clipzone-tests:8081`. Não copiar dados reais para testes nem escrever no remoto por padrão.
- Validar checksum, schema, nomes de caminhos, referências e tipos; rejeitar alvo errado e arquivo incompleto antes de qualquer gravação.
- Destino vazio e create-only; se existir documento, interromper em vez de sobrescrever silenciosamente. Não apagar o banco para “preparar” uma restauração.
- Conferir contagens/referências após a restauração. Ranking e métricas podem exigir reconstrução controlada; não apontar para uma geração incompleta. Retomar publicação só após validação.
- Um incidente remoto exige aprovação específica de origem, alvo, conteúdo e modo de restauração. A autorização genérica de continuar a homologação não autoriza exclusões, reset, importação ou troca de credenciais.

## Retomada e suspensão

Para problema apenas de código, preferir retorno a versão compatível conhecida, preservando banco e segredos. O ajuste TikTok desta rodada não migrou schema persistido; rollback não deve apagar os registros cadastrados pelo proprietário. Conferir primeiro se a falha é da aplicação ou de um provedor: retornar código não remove HTTP 429 externo.

Manter a estratégia já registrada para erro de CPU/1102, falha de proteção ou recorrência: suspensão controlada do ingresso de homologação, preservação das evidências e diagnóstico. Jobs seguem desligados. Não executar retenção manual, reset de marcadores ou geração de ranking para contornar uma falha.

## Pendências para 9-B e decisão do proprietário

- [ ] Aprovar escopo/destino privado de backup real e teto de leitura.
- [ ] Implementar/revisar ferramenta de leitura consistente e demonstração em fixtures antes de usar dados reais.
- [ ] Produzir backup privado verificado e definir frequência operacional compatível com quota/uso.
- [ ] Revisar recuperação de Auth/TOTP/credenciais separadamente com o proprietário, sem enviar segredos pelo chat.
- [ ] Executar ensaio de recuperação autorizado e registrar tempo/perdas toleráveis reais, sem inventar RPO/RTO.

Não foram criados recursos, cópias remotas, arquivos com dados de produção ou tarefas recorrentes. A decisão de ranking/agendamento continua separada: testes locais mostram limites, mas a CPU real e a aprovação da operação remota ainda são necessárias.

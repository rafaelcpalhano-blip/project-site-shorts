# Etapa 8-F — escritor local de snapshot

26/10/2026. Preparação local concluída para gravação e verificação de arquivo. **Não é backup remoto executado nem ferramenta operacional pronta para dados privados.**

## Implementação

`scripts/recovery/private-snapshot-writer.ts` é uma biblioteca sem CLI, rede, captura, fonte de token ou import pela aplicação. Recebe snapshot e alvo explícitos, verifica o formato/checksum existente e separa o conteúdo de alterações do chamador antes de aguardar operações assíncronas.

O destino precisa existir, ser absoluto e ficar fora da raiz canônica do repositório informada pelo chamador. Componentes simbólicos/junctions são recusados. Nome base restrito, inclusive nomes de dispositivos Windows; teto explícito até 32 MiB. Não cria pasta, altera ACL ou descobre credenciais.

Exige um verificador de diretório privado injetado e o consulta antes da gravação e nas etapas seguintes. **Esse callback ainda não tem adaptador Windows real revisado.** Nos testes ele simula permissão aprovada, negada, revogada ou erro; não comprova ACL real. O modo 0600 solicitado ao abrir arquivo não substitui ACL Windows. A raiz de repositório informada também é um contrato do integrador, não descoberta independente.

O arquivo temporário usa nome aleatório `.partial`, criação exclusiva, escrita completa, sync e releitura limitada. O conteúdo relido precisa ser idêntico e passar novamente pela verificação de snapshot. O nome final `.snapshot.json` é criado por hard link exclusivo, sem rename com sobrescrita; outra criação concorrente é recusada. Sistema de arquivos sem esse suporte recusa a operação. Após nova verificação do nome final, remove somente o nome temporário criado pela própria execução; se essa remoção falhar, o recibo informa partialRetained.

Qualquer falha produz erro genérico sem conteúdo, caminhos internos ou detalhes privados. Não há retry, rollback ou exclusão automática de arquivos em falha. Pode restar arquivo parcial ou até nome final se a falha ocorrer depois do hard link: **o nome final sozinho não prova sucesso; exige recibo verificado ou inspeção independente.** Não há garantia de durabilidade contra queda de energia, lock de diretório ou defesa contra processo malicioso com acesso de escrita ao diretório. A futura política ACL e custódia são indispensáveis.

## Verificações executadas

39 testes Node relacionados passaram: 30 anteriores de captura/transporte/ensaio e nove novos de arquivo. Os novos casos exercitam sucesso e preservação exata de quatro documentos fictícios, destino ocupado, alvo/hash/teto/nome inválidos, contrato ACL ausente/negado/com erro, junction, corrupção de parcial, revogação simulada, concorrência do nome final, falha na verificação final e mutação do objeto de entrada.

Primeira execução: seis casos novos falharam porque a configuração da fixture não fornecia projectId/databaseId explicitamente. A biblioteca recusou o alvo ausente antes de escrever. Corrigida a fixture, sem relaxar a validação; execução final 39/0. TypeScript estrito da biblioteca e lint dos dois arquivos passaram.

Arquivos de teste foram criados somente em diretórios temporários exclusivos com conteúdo fictício e removidos pelo teardown. Nenhum emulador precisou ser iniciado, nenhum servidor existente foi reiniciado. Não houve acesso ao Firebase remoto, leitura de credenciais, consulta TikTok, deploy, dependência nova ou serviço pago. A suíte completa anterior permanece 704/0, não repetida nesta rodada; não somar nove a esse resultado como se fosse nova execução completa. Runtime/frontend não foram alterados.

## Próxima entrega delimitada

Preparar e testar, em pasta sintética, o verificador Windows de ACL, sem alterar permissões existentes. Depois preparar o contrato de autenticação usando a identidade existente, sem ampliar IAM ou carregar credenciais reais nesta fase. Antes da primeira cópia real, apresentar projeto/banco, identidade, escopo, destino e tetos de leitura/bytes/requisições para autorização específica. Nenhum valor operacional de orçamento ou caminho de dados reais foi aprovado por esta implementação.

Backup Firestore continua separado da recuperação de Auth/TOTP/IAM/segredos. A pendência TikTok continua aberta e a Etapa 8-F não está encerrada.

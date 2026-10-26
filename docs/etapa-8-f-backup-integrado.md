# Etapa 8-F — fluxo local integrado de backup

26/10/2026. Biblioteca integrada e testada com respostas fictícias. Nenhum dado remoto ou chave privada lido. **Ainda não existe backup real concluído ou comando operacional de captura.**

## Entrega

`scripts/recovery/capture-private-backup.ts` conecta preflight de destino, provedor de token existente, transporte de leitura limitado, captura consistente e escritor verificado. Projeto/banco fixados em clipzone-db02a/(default); identidade e escopo vêm da composição já revisada do token. Não há CLI, fetch padrão, descoberta de credenciais, gravação remota ou import pela aplicação publicada. Construir/injetar um assinador e transportes reais exigirá uma composição explícita e autorização da operação.

O preflight foi extraído do escritor para `checkPrivateSnapshotDestination`: recusa caminho inseguro, pasta dentro do repositório informado, política privada negada, nome inválido/ausente e arquivo final ocupado **antes de OAuth ou leitura da fonte**. O escritor repete a conferência antes de gravar, preservando hard link exclusivo, verificação e recusa de sobrescrita. Não há lock contra processo com acesso ao diretório.

Configuração e limites são copiados antes do primeiro await. A biblioteca recusa projeto/banco diferente ou limites acima do máximo. Usa readTime explícito único; o núcleo continua aplicando a janela de consistência já validada. O transporte recebe sinal combinado por requisição; o mesmo sinal da operação alcança OAuth. O finally aborta o controlador próprio em sucesso ou falha. A captura só informa sucesso depois da releitura/verificação do arquivo. Erros são genéricos, sem conteúdo privado, retry ou exclusão automática.

O cancelamento é cooperativo: não mata operações arbitrárias do sistema de arquivos, subprocessos ACL já iniciados ou assinadores que ignorem cancelamento. Os limites de processo ACL existentes permanecem. Uma falha tardia pode deixar parcial ou nome final; não inferir integridade apenas pelo nome. Captura não é restauração, criptografia, recuperação de Auth/TOTP/IAM nem garantia de completude independente do protocolo/fonte.

## Validação

57 testes relacionados aprovados: 50 anteriores e sete novos. Os sete cobrem fluxo completo com campos tipados e referência; preflight/identidade/limites inválidos antes de OAuth; HTTP429 sem repetição ou arquivo; orçamento de documentos/arquivo e permissão revogada antes de gravar; cancelamento da troca OAuth por timeout; mutação de configuração durante await; e fluxo completo usando pasta privada real do Windows, com OAuth/Firestore fictícios.

O fixture de fluxo completo usa nomes de recursos do projeto fixado, mas os dois documentos são gerados no teste e as respostas HTTP são injetadas. Não lê o projeto real. Rede global bloqueada. O cenário Windows cria/altera ACL somente em pasta temporária nova, exclusiva e descartável.

Tipos estritos e lint aprovados. Após acrescentar recusa explícita de basename ausente no preflight, os 16 testes diretamente afetados (sete da composição e nove do escritor) foram repetidos: 16/0. A suíte global histórica permanece 704/0, não repetida nesta rodada; não apresentar a soma como nova execução completa. Sem mudança no runtime/frontend, deploy, CPU, Lighthouse, serviço pago ou dependência nova.

## Proposta para a primeira captura real — não executada nem autorizada por este documento

| Item | Proposta |
| --- | --- |
| Banco | clipzone-db02a/(default), conferido novamente antes da execução |
| Identidade | clipzone-runtime existente, sem criar chave ou ampliar IAM |
| Escopo | Todas as coleções/subcoleções descobertas no instante fixo, incluindo documentos operacionais privados; não inclui Firebase Auth ou segredos |
| Destino sugerido | Pasta nova C:/Users/rafae/AppData/Local/Clipzone/backups, separada das credenciais e fora do Git; verificar caminho e aprovar criação/ACL antes de usar |
| Documentos enumerados | Até 500, incluindo caminhos de pais ausentes contabilizados pelo núcleo |
| Requisições Firestore | Até 250, sem retry; OAuth não é contado como requisição Firestore |
| Respostas | Até 5 MiB de JSON contabilizado pelo núcleo; transporte limita a 1 MiB por resposta antes do parse |
| Arquivo | Até 8 MiB, criação exclusiva, releitura e checksum |
| Cancelamento | Sinal global até 120 segundos; não é garantia de término forçado de I/O local |
| Repetições/restauração | Nenhuma automática; restauração remota não faz parte da captura |

Esses valores são **tetos técnicos propostos**, não inventário real, estimativa exata de consumo nem confirmação da margem da quota. Requisições HTTP não equivalem a leituras contabilizadas; enumeração vazia, páginas e subcoleções também precisam ser consideradas. Antes da cópia, conferir Spark, margem de uso e a política vigente sem ativar serviços, faturamento ou APIs. Se não for possível confirmar a margem, parar essa parte e solicitar a conferência pelo Console. Se um teto for atingido, não produzir recibo de backup completo nem aumentá-lo automaticamente.

## Próximo passo delimitado

Preparar a entrada operacional que recebe explicitamente o caminho privado da credencial existente e valida projeto/tipo/e-mail/tamanho sem registrar valores. Testar com chave gerada exclusivamente para fixture. O carregamento real da credencial, criação da pasta privada real e primeira captura continuam dependendo de aprovação específica do pacote e dos parâmetros acima. Não pedir autorização de execução como se essa entrada já estivesse pronta.

A Etapa 8-F e a pendência TikTok continuam abertas. Esta entrega não autoriza publicação pública, jobs, cron, upgrade, migração ou gravação no Firebase.

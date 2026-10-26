# Etapa 8-F — ACL Windows e composição de autenticação do backup

26/10/2026. Preparação local com dados sintéticos. Não houve leitura de credenciais, troca OAuth real, consulta ao banco remoto ou deploy. Não é backup remoto realizado.

## Permissões privadas

`scripts/recovery/windows-snapshot-directory.ts` fornece o callback para o escritor de snapshot. Inspeciona caminho absoluto local, recusa UNC, componentes simbólicos/junctions, alvo ausente e divergência do caminho canônico. Executa o PowerShell do Windows com caminho explícito, sem shell, janela visível ou perfil, com tempo e saída limitados. Não altera permissões.

`scripts/recovery/verify-private-snapshot-directory.ps1` usa APIs .NET locais para consultar o descritor de segurança. A política é conservadora: proprietário igual ao usuário do processo, DACL protegida, exatamente duas entradas explícitas de Allow/FullControl, uma para esse usuário e outra para SYSTEM, com herança para arquivos e subdiretórios, sem flags de propagação adicionais. Qualquer desvio recusa. A saída contém apenas schema e booleano, sem SID, nome de conta ou caminho. Uma ACL diferente pode ser segura por outra política, mas não é aceita por esta ferramenta.

Referências: [segurança e direitos de arquivos Windows](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights), [FileSystemRights](https://learn.microsoft.com/en-us/dotnet/api/system.security.accesscontrol.filesystemrights?view=netframework-4.8.1). Não equivale a criptografia, proteção contra administradores/SYSTEM, processos executando como o mesmo usuário, comprometimento do sistema ou garantia contra alteração concorrente do caminho. A custódia e o ambiente confiável continuam necessários.

Seis testes Windows reais passaram: aceitar pasta privada, recusar herança de permissões, leitor Everyone adicional, ausência de herança para arquivos, junction/alvos inválidos, e compor a gravação do snapshot fictício com esse verificador. A integração também consultou a ACL do arquivo efetivamente criado e confirmou as duas entradas restritas herdadas. Os testes criaram e configuraram somente diretórios temporários novos, exclusivos e descartáveis; não alteraram permissões de repositório, credenciais, pasta de backup real ou pais existentes.

A primeira execução passou um teste e falhou cinco na montagem das fixtures por erro de carregamento do módulo Microsoft.PowerShell.Security no PowerShell filho. O inspetor recusou a condição indisponível. A implementação final usa as APIs .NET já presentes, sem Get-Acl/Set-Acl, sem instalação, mudança de política de execução ou enfraquecimento da política ACL. Um alerta de lint sobre regex com caracteres de controle foi corrigido usando comparação de códigos de caracteres.

## Autenticação preparada sem chave carregada

`scripts/recovery/snapshot-token-provider.ts` reutiliza `server/auth/service-token.ts`, sem modificar esse módulo ou o runtime. Fixa projeto clipzone-db02a e identidade clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com. O provedor existente fixa OAuth oficial, assinatura RS256 e escopo Datastore. Assinador, transporte e relógio precisam ser injetados; não há descoberta de chave, token de CLI, variáveis de credencial, fetch padrão ou inicialização remota na construção.

Exige sinal de vida da operação. Cancelamento global alcança a troca HTTP e impede retornar token de cache após cancelamento. Cancelamento de uma espera individual encerra aquela espera, mas não cancela a troca compartilhada que outro consumidor poderia utilizar: o integrador deve abortar o sinal da operação inteira quando a captura falhar ou terminar. O assinador injetado pode continuar trabalho já iniciado; não há promessa de interromper arbitrariamente código que ignore cancelamento. Cache de token existe apenas em memória, sem persistência em disco. O sinal global e os limites existentes do provedor/transporte não substituem o orçamento total da futura execução.

Cinco testes com assinatura fictícia de 256 bytes e respostas OAuth injetadas: identidade/escopo e cache; cancelamento antes de assinar e após cache; cancelamento da troca em curso sem retry; recusa de OAuth antes de qualquer chamada Firestore; composição com transporte limitado e recusa de rota estrangeira antes de OAuth. Rede global real bloqueada nesses testes. Não houve assinatura com chave real nem validação remota de permissões.

## Resultado e limites

Rodada relacionada: 50 testes Node aprovados, incluindo os 39 anteriores e 11 novos. A integração ACL foi repetida com a verificação adicional da ACL do arquivo: seis aprovados, sem falhas ou skips no Windows. TypeScript estrito dos três módulos de ferramenta e lint dos arquivos novos passaram. Suíte global anterior 704/0 não foi repetida; não anunciar 715 como execução completa. A aplicação publicada não importa estes módulos; sem build, CPU, Lighthouse ou deploy nesta rodada.

Ainda falta a composição operacional completa: carregar explicitamente a credencial existente de um caminho privado aprovado, conferir sua identidade sem imprimir conteúdo, conectar captura/transporte/escritor/verificador, garantir encerramento do sinal global e produzir recibo privado. Nenhuma permissão IAM nova é necessária por inferência; uma recusa real deve ser reportada, sem ampliar acesso automaticamente.

Antes de qualquer captura real, apresentar para autorização: banco clipzone-db02a/(default), escopo das coleções/subcoleções, identidade, destino privado e tetos de documentos/requisições/bytes. Não confundir número de requisições com leituras contabilizadas pelo Firestore. Confirmar quota/plano sem ativar serviços ou faturamento. Restauração remota, cron, armazenamento adicional e lançamento continuam decisões separadas. A pendência TikTok e a revisão 8-F permanecem abertas.

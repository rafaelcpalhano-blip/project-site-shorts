# Etapa 8-F — recuperação compatível com Firebase Spark

26/10/2026. **Procedimento proposto e núcleo local de captura/integridade preparado; não é backup do banco remoto nem restauração de produção executada.** Nenhum dado privado foi copiado nesta rodada. Não ativar billing, Cloud Storage, PITR, backup gerenciado, agendamento ou serviço adicional por inferência.

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

Proposta: ferramenta local explícita de leitura por REST, usando somente permissões já existentes, gravando fora do repositório em pasta privada do proprietário. O núcleo local de enumeração e integridade foi preparado e testado em fixtures, conforme seção posterior; ainda faltam adaptador HTTP autenticado com resposta limitada, gravação privada segura e validação real autorizada. Não apresentar simples paginação como snapshot atômico. Antes de uma execução real:

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


## Preparação local concluída nesta rodada — sem operação remota

Implementados `server/recovery/read-only-snapshot.ts` e nove casos em `tests/read-only-snapshot.test.mjs`. Não há transporte de rede padrão, acesso a credenciais, escritor de arquivos, comando remoto, endpoint, agendamento ou implementação de restauração. O módulo não foi importado pela aplicação publicada e não houve deploy.

- Exige alvo explícito permitido e banco(default), um `readTime` fixo e tetos de requisições, documentos e bytes de respostas. Sem PITR: restringe-se à janela documentada de uma hora e aborta se ela vencer durante a leitura.
- Enumera coleções e documentos de forma paginada com o mesmo instante em todas as chamadas. Descobre subcoleções sob pais ausentes com `showMissing`; preserva esses caminhos como estrutura, sem inventar documentos para restaurar. Documentos realmente vazios são distinguidos pela metadata.
- Conserva os campos no formato JSON tipado do Firestore, incluindo inteiros64 como texto e timestamps com nanossegundos; não arredonda para Number ou Date do JavaScript. Não é um decodificador nem validador completo dos tipos wire para restauração.
- Recusa alvo/caminho divergente, páginas/tokens repetidos, metadata contraditória, envelopes de erro e ultrapassagem dos tetos. Falha de transporte não devolve resultado parcial como captura concluída. O adaptador futuro deve rejeitar HTTP não2xx/redirecionamentos, impor limite de bytes antes do parse e respeitar o AbortSignal; o núcleo só contabiliza JSON já recebido.
- Manifesto inclui escopo descoberto, instante, documentos e SHA256 sobre conteúdo canônico. A verificação offline detecta alteração de conteúdo, duplicidade, alvo e topologia incompatíveis. **Checksum não comprova autoria, autenticidade nem completude independente de uma fonte defeituosa**; não tratar arquivo arbitrário como backup confiável por ter hash correto.

Nove provas locais aprovadas e suíte completa de677 testes Node sem falhas; tipos servidor e lint aprovados. Não houve nova execução workerd porque a aplicação/runtime não foi alterada; os32 casos anteriores têm escopo histórico próprio. Evidência sanitizada em [etapa-8-f-recuperacao-local.json](evidencias/etapa-8-f-recuperacao-local.json).

Protocolo fundamentado em [listCollectionIds/readTime](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/listCollectionIds) e [listDocuments/readTime/showMissing](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/listDocuments). O uso efetivo, permissões e cotas no Spark ainda não foram comprovados contra o projeto real nesta rodada. Request count não equivale a leituras faturáveis; orçamento de quota e destino privado exigem revisão antes da primeira cópia real.

Continuam pendentes: transporte autenticado revisado, arquivo privado com ACL/destino/teto aprovados, inventário real consistente autorizado, verificação dos registros salvos e ensaio de restauração isolado com esse novo formato. Auth/TOTP/IAM/segredos permanecem fora da cópia de documentos. Nenhum dado de produção foi lido, copiado ou escrito; nenhum serviço pago, dependência, recurso ou cron foi criado.

## Transporte limitado preparado localmente

Adicionado `server/recovery/bounded-snapshot-transport.ts`, com oito testes em `tests/bounded-snapshot-transport.test.mjs`. Exige implementação de fetch e provedor de token explicitamente injetados: não descobre credenciais nem usa rede por padrão. O provedor injetado recebe sinal de cancelamento e deverá respeitá-lo; a espera local também é limitada, mas a ferramenta não consegue interromper efeitos externos de um provedor que ignore esse contrato.

Antes de obter token, recusa destinos fora de firestore.googleapis.com, projeto divergente, métodos de alteração, rotas incompatíveis e parâmetros inesperados. Aceita somente GET de documentos e POST de listCollectionIds; exige banco(default), paginação de100, readTime e showMissing nas leituras de documentos. Não segue redirects, não repete falhas, exige HTTP2xx/JSON e limita o corpo transmitido antes de converter texto/JSON, inclusive sem Content-Length. Timeout/abort interrompem a espera e cancelam o leitor; erros devolvidos não incluem respostas privadas ou tokens. O teto total permanece no núcleo de captura; o transporte acrescenta teto por resposta.

Validação:17 testes específicos (nove do núcleo e oito do transporte), suíte completa de685 testes Node sem falhas, tipos servidor e lint dos arquivos novos aprovados. A primeira execução completa em sandbox falhou por EPERM nos temporários do Vite; a repetição com permissão de escrita no repositório passou. Não houve alteração do runtime, deploy, leitura de dados reais ou acesso a credenciais.

Não há comando executável de backup, fonte real de token, escritor privado ou restauração desse novo formato. Ainda faltam a revisão do destino/ACL e orçamento, integração de autenticação autorizada, captura real aprovada e ensaio de recuperação isolado. Não apresentar esta preparação como backup de produção concluído.

## Integração local do núcleo com o transporte

Três provas em `tests/snapshot-transport-integration.test.mjs` exercitam a composição real dos dois módulos com HTTP/token fictícios: preservação de fields wire/inteiros64/timestamps e checksum; HTTP429 interrompe a travessia sem retry ou resultado parcial; resposta maior que o teto é recusada antes do parse. A rede global real fica bloqueada nesses testes.

Os20 testes de recuperação passaram e o lint do arquivo novo passou. Nenhuma implementação da aplicação mudou nesta rodada: não foi repetida a suíte geral, cujo último resultado continua685/0 e não deve ser apresentado como uma execução de688 casos. Esses testes não comprovam backup remoto, restauração, validade de credenciais ou cotas reais.

## Ensaio do novo formato concluído somente com fixtures

26/10/2026: [relatório do ensaio isolado](etapa-8-f-recuperacao-ensaio.md). Foram aprovados30testes Node relacionados e5integrações em demo-clipzone-tests:8081, com destino vazio, creates atômicos, campos brutos verificados, conflito sem lote parcial e confirmação perdida sem retry/exclusão. O novo harness vive somente em tests/helpers; não é ferramenta de produção e não foi importado pelo runtime. Snapshot sintético foi construído com transporte injetado; nenhuma captura remota foi realizada.

O primeiro ensaio recusou2casos de verificação. A revisão confirmou a precisão de microssegundos dos campos timestampValue; o ensaio passou a recusar precisão submicrossegundo antes de I/O, sem arredondar. O núcleo de captura continua preservando o JSON recebido e metadados com nanossegundos; metadados de saída não são restaurados como tais. Estado final:30/0 testes relacionados,5/0 integrações, tipos/lint aprovados. Suíte completa anterior704/0 não foi repetida por mudança exclusiva de testes. Fontes/limites e evidência em etapa-8-f-recuperacao-ensaio.md/json.

Continua pendente ferramenta autenticada de captura real, escritor privado/ACL/destino e orçamento aprovados, cópia real verificada e plano operacional de recuperação com aprovação específica. Não considerar fixtures ou essa nova prova como backup remoto pronto.

## Escritor de arquivo preparado localmente

26/10/2026: biblioteca scripts/recovery/private-snapshot-writer.ts e nove casos de arquivo preparados. Resultado final: 39/0 testes relacionados, tipos/lint aprovados. Recusa sobrescrita, verifica bytes/checksum, exige callback de diretório privado e mantém falhas sem retry ou exclusão automática. Detalhes e limites em [etapa-8-f-escritor-snapshot.md](etapa-8-f-escritor-snapshot.md). Ainda faltam adaptador Windows real de ACL, autenticação integrada e aprovação específica de escopo/destino/orçamento antes de qualquer captura real. Nenhuma credencial ou dado remoto foi lido; nenhum deploy foi realizado. Não considerar este escritor isolado como backup operacional pronto.

## Verificador Windows e autenticacao local preparados

26/10/2026: verificador ACL somente de leitura e composicao do provedor OAuth existente preparados; 50 testes relacionados aprovados e seis integracoes ACL repetidas com a verificacao do arquivo criado. Sem leitura de chave privada, OAuth real, consulta remota ou deploy. Detalhes e limites em [etapa-8-f-backup-acl-autenticacao.md](etapa-8-f-backup-acl-autenticacao.md). Ainda falta composicao operacional, carga explicita de credencial e aprovacao especifica de escopo/destino/orcamento antes da copia real. Nao considerar esta etapa como backup remoto concluido.

## Composicao local integrada

26/10/2026: captura, transporte, token e escritor conectados em biblioteca opt-in, sem CLI ou carga de chave real. 57 testes relacionados aprovados; apos ajuste final do preflight, 16 diretamente afetados repetidos sem falhas. Tipos/lint aprovados. Proposta de escopo/destino/tetos e limites em [etapa-8-f-backup-integrado.md](etapa-8-f-backup-integrado.md). Ainda falta entrada operacional com credencial explicita, prova com chave sintetica e autorizacao especifica antes da primeira copia real. Nenhuma operacao remota ou deploy.

## Entrada explicita de credencial validada com chave sintetica

26/10/2026: carregador limitado e entrada operacional em biblioteca preparados; 64 testes relacionados aprovados, tipos/lint sem falhas. A chave usada foi RSA gerada apenas para fixture, com assinatura verificada e ACL real Windows; nenhuma credencial existente ou fonte remota acessada. Proposta concreta da primeira captura e limites em [etapa-8-f-backup-credencial.md](etapa-8-f-backup-credencial.md). Biblioteca nao tem CLI, transporte HTTP padrao ou execucao automatica. Copia real continua exigindo aprovacao especifica de leitura da credencial, destino/pasta nova, escopo e orcamento. Nao e backup real concluido; TikTok permanece pendente.

## Primeira copia privada real concluida com autorizacao especifica

26/10/2026: plano Spark, banco e margem exibida no Console conferidos; primeira captura real verificada com 148 documentos, 178 requisicoes Firestore, uma troca OAuth e arquivo de 71.607 bytes. ACL configurada somente na pasta nova de backups; credencial existente e ACLs anteriores preservadas. Releitura e verificacao independente offline de integridade/recibo/ACL aprovadas, sem arquivos parciais. Dados e recibo privados fora do Git. Relatorio atual: [etapa-8-f-primeiro-backup.md](etapa-8-f-primeiro-backup.md). Nao houve escrita no banco, restauracao, agendamento, billing ou deploy. Frequencia/custodia adicional e recuperacao Auth/TOTP continuam separadas; 8-F e TikTok permanecem abertos. As secoes anteriores documentam a preparacao historica, nao ausencia atual desta primeira copia.

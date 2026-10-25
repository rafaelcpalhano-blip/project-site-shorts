# Etapa 8-C — conferência de configurações, somente leitura

25/10/2026, America/Sao_Paulo. Autorização recebida após a preparação local: conferir exclusivamente configurações, sem documentos de produção, listas de usuários, criação de recursos, credenciais, planos, billing ou deploy. Sessões já conectadas no navegador foram suficientes; não foi necessário login ou código do proprietário. Nenhuma mutação remota foi feita.

## Resultado confirmado nos consoles

| Item | Resultado observado | Conclusão |
| --- | --- | --- |
| Projeto Firebase | Clipzone, `clipzone-db02a` | Projeto existente identificado; nenhum projeto novo escolhido/criado |
| Plano Firebase | Spark, sem custos US$0/mês | Plano gratuito confirmado nesta data |
| Cloud Billing do projeto | “Este projeto não está vinculado a uma conta de faturamento.” | Ausência de vínculo confirmada; não clicado vincular/trial/upgrade |
| Identity Platform | Cabeçalho Authentication with Identity Platform | Serviço presente; não ativado nesta conferência |
| Google | Provedor com status ativado | Login Google configurado |
| TOTP específico | Não apresentado nas telas inspecionadas | Não confirmado; não concluir que está desativado |
| MFA por SMS | Telas Firebase/GCP mostram ativada | Configuração preexistente, mantida; não substitui o TOTP exigido pelo backend |
| Workers | Free marcado como Current plan, $0 | Plano Workers gratuito confirmado |
| Aplicações Workers/Pages | No projects found, uso diário0/100000 | Nenhum Worker Clipzone publicado na conta inspecionada |
| workers.dev | Subdomínio de conta já configurado | Não é o endereço de um Worker Clipzone criado/reservado |

A validação foi visual por telas autenticadas. [Evidência sanitizada](evidencias/etapa-8-c-conferencia-configuracoes.json) contém os estados observados e links, sem chaves, tokens, emails pessoais ou ID da conta Cloudflare. Não é exportação assinada das configurações nem auditoria financeira de outros produtos Cloudflare.

## Banco existente: decisão necessária antes de inicializar

A lista de metadados do Firestore mostra um banco `(default)` **já existente**, status Pronto, edição Padrão, modo Nativa do Firestore, localização `southamerica-east1` (São Paulo), criado em19/10/2026 13:43:47 UTC-3. Backups programados estão desativados e criptografia gerenciada pelo Google.

Não cliquei no link que abre o painel de dados. Não foram abertas coleções/documentos, feitas consultas de conteúdo/contagem ou inspecionadas listas de usuários. Portanto **não sabemos se o banco está vazio, contém testes ou contém conteúdo real**. Também não foram lidas regras/índices remotos ou acessadas chaves. A lista de metadados não comprova que o banco corresponde ao estado dos arquivos locais.

A preparação anterior continua sendo apenas uma proposta: não aplicar gameNameState/v1 ou rankingState/metrics nesse banco presumindo que seja novo. Não criar um segundo banco no mesmo projeto por conveniência nem migrar/apagar o existente. É necessário o proprietário identificar a finalidade desse banco e escolher o alvo antes de qualquer inicialização.

## Autenticação e limites da conferência

Domínios atualmente autorizados: localhost,127.0.0.1,clipzone-db02a.firebaseapp.com e clipzone-db02a.web.app. Nenhum domínio de Worker Clipzone foi adicionado. O endereço HTTPS final ainda depende de preparação/publicação autorizadas; não adicionamos wildcard ou domínio antecipado.

Google ativo e Identity Platform são confirmados, mas as telas de MFA mostraram apenas SMS. A página geral de configurações do Identity Platform apresentou aviso de Cloud Functions API desativada. A API não foi habilitada: trata-se de limitação daquela tela, não prova de dependência do Clipzone de Cloud Functions. A página direta de MFA abriu; o formulário de consulta foi visitado sem alterar campos e fechado com Cancelar, sem salvar. Não foram enviadas mensagens SMS nem gerados/copiados segredos TOTP.

O TOTP permanece obrigatório no backend conforme provas locais da8-B. Esta inspeção não acessou contas/fatores cadastrados e não repetiu login administrativo. A confirmação específica do TOTP deve ser feita em conferência de configuração autenticada que exponha esse fator ou em teste funcional dedicado autorizado, sem publicar segredo/código e sem remover Google/TOTP/UID. Não presumir indisponibilidade nem oferecer SMS como substituição.

## O que foi preservado

Nenhuma alteração de plano ou cobrança, clique em trial/upgrade, vínculo de cartão, nova conta, Worker, banco, índice, papel IAM, credencial, segredo, domínio, fator, regra ou deploy. Nenhuma chamada a endpoint de documentos/usuários realizada como ação desta conferência; foram usadas somente as páginas de configuração indicadas. Nenhum dado de teste importado. Servidores5174/5175/8080 e backups locais não tocados. A aba original de credenciais não teve chaves reveladas ou modificadas.

Não havia motivo para repetir build, Lighthouse ou testes de código: esta rodada é somente observação de configurações e documentação. Diff-check e checkpoint documental verificados na conclusão. As provas locais anteriores continuam válidas dentro dos limites registrados.

## Próxima decisão proposta, ainda não autorizada

1. **Definir o alvo do banco vazio.** Reutilizar `clipzone-db02a/(default)` somente se o proprietário confirmar que não é banco de produção a preservar e autorizar uma verificação restrita de existência de conteúdo. A verificação seria descrita previamente, retornaria apenas presença/contagens, sem exibir payloads, e não incluiria exclusão/reset. Se houver conteúdo ou dúvida, parar e apresentar alternativas. Não está autorizada por esta inspeção de configurações.
2. **Alternativa de isolamento:** projeto separado com seu banco default, sujeito à autorização de criação, plano Spark e configuração de Auth/IAM. Não é necessário assumir essa alternativa agora; o recurso não foi criado, nome/local não escolhidos e eventual fluxo que exigir billing deve parar.
3. Confirmar a configuração específica de TOTP sem alterar fatores e sem inspecionar usuários de produção; pode ser conferência acompanhada pelo proprietário. Não habilitar API Cloud Functions ou serviço pago para contornar a tela.
4. Só depois do alvo confirmado, apresentar pacote de ações remotas: permissões mínimas, custódia/rotação do assinador, regras/índices exatos e metadados create-only. Cada criação/gravação continua precisando de autorização explícita, independente da opção escolhida. Não usar a autorização de conferência como permissão de setup.

Recomendação: **primeiro esclarecer o banco existente**, evitando tanto descartar dados quanto criar recursos desnecessários. Não recomendar reutilizá-lo como vazio antes da confirmação. As limitações de CPU e a segmentação de jobs8-D permanecem; planos gratuitos confirmados não tornam a versão pronta para deploy.

## Páginas de origem

- [Plano Firebase](https://console.firebase.google.com/project/clipzone-db02a/overview).
- [Vínculo de faturamento](https://console.cloud.google.com/billing/linkedaccount?project=clipzone-db02a).
- [Provedores Google/Identity Platform](https://console.firebase.google.com/project/clipzone-db02a/authentication/providers).
- [Domínios autorizados](https://console.firebase.google.com/project/clipzone-db02a/authentication/settings).
- [Configuração MFA](https://console.cloud.google.com/customer-identity/mfa?project=clipzone-db02a).
- [Somente lista de metadados dos bancos](https://console.cloud.google.com/firestore/databases?project=clipzone-db02a).
- [Console Cloudflare](https://dash.cloudflare.com/) — plano Workers e lista de aplicações consultados na conta existente.

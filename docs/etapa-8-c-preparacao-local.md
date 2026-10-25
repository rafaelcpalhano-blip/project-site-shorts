# Etapa 8-C — preparação local de ambientes e banco vazio

25/10/2026. Base limpa `227e573`. Autorização limitada à preparação local; antes de qualquer ação remota, apresentar escopo e aguardar aprovação. Arquitetura Workers Free + Firebase Spark, sem upgrade, billing, Storage, função paga ou novo serviço. **Parte local concluída; execução remota não autorizada e não realizada.**

## Entregas concretas

| Arquivo | Finalidade | Limite |
| --- | --- | --- |
| `server/runtime/database-plan.ts` | Plano puro de ambientes: auditoria fixa8081/demo-clipzone-tests ou prévia remota com alvo explicitamente listado | Sem fetch, leitura de env, construção de store ou operação apply; `remoteAllowed=false` sempre |
| `server/auth/service-token.ts` | Contrato optativo de fornecedor OAuth para REST: JWT RS256, endpoint/escopo fixos, cache/renovação/erros privados | Assinador e transporte obrigatoriamente injetados; sem carregar chave, SDK global ou credencial real; não conectado à aplicação |
| `docs/etapa-8-c-iam-proposta.json` | Permissões candidatas do runtime para revisão | Documento inerte, não manifesto de deploy; papel não criado/concedido |
| Testes Node e `worker-database-preparation-probe.ts` | Assinaturas reais com chaves efêmeras e respostas OAuth/Firestore falsas | Nenhuma validação de conta, projeto, plano ou IAM real |

O código existente de5174/5175 não foi reconfigurado; os módulos novos não alteram seus padrões de conexão. O plano puro não é um bloqueio mágico sobre scripts antigos: a futura composição deverá usá-lo de forma explícita e manter os scripts locais fora do deploy.

## Isolamento de ambientes

Não existe projeto remoto padrão, nem leitura implícita de GOOGLE_APPLICATION_CREDENTIALS, ADC, .env, perfil gcloud ou conta do desenvolvedor. Nenhum arquivo privado foi aberto nesta preparação. A auditoria só descreve127.0.0.1:8081/demo-clipzone-tests;8080/demo-clipzone e seus backups continuam fora dos testes.

Prévia remota exige projectId do banco e authProjectId explícitos, com o banco numa lista de candidatos fornecida pela composição servidor. Campos de endpoint, porta, modo desconhecido ou aprovação enviada junto no objeto são recusados. A lista de candidatos **não é autorização humana**: mesmo alvo listado continua `remoteAllowed=false`; nenhum hostname customizado ou baseURL remoto é aceito. Não foi escolhido nem reservado projeto real; `clipzone-fictional` e `clipzone-fictional-auth` são apenas nomes de fixtures.

Auth e dados podem ter identificadores diferentes somente por decisão explícita e revisão IAM entre projetos; nunca herdar um do outro silenciosamente. Não apontar uma build de homologação ao emulador do computador nem ao banco de produção. Antes de conectar, conferir que frontend, emissor/audiência de Auth e banco/API correspondem ao ambiente aprovado. Sem migração de conteúdo local.

## Contrato de credencial

Fornecedor usa endpoint fixo `https://oauth2.googleapis.com/token`, grant jwt-bearer, escopo único `https://www.googleapis.com/auth/datastore`, algoritmo RS256 e validade da assertion de1h. Emissor é conta de serviço do projeto configurado; sem sub/delegação de usuário, scope/endpoint selecionáveis por HTTP ou uso de token Google do administrador para acessar dados de servidor.

O assinador recebe somente bytes da assertion e devolve assinatura. Custódia de chave real ainda não implementada: escolher explicitamente como injetar e rotacionar segredo servidor antes de ativar; nunca colocar PKCS8/token em VITE_*, repositório, relatório, chat, URL ou bundle. Nos ensaios, WebCrypto gera chave RSA2048 não exportável e verifica a assinatura com sua chave pública. Não é prova de credencial aceita pelo Google.

O transporte também é obrigatório e explícito, sem fetch global padrão. Na composição Workers futura, usar o fetch do orçamento da invocação, que já adapta redirect:error para manual+recusa. Assertion e bearer não são logs. Resposta é limitada a24KiB antes de parse; bearer até16KiB, tipo Bearer e expires_in inteiro maior que60 e até3600s. Conteúdo inválido, status de erro ou corpo excessivo produz erro genérico e não dispara Firestore.

Cache pertence à instância do fornecedor; renovação60s antes do vencimento, concorrência coalescida e relógio regressivo recusado. Falha de refresh não reaproveita token rejeitado ou quase vencido e não tem retry automático. Não armazenar fornecedor cujo exchange esteja ligado ao budget da primeira invocação em singleton global. Cache compartilhado entre invocações, se necessário depois para consumo/CPU, deve transportar apenas dados válidos e usar o transporte/budget atual; não foi implementado nesta fase. O callback de relógio e assinador é dependência confiável de servidor.

## Regras e IAM

Regras existentes preservadas: somente jogos ativos podem ser consultados diretamente pelo SDK, com limite de listagem; shorts/comentários e coleções privadas não são lidos diretamente; todas as escritas de cliente são negadas, inclusive com claim admin. A API mantém Google+TOTP+UID, conta atual, origem/cookie e limites persistidos. Nenhuma proteção foi removida.

Service-account OAuth usa IAM e pode ignorar as regras de cliente; portanto regras aprovadas não provam que a conta de servidor tenha privilégio mínimo. Proposta de runtime: operações de leitura/listagem/criação/atualização/exclusão de entidades e consulta de banco exigidas pelo REST, sem criar banco, administrar índices/IAM, billing, import/export/backup ou usuários Auth. O JSON traz candidatos a confirmar por método/escopo; não é papel pronto nem criado. `roles/datastore.user` é alternativa predefinida mais ampla para acesso a dados, não sinônimo de privilégio mínimo por coleção; não conceder por padrão. Nunca usar Owner/Editor/Firebase Admin para fazer um teste passar.

Operador de setup e runtime devem ser distintos. Permissões temporárias para criar banco, publicar regras/índices ou cadastrar segredo só serão discutidas após aprovação do alvo e plano. A allowlist de UID administrativa continua na aplicação e não é substituída por IAM de servidor. Nenhum papel novo foi criado/concedido.

## Índices revisados localmente

Arquivo ativo: `firestore/firestore.indexes.json`,37 índices compostos e15 configurações de campo; JSON válido e0 definições compostas duplicadas. Mantido sem alteração. São quantidades inferiores aos limites documentados de200 índices compostos e200 configurações de campo sem billing, mas a franquia é por projeto e o consumo real existente é desconhecido. Não inferir que ainda há espaço disponível no projeto remoto.

O emulador não certifica disponibilidade/estado READY dos índices compostos em produção nem custo de entradas de índice. A confirmação final requer comparar queries e definições com o alvo aprovado e aguardar criação terminar antes de liberar dependentes. Não publicar `docs/title-search.indexes.dormant.json` ou executar backfill de pesquisa por título: a função segue dormente. Nenhuma política TTL, backup gerenciado ou índice novo foi provisionado.

## Banco sem conteúdo: prévia de inicialização

`planEmptyMetadata` descreve apenas dois documentos internos, com precondição create-only (`exists=false`):

| Documento | Conteúdo mínimo |
| --- | --- |
| `gameNameState/v1` | `version:1, ready:true`, somente após confirmar ausência de jogos/índices de nomes |
| `rankingState/metrics` | `version:1, ready:true`, epoch novo e contadores iniciais zero, somente após confirmar banco de negócio vazio |

Nenhum jogo, short, comentário, curtida, denúncia ou registro do emulador é importado. Não criar geração fictícia em rankingState/current; ranking visível depende dos jobs da8-D. Contadores públicos e suas reservas são criados sob demanda pelas operações existentes, não preenchidos com os testes locais.

Essa função **somente descreve** documentos: não lê banco, não certifica vazio e não escreve. Datas/epoch dos testes são fictícios e não devem ser copiados para o alvo. Antes de uma aplicação futura: manter API/jobs/escritores desligados, verificar vazio nas coleções relevantes do alvo novo, rever metadados ausentes, gerar epoch/data novos e executar creates com precondição. Existência inesperada ou conteúdo não vazio interrompe o procedimento, sem sobrescrever, migrar ou apagar. Repetição não é reset; precisa reconhecer estado compatível ou parar.

## Validação executada

-19 testes Node relacionados aprovados (9 novos casos compartilhados + transporte/orçamento existente).
-9 mesmos casos no workerd aprovados: isolamento, prévia sem execução, metadados create-only, RSA/audience/scope, cache/concorrência/expiração, erros privados, limite de corpo e falha de credencial sem chamada Firestore.
-9 integrações de acesso público/regras no emulador8081 aprovadas. Uma primeira execução encontrou fixture antiga de comentário sem publicationNumber; corrigido somente o teste para incluir número1 e verificá-lo. Regras/leitura da aplicação não foram alteradas para contornar a falha. Mensagens PERMISSION_DENIED são esperadas nos testes negativos.
-TypeScript estrito, ESLint, build e diff-check aprovados na conclusão.

Evidência: [JSON sanitizado](evidencias/etapa-8-c-preparacao-local.json). Nenhuma chave/token real, chamada Google, ADC, conta/projeto remoto, implantação, biblioteca ou plano foi usado/modificado. Laboratório Workers reutilizado; instâncias8798 e8081 encerradas. Serviços5174/5175/8080 não reiniciados. Não foi necessária nova leitura Lighthouse ou repetição dos perfis CPU; o fornecedor novo ainda precisará medição na composição real, principalmente assinatura/renovação fria.

## Roteiro remoto para aprovação futura — não executar agora

1. **Primeira autorização sugerida: conferência somente de configurações**, sem ler conteúdo de produção. Identificar projeto(s) exatos, confirmar Spark/sem Cloud Billing e Workers Free, verificar Identity Platform/TOTP/Google e a existência/configuração do banco default, sem abrir documentos, criar recurso ou mudar plano. Se a conta/tela exigir upgrade, parar. Esta conferência ainda não foi autorizada.
2. Apresentar os resultados e decidir projeto existente versus projeto separado. Se já houver conteúdo/banco, não limpar nem assumir que é o alvo vazio. Projeto separado melhora isolamento, mas também seria recurso novo que exige aprovação; não foi criado ou escolhido automaticamente. Confirmar localização do banco antes da criação.
3. **Autorização separada de preparação remota:** listar exatamente banco/projeto, conta de serviço, papel/permissões, custódia/rotação de segredo, regras e37 índices a preparar; confirmar ausência de billing e estimar consumo. Nunca incluir serviços pagos ou migração por conveniência. Só então executar operações aprovadas.
4. Somente no banco novo/aprovado, executar verificação de vazio e inicialização dos2 metadados, sem jogos/shorts de testes. Não inspecionar um banco de produção sob essa autorização. Rever o resultado antes de liberar escritores.
5. Homologação HTTPS e deploy continuam outra autorização. Antes de publicar, jobs precisam segmentação8-D e CPU/ingresso precisam homologação no destino; módulos locais optativos não significam serviço pronto.

Não há comandos remotos executáveis anexados a esta entrega, nem CLI de apply/autoaprovação. Próxima decisão do proprietário pode limitar-se ao item1, sem consentir com os itens2–5. Enquanto isso, nenhuma ação manual no computador é necessária para manter esta preparação guardada.

## Fontes oficiais

- [OAuth de conta de serviço: assertion RS256, audience e grant](https://developers.google.com/identity/protocols/oauth2/service-account).
- [Firestore REST: escopo e diferença entre IAM/regras](https://firebase.google.com/docs/firestore/use-rest-api).
- [IAM do Firestore e papéis de dados/administração](https://docs.cloud.google.com/firestore/native/docs/security/iam).
- [Quotas e índices sem billing](https://firebase.google.com/docs/firestore/quotas).
- [Spark e vínculo de faturamento](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

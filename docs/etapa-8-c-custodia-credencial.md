# Etapa 8-C — custódia da credencial de runtime

Atualização: o handoff descrito abaixo foi concluído pelo proprietário; credencial validada para OAuth e leitura dos três marcadores. Consulte o resultado real ao final. A descrição da preparação é histórica.

26/10/2026. Preparação local e handoff, sem gerar chave. Alvo mantido: clipzone-db02a/(default), identidade clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com e papel mínimo já verificado. Base desta rodada:31ab0c1. Índices/IAM/metadados concluídos conforme etapa-8-c-preparacao-remota.md; não reinicializar o banco.

## Armazenamento privado

Preparada somente a pasta %LOCALAPPDATA%/Clipzone/credentials, fora do repositório, dist, diretórios de evidências e configuração pública. ACL protegida contra herança e conferida: Allow somente para o usuário Windows atual e SYSTEM. Não é criptografia do arquivo; é restrição local de acesso. Arquivo esperado: clipzone-runtime.json. Na preparação, ele ainda não existia. Nenhuma chave lida, criada ou copiada.

## Ação do proprietário

1. No Console Google Cloud, projeto Clipzone/clipzone-db02a, abrir a conta clipzone-runtime, aba Chaves.
2. Adicionar chave > Criar nova chave > JSON. A geração final e o download devem ser feitos pelo proprietário. Não usar a identidade Firebase Admin SDK nem selecionar P12.
3. Salvar o JSON na pasta privada com o nome clipzone-runtime.json. Não abrir seu conteúdo no chat/editor compartilhado, anexar arquivo ou enviar screenshot do segredo. Remover pelo próprio usuário cópias excedentes de Downloads somente após conferir a cópia privada.
4. Avisar somente que o arquivo foi salvo. Antes de usá-lo, reconferir ACL da pasta e do arquivo, incluindo eventual herança mantida ao mover de Downloads.

O handoff decorre das regras de segurança de controle do navegador para credenciais, e não de uma exigência de aprovação descrita no SKILL.md. Nenhuma criação automática por CLI/API deve contornar essa participação. Uma chave permite autenticar a identidade com suas permissões atuais; deve permanecer privada. Se o Console exigir ativação de API, mudança de política ou upgrade, interromper essa parte e relatar, sem contornar a restrição.

## Verificação preparada

Ferramenta operacional fora do Git em Project-Site-Shorts/stage8-local/check-runtime-key.cjs. Não está ligada à API pública nem possui ativação automática. --check importa/assina localmente; --probe usa o mesmo assinador e fornecedor OAuth do projeto e permite somente o endpoint OAuth oficial e batchGet dos três marcadores existentes. Não usa a sessão CLI do proprietário como fallback. Nenhum acesso a jogos/shorts/usuários ou escrita Firestore é permitido pelo transporte do probe. OAuth token, assertion e PEM somente em memória, nunca em logs, ambiente ou relatório; arquivo original permanece sob custódia local.

Cinco autochecagens offline aprovadas: projeto incorreto, destino OAuth incorreto, operação commit, documento fora da lista e leitura permitida com transporte simulado. Zero requisições externas e nenhuma credencial real lida. Não é prova de autenticação real nem de IAM transacional/escrita/CPU em produção. A execução real aguarda o arquivo e a participação do proprietário. Falhas devem ser reportadas de forma genérica, sem imprimir objetos de erro que contenham respostas/headers privados. Após criação, pode haver propagação; não gerar várias chaves para contornar uma primeira falha transitória.

## Destino de produção e limites

O PKCS8 será fornecido somente ao binding servidor FIREBASE_SERVICE_PRIVATE_KEY, com FIREBASE_SERVICE_EMAIL da identidade dedicada. Não colocar o JSON/PEM em VITE_*, vars públicas, navegador, Git, bundle, relatório ou comandos que exponham seu conteúdo no histórico. Nenhum binding/Worker/serviço adicional foi criado e nenhum segredo enviado à Cloudflare nesta rodada.

Não executar wrangler secret put como se fosse armazenamento neutro: a documentação informa que ele cria versão e faz deploy imediatamente. A opção versions também altera o remoto. Inserção de segredos/versões/publicação fica para escopo HTTPS aprovado, com destino exato e participação no preenchimento privado. Não precisamos criar um serviço pago de armazenamento para esta preparação.

Rotação futura: preparar nova credencial, validar o uso no destino e só então revogar a anterior sob autorização; não apagar chave funcional antes da validação. Em caso de exposição, tratar revogação de forma explícita e nunca tentar reutilizar o segredo exposto. Não implementado agendamento automático de rotação.

Fontes oficiais: [criação de chaves Google](https://docs.cloud.google.com/iam/docs/keys-create-delete) e [segredos Workers](https://developers.cloudflare.com/workers/configuration/secrets/). Sem deploy, ativação de APIs, alteração IAM/regras/billing, testes completos, Lighthouse ou reinício dos servidores. Dados locais preservados. A8-C permanece pendente de credencial/teste real; domínio HTTPS/TOTP/CPU/provedores/jobs e validação final ainda posteriores.

## Resultado real — 26/10/2026

O proprietário gerou o JSON e mostrou somente sua localização/nome no Explorer, sem expor o conteúdo. A extensão oculta do Windows resultou em clipzone-runtime.json.json. Foi corrigido apenas o nome para clipzone-runtime.json, recusando sobrescrita; não houve criação de outra chave. Arquivo regular, sem reparse point, tamanho dentro do limite. ACL do arquivo conferida antes da leitura: duas concessões Allow, somente usuário Windows atual e SYSTEM.

--check importou a chave com createServiceKeySigner e produziu assinatura local sem transmitir segredo. --probe autenticou com createServiceTokenSupplier da aplicação, usando exclusivamente a identidade clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com e o escopo datastore; não houve fallback para a conta do operador/CLI. Leitura dos três marcadores gameNameState/v1, adminQueueState/reportTitles e rankingState/metrics confirmou version1/ready e o formato esperado dos dois primeiros. O transporte recusava operações e documentos fora da lista. Nenhuma escrita, criação de sessão administrativa ou consulta de jogos/shorts/usuários realizada.

Evidência sanitizada: [etapa-8-c-credencial-runtime.json](evidencias/etapa-8-c-credencial-runtime.json). Nenhum PEM, private_key_id, token, assertion, corpo de credencial ou header Authorization incluído no relatório/Git. O arquivo privado permanece fora do repositório. Não copiado para .env, VITE_*, bundle ou Cloudflare. Sem deploy, mudança de regra, IAM, billing, API, domínio ou dados. Sem repetir suíte/build/Lighthouse ou reiniciar serviços locais.

Custódia local e teste OAuth/leitura da identidade real agora concluídos. Esta prova não valida permissões de escrita/transação via runtime, CPU no Workers Free, revogação/MFA/TOTP, sessões/cookies/origem, provedores ou publicação HTTPS. Essas validações continuam para homologação sob escopo próprio; não ampliar permissões por suposição nem declarar a Etapa8 completa. Próximo: apresentar endereço/origem gratuitos e conjunto exato de bindings/domínio/versão/publicação para aprovação antes de qualquer alteração remota adicional. Não executar secret put ou deploy automaticamente.

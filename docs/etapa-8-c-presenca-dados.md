# Etapa 8-C — finalidade do banco e presença de dados

25/10/2026, America/Sao_Paulo. Continuação das autorizações de conferência, após o proprietário esclarecer que todo o ambiente era destinado a testes e o cadastro definitivo começará após o deploy. Isso não é autorização para exclusão/reset, criação de recursos, mudança de acesso ou deploy.

## Resultado observado

Projeto `clipzone-db02a`, banco `(default)`, localização `southamerica-east1` (São Paulo). O painel Firestore Studio, na raiz, exibiu **“Seu banco de dados está pronto, basta adicionar dados.”**, com botões para iniciar coleção e nenhuma coleção listada. Não foram selecionadas coleções, abertos documentos, executadas consultas de contagem ou feitas gravações. Nenhum usuário/fator/segredo foi consultado.

A observação indica banco sem dados visíveis na raiz no momento da consulta. Não é uma certificação transacional de vazio: o console não prova ausência de escritas concorrentes, documentos órfãos em subcoleções ou alterações posteriores. Não há necessidade comprovada de limpar o banco. Antes de qualquer inicialização futura, manter escritores desligados e conferir novamente as coleções relevantes e a ausência dos metadados, sem overwrite.

Fonte: https://console.cloud.google.com/firestore/databases/-default-/data/panel?project=clipzone-db02a . Evidência sanitizada: [JSON](evidencias/etapa-8-c-presenca-dados.json). Registro manual da UI, sem exportação de documentos ou credenciais.

## Destino recomendado

Recomenda-se reutilizar o banco default existente para o início vazio, sem criar segundo banco/projeto e sem importar jogos, shorts ou interações do emulador. Essa é uma proposta de destino; a inspeção não ativou escrita nem conectou a aplicação ao banco. Dados locais e backups permanecem preservados para testes. Conteúdo definitivo será cadastrado pelo fluxo normal depois da homologação/deploy autorizados.

## Pacote remoto proposto — não executado

| Passo | Ação concreta a autorizar | Limite / interrupção |
| --- | --- | --- |
| 1 | Adotar `clipzone-db02a/(default)` como destino remoto vazio; ler regras/índices remotos para comparar com os arquivos locais | Sem dados de usuários; não publicar diferenças automaticamente; conteúdo inesperado interrompe inicialização |
| 2 | Resolver a confirmação específica de TOTP por configuração ou teste dedicado acompanhado | Não remover Google/TOTP/UID, substituir por SMS, habilitar APIs ou consultar fatores de terceiros por conveniência |
| 3 | Preparar identidade de serviço exclusiva para runtime, com papel candidato de `docs/etapa-8-c-iam-proposta.json` revisado por método | Sem Owner/Editor/Firebase Admin ou permissões de billing, criação de banco, índices, backup, import/export ou administração Auth; criação/concessão requer aprovação específica |
| 4 | Definir e implementar custódia/rotação do assinador no servidor antes de gerar chave real | Nunca enviar chave no chat, VITE_*, bundle ou Git; qualquer criação de credencial/segredo deve ser apresentada e acompanhada, sem presumir autorização |
| 5 | Publicar somente regras e índices aprovados após comparação; arquivos locais atuais: `firestore/firestore.rules` e `firestore/firestore.indexes.json` | 37 índices compostos e 15 configurações de campo locais; verificar consumo/estado remoto; sem pesquisa dormente, TTL ou serviços pagos |
| 6 | Com escritores desligados e vazio reconferido, criar somente `gameNameState/v1` e `rankingState/metrics` conforme plano local | Create-only `exists=false`, epoch/data novos, sem jogos/shorts de testes, geração fictícia de ranking, exclusão ou reset; implementação executora ainda pendente |

Esta tabela apresenta a sequência para revisão; **nenhuma mutação está autorizada ou realizada por este relatório**. Cada passo depende dos anteriores. Não executar o conjunto após uma autorização ambígua, nem publicar regras, conceder IAM ou gerar credenciais em uma etapa de leitura. Operador de setup e identidade de runtime devem permanecer distintos. A conta de serviço não substitui a allowlist de UID nem Google/TOTP na aplicação.

## Pendências técnicas preservadas

- Composição real do assinador/transporte, custódia e executor de inicialização ainda precisam implementação e validação local antes de uso remoto.
- Configuração específica de TOTP ainda não confirmada pelas telas anteriores; não inferir desativação.
- Regras/índices remotos ainda não comparados aos arquivos locais; planos gratuitos foram observados na rodada anterior, sem repetição nesta.
- Jobs 8-D precisam segmentação antes de ativação: ranking monolítico excede orçamento de subrequests Workers Free. CPU real de 10 ms e ingresso exigem homologação HTTPS posterior.
- Não criar Worker, domínio, serviço de armazenamento ou ativar billing/upgrade. Homologação HTTPS e deploy continuam autorizações separadas.

## Validação desta rodada

Somente inspeção visual da raiz e documentação; nenhum código de aplicação modificado. Não foram repetidos testes, build ou Lighthouse. JSON e diff documental conferidos. Servidores, emuladores e dados locais não alterados. O relatório anterior permanece como evidência histórica do escopo restrito de configuração; esta observação posterior resolve a dúvida de finalidade com a declaração do proprietário e acrescenta a evidência visual, sem reescrever aquela rodada.

## Próximo passo recomendado

Aprovar o destino `clipzone-db02a/(default)` e a leitura de suas regras/índices, sem publicação, enquanto a preparação local das dependências restantes é detalhada. Não há necessidade de apagar dados ou criar outro banco com a evidência atual. Criação de identidade/IAM/credencial, publicação de regras/índices, inicialização e deploy ficam fora dessa próxima leitura.

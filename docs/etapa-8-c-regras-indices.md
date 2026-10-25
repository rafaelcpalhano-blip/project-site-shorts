# Etapa 8-C — comparação de regras e índices

25/10/2026, America/Sao_Paulo. Autorização recebida para o próximo passo proposto: comparar regras e índices remotos com os arquivos locais, somente leitura. Projeto `clipzone-db02a`, banco `(default)`. Nenhum recurso/configuração/dado alterado, nenhuma concessão IAM, criação de credencial ou deploy.

## Resultado

| Configuração | Remoto observado | Arquivo local | Consequência para futura publicação |
| --- | --- | --- | --- |
| Regras de cliente | Deny-all ativo, data exibida 19/10/2026 13:43:49 | Exceção para leitura de jogos ativos; demais acessos negados | Não equivalentes; publicar local ampliaria leitura de jogos ativos pelo SDK |
| Índices compostos manuais | 0; “Nenhuma linha a ser exibida” | 37, nenhuma definição duplicada | As consultas compostas dependentes ainda não estão preparadas no remoto |
| Exceções/configurações de campo | 0; “Nenhuma linha a ser exibida” | 15 fieldOverrides | As reduções de indexação previstas localmente ainda não foram aplicadas |
| Índices automáticos | Crescente, decrescente e array-contains ativados no escopo coleção; desativados no escopo grupo de coleções | Sem troca global no manifesto; somente os overrides explícitos | Preservar padrões globais; não confundir ausência de compostos com ausência de toda indexação |

As regras remotas exibidas são:

```text
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

O arquivo local `firestore/firestore.rules` permite `get` de games somente com status active e `list` somente de jogos ativos com request.query.limit presente e <=51. Não concede nenhuma escrita de cliente; shorts/comments e demais caminhos privados permanecem negados inclusive para claim administrativo. A exceção não libera jogos provisórios/inativos nem transforma login Google/TOTP em permissão de escrita direta.

O servidor com OAuth/IAM tem outro mecanismo de autorização: publicar as regras não prepara sua identidade nem substitui Google+TOTP+UID e as validações da API. Esta rodada não verificou IAM e não testou pedidos de dados no remoto.

## Índices compostos a preparar, caso aprovados

| Coleção | Definições locais | Remoto |
| --- | ---: | ---: |
| `comments` | 6 | 0 |
| `gameRequests` | 4 | 0 |
| `games` | 8 | 0 |
| `moderationLogs` | 3 | 0 |
| `rankingItems` | 2 | 0 |
| `reportSummaries` | 5 | 0 |
| `reports` | 1 | 0 |
| `shorts` | 8 | 0 |
| **Total** | **37** | **0** |

A fonte exata proposta é `firestore/firestore.indexes.json`, não os índices dormentes de pesquisa por título em docs. Os 37 compostos são todos do escopo COLLECTION. A evidência registra SHA-256 dos dois arquivos locais e as 15 configurações de campo; uma edição posterior exige rever o pacote antes de aplicar. A consulta de índice mostrava tabela vazia sem filtro preenchido; não havia definição remota a excluir/substituir nesta observação.

As configurações de campo desativam indexação de shorts.searchFragments/titleSearchVersion/thumbnail/administrativeBlock, shortLikes.*, likeAttempts.*, rankingMetrics.*, rankingRuns.*, rankingBudgets.*, rankingState.*, rankingSignals.*, rankingHours.*, rankingDays.* e networkAbuse.*. O override networkAbuse.expiresAt reativa somente crescente/coleção. **expiresAt não é política TTL**; esta proposta não ativa TTL, backfill, pesquisa dormente ou armazenamento adicional. Wildcards/exceções herdadas devem ser conferidos após aplicação autorizada.

## Impacto e sequência recomendada

1. **Preparar índices e exceções primeiro**, sob autorização específica para o arquivo identificado, mantendo o banco vazio e sem escritores ativos. Nenhuma exclusão de dados, alteração de regra ou credencial precisa fazer parte dessa autorização. A criação de índices é preparação de infraestrutura remota e ainda não ocorreu.
2. Aguardar os 37 compostos atingirem estado pronto e conferir as configurações de campo. Não considerar um comando bem-sucedido como confirmação de prontidão. Se houver quota, incompatibilidade, exigência de billing ou definição inesperada, interromper e relatar, sem upgrade ou exclusão automática.
3. **Manter deny-all enquanto a composição remota da API não estiver pronta.** Preparar/validar localmente o assinador e a inicialização antes de criar identidade/credencial real. Resolver a confirmação específica de TOTP sem reduzir proteção; ela não faz parte da comparação atual.
4. Publicar regras locais somente em aprovação posterior que reconheça explicitamente a leitura pública de jogos ativos. Como o banco hoje está vazio na evidência anterior, a mudança não disponibilizaria conteúdo existente conhecido, mas afetaria os futuros jogos ativos. Escritas e coleções privadas devem continuar fechadas.
5. Inicialização create-only de 2 metadados, Google/TOTP/UID, conexão da API, jobs8-D, homologação HTTPS e deploy continuam etapas dependentes e separadas. Revalidar ausência de conteúdo imediatamente antes da inicialização; não importar o emulador.

Esta ordem preserva o bloqueio remoto atual e permite preparar consultas sem antecipar liberação de acesso. Não usar a autorização de inspeção como autorização de publicação ou concessão. A arquitetura gratuita permanece: nenhuma operação que peça billing/upgrade deve prosseguir automaticamente; índices podem consumir franquia/armazenamento e sua disponibilidade real deverá ser conferida. Limites de CPU/subrequests já identificados na8-B continuam abertos.

## Validação e limites

Observação em três telas autenticadas: regras ativas, índices manuais e índices automáticos/isenções. Nenhum editor alterado, botão de criar/clonar/publicar/isentar acionado ou documento consultado pelo agente. Evidência sanitizada em [etapa-8-c-regras-indices.json](evidencias/etapa-8-c-regras-indices.json), com transcrição manual e URLs; não é exportação bruta assinada nem prova de consultas reais.

Comparação local: JSON válido, 37 compostos/15 overrides e 0 duplicatas exatas; diff documental conferido. Nenhum código, regra ou índice local modificado. Não há necessidade de repetir testes, build ou Lighthouse nesta rodada documental; provas anteriores de emulador não certificam índices remotos. Servidores5174/5175/8080 e dados locais preservados.

## Próximo passo para aprovação

Autorizar **somente preparar os 37 índices compostos e as 15 configurações de campo de `firestore/firestore.indexes.json` em `clipzone-db02a/(default)`**, sem publicar regras, gerar credenciais, conceder IAM, gravar documentos, importar testes, ativar serviços pagos ou fazer deploy do site/API. A aplicação ainda requer uma via autenticada de operação; se depender de login/instalação/permissão adicional, identificar e apresentar antes de usar. A revisão atual já concluiu a comparação e não criou tais capacidades.

## Fontes observadas

- [Regras ativas](https://console.cloud.google.com/firestore/databases/-default-/security/rules?project=clipzone-db02a).
- [Índices manuais](https://console.cloud.google.com/firestore/databases/-default-/indexes/manual?project=clipzone-db02a).
- [Índices automáticos e exceções](https://console.cloud.google.com/firestore/databases/-default-/indexes/automatic?project=clipzone-db02a).

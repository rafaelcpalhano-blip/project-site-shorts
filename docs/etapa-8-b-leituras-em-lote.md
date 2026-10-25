# Etapa 8-B — leituras em lote e avaliação do transporte

25/10/2026. Continuação autorizada pelo proprietário. Parte de leituras implementada e validada; Etapa8-B ainda não encerrada. Sem banco remoto, deploy, contratação ou reinício dos servidores em uso.

## Alteração localizada

- `server/firestore/atomic-store.ts`: getMany opcional para 1–4 caminhos distintos, dados atuais e resultados na ordem solicitada.
- `server/firestore/rest-store.ts`: um batchGet por lote, validação dos caminhos antes de credencial/rede; mapeamento pelo nome completo do documento, não pela ordem de resposta. Ausentes explícitos viram null. Resposta incompleta, duplicada, ambígua ou com documento fora do projeto/lote falha fechada.
- `server/ranking/read-feed.ts`: mesmos grupos de até4 candidatos e mesmos slots restantes; lê shorts atuais em lote e depois os jogos elegíveis ainda não lidos nesta requisição. Adaptadores sem getMany mantêm o caminho anterior. Não há cache compartilhado entre requisições nem gravação nova.

Preservados:15 cards/página, teto30 candidatos, snapshot da ordenação/cursor, revalidação atual de moderação/jogo, filtro por jogo, DTOs, totalizações, 4 modos de ordenação, deduplicação de jogos na requisição e transação do limiter. Falha de lote rejeita a página inteira; não publica resposta parcial com sucesso. Players, publicação, comentários, painel, autenticação e frontend não foram alterados.

## Medição

Chamadas HTTP REST por leitura latest com sessão já emitida e uma transação de limiter sem retry:

| Caso | Antes, sem lote | Agora |
| --- | ---: | ---: |
|15 cards, um jogo compartilhado|20|9|
|15 cards, jogos distintos|34|12|
|30 candidatos, jogos distintos todos ocultos|65|21|
|14 visíveis no começo e restantes ocultos|não medido nesta baseline|43|

16 combinações de prefixo visível (0–15) foram testadas para latest e relevant: máximos observados43 e45, respectivamente. Cada resposta preserva cards/continuação/limited. Um limite simulado de transporte confirma HTTP503 genérico e no-store em falha, sem vazar detalhe privado.

**Limites da conclusão:** menos chamadas HTTP não significa redução proporcional nas leituras de documentos cobradas pelo Firestore. OAuth, retries transacionais e CPU ainda precisam de orçamento na composição final. Por exemplo, sete retries adicionais do limiter podem acrescentar21 chamadas;45 não é garantia de permanecer abaixo de50 em qualquer condição. Nenhum limite do plano remoto ou custo real foi homologado.

## Testes

-66 testes Node relacionados aprovados: ordered-feed-concurrency, ordered-feed-batch, rest-batch-read, runtime-read-budget, public-api, public-read e ranking-generation. Os arquivos afetados foram repetidos somente após alterações relevantes.
-1 integração real aprovada no emulador isolado8081/demo-clipzone-tests. Confirmou nomes/ordem/ausentes/tipos Date e que ocultar jogos depois do snapshot não os reexibe.30 candidatos ocultos usaram18 chamadas REST diretas (sem limiter HTTP), com continuação correta até o último registro. Emulador encerrado normalmente.
-Na primeira execução dessa integração, uma fixture usava relógio fixo anterior ao readTime real e o cursor foi corretamente rejeitado. Corrigido somente o relógio do teste; segunda execução aprovada. Não afrouxar a expiração do cursor para corrigir fixture.
-TypeScript, lint dos arquivos afetados, build e diff-check aprovados.
-Reutilizadas as14 verificações Workers anteriores para o diagnóstico de transporte; esta rodada não certifica a nova leitura em lote no edge. Não repetido Lighthouse nem teste manual sem necessidade.

Testes novos cobrem comparação completa entre lote e fallback em4 modos/filtros/páginas, moderação atual após snapshot, ausentes, cache somente por requisição, falha de lote, lote incompleto, respostas reordenadas e documentos inesperados. O teste da baseline65 é mantido com getMany desativado apenas na fixture.

## Capas: alternativa arquitetural

O código de transporte atual permanece intacto. A falha maxHeaderSize no workerd já demonstrada não deve ser resolvida simplesmente retirando opções de segurança.

A documentação de [node:http no Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/) registra que lookup/createConnection/maxHeaderSize não são suportados nesse cliente. A de [HTTPS](https://developers.cloudflare.com/workers/runtime-apis/nodejs/https/) também descreve restrições de socket/TLS. A existência de [node:tls](https://developers.cloudflare.com/workers/runtime-apis/nodejs/tls/) não torna o cliente HTTP equivalente automaticamente.

Além disso, [sockets TCP no Workers](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/) bloqueiam IPs da Cloudflare. Como capas externas atualmente aceitam domínios públicos variados, implementar HTTP/TLS por socket não pode ser apresentado como equivalente para todos os destinos hoje permitidos. Não excluir esses domínios, adicionar proxy externo ou trocar por fetch irrestrito sem aprovação.

Recomendação Node foi apresentada e NÃO autorizada: o proprietário decidiu manter apenas Workers e revisar alternativas primeiro. Nenhuma entrada Node foi preparada. Revisão e opções em [alternativas somente Workers](etapa-8-b-alternativas-workers.md). Nenhuma opção adotada, nenhuma infraestrutura/custo autorizado.

## Operação atual e próximos passos

A build foi conferida, mas a API em uso não foi reiniciada. Código de backend novo será carregado no próximo reinício controlado; não pedir que o proprietário volte ao computador somente para isso. Validação manual posterior fica registrada, sem marcar como executada.

Continuar8-B após a decisão de runtime: entrada local isolada, certificados X.509/conta revogada/MFA removido, credencial fictícia ausente/renovada, transporte de IP confiável e orçamento de retry/OAuth/CPU/jobs. Só depois avançar aos gates do banco remoto. PWA continua para8.5. Checkpoint original9782f90 preservado e nenhum commit automático.

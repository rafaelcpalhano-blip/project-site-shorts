# Etapa 8-B — orçamento de saída e falhas controladas

25/10/2026. Base limpa20a3c34, após commits anteriores do proprietário. Preparação e provas concluídas nesta parte;8-B ainda não encerrada. Somente Workers como candidato. Sem mudança de cotas de uso, infraestrutura, dados reais, autenticação ou política de capas.

## Implementação preparada

`server/runtime/outbound-budget.ts` cria um escopo por invocação, com transportes fetch comum e cleanupFetch, contador compartilhado e teto explícito. Conta disparos antes do await, inclusive falhas de rede/HTTP e novas tentativas; não devolve créditos por erro. Chamadas concorrentes não ultrapassam o limite. Snapshots de uso não permitem zerar o contador.

Uma chamada é reservada para tentar rollback. Reserva não garante entrega nem sucesso: o destino pode falhar, a credencial pode estar indisponível/expirada e a própria transação pode já não existir. Não usar cleanupFetch como transporte normal para consumir a reserva. Ambas as capacidades continuam sujeitas ao mesmo teto total.

Redirecionamento automático follow é recusado antes da rede; URLs sem política explícita usam error, e manual permanece possível com cada etapa passando pelo transporte. Request já criado com redirect=follow também é recusado, inclusive quando esse era seu padrão. Um cancelamento já sinalizado não dispara nem consome chamada.

`server/firestore/rest-store.ts` recebeu injeções opcionais fetcher e cleanupFetcher. Somente rollback usa a segunda. Sem essas opções, conserva o comportamento anterior e a resolução dinâmica do fetch padrão. Retentativas existentes, transações, visibilidade e cotas não foram reduzidas ou substituídas por memória.

**Não conectado à API em uso:** o módulo foi ligado nas composições de teste. A entrada real do Workers ainda precisará compartilhar um novo escopo entre banco, fornecedor de credenciais e provedores a cada invocação. Não manter esse transporte em singleton/cache da API, nem criar um orçamento independente por serviço e somá-los inadvertidamente.

## Configuração do ensaio

Teto experimental48 chamadas, com47 para operação e1 reservada. É uma escolha conservadora do ensaio, não alteração de plano ou garantia sobre a conta. O Workers Free documenta50 subrequests por invocação, e redirects podem acrescentar subrequests: [limites oficiais](https://developers.cloudflare.com/workers/platform/limits/).

Esse controle conta apenas fetches explicitamente injetados. Não mede DNS nativo, sockets, bindings, cache, chamadas feitas fora do wrapper ou CPU; portanto a margem2 não certifica cobertura de qualquer composição. A entrada completa deverá inventariar todos os caminhos antes do deploy.

Credencial adicional foi simulada por uma chamada a um fornecedor fictício usando o mesmo escopo. Nenhuma implementação real de OAuth, IAM ou renovação de token do Google foi criada. Os retries usam o código real do adaptador REST e respostas ABORTED simuladas; nenhuma requisição foi enviada ao Google.

## Resultados no Workers local

Wrangler4.152.0/workerd1.20261019.1 existentes, configuração2026-10-25, execução somente127.0.0.1:8798. [Evidência sanitizada](evidencias/etapa-8-b-orcamento-workers.json).

| Cenário | Resultado | Chamadas disparadas |
| --- | --- | ---: |
|Relevância, mistura de14 visíveis/16 ocultos, credencial inicial fria|200,14 cards e continuação corretos|46|
|Mesmo caso com2 retries de transação|503 genérico, sem itens de feed parciais|47; reserva não necessária porque a falha posterior foi de leitura|
|2 retries,15 cards de um jogo compartilhado|200;3 tentativas de commit e contador confirmado uma vez|18|
|Teto reduzido6, transação interrompida|503; rollback usa a chamada reservada; contador não confirmado|6|
|Mesmo caso com falha no rollback|503 mantém erro genérico, sem detalhes internos|6|
|Falha do fornecedor de credencial|503 e nenhuma chamada Firestore|1|

Prova concorrente adicional:10 disparos solicitados com teto4, exatamente4 enviados.7 cenários Workers concluídos, incluindo falhas esperadas. A prova Node reutiliza os mesmos cenários para evitar divergência entre fixtures.

**Sem promessa de rollback global:** transações já confirmadas não são desfeitas se uma leitura posterior falhar. No cenário de47 chamadas, o contador de tentativas públicas ficou confirmado uma vez; isso é esperado e preserva o limiter. Não confundir com a cota diária de postagem. Nenhuma escrita de conteúdo de negócio ocorreu nessas fixtures de leitura. A garantia demonstrada é resposta HTTP sem feed parcial em sucesso, não reversão de todos os efeitos de uma invocação.

## Testes e compatibilidade

-50 testes Node relacionados aprovados: outbound-budget, outbound-budget-api, rest-batch-read, runtime-read-budget, public-read, public-api e ordered-feed-batch.
-7 cenários no workerd local aprovados:6 de composição API/REST/credencial e1 concorrente.
-1 integração real aprovada em8081/demo-clipzone-tests: escopo3 envia beginTransaction/batchGet/rollback, impede commit e deixa contador ausente; escopo independente8 permite operação normal em4 chamadas e confirma contador1. Leituras de auditoria são separadas da invocação sob medição, apenas nesse emulador de teste.
-TypeScript estrito do probe/imports, lint dos arquivos afetados, build e sintaxe do runner aprovados. Diff-check aprovado ao fechar a rodada.
-Emulador de teste e instância8798 encerrados.5174/5175/8080 não reiniciados; sem seed/reset/produção. Nenhuma alteração de frontend ou players; Lighthouse/manuais não repetidos sem necessidade.

Reexecução direcionada na raiz do repositório:

```powershell
node --test tests/outbound-budget.test.mjs tests/outbound-budget-api.test.mjs
node tests/runtime/run-worker-budget.mjs "C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/runtime-lab-8b"
node scripts/firebase-local.mjs test outbound-budget.test.mjs
```

O runner usa somente a instalação isolada já autorizada. Gera config/estado/evidência no laboratório e encerra a instância em finally. Não instala ferramentas, faz login ou publica.

## Próxima parte

Continuar a composição local da entrada Workers e a avaliação de CPU/transportes não contados, mantendo fail-closed para contexto de IP/origem não demonstrado. Fornecedor real de OAuth/IAM8-C e tarefas autônomas8-D permanecem posteriores. A decisão de capas é independente e continua aberta: nenhum domínio foi limitado, nenhum upload/R2/proxy adicionado e nenhuma entrada Node preparada. Não iniciar publicação nem declarar8-B completa enquanto esses gates persistirem. PWA8.5 permanece posterior à integração.

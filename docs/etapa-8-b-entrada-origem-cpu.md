# Etapa 8-B — entrada Workers, origem e perfil local

Data: 25/10/2026. Base limpa: `5f301a2`. Direção autorizada: somente Workers. Esta composição é optativa e não foi ativada nos servidores em uso. `deployReady=false`.

## Resultado implementado

`server/runtime/worker-entry.ts` recebe origem HTTPS canônica, assets, fábrica da API e resolvedor de transporte confiável injetados pelo servidor. Não deduz confiança de `CF-Connecting-IP`, `X-Forwarded-For` ou outros cabeçalhos encaminhados. A integração real com o edge ainda precisa definir e verificar essa fronteira.

Valida origem da URL e das mutações, separa `/api` e `/api/` dos assets e recusa resposta HTML ou redirecionamento inesperado da API. Mantém status, JSON, corpo e cookie seguro; força `no-store` na API. Cada invocação recebe orçamento próprio e captura o endereço antes da construção assíncrona, evitando mistura de contexto entre requisições concorrentes. Exceções privadas viram erro genérico.

O módulo não é uma entrada de publicação completa: faltam composição dos provedores reais, política de ingresso, configuração final de assets e solução aprovada para capas. Não há configuração de produção ou fornecedor OAuth real novo.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| Testes Node de entrada, orçamento, rede e API | 32 aprovados, sem falhas ou skips |
| Casos compartilhados executados no workerd | 12 aprovados |
| Rotas reais da composição local | 4 aprovadas: sessão/cookie, API inexistente JSON, origem estrangeira recusada e navegação SPA |
| TypeScript estrito do probe e importações | Aprovado |
| ESLint dos novos arquivos TypeScript | Aprovado |
| Build da aplicação | Aprovada; frontend não alterado |

Os testes cobrem IP inválido, cabeçalhos forjados sem contexto confiável, IPv6, origem incorreta, isolamento concorrente, corpo ainda não consumido e ausência de fallback da API para SPA. Detectaram e permitiram corrigir no código novo a aceitação de IPv6 com zona e o encaminhamento ausente do fetcher de teste. Nenhuma proteção anterior foi removida.

O laboratório utiliza Wrangler 4.152.0/workerd 1.20261019.1 já instalados fora do repositório. O bridge de teste reescreve a origem para `https://clipzone.test` e injeta IP fictício fixo: isso não atesta o ingresso real da Cloudflare. `run_worker_first: true` é política do laboratório; roteamento de produção deve revisar custo de invocações e precedência de assets/API.

## Perfil de CPU: evidência exploratória

O inspector V8 capturou 72 amostras durante cinco requisições de fixture. Intervalo solicitado: 100 µs; não certifica resolução efetiva. Tempos de parede observados: 22,44; 13,08; 13,93; 12,89; 14,57 ms. Janela total do perfil: 101,30 ms.

Esses valores não são CPU faturada por requisição, LCP, latência remota ou cold start publicado. O perfil contém tempo ocioso, I/O e construção/serialização dos documentos fictícios no mesmo Worker. A função `document`, por exemplo, pertence à fixture. A amostra pequena não demonstra conformidade com o limite do plano Free e não justifica otimizações por si só. Importação de chaves, JSON e processamento do feed são apenas candidatos a medição posterior.

Resumo sanitizado: [evidência JSON](evidencias/etapa-8-b-entrada-workers.json). Perfil bruto preservado somente no laboratório externo: `runtime-lab-8b/evidence/entry-cpu.cpuprofile`. A falha inicial de conexão ao inspector foi corrigida; nenhuma métrica foi inventada para substituí-la.

## Limites e sequência

Não houve deploy, login cloud, alteração de infraestrutura, credencial real, consulta a dados Google, mudança de dependências do Clipzone, reinício de 5174/5175/8080 ou alteração das capas. Não foi necessário repetir Lighthouse, testes de navegador ou integração do emulador: o módulo novo permanece optativo e a interface não mudou.

A parte local de entrada e perfil está concluída. A Etapa 8-B continua aberta principalmente pela decisão sobre capas externas e pela política concreta de confiança do ingresso. Não prometer equivalência do pinning atual usando apenas fetch. Fontes aprovadas ou upload controlado mudam o fluxo atual e exigem decisão do proprietário; nenhum recurso ou custo foi autorizado por este trabalho.

Próximo passo: consolidar a decisão de capas e o desenho do ingresso Workers. Credenciais/IAM e banco remoto vazio pertencem à 8-C; jobs à 8-D. CPU e ingresso reais serão homologados no ambiente remoto somente após autorização de preparação/publicação. Essa medição remota não é exigência circular para concluir uma prova exclusivamente local. PWA 8.5 permanece posterior à Etapa 8.

## Referências oficiais

- [Cabeçalhos e comportamento de CF-Connecting-IP em subrequests](https://developers.cloudflare.com/fundamentals/reference/http-headers/).
- [Request e contexto cf](https://developers.cloudflare.com/workers/runtime-apis/request/).
- [Identificação de subrequests de Workers por regras WAF](https://developers.cloudflare.com/waf/custom-rules/use-cases/block-worker-subrequests/) — nenhuma regra criada.
- [Perfil de CPU e limitações das medições locais](https://developers.cloudflare.com/workers/observability/dev-tools/cpu-usage/).
- [Limites do runtime Workers](https://developers.cloudflare.com/workers/platform/limits/).

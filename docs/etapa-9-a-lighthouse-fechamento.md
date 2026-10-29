# Etapa 9-A — fechamento das correções no Lighthouse

Relatórios de 28/10/2026 às 21h56 de Brasília, versão de referência 7ec6774e-b1f8-4da5-bf3b-ce1c41d16bf4. [Evidência sanitizada](evidencias/etapa-9-a-lighthouse-fechamento.json).

| Resultado | Desktop 21h56min17s | Mobile 21h56min53s |
| --- | --- | --- |
| Performance | 99 | 94 |
| Acessibilidade | 100 | 100 |
| Boas práticas | 100 | 100 |
| SEO | 66 | 66 |
| LCP | 0,76 s | 2,62 s |
| TBT | 0 ms | 5 ms |
| CLS | 0,0344 | 0,0322 |
| label-content-name-mismatch | Aprovado, zero falhas | Aprovado, zero falhas |
| robots.txt | Válido, zero erros | Válido, zero erros |

As duas correções estão comprovadas na auditoria real recebida. Navegação/layout/painel já foram confirmados pelo proprietário após o deploy. Não há motivo para repetir a mesma rodada agora.

A queda de SEO de 92 para 66 decorre da diretiva Disallow: /: is-crawlable identifica explicitamente o robots.txt como origem do bloqueio. Esse comportamento foi autorizado para a homologação. Não remover o bloqueio para elevar a pontuação; revisar indexação na autorização de lançamento. Robots não é autenticação nem garantia de remoção de URLs já conhecidas de buscadores.

As notas de performance permanecem iguais às anteriores. Há aviso de IndexedDB nas duas auditorias; ausência de runtimeError não elimina esse aviso. Não afirmar execução anônima limpa ou comparação controlada de performance. Ambos os JSONs têm screenEmulation.disabled=true e throttling simulate; o perfil mobile não representa celular físico. Não concluir regressão ou ganho por pequenos deltas de tempo em amostras diferentes.

Imagens externas, cache de terceiros, JavaScript não utilizado e CSS bloqueante continuam oportunidades não obrigatórias de otimização. Não criar proxy/armazenamento, reduzir segurança ou iniciar um ciclo de ajustes apenas para aumentar a nota. O Lighthouse não certifica CPU do Worker ou todas as condições de acessibilidade/uso.

A homologação 9-A destes ajustes está fechada no escopo relatado: ordens comuns, navegação/layout/admin confirmados, envio/reprodução TikTok confirmados e duas auditorias corrigidas. Cobertura de iPhone, outros aparelhos, modos de sessão e conteúdo insuficiente não é ampliada por inferência. O parecer global de lançamento depende da revisão operacional 9-B e do fechamento do GitHub/README/CI, com aprovações específicas.

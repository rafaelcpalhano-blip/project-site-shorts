# Etapa 3 — CPU: leituras transacionais em lote

Data: 28/10/2026. Estado: preparação local concluída; deploy e comparação remota pendentes de autorização específica.

## Problema e mudança

As confirmações oficiais de jogos e o fluxo de tradução faziam leituras independentes em chamadas REST separadas, embora pertencessem à mesma transação. O pacote agrupa pares de documentos pelo getMany já suportado pelo adaptador. Não há cache novo entre requisições, remoção de validações, mudança de modelo ou aumento de quota.

Arquivos de produção: server/firestore/transaction-reads.ts, server/games/name-keys.ts e server/games/translation-store.ts. O auxiliar recusa lotes malformados; uma falha de lote não é recuperada por leituras independentes. Adaptadores sem getMany mantêm leituras ordenadas na transação existente. O dia UTC é fixado uma vez ao reclamar tarefa e orçamento.

## Resultado local comparável

| Fluxo com o adaptador REST e dados simulados | Antes | Depois |
| --- | ---: | ---: |
| Confirmação de jogo novo e tradução simulada: chamadas REST | 12 | 9 |
| Reconfirmação com tradução em cache: chamadas REST | 7 | 6 |
| Documentos lidos no primeiro fluxo | 9 | 9 |
| Documentos lidos no fluxo em cache | 5 | 5 |

As contagens incluem chamadas de commit. Menos chamadas HTTP não equivale a menos leituras faturadas pelo Firestore. Os números são de fluxos específicos, sem concorrência ou retries; outros caminhos podem variar. Texto original, tradução, uso do orçamento e quantidade de chamadas ao provedor simulado permaneceram iguais. Nenhuma inferência real foi executada.

Os mesmos contratos passaram no workerd local com os bundles minificados anterior e candidato, a mesma fixture corrigida e zero tentativas de fetch externo. Isso não mede CPU na borda, nem certifica inicialização a frio ou execução abaixo de 10 ms.

## Testes e limites da evidência

- 34 testes focados aprovados, incluindo seis novos casos: contrato/fallback, rejeição de lote inválido, cache, concorrência, quota esgotada e virada do dia UTC.
- 820 testes Node aprovados; nenhuma falha ou skip.
- 141 testes da suíte Firestore aprovados no emulador local, projeto demo-clipzone-tests; nenhuma falha ou skip. Emulador encerrado normalmente.
- Tipos frontend/backend, lint, diff-check e dry-run do Wrangler aprovados.
- Dois contratos comparativos no workerd local aprovados; não houve chamadas externas.

A fixture REST antes lia documentos do estado corrente a cada chamada, o que permitia uma visão inconsistente numa transação concorrente. Foi corrigida para manter uma cópia dos documentos por transação e detectar conflito no commit. Isso altera somente o suporte de testes; a implementação de runQuery da fixture continua simplificada. Não constitui um simulador completo do Firestore.

## Pacote congelado

- Baseline remoto conhecido: d6782c6c-7323-44a2-98fb-1aa39d85741a.
- SHA-256 do bundle candidato: ed90acb58acfa3a0ed3cb18df4d6d198ad8e7451703956e294d2346ad9d91c37.
- 102 arquivos TypeScript do servidor registrados com hashes no manifesto local privado.
- 43 arquivos estáticos copiados do pacote API previamente aprovado e conferidos por hash; sem aproveitar dist genérico.
- Nove segredos preservados por referência, sem abertura de credenciais nesta preparação.
- Tradução habilitada conforme a versão já publicada; ranking, jobs, diagnósticos de provedor e cron permanecem desligados.
- Nenhum deploy, acesso a documentos reais, inferência, mudança de plano ou commit/push nesta etapa local.

## Próxima verificação proposta

Mediante autorização específica: comparar no máximo duas reconfirmações de Doom com tradução já em cache antes e duas após publicar este pacote somente na homologação, com coleta sanitizada de CPU. Reconferir versão, cache, fonte, estado e franquias; interromper diante de divergência ou erro, sem repetição automática. Não invalidar cache nem planejar nova inferência. A rota normal reconfirma metadados e pode realizar escritas de manutenção; não é uma consulta somente de leitura.

A comparação deve usar o mesmo caminho em cache dos dois lados. Não comparar diretamente com os 16 ms da amostra anterior que executou IA. Uma amostra pequena não certifica todos os endpoints ou cold starts. O ganho real de CPU, os demais caminhos críticos, ranking automático, TikTok e os bloqueios de lançamento continuam pendentes. Não publicar publicamente o site ou o repositório nesta decisão.

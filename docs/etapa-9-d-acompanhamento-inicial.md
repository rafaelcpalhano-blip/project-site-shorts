# Etapa 9-D — primeira conferência operacional

Conferência de29/10/2026, iniciada após o proprietário pedir continuidade. Acompanhamento pontual, não monitoramento contínuo ou teste de carga.

## Entrega e CI

- Checkout estava limpo e main alinhada à referência local origin/main.
- Commits finais: `bd7d4b08ca1e9c45233e7a646a516d3218027bbe` e `993b3819d3119f7a1270ba5b8473ad6591d62550`.
- [CI16](https://github.com/rafaelcpalhano-blip/project-site-shorts/actions/runs/40913693952) do SHA993b381: sucesso,1m31s total/verify1m27s, sem artefatos. Não foi disparado rerun.
- Repositório confirmado **Public** na página GitHub; a alteração de visibilidade foi feita pelo proprietário, não pelo agente.
- Worker publicado `68add1ea-d8f8-468c-a8ba-9d752a41dac3`,100%/Ready no painel; sem novo deploy.

Os registros desta conferência são alterações documentais posteriores ao SHA acima. Não criar um ciclo de commits apenas para registrar o próprio CI; o workflow continuará verificando os próximos pushes normalmente.

## Disponibilidade e indexação

Três consultas públicas, sem sessão/API/provedores: `/`, `/robots.txt` e `/admin`, todas200. HSTS1dia/nosniff preservados. Página inicial sem noindex; painel com `noindex, nofollow`. Robots texto com `Allow: /`, excluindo `/admin` e `/api`. Isso não é login no painel nem nova verificação dos players; reteste humano e Lighthouse já concluídos na9-C.

## Métricas Cloudflare: versão ativa,29/10 das13h20 às13h40 de Brasília

A janela foi ajustada explicitamente no painel, com filtro **Actively deployed versions** e a única versão ativa68add1ea. Inclui a publicação às13h20min47s e suas conferências/Lighthouse/uso observado; não representa usuários únicos ou tráfego exclusivamente espontâneo.

| Indicador exibido | Resultado |
| --- | ---: |
| Invocações do Worker | 78 |
| Subrequisições | 260 |
| Erros de execução | 0 |
| Exceeded CPU Time Limits | 0 |
| Exceeded Memory/Internal/Load Shed/Uncaught Exception | 0 em cada categoria |
| CPU P50 | 3,75ms |
| CPU P90 | 13,39ms |
| CPU P99/P999 | 14,67ms |
| Requisições a assets | 214 |
| Cache hit rate de assets | 99,07% |

**Ressalva de CPU:** P90/P99 exibidos estão acima de10ms, apesar de não haver erros de limite no recorte. Não declarar que todas as requisições cabem em10ms nem que o risco foi eliminado. São percentis agregados exibidos pelo painel; não identificam endpoints nem provam inicialização a frio. Não converter a mediana em máximo ou deduzir quantidades exatas de chamadas acima do limite a partir destes valores agregados.

O painel também mostrou mediana da versão ativa em bloco próprio, com agregação distinta do gráfico; a tabela usa os percentis do gráfico CPU Time. Logs/traces persistidos aparecem desativados; não foram ativados. Zero erros de execução não significa zero respostasHTTP4xx, pois recusas de segurança podem ser respostas normais.

Não houve erro1102 relatado pelo proprietário nem `Exceeded CPU Time Limits` registrado no indicador observado. Essa é uma constatação limitada à janela, não garantia histórica ou futura. Sem ajuste automático de segurança, plano ou suspensão; ranking experimental continua fora do escopo desta versão.

## Margem de franquias

| Serviço | Uso exibido | Franquia exibida |
| --- | ---: | ---: |
| Workers: requisições do dia | 248 | 100.000/dia |
| Firestore(default): leituras | aproximadamente1.100 (2,2%) | 50.000/dia |
| Firestore: gravações | 72 (0,4% arredondado no painel) | 20.000/dia |
| Firestore: exclusões | 0 | 20.000/dia |

Firebase Spark confirmado no Console; Free foi confirmado antes do lançamento e o painel Workers mantém a franquia diária mostrada. Indicadores podem ter atraso e usam janelas/definições diferentes; requisições de assets, Worker, subrequisições e leituras faturáveis não são equivalentes. Não atribuir todo o consumo às três consultas desta conferência.

## Rotina após esta primeira conferência

1. Usar normalmente. Não gerar acessos repetidos, publicações fictícias ou spam para tentar provar estabilidade.
2. Se ocorrer falha, registrar horário, página/ação, mensagem e versão, sem códigos, chaves, dados de terceiros ou IP pessoal. Distinguir indisponibilidade de provedor, validação recusada e erro do runtime.
3. Se houver1102/ExceededCPU real ou falhas recorrentes em uso legítimo, conferir o período/endpoint quando houver evidência e discutir suspensão controlada ou ajuste mínimo com o proprietário. Não reativar ranking ou reduzir proteções para contornar limites.
4. Fazer nova leitura de métricas após um período de uso real ou diante de incidente, em outra sessão autorizada. Este documento não agenda consultas nem promete acompanhamento enquanto o computador/chat estiverem fechados.
5. Manter o lembrete único de backup08/11/2026 às21h; após essa revisão, combinar a sequência15dias. Nenhuma captura/chave/HD foi aberta nesta rodada.

Primeira conferência9-D concluída sem falha funcional que exija intervenção imediata. O ponto de atenção registrado éCPU; a estabilidade de longo prazo permanece uma responsabilidade operacional, não uma promessa de etapa encerrada para sempre. Não é necessário repetir Lighthouse por uma anotação documental.

## Efeitos desta rodada

Somente consultas públicas e leitura de painéis/GitHub, além deste registro local. Sem alterações na aplicação, deploy, conteúdo remoto, segredos, contas, planos, jobs/cron, logs/traces, dados debackup ou GitHub. Nenhuma automação nova, mensagem externa ou dependência instalada.

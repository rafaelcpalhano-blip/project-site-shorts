# Etapa 4 — controle de acúmulo e proteção do dia UTC

28/10/2026. Preparação e validação locais concluídas. Este relatório complementa etapa-4-ranking-retencao-local.md: resolve, nos cenários simulados, a limitação de acúmulo observada com 100 vídeos. Não aprova ativação remota ou lançamento.

## Comportamento preparado

O novo modo ranking-with-retention admite uma geração apenas quando há menos de seis registros de geração retidos. Conta gerações prontas, incompletas e falhas na primeira página limitada a 30; uma página com seis ou mais já basta para pausar. Uma verificação falha ou ainda pendente nunca concede admissão. Ao pausar, mantém o ranking publicado e permite continuar a limpeza limitada. A verificação negativa só é refeita após 15 minutos e usa reserva própria no mesmo orçamento diário.

O teto é da rotina automática sob este modo; não é autorização para apagar versões externas ou retroativamente reduzir um acervo preexistente sem piloto. Se já houver mais versões, o modo pausa novos builds enquanto a limpeza protegida avança. As proteções de geração atual/anterior, idade mínima de duas horas, lease ativo, fatias de 15 e isolamento dos dados primários permanecem intactas.

O algoritmo de pontuação e o intervalo normal de 30 minutos não foram alterados. Sob pressão de armazenamento, a ordem publicada pode demorar mais para atualizar. Essa é uma interrupção controlada dentro da premissa gratuita, não uma promessa de atualização a cada 30 minutos para qualquer volume.

## Virada UTC

A simulação de vários dias revelou que uma geração segmentada iniciada tarde podia concluir após a meia-noite UTC e ajustar o orçamento anterior. O novo modo passa singleUtcDay=true ao gerador: não inicia builds nos últimos 30 minutos UTC, deixa os já iniciados concluírem dentro do limite existente, e abandona um checkpoint que atravessou o dia, sem promover seu ponteiro nem reembolsar o orçamento passado. A finalização também verifica o dia dentro da transação. Um build interrompido mantém staging privado para a retenção protegida.

A proteção é opt-in do novo modo; os operadores e modos antigos mantêm a interface anterior. Nada disso foi publicado na homologação. A máquina não teve seu relógio alterado; todas as datas avançadas pertencem aos testes.

## Resultados das simulações

| Cenário | Dias | Gerações prontas | Máximo de versões retidas | Pico de itens | Itens finais | Interrupções por quota |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 9 vídeos | 2 | 92 | 5 | 45 | 27 | 0 |
| 100 vídeos | 3 | 40 | 6 | 600 | 485 | 0 |
| Crescimento de 9 para 100 vídeos | 3 | 74 | 6 | 600 | 500 | 0 |

As pausas preventivas por acúmulo/UTC são esperadas e diferem de esgotamento de quota. No cenário de 100 vídeos, houve 3.080 ticks com pausa preventiva; o ponteiro continuou disponível. Na rodada anterior, sem admissão, 100 vídeos acumulavam 2.410 itens ao fim de apenas um dia. Esta rodada demonstra limite do acúmulo nos casos testados, não uma certificação para toda configuração possível.

Agora a instrumentação conta também pedidos de leitura de documentos fora das reservas, inclusive polling. Por dia simulado: 14.392–14.469 no cenário pequeno; 15.043–16.226 no cenário de 100; 14.392–16.303 no crescimento. Tentativas de escrita/exclusão: até 3.877 por dia. A maior invocação usou 38 chamadas simuladas, abaixo do teto de 48; a troca OAuth real não foi feita nestes testes. Os orçamentos internos ficaram abaixo de 20 mil leituras, 4 mil gravações e 4 mil exclusões reservadas.

Essas contagens NÃO são faturamento real. A fixture conta os documentos pedidos e resultados das consultas, com mínimo de um; não modela todas as cobranças de índices, contenção, tráfego de usuários ou demais funcionalidades. A franquia é compartilhada com o aplicativo e precisa de margem global. Não usar esses números como garantia de capacidade gratuita em produção.

## Validação e pacote local

- 842 testes Node aprovados, sem falhas/skips; 21 focados na admissão, retenção e ciclo contínuo.
- Seis testes específicos aprovados no emulador Firestore real, projeto demo-clipzone-tests/127.0.0.1:8081: exclusão limitada, concorrência, orçamento, privacidade, admissão pendente e virada UTC. Emulador encerrado normalmente. A suíte completa de 141 testes anterior não foi reexecutada nesta rodada.
- Tipos frontend/backend, lint e dry-run aprovados.
- Bundle local congelado: 47a1dfcdd20eb4401006a38ca16ec363c3ca56d83d80f7d64b8f096931f28e2a; 104 fontes com hashes e os mesmos 43 assets API verificados.
- Nenhuma credencial foi aberta, nenhum recurso remoto foi consultado ou alterado e nenhuma inferência foi executada nesta rodada. O checkpoint anterior dos três arquivos está no workspace privado.

Worker conhecido preservado: df8da48f-975f-47a5-9424-4d2476f4a0fc. Ranking, jobs e cron continuam desligados no remoto. A nova flag de retenção não foi criada na configuração remota. O pacote congelado permanece com essas flags desligadas e não é um pacote de ativação.

## Próximo passo e limites

Preparar um piloto para medir CPU real de admissão, geração e limpeza, incluindo primeiro uso, com quantidade de passos, dados auxiliares e forma de acionamento claramente delimitados. Publicação do pacote, qualquer gravação/exclusão remota e eventual gatilho exigirão aprovação específica depois dessa preparação. Não instalar cron permanente para descobrir se o limite é atendido. CPU ainda não certificada, TikTok e demais gates de lançamento continuam pendentes. Nenhum commit ou push pelo agente.

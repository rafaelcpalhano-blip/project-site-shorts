# Ranking — ciclo diário e retenção local

Simulação acelerada de um dia UTC com o adaptador REST real e Firestore inteiramente em memória. Um passo limitado por minuto; intervalo de 30 minutos contado desde o snapshot. Não houve acesso externo, inferência, alteração remota, deploy ou agendamento.

| Fontes elegíveis | Gerações concluídas | Reserva de leituras | Reserva de gravações | Itens auxiliares acumulados | Interrupção por orçamento |
| --- | --- | --- | --- | --- | --- |
| 9 | 47 | 3.854 | 1.034 | 423 | Não |
| 100 | 29 | 11.455 | 3.857 | 2.900 | Sim |

Esses números representam o cenário simulado, sem novas interações. As reservas internas não são leituras/gravações faturadas. O intervalo não garante 48 publicações diárias: a aquisição do snapshot e a conclusão também levam tempo. O máximo observado de requisições por passo foi 25/37, abaixo do teto configurado de48.

As regressões confirmam interrupção sem mutação quando não cabe nova reserva, preservação do ranking vigente e dos dados primários, e retomada no novo dia UTC sem reescrever o orçamento anterior. A limpeza explícita simulada recusa as gerações atual e anterior e remove uma geração antiga (nove itens mais o registro da execução) sem alterar o conteúdo original.

## Pendências antes da rotina contínua

O modo ranking-only não executa retenção. A tabela mostra o acúmulo esperado sem limpeza; não ativar esse modo indefinidamente como se resolvesse o armazenamento. Preparar separadamente a integração de retenção limitada, preservando suas proteções e sem ativar por conveniência a manutenção de curtidas/rede.

Ainda é necessário validar CPU da geração e da limpeza no Workers, revisar margem global de quotas e autorizar especificamente eventual pacote remoto e agendamento. A simulação não certifica o limite de CPU do edge. Ranking/jobs permanecem desligados, sem cron; o intervalo local de30min continua aguardando o próximo deploy necessário, conforme decisão do proprietário.

Teste: tests/worker-ranking-isolation.test.mjs. Evidência: docs/evidencias/etapa-9-a-ranking-ciclo-diario.json. Tradução de Tibia e TikTok permanecem pendentes, sem novas tentativas nesta verificação.

Validação final: 803 testes Node aprovados, sem falhas ou skips; lint e conferência de whitespace aprovados. Nenhum commit ou push executado pelo agente.

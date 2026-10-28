# Etapa 3 — homologação do primeiro pacote de CPU

28/10/2026. Deploy e quatro reconfirmações em cache expressamente autorizados e concluídos, sem repetir tentativas ou executar nova inferência.

## Resultado

Worker df8da48f-975f-47a5-9424-4d2476f4a0fc ativo a 100%, anterior d6782c6c-7323-44a2-98fb-1aa39d85741a; bundle ed90acb58acfa3a0ed3cb18df4d6d198ad8e7451703956e294d2346ad9d91c37. Os 43 arquivos estáticos e os mesmos nove segredos foram preservados; 42 hashes públicos e 13 verificações de cabeçalhos/proteções passaram. A ACL e os bytes do arquivo privado existente foram conferidos, sem exposição de valores ou criação de credencial. O frontend continua em modo API.

| Amostra da reconfirmação de Doom em cache | CPU | Tempo total | Contexto observado |
| --- | ---: | ---: | --- |
| Antes 1 | 7 ms | 1176 ms | Rota já usada no isolate |
| Antes 2 | 8 ms | 922 ms | Mesma rota e isolate reutilizados |
| Depois 1 | 7 ms | 847 ms | Primeiro uso da rota no isolate |
| Depois 2 | 12 ms | 1495 ms | Primeiro uso da rota em outro isolate |

As quatro respostas foram HTTP 200. Duas janelas de 180 segundos registraram 17 e 25 eventos, sem exceções ou outcome exceededCpu. O pico de 12 ms excede o alvo de 10 ms, mas não configura por si só um erro efetivo de limite ou recorrência. Os corpos de possíveis páginas 1102 não foram inspecionados; não declarar ausência universal desse erro.

O caminho funcional foi o mesmo, mas o histórico dos isolates mudou: as amostras anteriores reutilizaram a rota; as posteriores foram primeiros usos da rota. Isso, o tamanho da amostra e a variação de rede impedem afirmar redução de CPU ou latência. A inicialização completa do ambiente da Cloudflare não foi certificada. Não comparar esses valores diretamente com os 16 ms da amostra anterior que executou IA.

## Segurança e dados

Preflight no painel: Spark; Firestore com cerca de 1,2 mil leituras/50 mil e 178 gravações/20 mil; Workers 130 requisições/100 mil; AI 41,76 neurônios/10 mil. Indicadores podem ter atraso. Nenhum upgrade, cron, job ou alteração de autenticação/quota foi feito. Ranking e diagnósticos de provedor continuam desligados.

Antes de cada reconfirmação, o hash do cache e os contadores foram verificados. Estado final: Doom ready/pt-BR, 633 caracteres, original de 617 preservado; tarefa com duas tentativas e orçamento diário com cinco, sem alteração desde o preflight. A tradução e a abertura do original foram conferidas na interface após o deploy. A rota de reconfirmação pode gravar manutenção de metadados; não foi um teste exclusivamente de leitura. Nenhum jogo novo ou vídeo foi publicado.

## Conclusão e próximo trabalho

A redução de chamadas REST permanece comprovada nos contratos locais (12→9 com tradução simulada; 7→6 em cache). Ganho real de CPU ainda não demonstrado. O pacote permanece na homologação controlada, sem aprovação de lançamento. Não aumentar automaticamente a quantidade de amostras ou executar inferências.

Próximo trabalho: investigar localmente o custo do primeiro uso da rota e do fluxo com IA; avaliar os demais endpoints críticos e a automação segura do ranking. TikTok continua pendente do suporte/validação no servidor. O relatório não encerra a Etapa 3 nem dispensa os bloqueios finais.

Evidência sanitizada: docs/evidencias/etapa-3-cpu-homologacao.json. Prova visual mantida fora do Git, no workspace privado. Nenhum commit ou push pelo agente.

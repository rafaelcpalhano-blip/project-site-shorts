# Etapa 4 — preparação local da retenção isolada do ranking

28/10/2026. Estado: código e testes locais preparados; NÃO aprovado para ativação remota. O Worker publicado continua df8da48f-975f-47a5-9424-4d2476f4a0fc, com ranking/jobs/cron desligados. A tradução retroativa do catálogo foi concluída separadamente, sem deploy.

## Mudança preparada

Novo modo interno ranking-with-retention, separado do ranking-only existente e da manutenção geral de curtidas/rede. O scheduled só o selecionará quando ranking e CLIPZONE_RANKING_RETENTION_ENABLED forem exatamente true. A flag nova não foi adicionada à configuração remota; sozinha não ativa nada. O modo geral explicitamente autorizado conserva a precedência anterior.

Um passo de geração tem prioridade. Somente quando o ranking ainda não está devido, a retenção pode descobrir e remover uma fatia de versões antigas. Descoberta limitada ao minuto 3 de cada quarto de hora UTC, com claim transacional durável que impede execução duplicada no mesmo slot. Uma fatia remove até 15 itens auxiliares; ao concluir, remove também o registro da geração. Não apaga vídeos, jogos, comentários ou curtidas.

Gerações atual e anterior, gerações com menos de duas horas e lease ainda ativo continuam protegidos dentro da transação de exclusão. Cursor e candidato persistem para retomada de fatias incompletas; páginas malformadas e estados futuros são recusados. Não se avança sobre o restante de uma página ao selecionar um candidato.

O custo interno de descoberta é reservado antes da varredura (40 leituras e três gravações). A exclusão usa o orçamento e a validação existentes (70 leituras, três gravações e as exclusões da fatia). A virada UTC não reescreve o orçamento do dia anterior. Reservas não são a contagem real faturada: polling de ranking e retries também precisam entrar na estimativa global antes de habilitar o cron.

## Evidência local

| Cenário simulado por minuto | Dias | Gerações | Registros auxiliares excluídos | Maior acúmulo de itens | Itens ao final | Ticks recusados por orçamento |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 9 vídeos elegíveis | 2 | 93 | 890 | 45 | 36 | 0 |
| 100 vídeos elegíveis | 1 | 28 | 393 | 2.425 | 2.410 | 572 |

Exclusões incluem itens e registros de execução. No cenário pequeno, reservas por dia: leituras 10.074/10.382, gravações 1.406/1.402 e exclusões 420/470. No stress: 14.230/3.901/393. Todas permaneceram abaixo dos limites internos 20 mil/4 mil/4 mil. Máximo de requisições externas simuladas por invocação: 29 no cenário pequeno e 37 no stress, abaixo do teto 48. O score e o intervalo de 30 minutos não foram alterados.

832 testes Node aprovados, sem falhas/skips; tipos, lint e dry-run aprovados. Três testes específicos com Firestore real emulado passaram: preservação/privacidade SDK, concorrência do claim e retomada/quota. Projeto demo-clipzone-tests em 127.0.0.1:8081; emulador encerrado normalmente. A suíte anterior de 141 testes não foi reexecutada inteira nesta rodada. Nenhum teste acessou dados remotos.

## Limitações que impedem ativar agora

O cenário de 100 vídeos evidencia que a taxa de limpeza atual não acompanha o acúmulo, embora o orçamento pare a geração de forma controlada. O resultado com nove vídeos não autoriza prometer funcionamento contínuo para qualquer crescimento. Antes da ativação: ajustar a política de backlog/pausa para manter acúmulo limitado sem reduzir proteções ou ampliar quotas; ampliar simulação com crescimento e interações; completar a estimativa global de operações faturadas; medir CPU de geração/limpeza no runtime real com aprovação específica.

A cadência de agendamento por minuto é somente uma hipótese das simulações; não foi criado cron no computador ou na Cloudflare. Não usar o dry-run desta preparação como autorização de deploy. Eventual pacote, piloto de exclusão remota e agendamento exigem escopo concreto e aprovação separados. A publicação pública, TikTok e os gates de CPU seguem pendentes. Nenhum commit/push pelo agente.



## Atualização posterior em 28/10/2026

O controle de acúmulo foi preparado e validado em uma nova rodada local; consultar etapa-4-ranking-controle-acumulo.md e sua evidência. Os resultados acima são históricos da versão sem admissão. A nova rodada limita a rotina a seis versões retidas, inclui crescimento por três dias e proteção de virada UTC. Ainda sem deploy, cron, exclusão remota ou aprovação de CPU.

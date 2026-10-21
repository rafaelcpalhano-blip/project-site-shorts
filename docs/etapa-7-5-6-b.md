# Etapa 7.5.6-B — base interna de ranking e consultas

Entrega local: 21/10/2026. Variante 24h/12h/6h e detalhamento de gerações horárias
aprovados pelo proprietário. Interface e rotas públicas de ordenação permanecem
para a C; nenhum agendamento, serviço externo, plano pago ou deploy ativado.

## Implementado

- Fórmula de publicação 24h, curtida/comentário elegível 12h e bônus 6h; pesos 2,
  1, 0,25 e 0,3. Usa massas de interações com origem temporal, nunca deduz atividade
  recente do contador total. Métricas ausentes/invalidas fecham a construção.
- Preparação idempotente: likeCount=0 somente quando ausente; mantém valores presentes
  e todos os outros metadados. Registro privado ausente recebe ready:false, nunca
  engajamento zero inventado. Novas publicações já nascem com likeCount=0.
- Contrato privado rankingMetrics/<shortId>: version=1, ready, shortId/gameId,
  asOf, likeMass, commentMass e commentContributors. As massas correspondem às
  contribuições elegíveis decaídas até asOf; não são contagens totais de pessoas.
- A manutenção transacional dessas massas, admissões/caps e inicialização histórica
  confiável serão integradas na C. Nenhum total existente é convertido em recência.
  Marcadores ready:false são uma barreira deliberada de prontidão, não ranking válido.
- Coleta paginada de shorts e leitura de jogo/métrica no MESMO readTime. Constrói
  somente de shorts publicados e jogos ativos naquele instante. Snapshot mantém
  precisão temporal do Firestore. Pontuação de todos os itens usa a mesma data-base.
- Staging em rankingItems + metadata em rankingRuns. rankingState/current só muda
  após conclusão e verificação de lease. Queda, dados inválidos ou orçamento impedem
  promoção e preservam a geração anterior. Retentativa cria novo ID, sem reaproveitar
  itens incompletos. IDs do cache preservam desempate pelo ID original do short.
- Um construtor por lease de 5min, renovado por lote; construção máxima 20min e
  intervalo mínimo de 1h entre publicações bem-sucedidas. Sem timer/daemon instalado.
- Consultas internas latest/oldest/likes/relevant, páginas até 15, cursor vinculado
  a modo/jogo/instante, limite 30 candidatos e possibilidade de página parcial/vazia
  com continuação. A coleção não é ordenada no navegador.
- Todas as modalidades revalidam short e jogo ATUAIS, independentemente da leitura
  histórica. Cursores expiram em 30min. Mais Relevante exige geração até 90min e
  informa sua data-base; ausência/vencimento não vira fallback silencioso.
- Seis índices compostos necessários adicionados ao manifesto: oldest/likes/relevant,
  cada um geral e por jogo. latest reutiliza índices existentes. Não publicados.
  Coleções de controle/métricas sem índices de campos dispensáveis. Regras atuais
  já negam SDK público; não foram ampliadas.

## Limites operacionais locais e custos

Controles conservadores, não novos limites de publicação:
- No máximo 300 documentos de origem examinados por construção e 100 vídeos ativos
  na geração. Ao exceder: falha completa, nunca top 100 apresentado como ranking global.
- Reserva por tentativa: 762 leituras e 124 gravações, antes da coleta. Por dia UTC:
  20.000 leituras reservadas, 4.000 gravações e 4.000 exclusões de manutenção.
  Reservas de tentativa falha não são devolvidas, evitando subestimar consumo.
- A reserva inclui margem para páginas, jogos distintos, métricas, lease, promoção
  e diagnóstico de falha. Não equivale a faturamento: retentativas do Firestore,
  operações rejeitadas, chamadas do próprio controle e virada UTC podem acrescentar
  consumo; outros módulos compartilham as cotas do projeto e precisam monitoramento.
- 24 tentativas completas reservam 18.288 leituras e 2.976 gravações/dia. É reserva
  máxima do módulo, não consumo medido nem garantia de franquia para o site inteiro.
- Mantém orçamento da A para páginas: até cerca de 91 leituras de documentos,
  chegando a 92 na primeira página de relevância ao consultar o apontador. Índices,
  consultas vazias, sessão e retentativas podem consumir adicionalmente.
- A preparação inicial é operação separada limitada a 300 fontes; diagnóstico e
  releituras dos registros têm custo próprio. Produção/nuvem não foi acessada.

Retenção manual: cache de geração antiga com mais de 2h, fora da geração atual e
anterior e sem lease ativo. Uma chamada remove até 30 itens; após terminar, outra
chamada pode remover metadados da execução. Nunca exclui shorts/jogos/métricas.
Relê o estado em transação e respeita orçamento. Cache órfão sem histórico é erro,
sem exclusão ou falsa conclusão. Sem TTL pago; não há limpeza agendada.
Coleções/budgets por dia e métricas ainda exigirão política de operação/monitoramento
na C; nenhum crescimento contínuo foi iniciado aqui.

## Comandos manuais locais

    node scripts/ranking-local.mjs inspect
    node scripts/ranking-local.mjs prepare
    node scripts/ranking-local.mjs build
    node scripts/ranking-local.mjs prune ID_DA_GERACAO

Fixos em demo-clipzone:8080, sem credencial/projeto de nuvem. build não está pronto
para os dados atuais: métricas pendentes provocam ranking-metrics-not-ready e não
promovem geração. Não preencher métricas fictícias para liberar o comando. prune
é uma página por execução, sem loop irrestrito. A implementação de C deve integrar
validação pública completa/DTO, amarração segura de cursor, coleta de métricas e UI
antes de expor consultas; estas funções internas não foram conectadas ao HTTP.

## Validação e dados locais

19 testes distintos aprovados: 11 unitários e 8 REST/regras no emulador isolado 8081.
Incluem métricas inválidas, preparo/idempotência, snapshots, quatro modos em três
escopos, concorrência, falha, orçamento, retenção, privacidade, moderação atual e
regressão das cinco publicações/duplicatas após o inicializador de contador.
Lint/build completos aprovados. Ajuste final de cache órfão verificado somente por
teste/lint localizado; suítes aprovadas sem alteração relacionada não foram repetidas.

Diagnóstico no desenvolvimento: 10 shorts, 10 contadores ausentes e 10 métricas
pendentes. API pausada, preparação aprovada aplicada, 10 registros preparados;
comparação confirmou preservação dos demais metadados. Nenhuma curtida, comentário,
vídeo ou pontuação fictícia criado. Nenhuma geração construída/publicada no 8080.
API reiniciada para carregar inicializador de novos shorts; sessões antigas podem
precisar renovação como antes. HTTPS: sessão 204; feed 200 com 10 shorts e contadores
válidos; tentativa de order no endpoint antigo 400, comprovando ausência de exposição
prematura; rankingState/current ausente. Sem nova conferência visual nesta B.

## Próxima etapa

B concluída como base de servidor/preparação. 7.5.6-C aguarda autorização: conectar
métricas elegíveis/caps, validar preparação histórica sem inventar datas, gerar ranking
local válido e integrar rotas/cursor e as quatro opções na interface. Só então liberar
modos futuros; preservar Ultimo Postado padrão e busca textual desativada. Reavaliar
limites/custos com as operações de manutenção de métricas antes de qualquer produção.

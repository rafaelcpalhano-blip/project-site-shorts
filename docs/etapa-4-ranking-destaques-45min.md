# Etapa 4 — Destaques por jogo e consumo diário: validação local

## Resultado

O protótipo local mantém até quinze destaques por jogo e mostra até quinze no geral, sem continuação no modo Mais Relevante. Os mesmos registros servem aos dois escopos: nenhum vídeo é duplicado para manter uma lista geral separada. Se um jogo tiver sete vídeos elegíveis, serão guardados sete, não quinze posições reservadas.

O intervalo passa de trinta para 45 minutos, contado a partir do snapshot, sem alterar a fórmula de pontuação. A seleção ocorre somente após avaliar todos os candidatos dentro dos limites existentes de cem vídeos elegíveis/trezentos documentos de origem. Um candidato inválido também bloqueia a geração quando ficaria fora dos quinze vencedores. Ordenações recentes, antigas e por curtidas mantêm sua paginação.

A validação é local. Nenhum deploy, credencial real, consulta remota, cron, inferência ou alteração de dados remotos foi executado nesta preparação. Não há aprovação de ativação permanente ou lançamento.

## Por que não duplicar rankings

O top quinze global sempre está contido na união dos quinze melhores de cada jogo: um vídeo que tivesse quinze concorrentes melhores no próprio jogo não poderia integrar os quinze melhores globais. Portanto, basta gravar uma única vez a seleção por jogo e consultar a mesma coleção com ou sem filtro. A ordenação continua score, data de criação e ID, todos descendentes, com desempate determinístico.

Isso também limita a economia: cem vídeos de um jogo caem para quinze itens; cinco jogos de vinte vídeos resultam em 75; dez jogos de dez vídeos continuam com cem. Os testes cobrem essas distribuições e um vencedor encontrado na última página de consulta.

## Redução do trabalho por execução

- Ticks sem construção ativa e com ranking ainda válido evitam abrir uma transação do gerador apenas para verificar o intervalo. No caminho ocioso sem limpeza, as chamadas caem de cinco para duas. A limpeza continua nos slots previstos e um checkpoint ativo ou malformado nunca é ignorado.
- Leituras projetadas de snapshot do ranking usam lotes de até oito documentos com o mesmo readTime. O limite de quatro das leituras correntes e das transações permanece intacto. Lotes inválidos, incompletos ou malsucedidos não provocam recuperação com leituras atuais.
- Construções antigas em staging que excedam quinze por jogo são recusadas; o ponteiro público não é trocado e os itens privados existentes ficam preservados para recuperação/limpeza controlada.

Comparação local minificada em workerd com o pacote anterior otimizado (lotes de quatro), mesma fixture, mesma saída e mesmos passos nos dois cenários abaixo. Uma resposta OAuth foi simulada por invocação, sem assinatura ou credencial real nessa comparação.

| Cenário | Chamadas totais antes → depois | Observação |
| --- | --- | --- |
| Dez vídeos/oito jogos, com proteção do piloto | 39 → 37 | Coleta 13 → 11; início continua em 13 |
| Cem vídeos em cem jogos, modo automático | 123 → 97 | Saída de cem itens preservada; coleta inicial 14 → 10 |

Essas contagens não são CPU medida. O início ainda tem o mesmo número de chamadas neste pacote. A assinatura na autenticação nova e o custo mínimo de inicialização continuam pendentes; não há evidência de que este ajuste sozinho alcance dez milissegundos.

## Simulação de um dia

Mesma população sintética constante, 1.440 ticks por cenário, relógio UTC, orçamento interno, pausa por retenção e limpeza existentes. Antes: metodologia de trinta minutos e todos os itens; depois: 45 minutos, quinze por jogo, snapshot de oito e atalho ocioso. Não é tráfego real nem previsão de cobrança.

| População | Solicitações de leitura antes → depois | Tentativas de gravação antes → depois | Ciclos completos antes → depois |
| --- | --- | --- | --- |
| Dez vídeos/oito jogos | 13.123 → 5.718 | 1.488 → 1.096 | 46 → 31 |
| Cem vídeos/um jogo | 14.242 → 12.105 | 2.744 → 1.587 | 16 → 31 |
| Cem vídeos/dez jogos | 15.250 → 13.251 | 2.744 → 2.694 | 16 → 16 |
| Trezentas origens/cem vídeos em cem jogos | 17.297 → 16.459 | 2.978 → 2.932 | 15 → 15 |

Solicitações de leitura contam documentos pedidos e pelo menos um por consulta vazia; não certificam leituras debitadas. Índices, retries reais, OAuth, tráfego de visitantes, outras funções e latência real não estão modelados. Tentativas de gravação/exclusão são contadas no protocolo, não recibos de faturamento. Reservas internas são outra medida e não foram convertidas em débito.

No cenário pequeno, pedidos de leitura caíram aproximadamente 56,4% e chamadas REST totais 8.725 → 4.486. No cenário concentrado em um jogo, a nova seleção também diminui acúmulo e permite concluir mais ciclos com menos gravações. Nos cenários distribuídos, quase todos os vídeos ainda cabem nas listas e a economia de itens pode ser zero.

## Limitação de cadência identificada

45 minutos é o intervalo de elegibilidade para começar outra geração, não promessa de publicação exata a cada 45 minutos. A construção é segmentada, existe proteção de virada UTC e novos ciclos param quando há seis gerações retidas. A limpeza atual remove até quinze itens por slot de quinze minutos e protege versões atual/anterior/recentes.

Com cem itens por geração distribuídos entre muitos jogos, a limpeza não acompanha a taxa desejada: os dois cenários maiores ficaram em dezesseis/quinze ciclos completos por dia, mesmo após a mudança. No pior caso modelado, a reserva de leituras terminou em 19.354 de 20.000. Nenhum teto foi aumentado para contornar isso. Por isso a cadência ainda não está certificada para todas as distribuições e o pacote não está pronto para ativação permanente.

O próximo refinamento local deve avaliar o custo de início e uma retenção com capacidade sustentável, mantendo reserva de quota, proteção das gerações recentes, atomicidade e tetos por execução. A baixa escala esperada ajuda no consumo provável, mas não substitui esses controles.

## Verificação e pacote

- Suíte geral: 871 testes aprovados/zero falhas. Depois foi acrescentado um caso de checkpoint legado; os dez testes direcionados de destaques, incluindo esse caso extra, passaram. Não somar os dez como se fossem todos adicionais à suíte.
- Seis testes no emulador Firestore isolado aprovados, incluindo lote de oito, seleção por jogo/global, publicação somente ao concluir e revalidação de vídeo removido sem paginação extra.
- Tipos da aplicação/servidor, build e lint aprovados. A seleção máxima e o pior caso de trezentas origens continuam abaixo de trinta passos nos testes.
- Build de revisão congelada explicitamente em modo API, 43 arquivos estáticos. Assets públicos de nome fixo, PWA e cabeçalhos preservados; bundles com hash e texto do feed atualizados. Nove referências de segredos preservadas, arquivo privado não aberto.
- Dry-run aprovado, ranking/jobs desligados, sem bindings temporários de piloto/retenção ou cron. Não foi consultada a versão remota nesta etapa.

Bundle local: `357abc43bd2124c0c497d9a81399702ebb9e42aea5cad70fe9cde30081b4bd78`.

TikTok continua pendente separadamente. O checkpoint incompleto privado do último piloto não foi alterado. Recuperação remota, novo deploy, novo piloto ou ativação precisam de autorização específica de um pacote concreto.

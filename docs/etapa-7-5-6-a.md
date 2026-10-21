# Etapa 7.5.6-A — avaliação local de ranking e paginação

Data: 21/10/2026. Escopo autorizado: simulações, prova no emulador e orçamento.
Nenhuma ordenação, índice, migração, serviço, agendamento ou endpoint foi habilitado.
Código da aplicação preservado. Fixtures somente em demo-clipzone-tests:8081;
nenhuma escrita em demo-clipzone:8080 ou no Firebase real. Git inicialmente limpo.

## Resultado e recomendação

A prova de paginação funcionou e o orçamento foi confirmado como contagem de operações
no protótipo. O modelo temporal inicial NÃO deve ser promovido sem revisão: quando
publicação, interações e bônus decaem todos com meia-vida de 24h, a mesma constante
multiplica todos os scores. Sem novas interações/publicações, a ordem nunca muda.
O bônus de jogo novo também permanece uma vantagem percentual de 15%, indefinidamente,
mesmo que sua contribuição absoluta diminua. Isso conflita com o efeito temporário
esperado. A simulação registra essa limitação, sem disfarçar queda absoluta como
perda real de posição.

Variante experimental recomendada para aprovação, ainda não adotada na aplicação:

    R(t) = 2 × D24(t-publicação)
         + soma(D12(t-primeira_curtida_elegível))
         + 0,25 × soma(D12(t-criação_do_comentário_elegível))
         + B × D6(t-publicação)
    Dh(idade) = 2^(-idade/h)
    B = 0,3 se a publicação ocorreu nos primeiros 7 dias completos do cadastro do jogo;
        0 nos demais casos.

Contribuições somente quando ativas/aprovadas. O instante original é mantido ao
reativar, sem reciclar uma curtida ou comentário como impulso recente. Sem análise de
sentimento: críticas e elogios recebem o mesmo peso. Registros sem evidência confiável
não terão datas ou elegibilidade histórica inventadas na futura preparação.

Caso ilustrativo: A teve pico de 20 curtidas 24h antes; B acabou de ser publicado e
não tem interações. No modelo comum: 11 contra 2, e 72h depois 1,375 contra 0,25;
A nunca perde para B. Na variante: 6 contra 2, e depois 0,2031 contra 0,25; B ultrapassa.
O bônus percentual na variante cai de 15% para 1,875% em 24h.

A variante elimina a chave constante equivalente: precisa atualização temporal da
ordenação. Recomendação para detalhar na B, sujeita a aprovação: gerações completas
no Firestore, inicialmente com intervalo de 1h; processamento paginado fora das
visitas, publicação do apontador só após conclusão, preservação da geração anterior
em caso de falha e retenção limitada. Nada disso foi implementado/agendado na A.
Mais Relevante deverá mostrar a data-base da geração; não anunciar pontuação ao vivo.
Uma atualização por hora pode atrasar a entrada de interação/post novo nesse modo,
embora Ultimo Postado continue refletindo a publicação normalmente. Exige aprovação.

Gerações com cálculo consistente precisam usar uma fonte comum de métricas, controle
contra alterações durante a construção e expiração explícita para resultado vencido.
Estes são requisitos da futura implementação, não garantias fornecidas pelo protótipo.
Não publicar geração parcial, truncada aos primeiros candidatos ou com coleta inconsistente.

## Proteções simuladas e limites reais

- Até 20 primeiras curtidas e 10 contribuições de comentário por short/hora UTC.
- Até um comentário contribuinte por identidade/short/dia UTC. É dia de calendário,
  não janela móvel de 24h. Publicação/contagem normal não é limitada por esse teto.
- Admissão consumida não é devolvida ao descurtir/remover, evitando reciclar vagas;
  contribuição ativa é retirada. Reativação conserva origem temporal/admissão.
- Cada par visitante/vídeo contribui uma vez; pedido duplicado não soma novamente.
- Pendentes/rejeitados não geram pontuação. Aprovação real é pré-condição da simulação.
- Opinião não entra na fórmula. O modelo não instala nem presume detector de fraude.

Um ataque com 500 repetições de uma identidade contribui uma vez; 500 identidades na
mesma hora ficam limitadas a 20 contribuições. Porém 20 novas identidades/h por 24h
conseguem 480 contribuições: o modelo não distingue pessoas reais de identidades
renovadas. A pontuação comum desse ataque chegou a 343,2579 contra 55,4545 do cenário
orgânico de seis horas. O cap limita rajadas, não comprova legitimidade. Não afirmar
resistência completa à manipulação. Evolução de admissão/monitoramento exige escopo
próprio; não ativar novos serviços ou identificar pessoas por fingerprint nesta etapa.

## Prova de readTime no emulador

Protótipo isolado em scripts/experiments/ranking-snapshot.mjs, recusando execução
fora de FIRESTORE_EMULATOR_HOST=127.0.0.1:8081. Não importado pelo app. Usa REST real
com limite 15 e projeção de campos; não ordena coleção no navegador. A ordenação em
memória presente no teste é somente o oráculo para comparar o resultado do Firestore.

Verificado:
- Snapshot preserva valor anterior e não inclui inserções posteriores. readTime,
  incluindo precisão submilissegundo, é mantido como texto no cursor.
- Quatro ordenações, cada uma nos escopos geral, g1 e g2: todas as páginas reproduzem
  a ordem global daquele instante, sem IDs repetidos/perdidos após mudanças.
- Cursor vinculado ao modo/jogo/instante; trocar escopo rejeita a consulta. Mais de
  30min exige novo feed, em vez de migrar silenciosamente para dados atuais.
- Moderação é atual: reconsulta short e jogo, com cache de jogo só dentro da chamada.
  Snapshot não permite exibir short removido ou jogo atualmente banido.
- Até 30 candidatos por chamada, 15 itens retornados; página pode ser parcial/vazia
  com continuação. Um lote completo pode oferecer continuação que leva a página vazia;
  não se garante fim enquanto não houver evidência suficiente.
- Consulta vazia devolve readTime. orderBy omite campos ausentes: a prova reproduz a
  perda de legados e demonstra por que a preparação completa é pré-condição.

O protótipo é prova de viabilidade, não contrato público pronto: validação completa,
assinatura/amarração de cursor à origem, erros/DTO e emissão de sessão devem ser
integrados/testados na etapa aprovada. O emulador não comprova índices em produção,
cobrança real ou comportamento de toda combinação concorrente da aplicação.

## Custos estimados e medidos

No pior caso observado, a chamada fez 2 consultas, leu 30 candidatos, releu 30 shorts
e 30 jogos atuais: 90 leituras de documentos. Somando a leitura do limitador, o
orçamento é 91, com 1 escrita do limitador. Ele não é limite financeiro universal:
consultas vazias, filtros, índices, sessões e retentativas exigem contabilização.
Consulta típica de 15 itens/um jogo: aproximadamente 32 leituras/1 escrita; 15 jogos:
46 leituras/1 escrita. Ver tabela determinística no relatório de resultados.

1.000 chamadas típicas de um jogo equivalem a cerca de 32.000 leituras de documentos;
500 chamadas no pior caso, cerca de 45.500, antes de outras funcionalidades/índices.
Não prometer alto volume dentro da franquia gratuita somente pelo limite 30.
Uma geração materializada proposta pode adicionar uma leitura do apontador à primeira
página: reservar até 92 nessa variante; confirmar o contrato na B, sem alterar o
orçamento por decisão implícita.

Limite inferior para gerações horárias de N vídeos com métricas já agregadas:
24N leituras/dia; 24(N+1) gravações/dia; aproximadamente 24N exclusões/dia em regime
estável se gerações antigas forem removidas manualmente/pela rotina futuramente
aprovada, sem TTL pago. Não inclui manutenção de admissões, métricas, falhas,
concorrência, visitas ou preparação inicial. Apenas a leitura de N métricas não
constitui por si só snapshot consistente; esses controles adicionam operações.

- 100 vídeos: pelo menos 2.400 leituras e 2.424 gravações/dia.
- 500: 12.000 leituras e 12.024 gravações/dia.
- 1.000: 24.000 leituras e 24.024 gravações/dia; já excede 20.000 gravações/dia da
  franquia gratuita antes do resto do site. Frequência/capacidade precisam aprovação,
  monitoramento e orçamento reservado; não ativar faturamento automaticamente.

O Firestore gratuito também tem limites compartilhados de leituras, exclusões e
armazenamento. Índices/retentativas podem consumir mais que as estimativas. Não foi
feito Query Explain no projeto real, nem ativado serviço/billing para medições.

## Testes e reprodução

- node --test tests/ranking-model.test.mjs: 16 aprovados.
- node scripts/firebase-local.mjs test ranking-snapshot.test.mjs: 7 aprovados.
- node scripts/simulate-ranking.mjs: relatório determinístico, sem rede/banco.
- ESLint somente nos cinco arquivos experimentais/de teste: aprovado. Após a variante,
  foram verificados novamente somente os três arquivos atingidos. Não repetida suíte
  de emulador sem alteração relacionada, nem testes anteriores de funcionalidades.
- Sem build/lint geral: não houve integração ou alteração estrutural do app. Nenhuma
  dependência nova, alteração de índices/regras, restart da API ou deploy.

Total: 23 testes distintos aprovados. São provas experimentais; nenhuma funcionalidade
nova aparece na página e nenhuma conferência visual é necessária nesta subetapa.
Relatório: [etapa-7-5-6-a-resultados.md](etapa-7-5-6-a-resultados.md).

## Próxima autorização

7.5.6-A concluída como avaliação. B/C não iniciadas. Antes de preparar os dados ou
integrar consultas, o proprietário deve aprovar a variante 24h/12h/6h e o detalhamento
local de gerações completas com intervalo inicial de 1h e controles de orçamento.
Não considerar frequência/arquitetura operacional aprovadas pela autorização da A.

Fontes oficiais consultadas em 21/10/2026:
- https://firebase.google.com/docs/firestore/pricing?hl=pt-br
- https://firebase.google.com/docs/firestore/reference/rpc/google.firestore.v1#runqueryrequest
- https://firebase.google.com/docs/firestore/query-data/order-limit-data

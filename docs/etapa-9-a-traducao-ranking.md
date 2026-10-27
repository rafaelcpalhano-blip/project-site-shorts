# Etapa 9-A — tradução e ranking: preparação operacional

27/10/2026. Preparação local solicitada pelo proprietário. Versão de homologação de referência: `42c847fa-f9c8-4497-9e9c-c4d0f16e6de9`. Nenhum deploy, segredo remoto, cron, inferência real ou documento remoto alterado nesta rodada. TikTok continua pendente.

## Tradução

A integração Workers já foi publicada desligada. A configuração local tem token AI e account ID correspondente à homologação; conferência restrita à presença e correspondência, sem exibir valores. Isso não confirma validade/permissões atuais do token nem disponibilidade da franquia.

Preparado fora do repositório um pacote congelado para aprovação: bundle compilado, mesmos 43 arquivos estáticos do pacote anterior, `CLIPZONE_TRANSLATION_ENABLED=true`, account ID da mesma conta e nome do segredo adicional `CLOUDFLARE_AI_TOKEN`. Nenhum valor privado consta da configuração ou deste relatório. Os oito segredos existentes deverão ser preservados; ranking, jobs e diagnósticos permanecem false, sem triggers novos. Nenhuma nova credencial, binding AI, serviço ou dependência é necessária.

Antes da execução remota autorizada: reconferir versão/hashes, Workers Free e margem de Workers AI, validar o token existente sem expor valores e interromper se houver solicitação de pagamento, divergência de conta, token inválido ou quota insuficiente. Não publicar flag habilitada sem o segredo preparado. O deploy/configuração de segredo ainda exige aprovação específica deste pacote.

Após ativação, coletar CPU e reconfirmar um único jogo IGDB legítimo escolhido pelo proprietário no fluxo existente. A tradução é disparada na confirmação do catálogo, nunca por visita à ficha. Não traduzir todos os jogos existentes automaticamente. Preservar descrição original, nomes, cache, lease e limites de 20 tentativas/dia e 3 por jogo/versão/dia. Falha mantém o original e aplica cooldown, sem invalidar o cadastro ou consumir cota de vídeos. A desativação da flag interrompe novas inferências, sem apagar traduções salvas.

Estimativa de uma tentativa concluída: aproximadamente 5 leituras e 4 gravações de documentos, além do fluxo de confirmação do jogo. Cache exige leitura do jogo e evita nova inferência. Conflitos, retries e falhas mudam a contagem; isso não é medição faturada nem reserva de quota da conta. O custo de inferência depende do texto/tokens; 20 tentativas não equivalem a uma garantia de neurons disponíveis.

## Ranking isolado das retenções

Adicionado `CLIPZONE_RANKING_ENABLED`, desligado por padrão e nos dois manifestos locais. Com ranking=true e jobs=false, scheduled chama apenas `maintenance('ranking-only')`. Quando a geração não está vencida, retorna not-due sem consultar/executar limpezas. Jobs=true mantém o comportamento anterior completo e continua desligado. Nenhum endpoint público de manutenção foi criado; a geração nunca é disparada por um visitante.

O modo exclusivo preserva snapshot, lease, limite diário, limite de 48 dispatches por invocação com uma reserva de limpeza/transação e promoção atômica somente após completar o staging. Não edita shorts, jogos, métricas de engajamento, comentários ou curtidas; suas escritas são nos estados, orçamento, runs e itens derivados do ranking. Não faz bootstrap de métricas nem reparos de registros antigos. A leitura anterior havia confirmado metrics ready/version1 e ausência de current; isso precisa ser reconferido antes da primeira geração real.

Proposta de primeira homologação, ainda sem execução: conferir Spark e margem de quota, gerar somente um ranking em passos limitados e observar CPU por passo, frio e quente. Parar em métricas ausentes, contador inválido, concorrência, orçamento, fonte excessiva, erro de transporte ou exceededCpu/1102. Não repetir cegamente após resposta perdida: reler checkpoint. Uma falha mantém o ponteiro anterior; staging parcial privado pode permanecer e não deve ser apagado por inferência. O mecanismo local/operador e os tetos da execução real serão revisados antes da aprovação de escritas; não executar a geração monolítica local contra o remoto como substituto do caminho segmentado Workers.

## Cadência e consumo: limites conhecidos

Uma geração isolada não resolve o funcionamento contínuo: o leitor exige computedAt com até 90 minutos, e uma renovação passa a ser devida após uma hora do snapshot. A construção usa 15 fontes/20 itens por passo, lease de 5 minutos e duração máxima de 30 minutos.

O ensaio workerd existente mostrou 100 jogos distintos em 14 passos, até 38 dispatches por passo sem OAuth. Com 300 fontes (100 elegíveis), mostrou 28 passos e snapshot de 26 minutos na publicação. Uma execução por minuto é uma hipótese para homologação em baixo volume, não uma agenda aprovada: no pior volume, a renovação acaba perto do vencimento e deixa pouca margem para atrasos/retries. Um único passo por hora é insuficiente. Conferir volume real e margem antes de escolher cadência ou ampliar capacidade; não mudar validade, limites ou segurança para ocultar falta de capacidade.

As reservas internas continuam 900 leituras/180 gravações por geração, com limite diário interno de 20.000/4.000. As cobranças internas da implementação são estimativas de proteção e não contabilidade Firestore. Como referência para uma fonte elegível e sem retries, a fórmula atual registra charge interno de cerca de 58 leituras/14 gravações; 100 fontes elegíveis, cerca de 395/133. Além disso, ticks not-due fazem leituras de estado (normalmente seis documentos), tráfego do feed consome suas próprias leituras, e falhas/transações repetidas podem adicionar consumo. Não prometer consumo diário a partir apenas do número de vídeos.

O modo ranking-only não limpa gerações antigas. Antes de mantê-lo recorrente, definir retenção separada de caches/orçamentos/runs para evitar crescimento de armazenamento. Não habilitar todas as retenções junto por conveniência. A retenção específica e qualquer cron exigem revisão e autorização próprias.

## Validação desta rodada

- 7 novos testes: not-due sem retenção nos quatro slots; ciclos REST com 0/1/31/100 fontes; fonte inválida preservando ponteiro e dados; scheduled opt-in estrito e compatibilidade do modo anterior.
- Suíte Node completa: 764 aprovados, zero falhas/skip. Os 46 testes direcionados já estão incluídos nesse total.
- Tipos frontend e servidor, lint dos arquivos alterados e dry-run Workers aprovados. A alteração é de servidor/configuração; arquivos estáticos permanecem os mesmos.
- 16 contratos existentes passaram no workerd local, com rede externa bloqueada e fixtures. Esses contratos não são sete testes novos de isolamento executados no edge.
- CPU de produção, validade do token AI, quota atual, tradução real e primeira geração remota não foram medidos/executados. Não declarar os dois recursos resolvidos na homologação antes disso.

## Referências consultadas em 27/10/2026

- [Workers AI: preços e franquia](https://developers.cloudflare.com/workers-ai/platform/pricing/): 10.000 neurons/dia na alocação gratuita; excesso falha sem upgrade. Manter o modelo atual e não habilitar modelos que exijam pagamento ou créditos.
- [Workers: limites](https://developers.cloudflare.com/workers/platform/limits/): respeitar CPU e subrequests, distinguindo tempo de espera de CPU. Teste local não certifica CPU faturada no edge.
- [Firestore: franquia gratuita](https://firebase.google.com/docs/firestore/quotas): 50.000 leituras/dia, 20.000 gravações/dia, 20.000 exclusões/dia, 1 GiB e 10 GiB/mês de saída. Franquia compartilhada; reset no horário do Pacífico, diferente do orçamento UTC interno. Não ativar TTL, backup gerenciado ou cobrança.

## 27/10/2026 — ativação de tradução autorizada e publicada

O proprietário aprovou especificamente configurar o token AI existente e publicar o pacote de tradução somente na homologação; escolheu Tibia para a primeira conferência. Painel Cloudflare confirmou Workers Free e 0/10.000 neurons hoje; verificação oficial do token retornou ativo na mesma conta. Isso não certifica permissão de inferência até a chamada legítima. Nenhuma nova credencial ou plano criado.

Publicado Worker `8c3d7514-851f-4e76-bebc-782387a5c339`, anterior `42c847fa-f9c8-4497-9e9c-c4d0f16e6de9` registrado para eventual rollback. Os 43 arquivos estáticos foram preservados; hashes dos 42 públicos e 13 contratos remotos aprovados. Nomes dos nove segredos conferidos, preservando oito valores anteriores e acrescentando somente CLOUDFLARE_AI_TOKEN. Novo arquivo privado fora do Git com ACL usuário/SYSTEM; arquivo antigo e ambiente local intactos. Duas preparações interromperam antes de gravar segredos/deploy por incompatibilidade do módulo ACL do PowerShell antigo; resolvido usando PowerShell atual instalado, sem relaxar a proteção. Arquivos vazios dessas tentativas não contêm credenciais.

Tradução habilitada; ranking, jobs e diagnósticos false; nenhum trigger. Nenhuma inferência ou escrita editorial foi feita pelo agente nesta publicação. Reconfirmação de Tibia pelo proprietário combinada durante coleta de CPU; resultado e qualidade ainda pendentes. Não traduzir lote de jogos por inferência.

Operação futura: o Worker agora tem **nove** segredos. Usar o pacote privado de segredos atualizado registrado no manifesto operacional fora do Git; não reutilizar cegamente os runners antigos que exigem oito ou a configuração versionada com flags desligadas. Não anexar o arquivo privado ao Git. A primeira geração e recorrência do ranking permanecem pendentes e não foram autorizadas por este deploy de tradução.

## Tibia — tentativa única e incompatibilidade de resposta

O proprietário informou que a ficha continuava em inglês. A primeira janela registrou 20 eventos de navegação, sem pesquisa/confirm; leitura pontual mostrou Tibia IGDB ativo, descrição de 340 caracteres, sem tarefa e zero tentativas no dia. Em seguida, o agente realizou a confirmação única do Tibia exato na pesquisa oficial, dentro da homologação autorizada, sem publicar vídeo ou criar outro jogo. A tarefa terminou failed/attempts=1; original preservado e retryAt 2026-10-27T06:00:43.188Z (03:00:43 de Brasília; nova tentativa somente a partir de 03h01). Nenhum reset de contador, espera ou fonte foi aplicado.

A segunda janela confirmou pesquisa HTTP200/7ms CPU e confirmação HTTP200/19ms CPU, sem exceção/exceededCpu. HTTP200 de confirmação não prova sucesso da tradução opcional. O pico de 19ms ainda exige investigação e não aprova CPU para produção; amostra única, sem comprovação de inicialização fria para a tradução. Nenhuma suspensão/configuração automática foi aplicada. Painel Workers AI após a tentativa mostrou 7,67 neurons usados de 10.000; total observado, não atribuição contábil independente por chamada.

Consulta somente de leitura ao esquema oficial do mesmo modelo confirmou saída chat.completion em choices[].message.content. O adaptador publicado só lia result.response. Incompatibilidade confirmada e causa provável da falha, sem certeza retrospectiva da resposta descartada, que não foi armazenada. Catálogo do modelo acessível HTTP200; detalhes administrativos do próprio token retornaram403 (permissão de gestão), o que não demonstra falta de permissão AI ou ausência de restrições de IP. Nenhuma permissão foi alterada.

Correção local aceita tanto o formato legado quanto uma única conclusão de chat finalizada com stop, índice0 e papel assistant. Rejeita formatos mistos, múltiplas escolhas, truncamento, ferramentas e recusa. Ignora reasoning_content sem armazená-lo; mantém validações de nomes, tamanho, HTML, hash/cache e limites existentes. Três testes novos e suíte completa767/0/0, tipos/lint e dry-run aprovados. Bundle congelado 1131ea10d188c56de63f8165945b791c7775d9c2b415c2e609cf847175fc47a8, mesmos43assets e nove segredos. Ainda não publicado: aguarda aprovação específica do pacote corrigido; após publicar, repetir apenas uma tentativa legítima de Tibia depois do cooldown e coletar CPU. Não alegar tradução resolvida antes disso.

Ranking continua desligado, sem primeira geração ou cron. Spark confirmado no painel atualizado: pico de sete dias de891 gravações e cerca de4,6mil leituras; não é contador instantâneo de saldo. TikTok permanece pendente.

## Protocolo corrigido publicado; próxima tentativa respeita a espera

O proprietário autorizou especificamente o pacote corrigido e uma tentativa adicional única após 03h01 de Brasília. Publicado Worker `d26c55de-ff11-47ef-8fca-1841a6a6e526`, anterior `8c3d7514-851f-4e76-bebc-782387a5c339`, bundle `1131ea10d188c56de63f8165945b791c7775d9c2b415c2e609cf847175fc47a8`. Hashes dos42arquivos públicos e13contratos aprovados; mesma configuração de43assets, nove valores de segredo preservados, ACL do arquivo privado conferida e intacta. Tradução permanece ligada, ranking/jobs/diagnósticos desligados e nenhum trigger. Nenhuma nova inferência foi feita neste deploy.

Esclarecido: a tentativa anterior falhou às02:00:43, e o cooldown de1hora da mesma fonte libera03:00:43 (06:00:43UTC);03h01 é apenas arredondamento com margem, não mudança na regra nem uma restrição de horário do provedor. A nova tentativa deve conferir o retryAt real antes do clique e não ser repetida se já houver tradução pronta/tarefa running/segunda tentativa.

A criação de uma retomada automática única do chat para03h01 foi rejeitada pela revisão automática, que considerou ausente autorização específica para agendamento automático com escrita futura no Firestore. Nenhuma automação foi criada e nenhum contorno executado. Solicitada escolha explícita entre essa retomada automática e retorno manual. A aprovação da tentativa e seu limite de uma chamada adicional permanecem; a forma automática aguarda resposta. Nenhuma promessa de execução em segundo plano sem agendamento confirmado.

## 27/10/2026 — teste adicional autorizado concluído, ainda sem tradução

Proprietário retornou às03h04 e pediu executar o teste. Conferidos horário UTC06:04, Tibia IGDB ativo e uma falha anterior com espera já vencida; não havia recibo de retry anterior. Versão ativa d26c55de-ff11-47ef-8fca-1841a6a6e526 conferida pelo coletor. Criado recibo exclusivo antes de um único clique Confirmar este jogo na pesquisa oficial. Nenhum vídeo publicado, outro jogo criado, cron ou agendamento executado.

Tentativa terminou failed/attempts=2, original preservado e sem opção de original, confirmado na UI. Nova espera do servidor até 2026-10-27T07:06:08.812Z (04:06:08 de Brasília). Não efetuar terceira tentativa por inferência da autorização anterior; recibo marca doNotRepeat=true e limite adicional consumido, inclusive se o cartão de automação for ativado depois.

Coleta recebeu 15eventos; pesquisa4ms CPU, confirmação HTTP200/16ms CPU, leitura da ficha3ms. Nenhuma exceção/exceededCpu. O sample da confirmação foi de primeira rota no isolate, mas applicationCreated=false; não certificar cold start completo. Valor16ms continua acima do alvo10ms, e os valores19/16ms em tentativas distintas exigem investigação (não satisfazem necessariamente a definição anterior de recorrência quente na mesma instância). Sem suspensão ou deploy automático.

A correção do formato choices não resolveu sozinha. Não afirmar causa exata a partir de status HTTP200 da confirmação: o erro da tradução é absorvido para preservar o jogo e o código publicado guarda apenas failed. Preparado localmente um diagnóstico privado mínimo: código de falha em lista fixa e status HTTP do provedor quando conhecido, sem texto bruto, cabeçalhos, prompt, nomes de visitante, IP, chave ou erro arbitrário. Sem novo endpoint, relaxamento de validações, alteração de modelo ou de retry/budget. Duas regressões novas,17testes direcionados e suíte completa769/0/0, tipos/lint e dry-run aprovados. Bundle congelado cfa407fe09e0d6e371131d6aebc68b072addf0a6db1b099a316cd1a39c52411b, mesmos43assets e nove segredos. Diagnóstico ainda não publicado; nenhuma nova inferência foi executada para validá-lo.

O próximo pacote remoto exige aprovação específica; publicar o diagnóstico não significa autorizar outra tentativa de Tibia. Tradução, CPU, ranking e TikTok continuam com gates em aberto.

## 27/10/2026 — diagnóstico privado publicado, sem nova tentativa

Proprietário aprovou especificamente publicar somente o pacote de diagnóstico privado de falhas. Worker ativo em100%: `6910fddf-8d39-4129-a289-f60ce08be37c`; anterior `d26c55de-ff11-47ef-8fca-1841a6a6e526`; bundle `cfa407fe09e0d6e371131d6aebc68b072addf0a6db1b099a316cd1a39c52411b`. Mesmos43arquivos,42hashes públicos conferidos e13contratos remotos aprovados. Nove valores de segredo preservados; arquivo privado e sua ACL conferidos e intactos. Sem chamada AI, tentativa adicional, escrita editorial pelo agente, nova credencial, plano, cron ou lançamento público. Ranking/jobs continuam false. A flag de diagnósticos gerais do provedor continua false; o novo registro é somente código fixo/status HTTP na tarefa privada de tradução.

Falhas futuras poderão registrar failure.code e, quando conhecido, failure.providerStatus, sem resposta bruta, prompt, cabeçalhos, segredo ou mensagem arbitrária. Esse registro não recupera os motivos das duas falhas antigas. A tradução de Tibia e sua CPU continuam pendentes. O único retry autorizado já foi consumido; terceira inferência e agendamento não integram esta aprovação. Antes de qualquer próximo teste legítimo autorizado, conferir estado, orçamento e retryAt real; não reiniciar contadores ou reduzir a espera.

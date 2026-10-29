# Etapa 4 — resultado do piloto remoto de CPU

28/10/2026. Piloto explicitamente autorizado após explicação do escopo. Resultado: interrompido pelo critério acordado de duas execuções consecutivas acima de 10 ms; versão anterior restaurada e cron temporário removido. A rotina automática NÃO está aprovada nem ligada.

## Preparação e execução

Os cinco commits do proprietário foram conferidos, HEAD 15f7519, árvore limpa. Preflight somente de leitura confirmou clipzone-db02a/(default), 10 fontes/10 vídeos elegíveis, métricas prontas, nenhum build em progresso e margem interna de 20 mil leituras/4 mil gravações. Painéis: Spark, Workers 228/100 mil requisições, Firestore 376/50 mil leituras e 76/20 mil gravações, nenhuma exclusão exibida; contadores podem atrasar. Não houve mudança de plano.

Publicado o bundle fff20003ef28e57448d20f5e17d5412aadd61b8c2d1a8b6c609dd6e8bc79398e na versão c8cb58fd-df11-4359-8d2e-679d68b42bf6, preservando os 43 assets API e os mesmos nove segredos; ACL e arquivo privado permaneceram intactos. Nenhuma nova credencial ou permissão. Jobs gerais ficaram desligados. Um cron temporário por minuto foi criado com trava de até oito claims em janela de início 13h22–13h42 de Brasília (16:22–16:42 UTC). Nenhuma janela foi estendida.

O painel mostrava o gatilho, mas o contador durável continuou ausente até a primeira entrega. A entrega de telemetria foi confirmada por uma leitura pública de configuração, sem cookie ou gravação de conteúdo. Primeira execução recebida por volta de 13h33, compatível com a propagação não imediata do cron. Não disparar tarefas extras para compensar essa espera.

## Medições

| Execução | Horário aproximado em Brasília | CPU | Tempo total | Chamadas externas | Resultado |
| --- | --- | ---: | ---: | ---: | --- |
| 1 | 13h33 | 38 ms | 5.397 ms | 17 | Build iniciado, fase scan |
| 2 | 13h34 | 37 ms | 5.971 ms | 31 | Scan concluído, fase stage privada |

Ambas tiveram outcome ok, sem exceções ou exceededCpu nos eventos recebidos. Isso NÃO equivale a respeitar o alvo de 10 ms. O critério preventivo foi atingido e a coleta terminou em two-consecutive-cpu-above-10ms. Os corpos de possíveis erros 1102 não foram inspecionados; não afirmar ausência universal desse erro. A telemetria não distingue com segurança cold start de reutilização para essas invocações.

Ainda não se mediram staging/publicação final ou limpeza de gerações antigas: a execução parou antes dessas fases. A CPU observada é da invocação inteira, incluindo a trava de teste e inicialização quando aplicável. Não atribuir todo o custo a uma biblioteca, criptografia ou Firestore sem perfilamento. A quantidade de chamadas é uma pista de trabalho local, não prova de causalidade; espera de rede não é CPU.

## Parada e estado final

Em torno de 13h35 foi restaurada a versão df8da48f-975f-47a5-9424-4d2476f4a0fc e removido o cron temporário, ambos com código de saída zero. Conferências posteriores: versão ativa a 100%, ranking/jobs desligados, bindings de piloto/retenção ausentes, nove nomes de segredos preservados, 42 hashes públicos e 13 verificações de cabeçalhos/proteções aprovados. O painel confirmou No cron triggers configured. A prova visual está no workspace privado, fora do Git.

Somente dois claims foram consumidos. O ponteiro público continuou na geração anterior de nove itens; nenhum ranking novo foi promovido. O scan do piloto contém dez candidatos privados, staged=0. Não foram criados itens novos de ranking nem exercitadas exclusões de versões antigas. Permaneceu um checkpoint auxiliar privado em phase stage, sem rotina para retomá-lo automaticamente. Ele deve ser tratado de forma limitada e revisada antes de outro piloto; não descartar dados primários ou adulterar datas para isso.

O orçamento interno manteve as reservas de 936 leituras e 183 gravações, deletesReserved=0. Reservas NÃO são a quantidade de operações faturadas; os claims e outras leituras de controle também consomem operações. Não houve alteração de vídeos, jogos, comentários ou curtidas pelo piloto, nem chamada de tradução/IA. Outros usos simultâneos do site não são objeto desta afirmação.

## Decisão e próximo passo

Continuamos na Etapa 4 do plano recente. A parte funcional local não basta: a CPU real dos dois primeiros passos exige otimização antes de ativar uma rotina contínua gratuita. Próximo trabalho local: perfilar admissão/inicialização e scan, reduzir a carga/consultas de cada passo sem enfraquecer validações, preservar os testes e preparar o tratamento do checkpoint incompleto. Qualquer novo deploy/piloto remoto exige escopo e aprovação próprios. A autorização desta janela foi consumida e encerrada; sem repetição, extensão ou agendamento ativo.

Nenhum código-fonte da aplicação foi alterado nesta rodada; apenas operadores privados e esta documentação. A validação local de 849 testes Node/oito específicos no emulador não foi repetida sem mudança de código. Sem commit ou push pelo agente. TikTok e os demais gates de lançamento permanecem pendentes.

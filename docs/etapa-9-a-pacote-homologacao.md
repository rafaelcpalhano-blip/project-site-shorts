# Etapa 9-A — pacote congelado para homologação

27/10/2026. Pacote preparado após o proprietário autorizar prosseguir. **Deploy não executado: a revisão automática exigiu autorização explícita para este pacote remoto específico, solicitada separadamente.** Não contornar a revisão nem interpretar silêncio como aprovação.

## Conteúdo revisável

- Entrada da ficha no topo na fase layout, antes do fallback/lazy, sem substituir a restauração de filtro/página/rolagem da home.
- Nomes acessíveis de preview/comentários alinhados ao texto visível, sem mudar handlers/player ou dados.
- Conexão opcional de tradução compilada, mas CLIPZONE_TRANSLATION_ENABLED=false. Sem segredo AI novo, inferência ou tradução automática de registros existentes.
- CLIPZONE_JOBS_ENABLED=false e diagnósticos false. Sem geração de ranking, cron ou retenção.

Referência anterior conhecida: a0d58723-b19c-4439-a2d2-85a402571691, a conferir novamente imediatamente antes do deploy autorizado. Origem/worker www, static-first nas mesmas rotas, compatibilidade/observabilidade e oito segredos existentes devem ser preservados. Nenhum lançamento público, mudança Firebase, domínio, plano ou GitHub integra este pacote.

O frontend e o bundle minificado do dry-run foram copiados para pasta nova, com SHA256 por arquivo e hash das quatro implementações alteradas. A configuração preparada contém apenas variáveis públicas e flags, sem valores de segredos. Conteúdo de nome fixo (ícones, manifesto, imagens e _headers) foi comparado byte a byte ao pacote anterior. HTML e bundles com hash mudam de acordo com a nova build. O deploy futuro deverá enviar o bundle já congelado sem recompilação e verificar os mesmos oito valores de segredos fora do console.

## Correção da contagem de arquivos

O log do Wrangler exibiu “Read46files”, usado no relatório anterior como contagem do dry-run. A enumeração física antes de congelar encontrou **43 arquivos e3diretórios**. O primeiro guard de preparação, que esperava46arquivos, interrompeu localmente; corrigida a contagem para43 e congelados os hashes desses43. A checagem de conteúdo fixo passou. Não houve tentativa de deploy nessa interrupção. A causa interna da contagem do log Wrangler não foi investigada; não afirmar que o SDK conta diretórios como arquivos apenas pela coincidência numérica.

Validações já executadas e não repetidas sem mudança de implementação:757testes Node, tipos frontend/servidor, lint global,20contratos workerd de entrada/cabeçalhos, build modo api e dry-run Workers. Esses testes não comprovam rolagem no aparelho físico após publicar, AI real ou CPU dos novos fluxos.

## Bloqueio da publicação e autorização

A revisão automática rejeitou a execução do deploy porque “podemos prosseguir” foi interpretado como preparação, não autorização explícita para publicar na homologação compartilhada usando os oito segredos existentes. O comando não executou, o manifesto confirma deploymentAttempted=false/deploymentPerformed=false e nenhum segredo foi aberto por esse comando. A solicitação específica descreve origem, pacote43arquivos, preservação dos oito segredos, jobs/tradução desligados e referência de rollback. Aguardar resposta antes de qualquer execução remota.

Após eventual aprovação: conferir versão ativa e hashes, verificar ausência de segredos no pacote público, publicar uma única vez, verificar HTML/bundles/headers/manifesto/ícones e contratos de API somente de leitura, confirmar versão ativa e solicitar ao proprietário um reteste Ver jogo/Voltar no Android/PC e painel na sessão habitual. Falha ambígua exige inspeção, não retry automático. Não usar scripts antigos de suspensão/deploy que possam restaurar assets anteriores.

## Tradução — próxima homologação operacional separada

Reutilizar o adaptador/modelo atuais, confirmar Workers Free/AI e quota compartilhada antes de ativar. Configurar token AI privado somente mediante autorização específica; não colocar no navegador/Git, criar credencial ou ativar plano pago por inferência. A flag false deste pacote não usa esse token. Uma primeira tradução legítima precisa de jogo escolhido, confirmação da fonte e medição CPU, preservando original/cache/lease e orçamento20tentativas/dia. O limite de tentativas da aplicação não equivale a quota garantida de neurons. Jogos já cadastrados precisam de reconfirmação ou operação controlada aprovada, não varredura oculta.

## Ranking — preparação necessária antes da ativação

Leitura anterior confirmou métricas version1/ready=true e nenhum ponteiro atual. Não repetir bootstrap de métricas nem editar dados primários por suposição. Preparar ensaio de uma geração segmentada usando apenas namespaces derivados, com teto de passos/requisições, quota Spark conferida e interrupção em legado inválido, concorrência ou limite. O modo operador e suas permissões/escritas deverão ser apresentados antes de executar.

Uma geração isolada não mantém o recurso operacional: validade90minutos e renovação considerada após1hora. Lotes têm15fontes/20itens por etapa, lease5minutos e construção máxima30minutos. Uma agenda deve concluir todos os passos dentro desses limites e preservar margem para atraso/CPU; não basta um único passo por hora. As reservas900R/180W e limites internos diários20.000R/4.000W não são uma medição contábil ou promessa de capacidade máxima contínua. Validar volume/consumo atual antes de escolher a cadência.

O scheduled atual também executa retenções quando ranking não está due. Ativar jobs globalmente habilitaria mais do que o pedido de ranking; separar esse escopo ou revisar todas as rotinas e custos antes de aprovar. Nenhum cron, retenção, escrita derivada ou alteração de quota foi realizado nesta preparação.

8-F/9-A continuam abertas nos gates aplicáveis; TikTok em standby conforme pedido. Não repetir Lighthouse até haver mudança publicada a comparar. iPhone e recuperação/custódia Auth/TOTP continuam pendentes nos seus escopos.


## Atualização — deploy específico autorizado e verificado

Em 27/10/2026, após aprovação explícita do proprietário, publicado uma única vez na homologação o pacote congelado. Worker ativo em 100%: `42c847fa-f9c8-4497-9e9c-c4d0f16e6de9`; referência anterior para eventual rollback: `a0d58723-b19c-4439-a2d2-85a402571691`. Bundle SHA256: `739bd045d5756927e51666df4b5c6ebe68062ed5ff72a1651fc74197176b29e0`.

Conferidos os hashes dos 42 arquivos públicos; o 43º arquivo, `_headers`, é configuração. Treze contratos remotos de assets/API passaram, incluindo no-store/HSTS/nosniff/no-referrer da API, rejeição de origem inválida e ausência de emissão de cookie nesses testes. A conferência usa `/` para o HTML, pois `/index.html` tem redirecionamento canônico; a primeira checagem interrompeu nesse redirecionamento e foi ajustada, sem novo deploy. Oito valores de segredo enviados foram preservados e o arquivo privado permaneceu idêntico. Tradução, jobs e diagnósticos seguem desligados. Sem escrita editorial, ativação de serviço, mudança de plano ou lançamento público.

Reteste Ver jogo/Voltar no PC e Android e continuidade da sessão administrativa solicitado, aguardando proprietário. CPU real e pontuação Lighthouse não foram medidas nesta publicação. TikTok, tradução operacional, ranking recorrente, iPhone e demais gates continuam pendentes; publicação deste pacote não encerra 8-F/9-A.


### Reteste do proprietário confirmado

Após o deploy `42c847fa-f9c8-4497-9e9c-c4d0f16e6de9`, o proprietário respondeu “esta parte funcionou certinho” ao roteiro conjunto PC/celular: ficha Ver jogo no topo, retorno à posição anterior do feed e painel na sessão habitual. Reteste funcional deste pacote concluído. Isso não comprova novo desafio Google/TOTP, nova medição CPU ou novo Lighthouse. TikTok, tradução, ranking e demais gates continuam pendentes.

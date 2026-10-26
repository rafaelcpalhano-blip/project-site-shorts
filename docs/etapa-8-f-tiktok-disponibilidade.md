# Etapa 8-F — TikTok: limite da fonte e tratamento de indisponibilidade

26/10/2026. Trabalho priorizado pelo proprietário após falhas em vários links, com autorização para continuar o planejamento seguro durante sua ausência. **O tratamento foi implementado e publicado em homologação; a disponibilidade da fonte continua intermitente e a publicação real de TikTok ainda não foi confirmada.** Não declarar resolvido apenas porque a prévia respondeu uma vez.

## Causa confirmada e limites da investigação

Um link informado nas capturas (`7639802790621007125`) foi usado em consultas delimitadas, sem submissão de conteúdo. A prévia publicada retornou 503, enquanto a mesma API oficial fora do Worker retornou 200 com provedor/identidade válidos. A observação sanitizada temporária no Worker confirmou **HTTP 429 no endpoint oficial oEmbed**. Não foram registrados corpos, headers privados, cookies, IP, UID ou credenciais.

Isso demonstra limitação no caminho hospedado até a fonte; não isola se a decisão do provedor depende de IP, ASN, região, tráfego compartilhado, volume ou outra política. Não atribuir a causa a uma chave Google, falta de chave TikTok ou ao usuário ter preenchido o título. A exceção de formato TikTok já existente aceita duração desconhecida, mas continua exigindo existência confirmada por fonte confiável.

Depois do primeiro ajuste, a prévia chegou a responder HTTP 200 com nome de canal e título ausente; em uma conferência posterior do formulário, reapareceu a mensagem de limitação. **200 temporário não comprova recuperação estável nem sucesso de envio.** Não houve tentativa de contornar o limite com proxy, rotação de IP, cabeçalhos de navegador falsificados, outra conta, endpoint não documentado, scraping como prova de existência ou serviço pago.

## Alteração implementada

- `429` produz evidência de disponibilidade negativa, com existência ainda desconhecida; nunca publica, reserva a identidade do vídeo ou cria pendência técnica como se o vídeo tivesse sido validado.
- Espera do `Retry-After` numérico ou data HTTP válida; sem valor utilizável, 60 segundos. Corpo de erro cancelado. Nenhuma repetição automática.
- Um temporizador de espera é compartilhado pela composição da aplicação Workers, entre fábricas por requisição, inclusive consulta opcional ao perfil. São somente números de tempo, sem transporte, resposta positiva de vídeo, decisão de autorização ou identidade em cache.
- O temporizador é local ao isolate/aplicação; não é limite global distribuído e pode não sobreviver a reinício, rotação ou roteamento para outro isolate. Quotas persistentes de abuso continuam sendo verificadas; a proteção nova é complementar.
- Prévia e envio distinguem `source-rate-limited` (503 e Retry-After quando válido) dos limites de abuso/publicação do visitante. A interface informa que preencher título manualmente não libera a publicação.
- YouTube/Twitch e as regras de elegibilidade existentes continuam preservados. Após a espera, a próxima tentativa consulta a fonte novamente; não reaproveita prova positiva antiga.

## Verificação e publicação

**660 testes Node sem falhas**, tipos frontend/servidor e lint aprovados. **31 provas workerd** (15 específicas + 16 integradas), sem acesso externo nos fixtures. As novas regressões cobrem espera/expiração, troca de transporte entre requisições, vídeo e perfil, ausência de transação/cota de publicação, origem/campos forjados, mensagens sem dados privados e ausência de retry automático.

Composição Workers real em fixture: prévia recebe 429, envio seguinte retorna indisponibilidade sem nova consulta ao provedor e sem escrever shorts, identidades, proprietários, cota de publicação ou logs de moderação. Isso prova o caminho de recusa; não substitui publicação real no remoto.

Diagnóstico temporário desligado depois da coleta. Versão final: `3f80231a-e6ef-45e2-8880-e85ba0d596be`. Jobs continuam desligados, routing static-first, cabeçalhos/cache e oito credenciais preservados. Build no modo API em diretório isolado; sem alterar a build local servida em 5175, reiniciar 5174/5175/8080 ou migrar dados. Checkpoint local do diff e fontes novas preservado; versão anterior conhecida para retorno sem migração: `04862db7-20a2-49db-ba0f-dfad52207133`.

Sete verificações de headers/cache/API passaram novamente no destino. A evidência visual do aviso foi obtida na primeira versão do ajuste; o frontend ficou idêntico na revisão final, que ampliou somente a cobertura da espera na consulta de perfil. Nenhum vídeo, comentário, curtida ou denúncia foi criado pelo agente.

## CPU e gates que continuam abertos

| Coleta delimitada | Sessão (ms) | Prévia TikTok (ms) | Resultado |
| --- | --- | --- | --- |
| Diagnóstico antes do ajuste | 11 | 17 | Sessão 204; prévia 503 e upstream 429 |
| Primeira versão do ajuste | 13 | 11 | Sessão 204; prévia 200 com canal |

Todos esses eventos tiveram outcome ok, sem exceções ou exceededCpu. Ainda assim, excedem o alvo de 10 ms. Os marcadores de criação/reuso não foram persistidos por esse coletor, portanto não classificar conclusivamente esses eventos como frio ou quente. Não são CPU de publicação válida e não certificam margem do Workers Free. Picos/recorrência seguem bloqueando declaração de prontidão para lançamento; não reduzir validações para melhorar a métrica.

Quando o proprietário retornar: atualizar a página e testar **um** envio legítimo após a espera. Se houver novo aviso de limitação, parar e registrar o resultado, sem várias tentativas. O endpoint oficial pode voltar a limitar mesmo após uma prévia bem-sucedida. Essa validação manual está pendente; não gastar cota/criar conteúdo automaticamente apenas para obter uma amostra.

Enquanto isso, a documentação de recuperação Spark foi avançada em [etapa-8-f-recuperacao-spark.md](etapa-8-f-recuperacao-spark.md). Relevância/jobs, CPU das ações válidas e recuperação real permanecem pendentes; 8-F não concluída. PWA 8.5 e auditoria GitHub 9-B.5 não foram iniciadas. Lançamento não autorizado.

Fontes: [TikTok oEmbed oficial](https://developers.tiktok.com/docs/en/embed-videos), [Embed Player e limites de uso](https://developers.tiktok.com/docs/en/embed-player). [Evidência sanitizada](evidencias/etapa-8-f-tiktok-disponibilidade.json).


## Reteste do proprietário — bloqueio persiste

Em 26/10/2026, o proprietário informou que o canal não foi preenchido automaticamente, digitou-o e recebeu a mensagem `source-rate-limited` ao confirmar o envio. Publicação não realizada. O status upstream dessa ação específica não foi coletado; a mensagem corresponde ao tratamento de indisponibilidade já implementado, não a prova de nova consulta bem-sucedida. Não repetir chamadas só para reproduzir o aviso.

A correção anterior tratou a espera e a comunicação do 429; **não resolveu a disponibilidade da fonte**. Revisão do fluxo: uma prévia bem-sucedida pode consultar o vídeo uma vez e o perfil uma vez; o envio faz nova verificação do vídeo. Até três consultas oEmbed para uma tentativa completa, dependendo dos metadados retornados. Isso é contagem do caminho de código, não demonstração de que essas três chamadas causaram a política externa.

Alternativa de redução de chamadas, ainda não aplicada: deixar os metadados TikTok sob demanda e fazer a verificação confiável obrigatória somente na confirmação do envio. No caminho padrão seriam uma consulta em vez de até três; título/canal seriam manuais, e a busca opcional poderia continuar disponível. Não usa cache positivo, não muda elegibilidade e não contorna 429. Também não garante que a consulta única seja aceita. A preferência sobre perder o preenchimento automático precisa ser confirmada pelo proprietário antes de alterar esse comportamento.


## 26/10/2026 — preenchimento automático preservado; bloqueio externo persiste

O proprietário recusou tornar os metadados manuais por padrão. A alternativa anterior não foi aplicada. Implementado no Workers: a prévia busca apenas o nome no perfil oEmbed oficial; a confirmação do envio continua consultando e validando o vídeo específico. Nome de perfil não comprova existência do vídeo e nunca autoriza publicação. Um cache limitado a 32 nomes públicos por aplicação/isolate, por 5 minutos, reduz consultas repetidas ao mesmo criador, sem transportar evidência de vídeo, sessão ou fetch/budget de requisição anterior. Não limpa o backoff nem substitui as quotas persistentes.

Para URL completa e sem cache: até duas consultas (perfil na prévia + vídeo no envio), em lugar das até três anteriores; com nome em cache, uma consulta de vídeo. Links curtos podem exigir resolução separada. Nenhum retry automático. O título TikTok continua manual; o aviso agora diz que o vídeo será validado ao confirmar o envio. YouTube e Twitch preservados.

**666 testes Node e 32 provas workerd passaram**, tipos frontend/servidor e lint aprovados. A composição Workers em fixture confirmou dois previews usando uma consulta de perfil, nenhum short escrito antes do envio, e publicação 201 após consulta fresca e válida do vídeo. Também provou recusa diante de indisponibilidade, perfil inválido, origem/campos forjados, expiração/limite do cache e backoff preservado. Isso não comprova publicação real.

Versão de homologação `73ef1d83-609e-4ac0-a5cb-38cef2e4fc2b`, retorno conhecido `3f80231a-e6ef-45e2-8880-e85ba0d596be`. Checkpoint/build isolados, 36 assets, oito segredos ausentes da build e inalterados no deploy, headers/routing/jobs false preservados. Sem conteúdo publicado pelo agente, nova dependência, alteração Firebase/IAM/plano ou lançamento. Sete checks finais HTTP passaram; o primeiro If-None-Match imediatamente após deploy respondeu 200, e a investigação/rechecagem respondeu 304. Evidência inicial mantida fora do repositório; não houve alteração do produto para forçar essa resposta.

**A consulta real única ao perfil também retornou 503/source-rate-limited, Retry-After 60. Portanto a otimização não resolveu o bloqueio e a postagem TikTok continua não confirmada.** Não repetir o mesmo teste com o proprietário nem prometer que aguardar resolve. A coleta reteve somente sessão 12 ms/outcome ok; faltou o evento da prévia, então não atribuir CPU à prévia ou alegar ausência de erros nessa requisição por ausência de trace. Não é medição de publicação.

Decisão solicitada ao proprietário: preparar ou não uma fila privada, fora do feed e sem aprovação automática, para solicitação pendente durante indisponibilidade da fonte. Isso muda a regra de recusar envios não confirmados, exige desenho de quotas/abuso/revisão/duplicidade/retenção e **não foi implementado nem autorizado nesta rodada**. Nenhuma prova de existência foi afrouxada. Demais gates da 8-F continuam abertos.

Referência do perfil: [oEmbed oficial de criadores](https://developers.tiktok.com/docs/en/embed-creator-profiles). A consulta de perfil oferece metadados do criador, não valida o vídeo específico.


## 26/10/2026 — auditoria de links e envio automático; uma tentativa real autorizada

O proprietário pediu investigação do fluxo, inclusive links curtos, mantendo publicação automática como objetivo. A fila privada não foi autorizada e não foi criada. Confirmado: URL completa não dispara resolução de redirecionamento. URLs curtas passam pelo resolvedor oficial, tornam-se a mesma URL canônica e usam o mesmo verificador. Provas Node/workerd cobrem identidade, remoção de tracking, redirect externo bloqueado e publicação com consulta fresca. Não foi encontrado conflito do resolvedor com a validação de URL completa.

Foi encontrada uma dependência evitável: a consulta opcional ao perfil podia receber429 e ativar a espera compartilhada que impede a consulta posterior ao vídeo. Isso não prova que fosse a única causa dos bloqueios. Removida a consulta de perfil do fluxo HTTP de prévia e retirado o cache de nomes introduzido pela otimização anterior. A prévia agora fornece somente o identificador @canal extraído da URL canônica, sem requisição ao TikTok. **Não é nome de exibição verificado, nem prova de existência**; a interface explica a distinção e mantém edição manual. O envio continua usando o mesmo verificador obrigatório, sem cache positivo nem autorização por dados do cliente. Com URL completa, a única consulta TikTok é a validação do vídeo no envio; link curto exige resolução prévia separada.

**665 testes Node/zero falhas, 32 provas workerd/zero chamadas externas em fixtures, tipos frontend/servidor e lint aprovados.** Os testes confirmaram recusa de 429/404/identidade divergente sem transação de conteúdo/cota e publicação201 quando a fonte fornece evidência válida. Uma consulta real delimitada no computador, com o mesmo verificador e o vídeo7688744049095806228, respondeu HTTP200 com provedor/identidade válidos e existência confirmada; sem escrita. Isso não comprova disponibilidade pela rede Cloudflare.

Deploy controlado `07e1bb94-6032-4c04-b31e-7beb51c77045`, rollback `73ef1d83-609e-4ac0-a5cb-38cef2e4fc2b`. Build isolada e checkpoint mantidos; oito segredos preservados/ausentes dos assets, roteamento/headers/jobs false/plano preservados. Sete checks HTTP finais aprovados. Prévia real200 com @canal e sem espera; interface preencheu @csrfps automaticamente. CPU observada sessão14ms/prévia3ms, outcomes ok e sem exceções nessa coleta, sem marcadores suficientes para classificar frio/reuso.

O proprietário autorizou expressamente **uma** publicação real do vídeo7688744049095806228, jogo Counter-Strike2, título “Vou CORRIGIR o seu SPRAY no CS2 em 1 MINUTO #cs2 #cs2highlights #viral”. Executada pelo formulário/confirmar publicação. Resultado503/source-rate-limited, sem publicação nem consumo da cota de publicações; não houve repetição. O status upstream específico não foi registrado separadamente nesta ação; não confundir a mensagem do aplicativo com uma nova captura direta do429. Tail reteve sessão11ms e envio20ms, outcomes ok/sem exceções. O503 é resposta controlada, sem exceededCpu/1102 observado nesses eventos. Os20ms excedem o alvo10ms; não certificam folga ou prontidão de lançamento, tampouco CPU de envio válido.

Conclusão delimitada: preenchimento automático corrigido, chamadas opcionais retiradas e relação curto/completo verificada; **postagem real continua bloqueada**. O sucesso local não garante a mesma resposta do provedor à origem hospedada. Não atribuir a causa exata a IP/ASN, chave ou formato sem evidência adicional. Não fazer novas tentativas reais sob a autorização única já usada, nem criar fila, trocar infraestrutura, introduzir proxy/rotação de IP ou enfraquecer validação para obter sucesso aparente. Nenhum conteúdo fictício ou outro registro editorial foi criado pelo agente.

Revisão oficial: [oEmbed continua documentado, mas a página Embed Videos avisa descontinuação futura](https://developers.tiktok.com/docs/en/embed-videos); isso não demonstra que a descontinuação causou429. O [Embed Player](https://developers.tiktok.com/docs/en/embed-player) é uma interface de reprodução; mensagens recebidas pelo navegador não substituem prova confiável no backend. A [Display API exige aplicativo aprovado e autorização do criador](https://developers.tiktok.com/docs/en/display-api-get-started), e [Query Videos restringe a consulta aos vídeos desse criador autorizado](https://developers.tiktok.com/docs/en/tiktok-api-v2-video-query). Não é substituição transparente para links arbitrários de visitantes. Nenhuma nova integração, credencial ou serviço foi criado.


## 26/10/2026 — confirmação no servidor mantida; transporte investigado sem novos cadastros

O proprietário rejeitou explicitamente aceitar somente URL/reprodução no navegador, por permitir contorno em clientes alterados. A confirmação independente no backend permanece obrigatória; nenhuma política de publicação por sintaxe, booleano do cliente, evento de player ou fila privada foi ativada.

Comparação controlada em loopback identificou uma diferença: Node enviou User-Agent node, Accept */* e Accept-Encoding gzip/deflate; workerd local não enviou esses três cabeçalhos por padrão. Essa prova local não demonstra quais cabeçalhos a rede Cloudflare de produção envia. Implementada identificação explícita honesta Clipzone/1.0 (+https://www.clipzone.workers.dev), Accept application/json e, depois, cache no-store na consulta oficial de vídeo. Não imita navegador, não encaminha cookies/IP/headers de visitantes, não muda URL de destino nem elegibilidade, não ignora429 ou Retry-After e não adiciona retries/proxy/serviço.

**668 testes Node/zero falhas e32 provas workerd/zero chamadas externas em fixtures**, tipos servidor e lint aprovados; frontend não mudou nesta parte. A composição real em fixture comprova headers/cache, resposta201 com evidência válida, rejeições mantidas e teste de jogo inexistente sem shorts/identidades/proprietários/cota de publicação/logs editoriais. Sete checks de headers/API no destino passaram após a última versão; oito segredos, jobs false, roteamento, plano e dados editoriais preservados. Build/checkpoint isolados.

Foram feitos dois testes negativos delimitados no caminho de envio: primeiro com identificação explícita, depois com identificação+no-store, separados por mais que os60s indicados. Antes de cada teste, um gameId aleatório foi confirmado inexistente via detalhe público404. Esse jogo impede transação editorial mesmo que a fonte valide o vídeo; a prova de segurança foi executada em fixture antes. **Não foram tentativas de cadastrar conteúdo real**, nem consumiram cota de publicações. Sessão e contadores técnicos de tentativas podem ser escritos pelos controles normais. Ambos retornaram503/source-rate-limited/Retry-After60 antes de validar o jogo. O status upstream individual não foi logado separadamente; não apresentar como duas novas capturas diretas429. A hipótese de headers/cache **não resolveu** o bloqueio.

Versão identificação somente594a4547-bfdc-43e8-891c-ddd1933a4e2f; versão atual8ced364c-e1c5-4542-9618-5cba2b260f40; rollback imediatamente anterior594a4547-bfdc-43e8-891c-ddd1933a4e2f. CPU32/21/18ms na primeira coleta, sem marcadores de inicialização. Segunda coleta: sessão13ms/aplicação criada/primeira API; detalhe do jogo15ms/aplicação criada/primeira API; envio10ms/aplicação reutilizada, primeira rota nesse isolate. Não deduzir repetição quente do mesmo caminho a partir desses números. Outcomes ok, sem exceções/1102/exceededCpu nos eventos capturados; publicação válida ainda não medida e prontidãoFree não confirmada.

A [documentação Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/fetch/) suporta no-store e descreve bypass do cache Cloudflare para origens externas, com headers de revalidação encaminhados. Não é uma garantia de que caches ou políticas da própria fonte serão removidos. Não afirmar que o cache causou os429.

Preparado rascunho sanitizado para [suporte oficial TikTok](https://developers.tiktok.com/support/), no workspace privado de trabalho, perguntando suporte a Workers, requisitos do endpoint e método oficial de confirmação de vídeos públicos de terceiros. **Nenhuma mensagem enviada.** Contato externo exige autorização explícita do proprietário; não criar conta nem fornecer contato pessoal por suposição.

Revisão de alternativa somente documental: [Render Free](https://render.com/docs/free) permite Node, mas dorme após15min, pode levar cerca de1min para iniciar, possui cotas e limiar para tráfego externo; o próprio fornecedor não recomenda Free para produção. Sem método de pagamento, o documento prevê suspensão em vez de cobrança de excedente de banda e bloqueio de builds excedentes. Não há evidência de que TikTok aceitaria essa origem. Portanto não recomendar migração como correção garantida, não criar conta/recurso ou mudar a arquitetura já escolhida. Confirmar compatibilidade do provedor é o próximo caminho recomendado; não repetir consultas cegamente nem marcar postagem como resolvida.


## 26/10/2026 — contato autorizado, envio ainda depende de CAPTCHA

O proprietário autorizou enviar o diagnóstico e avançar nas tarefas independentes. A página de suporte Developers redirecionou para login; não foi criada conta nem aceita interação com o chatbot, que apresentava termos próprios. Encontrado formulário público oficial https://www.tiktok.com/legal/report/feedback, categoria bug. Preenchido o relato sanitizado, com domínio/link públicos/resultados técnicos e e-mail público do Clipzone para retorno; usuário TikTok opcional deixado vazio, sem atribuir ao projeto o canal do vídeo de exemplo, sem anexos/segredos/IP privado.

Enviar foi acionado uma vez e o site exigiu CAPTCHA. Não foi solucionado pelo agente. Aba/formulário preservados para o proprietário. **Não há confirmação de recebimento ou número de chamado: não dizer que a mensagem foi entregue ou que já estamos aguardando resposta de um chamado aberto.** O próximo passo específico é o proprietário concluir o CAPTCHA e confirmar o resultado; não pedir criação de conta Developers para essa alternativa pública. Sem novo teste/publicação TikTok nesta rodada. A validação no servidor continua obrigatória.

Enquanto isso, preparado núcleo local de recuperação com nove casos novos,677 Node/tipos/lint aprovados; sem leitura de produção ou deploy. Ver [recuperação Spark](etapa-8-f-recuperacao-spark.md) e [evidência local](evidencias/etapa-8-f-recuperacao-local.json). 8-F continua aberta; PWA/lançamento não antecipados.


## 26/10/2026 — proprietário confirmou envio do relato TikTok

O proprietário informou que concluiu o CAPTCHA e apareceu confirmação de envio no formulário público oficial. Recebimento registrado com base nessa confirmação humana; não houve inspeção independente pelo agente, número de chamado informado ou resposta técnica recebida. Nenhuma segunda mensagem foi enviada. O login Developers mencionado na pergunta anterior não é necessário para concluir o relato pela alternativa pública e não deve motivar duplicação do contato. O retorno, se houver, usa o e-mail público de suporte do Clipzone. Nenhum monitoramento automático de caixa de entrada foi criado. Confirmação de envio não significa liberação do endpoint: postagem TikTok continua pendente, validação no servidor preservada e etapa8-F aberta.

## 26/10/2026 — resposta TikTok encaminha para outro canal

O proprietário colou a resposta recebida por e-mail, atribuída ao TikTok Customer Support. O conteúdo orienta relatar pelo aplicativo (Perfil → menu → Configurações e privacidade → Central de Ajuda → Relatar/Reportar outro problema ou chat) ou, se necessário, pelo site após login (More → Settings → Support → Privacy & user safety → Report another issue → No → Need more help). Registro baseado no texto fornecido pelo proprietário, sem leitura independente da caixa de e-mail ou validação do remetente.

Trata-se de encaminhamento de atendimento: não houve diagnóstico técnico do HTTP429, liberação de acesso, prazo ou confirmação sobre o funcionamento do oEmbed/Workers. Também não foi comunicada reprovação do projeto ou de sua incorporação. Manter validação no servidor e bloqueio de lançamento. Não considerar a postagem corrigida por ter recebido resposta. Nenhum novo chamado ou mensagem foi enviado nesta rodada; entrar na conta/aplicativo, passar CAPTCHA, aceitar termos ou encaminhar novos dados não foi feito por inferência.

Próximo contato, se autorizado e viável no canal indicado, deve identificar a natureza técnica do problema (TikTok Embed/oEmbed em Cloudflare Workers), informar somente exemplo/domínio públicos e resultados sanitizados, e solicitar encaminhamento à equipe de integrações. Evitar abrir relato sobre um criador ou denunciar o vídeo usado como exemplo.

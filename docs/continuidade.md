# Continuidade da aplicação — checkpoint

## Etapa 7.5.7-A — miniaturas implementadas e verificadas localmente (21/10/2026)

URLs oficiais opcionais obtidas nos adaptadores existentes e armazenadas com data e
validade, sem alterar política de publicação. Parser/hosts/identidade e DTO validados;
imagens ausentes, vencidas ou quebradas usam fallback. Card usa lazy/contain,
zoom/fade discreto sem corte e respeita movimento reduzido. Sem player/autoplay no
hover nesta A. Quatro ordenações e detalhe entregam os metadados opcionais.
Manutenção local limitada a 30 candidatos, inspecionar/aplicar com cursor;
idempotência e releitura transacional preservam dados concorrentes. Nenhuma chamada
externa de metadados por visita. Renovação/remoção operacional em produção depende
da Etapa 8; validade visual não equivale a TTL do Firestore.
45 testes distintos relacionados passaram; build completo e lint localizado após
correção do único erro do lint geral aprovados. HTTPS conferido: 10 shorts, 8 imagens
(6 YouTube/2 Twitch) e fallback nos 2 TikToks. Hashes comprovaram preservação dos
outros campos. API reiniciada, sem alterações na nuvem/deploy/dependências.
Conferência visual do proprietário pendente. Detalhes/custos/comandos em
[etapa-7-5-7-a.md](etapa-7-5-7-a.md). Próxima 7.5.7-B, mediante autorização:
compatibilidade de prévias oficiais por fonte; nenhum contorno de restrições.
Checkpoints seguintes são históricos.


## Etapa 7.5.6-C — implementação e validação local concluídas (21/10/2026)

Quatro ordenações integradas ao feed/filtro/ficha, padrão Ultimo Postado; busca
textual permanece desativada. Métricas elegíveis transacionais, caps 20 curtidas/
10 comentários por short/hora e um comentário por identidade/short/dia UTC;
remoção retira contribuição e restauro conserva idade, sem reciclar admissões.
Cursor assinado, snapshot 30min, páginas 15/30 candidatos, moderação atual.
Geração horária somente no runner local: promoção completa, orçamento/lease e
retenção limitados; indisponibilidade não vira ranking parcial ou fallback falso.
Limites da B preservados. Custos por interação e crescimento dos registros privados
exigem monitoramento/retenção próprios antes de produção. Sem novo serviço/deploy.
71 testes relacionados distintos aprovados, lint/build e HTTPS local conferidos.
Concorrência extrema pode esgotar retries; reenvio permanece atômico/idempotente.
8080: 10 shorts preservados por hashes; métricas inicializadas de fontes verificadas,
sem interação histórica existente/fictícia. Primeira geração completa publicada
somente no emulador; API reiniciada e sessões locais renovam no próximo acesso.
Conferência visual pelo proprietário ainda pendente. Detalhes/custos/reprodução:
[etapa-7-5-6-c.md](etapa-7-5-6-c.md). Próxima 7.5.7 — miniaturas e prévias, aguardando
autorização e avaliação da compatibilidade de cada plataforma. Checkpoints abaixo
são históricos e não representam funcionalidades ainda pendentes na C.


## Etapa 7.5.6-B — base local concluída, integração C pendente (21/10/2026)

Aprovada variante 24h/12h/6h e gerações horárias com controle de orçamento. Base interna
implementada: preparo idempotente, métricas validadas, snapshot único, staging/lease,
promoção só de geração completa, consultas nos quatro modos e retenção por lote.
Nada conectado ao HTTP/UI; nenhum agendamento/serviço/deploy. Métricas pendentes não
viram engajamento zero: gerador recusa, preservando geração anterior.
Limites locais: 100 vídeos ativos/300 fontes, sem truncar ranking; reserva por tentativa
762 leituras/124 gravações; teto diário UTC do módulo 20k leituras/4k gravações/4k
exclusões, conservador e separado do consumo do restante do site. Não é medidor de
faturamento; retentativas/índices/controle exigem margem e monitoramento.
19 testes passaram (11 unitários + 8 emulador), lint/build aprovados e ajuste final
localizado. Diagnóstico/aplicação local: 10 shorts preparados, demais metadados
preservados, 10 métricas ready:false. Sem geração real, curtidas ou vídeos fictícios.
API reiniciada; novas publicações nascem com likeCount=0. HTTPS feed 200; modos novos
continuam desativados (400 no endpoint antigo). Sem conferência visual nesta subetapa.
Detalhes em [etapa-7-5-6-b.md](etapa-7-5-6-b.md). Próxima C, mediante autorização:
coleta transacional de métricas/admissões e integração segura das quatro ordenações.
Checkpoints abaixo históricos.


## Etapa 7.5.6-A — avaliação concluída, estratégia da B aguardando decisão (21/10/2026)

Somente experimentos locais e documentação. Código da aplicação, dados 8080/nuvem,
API, índices e serviços preservados; nada habilitado ou agendado. ReadTime provado no
emulador 8081 para os quatro modos/escopos, com cursor temporal e moderação atual.
Pior caso: 90 leituras observadas + leitura do limitador estimada = 91. Não é cobrança
medida; índices/retentativas/sessões podem acrescentar consumo.
A simulação refutou a suficiência do decaimento comum de 24h: sem eventos novos a
ordem permanece fixa e o bônus mantém vantagem percentual permanente. Variante
24h publicação / 12h interações / 6h bônus corrige esse efeito, mas exige atualização
por tempo. Recomendação para aprovação: detalhar gerações completas horárias, fora
das visitas, com promoção só após conclusão e orçamento explícito. Não implementada.
Piso para 100 vídeos: 2.424 gravações/dia; 1.000: 24.024, acima da franquia de gravações
antes das demais ações. Atualização horária também traz atraso de até aproximadamente
1h nesse modo. Ataques com identidades renovadas continuam sendo limitação conhecida.
23 testes distintos passaram (16 simulações + 7 provas no emulador); lint localizado
aprovado. Sem build geral pois não houve integração. Nenhuma mudança visual a conferir.
Detalhes em [etapa-7-5-6-a.md](etapa-7-5-6-a.md) e relatório de simulações ao lado.
Aguardar aprovação explícita da variante/estratégia antes da B. Checkpoints abaixo históricos.


## Etapa 7.5.5 — curtidas implementadas localmente (21/10/2026)

Proposta aprovada: contador nos cards, curtir/descurtir no visualizador e persistência
privada sem cadastro. API usa cookie assinado, valida short publicado/jogo ativo,
transação de estado/contador e revisão contra pedidos atrasados. Duplicatas não
incrementam de novo. Limite independente de 20 chamadas/minuto; sem efeito nas cotas
de publicação. Alterações confirmadas atualizam card/modal sem recarregar o feed.
Retenção manual local em lotes de 30: inativos/tentativas com mais de 90 dias;
ativos preservados. Script não foi aplicado no desenvolvimento. Sem TTL pago,
agendamento, dependências, novos bancos, mudanças externas ou deploy. Regras já
bloqueiam acesso SDK; índices privados dispensados no manifesto não publicado.
29 testes relacionados aprovados (14 novos + 8 regressões públicas + 7 emulador),
lint/build aprovados. HTTPS: feed/estado 200 e alteração sem sessão 401, sem votos
artificiais no desenvolvimento. Conferência visual pendente no visualizador de um short.
Após reinício local, cookies/sessões antigas precisam renovação como antes.
Detalhes, custos e limitações em [etapa-7-5-5.md](etapa-7-5-5.md). Próxima 7.5.6:
propor relevância/quatro ordenações; aguardar autorização. Checkpoints abaixo históricos.


## Etapa 7.5.4-C — catálogo administrativo implementado localmente (21/10/2026)

Catálogo protegido pela autorização existente de UID + Google/TOTP: todos, ativos,
provisórios, ocultos e banidos; 20 itens/página, consulta 21, createdAt DESC + ID DESC.
Ativos inclui provisórios visíveis. Aprovar provisório, ocultar, banir, desbanir e
restaurar exigem motivo, confirmação explícita e revisão atual; transação conserva
metadados/vínculos/cotas, reservas e grava UID/motivo/data no histórico privado.
Desbanir recupera visibilidade anterior; oculto continua oculto. Vídeos removidos ou
pendentes não são publicados pela restauração do jogo. Sem exclusão física/cascata.
Contagem total por agregação somente ao consultar detalhes; falha = não calculada.
Histórico exibe até 20 eventos recentes; todos os eventos ficam preservados.
Novos índices locais documentados, sem deploy. Nenhuma dependência/serviço criado.
17 testes relacionados aprovados: 10 unitários/HTTP e 7 no emulador isolado. Lint e
build aprovados; ajuste final localizado verificado. HTTPS: novas rotas 401 para
visitante; feed 200. Conferência visual pelo dono
pendente em /admin → Catálogo administrativo de jogos. Reinício da API local pode
exigir verificar novamente Google/TOTP. Próxima: planejar 7.5.5 (curtidas), somente
com autorização própria. Checkpoints abaixo são históricos.


## Etapa 7.5.4-B — cadastro manual autônomo concluído localmente (21/10/2026)

Proprietário aprovou 3 novas criações/identidade/dia São Paulo, 20 tentativas/minuto
existentes e preparação local sem colisões. Inclusão usa /api/games/manual, cria
jogo ativo/provisório sem metadados inventados e seleciona-o no formulário. Reuso,
falhas e recusas não gastam cota de criação nem de shorts. Triagem textual local
existente aplicada a nomes; limitações explícitas, sem fornecedor externo.
Reservas privadas exatas/visuais compartilhadas com criação IGDB e administração;
IDs existentes mantidos, fontes oficiais não mescladas por nome, dados corrompidos/
órfãos fecham o cadastro. Comparação é conservadora, não universal ou semântica.
Fluxo antigo de solicitações preservado. Suporte fictício centralizado e sinalizado
como não operacional. Fonte IGDB indisponível não exige prova inventada de ausência.
Diagnóstico: 6 jogos, 12 chaves, zero colisões. API parada, reservas preenchidas para
os 6, prontidão true, sem alterar jogos/IDs/solicitações. Script retomável com lease;
seed de fixtures invalida prontidão antes de alterações (não executado nesta entrega).
API HTTPS reiniciada; rota manual conferida por reuso de Portal (200, sem cota diária),
feed 200. Nenhum jogo fictício criado no desenvolvimento para teste de inclusão.
53 testes relacionados aprovados (39 unitários/HTTP/cliente e 14 no emulador), lint/
build aprovados; verificações finais localizadas. Conferência visual final pendente.
Detalhes/custos em [etapa-7-5-4.md](etapa-7-5-4.md). Sessão administrativa em memória
pode precisar nova verificação após reinício. Sem serviços externos, dependências,
novos bancos ou deploy. Próxima 7.5.4-C: catálogo administrativo/banimento/restauração,
ainda não implementado e aguardando autorização. Checkpoints abaixo são históricos.


## Etapa 7.5.4-B — parâmetros preparados; execução pendente (21/10/2026)

Proprietário pediu avanço à B; Git limpo. Foi detalhada proposta de 3 novos jogos
manuais/identidade/dia São Paulo, mantendo 20 tentativas/minuto existentes e as
5 publicações/dia intactas. Reuso/falhas não gastam cota de criações aceitas.
Proposta inclui diagnóstico paginado local; preencher reservas privadas apenas
se não houver colisões, com prontidão bloqueada/retomada idempotente. Colisões
exigem apresentar o caso antes de corrigir. Nada em produção ou serviços externos.
Aguardando aprovação específica dos novos limites e desse preenchimento local,
conforme a reserva já registrada no desenho técnico. Nenhum código alterado,
diagnóstico/migração executado ou teste repetido nesta análise. Detalhes em
[etapa-7-5-4.md](etapa-7-5-4.md). B ainda não implementada; C continua pendente.


## Etapa 7.5.4-A — integridade das leituras públicas concluída localmente (21/10/2026)

Proprietário aprovou o ajuste arquitetural proposto. Feed/detalhe/comentários passam
pela API existente e verificam jogo ativo antes de devolver conteúdo público. SDK
continua apenas no catálogo/fichas. Regras locais bloqueiam reads diretos de shorts
e comments, inclusive clientes com claim admin. Administração permanece pela API.
Cursores vinculados ao contexto, até 30 candidatos/15 resultados, sem ocultação
apenas visual, sem leituras irrestritas, sem novos índices, banco ou dependências.
Nome do jogo vem no DTO; páginas parciais/vazias podem continuar. Limite independente
publicReadAttempts; consulta não consome cota de publicação. Comentários/denúncias
verificam jogo na transação; restauração de comentário bloqueada em jogo oculto.
Política de publicação/IGDB/restauração de short preservada e compartilhada.
61 testes relacionados aprovados, lint/build aprovados; HTTPS local: feed 200,
comentários 200 e pesquisa 404. Regras atualizadas apenas no emulador demo-clipzone
8080 sem limpar dados; API reiniciada, sessão administrativa pode precisar nova
verificação. Nenhum dado de desenvolvimento removido/migrado, nenhum serviço externo
alterado ou deploy. Conferência visual final pelo proprietário pendente.
Logs anteriores da API continham aviso React de chaves duplicadas; sem reprodução
nesta verificação de leitura, não houve ajuste fora do escopo. Rever se reaparecer
na conferência de catálogo administrativo.
Detalhes/custos em [etapa-7-5-4.md](etapa-7-5-4.md). Próxima subentrega 7.5.4-B exige
aprovar limite de cadastros e diagnóstico/preenchimento local das reservas de nomes
antes de ativar cadastro autônomo. B e C não foram implementadas neste passo.


## Etapa 7.5.4 — desenho técnico preparado; implementação pendente (21/10/2026)

Proprietário autorizou avançar à 7.5.4. Análise identificou que shorts/comments lidos
pelo SDK e regras atuais não ocultam os vídeos ao bloquear apenas o jogo. Proposta
em [etapa-7-5-4.md](etapa-7-5-4.md): leitura pública de shorts/comentários pela API
existente, preservando Firestore exclusivo; entrega A de integridade, B de inclusão
manual autônoma, C de catálogo/bloqueio auditado. Ajuste arquitetural e impacto das
páginas parciais/leituras aguardam aprovação antes de alterar código. Nenhum dado,
serviço externo ou regra alterado, nenhum teste repetido nesta análise.
Reserva privada de nomes legados requer diagnóstico e preenchimento local com
aprovação específica posterior; não mesclar colisões nem migrar automaticamente.


## Etapa 7.5.3 — atalhos de motivos administrativos (21/10/2026)

Painel de solicitações de jogos usa ReasonShortcuts: seis opções aprovadas em dois
grupos, positivos e negativos. Estado separa opções selecionadas e observações
livres; texto composto usa vírgula/espaço e segue enviado ao endpoint existente.
Desmarcar não apaga observações; frases já escritas manualmente não são duplicadas.
Editar uma frase gerada transforma o trecho editado em texto livre, preservando o
conteúdo. Motivos mistos mostram aviso acessível, sem decisão automática. Limite de
500 caracteres preservado; atalhos que excederiam o limite ficam indisponíveis,
sem truncar o texto. Reinício da análise/fila limpa o rascunho como anteriormente.
Autenticação, confirmação, registro de motivo e auditoria no servidor intactos.
6 testes de estado/texto aprovados; verificação localizada de renderização confirmou
seis checkboxes, grupos, aviso, limite e bloqueio enquanto ocupado. ESLint localizado,
tipagem frontend e diff aprovados. Sem build/suíte completa, dependências, serviços
externos ou deploy. Conferência visual no painel aguarda proprietário.
Git estava limpo ao iniciar; commit permanece a cargo do proprietário. Próxima:
7.5.4, cadastro manual autônomo/catálogo/bloqueio; apresentar desenho técnico e
subtarefas antes da implementação conforme os impactos de integridade já apontados.


## Etapa 7.5.2 — seção de inclusão de jogos recolhida (21/10/2026)

Formulário público usa opção collapsible do OfficialGamePicker, com details/summary
nativo inicialmente fechado. Texto do controle: Não encontrou seu jogo? Conteúdo
permanece montado para preservar consulta, seleção, resultados e campos do formulário
ao abrir/recolher, sem requisições decorrentes da expansão. Semântica nativa informa
estado expandido e fornece interação por teclado. Administração permanece aberta.
Fluxos de pesquisa, confirmação e solicitação existentes intactos; cadastro manual
autônomo pertence à 7.5.4, ainda não implementada. Sem mudanças de backend/dados.
ESLint localizado, tipagem do frontend e verificação temporária de renderização
aprovados; sem build/suíte completa. Conferência visual final: abrir, preencher,
recolher e expandir novamente; conferir campos preservados. Git estava limpo antes
da alteração. Nenhum commit realizado pelo agente. 7.5.3 aguarda autorização.


## Etapa 7.5.1 — seleção visual IGDB implementada (21/10/2026)

Autorizado apenas o refinamento dos resultados do OfficialGamePicker. Cada resultado
agora é um label clicável com nome e metadados; radio nativo fica visualmente oculto,
sem removê-lo da navegação por teclado/leitor de tela. Grupo com nome único por
instância, hover discreto, estado selecionado e foco visível no item inteiro.
Styles isolados em OfficialGamePicker.module.css. Confirmação, IDs oficiais,
requisições e regras de duplicatas intactos. Nenhuma alteração de backend ou dados.
ESLint localizado e tipagem do frontend aprovados. Verificação temporária com React
e cliente simulado confirmou renderização, seleção, habilitação/confirmacão e
callback; sem chamadas externas ou novas dependências. Diff sem erros.
Conferência visual/teclado no navegador pendente com proprietário. Não executado
build/suíte completa por ser alteração localizada. Etapas 7.5.2 em diante aguardam
autorização individual. Especificação de referência: texto anexado pelo proprietário
como Clipzone_Prompt_Etapa_7_5_Atualizado.md; manter decisões aprovadas da Etapa 7.5.


## Descoberta cronológica — pesquisa textual desativada por decisão de produto (21/10/2026)

Proprietário confirmou publicação e pesquisa funcionando localmente, encerrando a
validação visual da Etapa 7, e depois autorizou retirar a pesquisa da primeira versão
pública. Implementação/testes preservados sob controle compartilhado desativado;
rota pública sem operações Firestore, sem novos fragmentos na publicação/seed e
backfill bloqueado. Índices exclusivos arquivados fora da configuração ativa;
isenções simples preservadas para campos antigos. Nenhum dado existente removido,
nenhuma migração executada, nenhum índice remoto alterado ou deploy realizado.
Feed cronológico, 15 por página, cursor e filtros/fichas de jogos mantidos.
Curtidas anônimas próprias e relevância geral/por jogo são requisitos futuros
obrigatórios, ainda sujeitos a autorização de implementação. Detalhes e reativação
em [busca-firestore.md](busca-firestore.md). 36 testes relacionados aprovados, lint/build
aprovados e rota HTTPS local conferida com 404 após reinício da API. Conferência
visual final pelo proprietário; nenhuma alteração commitada pelo agente.
Checkpoints abaixo são históricos.


## Conferência visual da pesquisa — acesso YouTube restabelecido (21/10/2026)

Após o proprietário atualizar a restrição de IP, a consulta real da YouTube Data API
retornou HTTP 200. Controle N2sTV8SekIs: público, processado, incorporável, duração
36 segundos e título "O minotauro é outra experiência #dimraeth". O ID kYXeqi8U-ig
não veio em items; sua existência/disponibilidade não foi confirmada e não deve ser
aprovado com base nessa resposta. Não inferir duração ou motivo da ausência.
Próximo passo: proprietário publicar o controle no emulador com jogo Dimraeth e
conferir pesquisa por fragmentos/acentuação e filtro de jogos. Conferência visual
continua pendente. Nenhuma regra de publicação alterada ou configuração externa
modificada pelo agente. IP auxiliar permanece em arquivo .local ignorado pelo Git.


## Etapa 7 — pesquisa por títulos implementada e validada no emulador (21/10/2026)

Autorização ajustou o teto para 30 candidatos e 15 resultados. Firestore exclusivo;
fragmentos 1–3 no short, comparação final no servidor, ordem cronológica e filtro
de jogo. Até dois lotes internos de 15, cursor no último examinado, continuação
explícita inclusive em lote vazio e sem leitura do candidato 31. Sem novas consultas
por tecla, likes/relevância, serviços ou deploy. Índices apenas locais.
24 testes relacionados passaram (6 no emulador); lint/build, verificações finais
do servidor e scripts aprovados. Backfill local concluído com zero shorts existentes;
API HTTPS reiniciada e endpoint conferido com 200/zero candidatos/consulta esgotada.
Base de desenvolvimento não recebeu shorts fictícios. Navegador sem automação local;
conferência visual pendente com o proprietário. Limitações/custos/20 arquivos em
[busca-firestore.md](busca-firestore.md). Scripts geram migração local retomável, com
prontidão bloqueada em falha. Termos comuns podem exigir muitas continuações.
Relevância futura permanece separada do índice textual; nenhuma implementação de
curtidas foi antecipada. Não avançar a produção ou outra etapa sem autorização.


## Histórico anterior — avaliação inicial da pesquisa (antes da aprovação de 30 candidatos)

Proprietário autorizou avançar à etapa seguinte após organizar commits. Git limpo
no início. Avaliação Firestore existente e simulação com 1.000 títulos documentadas
em docs/busca-firestore.md; script reproduzível scripts/evaluate-title-search.mjs.
Proposta: fragmentos 1–3 no próprio short, consulta por candidato e comparação final
no servidor; até 15 resultados/60 candidatos examinados e continuação explícita.
Sem código funcional/índices/backfill implementados, sem serviços novos, testes
completos, alterações externas ou deploy. A mudança de campos/índices aguarda
aprovação arquitetural, conforme regra do proprietário. Próximo passo: aprovar a
estratégia e então medir no emulador, preservando publicação/cotas/privacidade.

Proprietário informou conclusão da conferência local do cadastro manual antes desta
etapa. Manter limitações conhecidas de tradução e contato de suporte provisório.


## Cadastro manual de jogos — implementado; conferência visual pendente (21/10/2026)

Proprietário esclareceu e autorizou aceitar solicitações sem cadastro na IGDB.
Painel agora permite vínculo IGDB ou cadastro manual com nome e motivo, exclusivamente
com autorização administrativa existente. Identidade manual determinística; criação,
vínculo e auditoria transacionais. Ficha sem descrição/capa, com justificativa e contato
provisório teste.suporte@clipzone.com explicitamente ainda indisponível, sem envio/email.
30 testes relacionados passaram (6 no emulador), lint/build e verificações finais
localizadas aprovados. Sem serviços novos/deploy. API local reiniciada para teste;
sessão administrativa precisa de nova verificação. Conferir manualmente a aceitação e
Abrir ficha do jogo. Detalhes/arquivos em [catalogo-jogos.md](catalogo-jogos.md).


## Ajuste vigente — tradução pt-BR configurada e amostras locais conferidas pelo proprietário

Proprietário autorizou Workers AI gratuito com persistência única por versão da fonte.
Adaptador, reservas/limites privados, integração no cadastro e ficha pt-BR/original
implementados. Original e nomes oficiais preservados; falhas não impedem cadastro.
20 testes relacionados aprovados (3 no emulador), lint/build e checagens finais do
servidor aprovados. Credencial criada pessoalmente pelo proprietário. Portal/Tibia traduzidos na API real
e salvos somente no emulador, com originais preservados. Glossário/proteção de nomes
ajustados após a primeira amostra. Proprietário informou a conferência e autorizou
seguir em 21/10/2026; manter limitações conhecidas, sem garantia universal de tradução.
API local reiniciada; sem mudança de plano ou deploy. Conferência das fichas/traduções encerrada pelo proprietário.
Próximo passo nesta etapa: conferir solicitação de jogo e revisão administrativa
no navegador. Não iniciar pesquisa global/produção sem autorização individual.
Não imprimir segredos; não usar plano pago/AI Gateway/créditos. Detalhes e arquivos
em [traducao-jogos.md](traducao-jogos.md). Alterações anteriores do catálogo preservadas.


## Estado vigente — Catálogo e fichas IGDB implementados; aceite visual pendente (21/10/2026)

Bloco autorizado pelo proprietário, Etapa 6 no relatório original. Reutiliza a busca
IGDB e a confirmação existentes. Ficha pública exibe metadados já armazenados;
solicitação privada de jogo sem resultados preserva o formulário aberto. Novo painel
usa Google/TOTP/UID por chamada, com filas paginadas, vínculo a jogo IGDB ativo,
rejeição motivada, revisão concorrente e auditoria. Nenhuma publicação de vídeo é
aprovada por esse painel; políticas, cota e duplicatas permanecem iguais.
25 testes relacionados passaram, incluindo 4 no emulador isolado; lint/build passaram.
Ferramenta de navegador bloqueou acesso local: conferência visual pendente com o
proprietário, sem contorno. API HTTPS e Firestore de desenvolvimento iniciados.
Detalhes, roteiro, arquivos e limitações em [catalogo-jogos.md](catalogo-jogos.md).
Sem dependências, configurações externas, deploy ou commit. Próxima etapa do plano:
pesquisa global por trecho, somente após autorização individual.


## Checkpoint anterior — Etapa 5 concluída e validada localmente (21/10/2026)

Comentários persistentes conectados ao formulário e ao servidor. Textos sem sinais
detectados publicam automaticamente; suspeitas de ameaça/discriminação/spam e
palavrões isolados ficam ocultos para revisão, conforme escolha do proprietário.
UUID de tentativa, deduplicação de texto recente e limite separado preservam o envio
contra reenvios e abuso; autor/recibos/sinais são privados. Sem cota de vídeo consumida.
Novo painel de comentários reutiliza Google/TOTP/UID por chamada, com filas paginadas,
aprovação/rejeição/remoção/restauração, motivo obrigatório e revisão transacional.
Regras Firestore existentes preservadas, índice apenas local, sem novos serviços/deps.
30 testes distintos relacionados passaram, incluindo 6 no emulador isolado; lint/build
passaram. API local reiniciada. Formulário real publicou teste normal e ocultou palavrão.
Conferência final com login Google/TOTP do proprietário concluída: fila pendente,
detalhe/sinal de triagem e rejeição motivada do comentário de teste funcionaram.
Painel confirmou Decisão registrada e fila pendente vazia, sem alterar outros conteúdos.
Detalhes, arquivos, limitações de triagem e retenção em docs/comentarios.md.
Não avançar para outra etapa sem autorização. Aviso React de chave repetida no feed
continua como pendência separada, sem refatoração nesta implementação.

## Checkpoint anterior — fontes e títulos entregues localmente (21/10/2026)

TikTok: proprietário aprovou explicitamente a publicação automática sem comprovação
de duração, desde que as demais verificações oficiais e de segurança sejam atendidas.
Exceção implementada no adaptador existente e na decisão compartilhada, restrita à
plataforma extraída da URL no servidor. shortFormat permanece unknown; o motivo de
auditoria tiktok-platform-policy registra a decisão consciente, sem inventar duração.
YouTube mantém /shorts/ e 180 segundos; Twitch mantém suas regras.
44 testes relacionados passaram, incluindo segurança, cota, duplicatas, revisão e
restauração; lint/build passaram. Consulta real do TikTok fornecido resultou em
publicação elegível pela exceção, sem gravar o vídeo no emulador ou na nuvem.
Detalhes e limitações em docs/validacao-tiktok.md.
API local reiniciada. Pendência separada: logs anteriores mostraram aviso React de
chave repetida no feed; componente não alterado nesta etapa. Investigar com escopo
próprio, preservando o bloqueio transacional de duplicatas.
Refinamento futuro de duração TikTok não bloqueia a primeira versão. Não avançar para
outra etapa sem autorização; sem dependências, novos serviços, OAuth ou deploy.

Checkpoint de configuração YouTube (21/10/2026): proprietário revisou e aceitou os termos
iniciais do Google Cloud; YouTube Data API v3 ativada em clipzone-db02a, status Ativado
confirmado no console. Sem adesão ao teste gratuito, faturamento ou deploy.
Credencial dedicada criada pelo proprietário e YOUTUBE_API_KEY presente no ambiente
privado ignorado pelo Git; chave limitada a YouTube Data API v3 e endereços IP.
Browser key do Firebase preservada. O primeiro HTTP 403 por IP foi diagnosticado:
backend usa IPv6. Proprietário salvou o IPv6 exato junto ao IPv4, mantendo as restrições.
Nova consulta real retornou HTTP 200; N2sTV8SekIs tem 36 segundos, incorporação permitida
e título disponível, com decisão automática publicada sem comprovação externa do jogo.
Submissão com metadados reais validada em memória isolada: publicação, título original,
edição preservada e uma unidade de cota. Vídeo longo Im69kzhpR3I consultado e recusado
como not-a-short. Nenhuma publicação gravada no Firestore de desenvolvimento ou nuvem.
API local reiniciada e formulário preencheu o título via Data API. Na primeira conferência,
o catálogo estava vazio e o envio foi cancelado. Depois o proprietário publicou o Short
pelo formulário e informou Dimraeth como jogo; registro existente preservado sem novo envio.
Aceitação conferida por leitura no emulador: status published, jogo Dimraeth ativo
(igdb-249202), título original preservado, reserva permanente e uma publicação na cota.
A publicação permaneceu no feed após recarregar; player oficial encontrado aberto,
sem iniciar reprodução pelo agente. Evidência: youtube-dimraeth-publicado.png no workspace.
Nenhuma gravação adicional pelo agente nesta conferência nem alteração na nuvem.
Chave não exibida nem copiada para o repositório; sem faturamento, OAuth ou deploy.
Aceitação local YouTube concluída. TikTok segue a exceção aprovada no resumo acima.

Política aprovada e implementada localmente: seleção obrigatória de jogo ativo é declaração
do visitante, sem exigir comprovação externa, OAuth ou confiança por criador.
YouTube: somente URL /shorts/ID, Data API com identidade/disponibilidade confirmadas,
duração positiva máxima de 180 segundos (sem tolerância) e incorporação explicitamente
permitida. O critério não certifica universalmente a classificação oficial Shorts.
Falhas técnicas inconclusivas permitem nova tentativa sem gravar/reservar vídeo nem
consumir cota. Sinais de moderação preservam revisão preventiva; denúncias, duplicatas
permanentes, cotas e autorização Google/TOTP/UID continuam preservadas.
A implementação da política não exigiu migração de pendentes antigos, dependências ou deploy.
A configuração externa YouTube foi posteriormente autorizada e validada, conforme checkpoint acima.
Validação: 70 testes distintos relacionados passaram (53 localizados + 17 transacionais
no emulador isolado), lint/build e git diff --check aprovados. API HTTPS local reiniciada.
Manifesto dos arquivos alterados e limitações em docs/fontes-titulos.md. Git sem staging,
commit ou push; alterações anteriores preservadas.

Avaliação TikTok em docs/validacao-tiktok.md preservada como contexto da decisão.
oEmbed não fornece duração e o player não comprova esse valor ao servidor; proprietário
aceitou conscientemente essa limitação exclusivamente para TikTok. Não exigir aprovação
de criadores, OAuth ou revisão administrativa para publicações comuns.
A seleção obrigatória de jogo ativo continua sendo declaração do visitante.
Filtros audiovisuais não implementados não são presumidos como existentes.

Etapa 0 regularizada. Etapa 1 autorizada individualmente e concluída no ambiente
local: Google, cadastro/desafio TOTP e autorização administrativa no servidor.
Proprietário confirmou "Acesso administrativo verificado." em 21/10/2026.
UID único na allowlist privada; autenticação em memória e exigência de TOTP
preservadas. Chaves e códigos do autenticador não foram coletados pelo agente.

Identity Platform ativo; Google habilitado, app Web registrado sem Hosting e
127.0.0.1 autorizado. TOTP ativado pelo proprietário no Cloud Shell: provedor
ENABLED e adjacentIntervals 1; SMS não configurado. Plano Spark mantido, sem
faturamento ativado. Firestore da aplicação continua somente no emulador local.

Onze testes focados, lint e build já passaram na implementação; não repetidos
para alterações documentais. Painel de denúncias e revisão autorizado em 21/10/2026 e implementado; três filas conferidas no navegador, incluindo removidos. Restauração aprovada, implementada e testada. Etapa 2 concluída localmente; Etapa 3 autorizada e concluída localmente: players oficiais e elegibilidade. Etapa 4 autorizada e em andamento: fontes/títulos conectados; política atual implementada conforme resumo acima e docs/fontes-titulos.md. Proposta de confiança por origem superada. Sem deploy,
commit, push ou ativação de serviços neste fechamento.

Os checkpoints abaixo são históricos; este resumo prevalece sobre estados antigos.

## Decisões confirmadas pelo proprietário

- Publicação automática de shorts válidos de games das plataformas aceitas.
- Revisão para denúncias, inconsistências e sinais de abuso; novas verificações técnicas inconclusivas permitem tentar novamente sem criar pendência.
- Combate fictício normal do jogo não equivale a ameaça, discurso de ódio ou violência real.
- Vídeos removidos mantêm sua reserva de identidade e não podem ser republicados.
- Apenas shorts efetivamente publicados consomem a cota de cinco no dia civil de São Paulo.
- Tentativas rejeitadas precisam de proteção antiabuso independente.
- Pesquisa persistente deve continuar encontrando qualquer trecho do título.
- Priorizar IGDB, com atribuição visível quando a integração estiver ativa.
- Firebase clipzone-db02a e conta Cloudflare gratuita configurados; sem deploy ou faturamento. Firestore continua o único banco aprovado.

## Entregue e verificado localmente

Etapa 4: leitura Firestore por cursores, regras restritivas, índices declarados,
Java portátil, emulador, registros de teste, estados de erro/vazio/carregamento,
modo demo preservado e testes isolados em portas diferentes do desenvolvimento.

Preparação da etapa 5:
- Validação compartilhada de entradas, um jogo por envio, limites de texto e
  rejeição de campos administrativos enviados pelo cliente.
- Chave de dia civil America/Sao_Paulo baseada no relógio confiável do servidor.
- Núcleo de decisão de publicação automática com falha conservadora.
- Serviço submitShort com jogo ativo, identidade reservada, registro de eventos,
  publicação ou pendência, e atualização atômica da cota apenas quando publicada.
- Adaptador Firestore REST usando fetch/Web Crypto, sem dependência do Admin SDK.
- Concorrência testada no emulador: duplicatas, cinco publicações, mudança de dia,
  pendência sem consumo, remoção com identidade preservada e recusa por abuso.
- Adaptador IGDB com autenticação de aplicativo Twitch, cache de token, consultas
  limitadas e escapadas, destinos fixos, timeout e falha sem metadados inventados.

O núcleo de submissão ainda não está ligado a um endpoint público ou formulário
persistente. verify e checkAbuse são dependências obrigatórias de servidor.
Os testes fornecem respostas controladas; isso NÃO verifica vídeos reais nem
implementa identificação anônima ou antiautomação de produção.

A coleção privada submissionOwners guarda o hash anônimo associado ao short para
contabilização futura quando um pendente for aprovado. Não fica em documentos
públicos. Retenção e fluxo de aprovação ainda precisam ser implementados.

## Estado das verificações

- Lint e TypeScript da aplicação e do servidor.
- Build de produção.
- 15 testes de URLs, entradas, data civil, decisão automática e adaptador IGDB.
- 14 testes no emulador de regras, consultas e transações concorrentes.
- No navegador: carregamento, falha sem emulador, recuperação, feed vazio,
  páginas 15/15/2, comentário aprovado visível e pendente oculto.
- Recarregar o modo Firestore preservou a leitura dos dados do emulador.
- A última tentativa de reconferir o modo demo em 5173 foi bloqueada pela
  revisão automática da ferramenta de navegador por limite de uso.
  Não houve nova validação visual depois dos ajustes de validação compartilhada.

## Ainda necessário para a aplicação completa

1. Middleware de identidade anônima assinada, limitação de tentativas e mecanismo
   antiautomação; hash em submitShort não pode vir diretamente de JSON do cliente.
2. Verificação real de existência/formato/jogo e moderação, antes de habilitar
   publicações públicas. Nenhum fornecedor de moderação foi escolhido/contratado.
3. Endpoints Cloudflare, credenciais servidor e conexão com os formulários.
4. Fluxo persistente de consulta/confirmar jogo e solicitações de revisão.
5. Índice de pesquisa por qualquer trecho com sincronização de publicações e remoções.
6. Autenticação administrativa com MFA, denúncias, filas de revisão, confirmações
   de exclusão e logs. Sem autorização administrativa simulada.
7. Integrações oficiais de reprodução e metadados das plataformas.
8. Testes de integração em ambiente real, responsividade completa e deploy aprovado.

Os metadados públicos das plataformas não comprovam isoladamente todo o conteúdo
do vídeo. O provedor precisa indicar incerteza em vez de marcar como verificado.

## Decisão atual sobre pesquisa

Cloudflare D1 não autorizado pelo proprietário. Não adicionar serviços ou
bibliotecas sem justificativa e aprovação. Alternativas compatíveis com o
Firestore foram registradas em [busca-firestore.md](busca-firestore.md), sem
alterar a pesquisa ou os índices existentes.

## Continuação: camada HTTP de publicação

Adicionado server/http/submissions.ts, que chama o núcleo existente e exige
origem configurada, POST/JSON, corpo de até 8 KiB e identidade resolvida por
middleware confiável. Erros internos não são enviados ao visitante. Sem
configuração, retorna indisponibilidade e não grava. Publicação retorna 201;
pendência retorna 202. Não é uma rota de produção já habilitada.

Quatro testes HTTP novos passaram; lint e build completos passaram pela
integração com o núcleo. As suítes antigas não foram repetidas sem alterações
relacionadas. Ainda faltam middleware real, composição da rota e conexão do
formulário. Verificação externa e autenticação administrativa continuam pendentes.

Diretriz de trabalho: consultas pontuais, respostas breves, testes proporcionais,
sem refatoração preventiva nem novas dependências não aprovadas.

## Contas e credenciais

Firebase/Cloudflare e aplicativo Twitch/IGDB ainda precisam ser criados ou
configurados com aprovação específica. Login, aceite de termos e credenciais
privadas serão tratados no ambiente próprio; não colar senhas ou chaves no chat.
Nenhum serviço externo foi criado, nenhum faturamento foi ativado e nenhum
commit, push ou deploy foi feito nesta continuação.


## Checkpoint — identidade anônima e composição da API

Implementados e compilados, sem exposição pública:
- server/security/visitor-identity.ts: cookie __Host- assinado com HMAC-SHA-256,
  identificador aleatório, HttpOnly/Secure/SameSite=Strict, validade de 30 dias,
  rejeição de assinatura inválida, duplicidade e expiração. O segredo permanece
  exclusivamente no servidor; nenhum segredo real foi criado neste bloco.
- server/security/attempt-limit.ts: contador transacional privado por identidade,
  janela e quantidade configuráveis, separado da cota diária de publicações.
  Conta tentativas válidas que chegam ao núcleo, incluindo vídeos rejeitados.
  Requisições malformadas são recusadas antes e ainda precisam de proteção de borda.
- server/http/session.ts: preserva sessão válida e exige controle de admissão
  confiável antes de emitir outra. Falha de admissão impede a emissão.
- server/http/public-api.ts: compõe /api/session e /api/shorts, sem registrar
  endpoints Cloudflare ou alterar o formulário demonstrativo.

Validação deste bloco: 5 testes de identidade/sessão e 3 de limite/API passaram;
lint e build completos passaram. As suítes anteriores não foram repetidas.
Os testes novos de API usam AtomicStore em memória com transações serializadas;
não representam nova validação de concorrência do adaptador REST no emulador.

Limites explícitos e próxima retomada:
1. Cookies não identificam uma pessoa. Apagá-los permite pedir nova identidade;
   allowSessionIssuance precisa de controle real independente do cookie antes
   da exposição pública. Nenhum mecanismo antiabuso de borda foi simulado como pronto.
2. Os valores operacionais maximumAttempts/attemptWindowMs precisam ser definidos
   na configuração. Nenhum limite adicional foi imposto à interface atual.
3. Não há política de limpeza automática de submissionAttempts; registros são
   reutilizados por identidade, mas retenção deve ser resolvida antes de produção.
4. Criar adaptadores oficiais de verificação real e escolher como analisar conteúdo
   além dos metadados. Não usar respostas dos testes como evidência real.
5. Configurar infraestrutura/segredos com aprovação, montar a rota Cloudflare,
   depois conectar o formulário. A sessão exige HTTPS, sem fallback inseguro.
6. Autenticação administrativa/MFA e painel permanecem pendentes.

Estado seguro para interrupção: site demonstrativo preservado, nenhuma rota nova
exposta, nenhuma dependência instalada, nenhum commit/push/deploy realizado.
Para retomar, começar deste checkpoint e consultar apenas os módulos envolvidos.

## Checkpoint — metadados oficiais Twitch

Adicionado server/videos/twitch.ts com consultas GET restritas a
https://api.twitch.tv/helix/clips, timeout, redirects bloqueados e token somente
no cabeçalho de servidor. Verifica identidade retornada, existência, duração,
título e categoria comparada a um mapeamento confiável do catálogo.
Resposta vazia indica ausência; falhas HTTP/rede e respostas inválidas indicam
incerteza. Não consulta URLs arbitrárias nem utiliza HTML fornecido pelo visitante.

Este adaptador NÃO analisa áudio/imagens, não comprova incorporação e não libera
moderação. Evidências de metadados continuam pendentes até as verificações restantes.
Mapeamento Twitch do catálogo e obtenção do token ainda precisam ser conectados.
YouTube e TikTok ainda não têm adaptadores reais. Nenhuma credencial foi criada.

Validação: quatro testes com respostas HTTP controladas, TypeScript do servidor
e lint localizado passaram. Não houve chamada autenticada real à Twitch nem
repetição de testes antigos. Nenhuma alteração na interface ou dependências.
Fonte: https://dev.twitch.tv/docs/api/reference/#get-clips (19/10/2026).

## Checkpoint — metadados oficiais YouTube

Adicionado server/videos/youtube.ts com consulta restrita ao endpoint oficial
videos.list, seleção mínima de campos, timeout e redirects bloqueados. Chave
somente no servidor; URL autenticada não deve ser registrada em logs.
Confirma existência e título apenas quando identidade e estado são coerentes.
Respostas vazias, privadas, malformadas e erros permanecem inconclusivos.

O adaptador não infere Shorts pela URL/duração nem jogo pelo título/categoria.
Também não libera moderação. Todo resultado continua pendente até a verificação
completa; incorporação deverá ser verificada pelo fluxo completo antes de publicar.
Não houve criação de chave, chamada autenticada real ou habilitação de rota.

Validação: quatro testes novos com HTTP simulado, TypeScript do servidor e lint
localizado passaram. Sem novas dependências ou repetição das suítes antigas.
Próximo: TikTok e composição dos verificadores, mantendo explícitas as limitações
que exigem credenciais, análise de conteúdo e decisões de infraestrutura.
Fontes oficiais consultadas em 19/10/2026:
- https://developers.google.com/youtube/data/reference/rest/v3/videos/list
- https://developers.google.com/youtube/data/reference/rest/v3/videos

## Checkpoint recuperado — TikTok e roteamento

server/videos/tiktok.ts consulta somente o oEmbed oficial com URL canônica,
timeout e redirects bloqueados; ignora HTML/scripts e URLs de mídia retornadas.
server/videos/verify.ts seleciona o adaptador pela URL validada. Metadados não
liberam moderação audiovisual. Adaptadores ausentes mantêm o envio pendente.
Cinco testes novos, lint e build passaram antes da interrupção. A gravação deste
checkpoint havia sido bloqueada por limite de uso da revisão automática e foi
concluída na retomada. Não foi necessário repetir os testes sem mudanças.
Fonte: https://developers.tiktok.com/docs/en/embed-videos

## Checkpoint — formulário persistente conectado ao contrato HTTP

Adicionados PersistentSubmissionDialog.tsx e submission-api.ts. No modo Firestore,
o botão Compartilhar abre formulário com catálogo paginado e usa /api/session
antes de /api/shorts. Respostas 201/publicado e 202/pendente têm mensagens diferentes;
apenas publicação confirmada atualiza o feed. Falhas preservam campos, e não há
retentativa automática após perda de resposta. Envio duplo é bloqueado por ref.
Modal.tsx agora permite impedir fechamento durante envio, inclusive Escape, sem
alterar o fechamento padrão dos outros diálogos. HomePage preserva modo demo.

Três testes novos do cliente HTTP passaram. Lint completo e build passaram;
após corrigir o fechamento do modal, TypeScript e lint dos componentes passaram.
Não houve validação visual deste bloco nem teste ponta a ponta com API real.
Nenhuma nova dependência, commit, push ou infraestrutura foi adicionada.

Atenção: conexão de código não significa servidor disponível. O Vite atual não
expõe essas rotas; tentativas no modo Firestore mostram indisponibilidade. Para
publicação real faltam configuração autorizada de infraestrutura/credenciais,
controle real de emissão de sessões e verificações completas do vídeo. Foi
solicitada ao proprietário autorização específica para configuração externa sem
faturamento; não presumir aprovação enquanto não houver resposta.

Próximos blocos: composição/deploy seguro após autorização; autenticação
administrativa/MFA; comentários/denúncias persistentes e filas administrativas.
Busca global por trechos permanece pendente, sem D1 autorizado. Não declarar a
aplicação completa ou a moderação autônoma pronta neste estado.

## Autorização de configuração externa — 19/10/2026

Proprietário autorizou configurar Firebase, Cloudflare e Twitch/IGDB somente em
planos sem faturamento, sem cartão/planos pagos ou serviços cobrados. Único banco
autorizado: Firestore. Preservar execução local. Segredos exclusivamente em
ambiente/armazenamento seguro, nunca no Git. Contas, login e configuração de
credenciais exigem participação do proprietário. Deploy público NÃO autorizado;
antes de expor endpoints verificar regras e autorização e obter aprovação específica.

Iniciada abertura do console Firebase; exige login Google pelo proprietário.
Nenhum projeto externo criado, credencial emitida ou faturamento ativado.
Próximo passo: após login, criar projeto Spark sem Analytics opcional e conferir
as opções gratuitas reais do console antes de habilitar Auth/Firestore. MFA deve
ser verificado quanto à disponibilidade sem faturamento; não habilitar SMS pago.
Cloudflare permanece sem deploy; Twitch exige conta com 2FA para registro do app.

## Projeto Firebase confirmado

Projeto criado pelo proprietário: Clipzone, ID público clipzone-db02a.
Console confirmou plano Spark, sem custos (US$ 0/mês). Login concluído pelo
proprietário. Em configuração do único banco Firestore autorizado; ainda não
considerar banco, Auth ou aplicativo Web configurados sem confirmação posterior.
Nenhum deploy público autorizado. Configuração local continua usando demo-clipzone.

## Firestore criado na nuvem

Confirmado no console: banco (default), edição Standard, southamerica-east1
(São Paulo), projeto clipzone-db02a em Spark. Criado no modo produção com
allow read, write: if false. Nenhuma coleção adicionada. Backups desativados
(exigem Blaze). Regras públicas locais ainda NÃO implantadas na nuvem.
Não alterados os destinos locais do emulador. Cloudflare aberto na tela de login;
autenticação/aceite de termos aguardam o proprietário. Sem deploy público.

## Cloudflare confirmado — conta gratuita

Login do proprietário concluído. Console Workers plans confirma Free como
Current plan, US$ 0; Workers & Pages mostra nenhum projeto existente. Nenhuma
aplicação criada/publicada, nenhum upgrade e nenhum armazenamento adicional.
Limites exibidos: 100.000 requisições/dia e 10 ms CPU/requisição. Medir CPU da
verificação/autorização antes de qualquer deploy; espera de rede não equivale a CPU.
Conta preparada para a etapa futura, mas deploy continua sem autorização.
Console Twitch aberto, aguardando login/2FA pelo proprietário para registro IGDB.

## Retomada — aplicativo Twitch confirmado

Console confirmou Clipzone Games registrado, callback https://localhost.
Preparado .env.server.local (ignorado pelo Git) para TWITCH_CLIENT_ID e
TWITCH_CLIENT_SECRET, preenchidos diretamente pelo proprietário. Não usar VITE_.
Não ler/imprimir esse arquivo em ferramentas, logs ou respostas. Não versioná-lo.

Adicionado scripts/check-igdb.mjs. Após preenchimento, executar:
node --env-file=.env.server.local scripts/check-igdb.mjs
O teste usa somente endpoints oficiais Twitch/IGDB, informa sucesso/erro sem
segredos, consulta League of Legends e não escreve no Firestore. Nenhuma chamada
real foi feita nesta preparação; falta participação do proprietário nas credenciais.
Arquivo verificado sintaticamente, sem instalar dependências ou repetir suítes.

## Twitch/IGDB — conexão real validada

Executado node --env-file=.env.server.local scripts/check-igdb.mjs após o
proprietário preencher as credenciais. Autenticação Twitch e consulta oficial
IGDB concluídas com sucesso; pesquisa League of Legends retornou 8 registros.
Nenhum segredo/token foi exibido, nenhum jogo foi selecionado automaticamente
e nenhum dado foi gravado no Firestore. A consulta pode conter jogos relacionados;
a confirmação do título oficial continua necessária no fluxo de cadastro.
Próxima etapa: integrar a consulta/seleção de jogos ao servidor e formulário,
com limitação de requisições e persistência somente após validação oficial.
Deploy público permanece não autorizado.

## Checkpoint — pesquisa IGDB na API

Adicionado server/http/game-search.ts e rota GET /api/games/search?q=... na
composição da API. Exige sessão assinada; rejeita origem cruzada, parâmetros
extras, repetidos ou inválidos; devolve no máximo dez resultados e atribuição
IGDB. Campos enviados ao cliente limitados a ID oficial, nome, data e plataformas.
Falhas retornam indisponibilidade; não geram jogos fictícios nem registros.

Limite privado gameSearchAttempts separado de submissionAttempts e da cota diária.
Thresholds são configuração explícita; gameSearch ausente mantém a rota em 503.
Coleção privada já coberta pelo deny-all das regras. Sem novos bancos/dependências.

Validação: quatro testes novos e três testes da API afetada passaram; build passou.
Lint completo concluído sem erros. Nenhuma consulta real repetida sem necessidade.
Próximo bloco: confirmar seleção contra IGDB no servidor antes de gravar o jogo,
então integrar busca/seleção ao formulário. Não confundir resultado de busca com
jogo já cadastrado. Rotas continuam sem deploy e não estão acessíveis pelo Vite.

## Checkpoint — confirmação oficial de jogos

Adicionados server/games/confirm-game.ts e server/http/game-confirmation.ts.
POST /api/games/confirm recebe somente externalId, exige origem/sessão, aplica o
limite de operações do catálogo e consulta novamente o IGDB antes de gravar.
ID determinístico games/igdb-{externalId}, criação transacional e retorno do jogo
existente evitam duplicatas. Jogos desabilitados não são reativados. Cliente não
pode enviar nome, status ou metadados. Reutilizado leitor HTTP limitado a 8 KiB.

Quatro testes novos e sete testes relacionados passaram; lint e build passaram.
Testes usam catálogo controlado e AtomicStore serializado em memória, não uma
nova comprovação de concorrência no emulador. Antes de habilitar esse fluxo,
validar a transação de confirmação no emulador e completar integração visual.
Nenhum dado de catálogo foi gravado na nuvem, nenhuma dependência/deploy criado.

Ausência no IGDB retorna game-not-found sem inventar cadastro; fluxo persistente
de solicitação pendente ainda falta. Próximo: seletor de resultados oficiais no
formulário e confirmação explícita preservando link/canal preenchidos.

## Checkpoint — seleção IGDB no formulário persistente

Adicionados OfficialGamePicker.tsx e catalog-api.ts; integrados ao
PersistentSubmissionDialog.tsx. Busca por botão ou Enter, até dez resultados,
atribuição IGDB, escolha por rádio e confirmação explícita. Apenas gameId oficial
confirmado é selecionado no formulário. Link e canal permanecem no componente pai.
Sem formulários aninhados, sem pesquisa a cada tecla e sem repetição automática
de gravações. Operações de catálogo bloqueiam envio/fechamento concorrentes.

Três testes novos do cliente HTTP, lint completo e build passaram. Não realizada
validação visual ou ponta a ponta com servidor neste bloco. A API ainda não está
montada no Vite; indisponibilidade é exibida sem simular cadastro bem-sucedido.

Pendências preservadas: teste de concorrência da confirmação no emulador,
solicitação persistente de jogo não encontrado, composição segura local da API,
administração/MFA e verificação audiovisual. Nenhum deploy ou nova dependência.

## Checkpoint — confirmação validada no emulador

Adicionado tests/firestore/game-confirmation.test.mjs. Três testes passaram com
o adaptador REST real no Firestore Emulator: três confirmações simultâneas geram
um único registro; visitante não consegue escrever no catálogo; jogo desabilitado
permanece oculto e não é reativado; falha/ausência no IGDB não cria documentos.
Respostas IGDB continuam controladas nesse teste, sem consulta externa.

scripts/firebase-local.mjs aceita nome opcional validado de teste para executar
apenas a suíte necessária. Executado:
node scripts/firebase-local.mjs test game-confirmation.test.mjs
Lint localizado passou. Nenhum código da aplicação alterado, build não repetido.
Emulador de testes encerrado normalmente. Nenhuma alteração no banco da nuvem.
Próxima etapa: API local segura para validar os formulários ponta a ponta; manter
proteções de produção e não habilitar publicação pública incompleta.

## Checkpoint — servidor HTTPS local preparado

Adicionados scripts/dev-api.mjs, scripts/local-api-bridge.mjs,
tests/local-api-bridge.test.mjs e docs/api-local.md. Servidor restrito a
127.0.0.1:5174, certificado externo obrigatório, API e Vite na mesma origem,
Firestore fixo demo-clipzone:8080, catálogo IGDB com credenciais privadas opcionais.
Verificação de vídeos ainda indisponível: envios permanecem pendentes. Nenhum
deploy, instalação ou modificação de regras na nuvem. Sessões locais limitadas
por processo e invalidadas ao reiniciar; não reutilizar esse runner em produção.

Três testes da ponte passaram; lint completo e build passaram. Início sem
certificado foi recusado como esperado. Fluxo HTTPS real no navegador ainda
não validado: depende de certificado local confiável e emulador em execução.
Solicitada participação do usuário para certificado, sem instalar autoridades
ou ignorar alertas TLS automaticamente. Próximo: certificado e validação ponta
a ponta de seleção IGDB/envio pendente/duplicidade.

## Checkpoint — fluxo local validado no navegador (2026-10-20)

Após reinício, certificado HTTPS reconhecido pelo navegador interno, sem ignorar
alertas. Servidor dev-api em 127.0.0.1:5174 e emulador demo-clipzone:8080 ativos.
Validados pela interface: pesquisa IGDB real (8 resultados), confirmação explícita
de League of Legends, preservação de link/canal, envio de URL sintética de teste
recebido para análise e segundo envio rejeitado como duplicado. Reabertura do
formulário recuperou o jogo cadastrado. Feed permaneceu vazio.
Leitura REST no emulador confirmou exatamente um short com moderationStatus
pending e zero documentos em submissionLimits. Nenhuma gravação na nuvem.
Não houve alteração de código; lint/build anteriores não repetidos.
Evidência visual no workspace do chat: validacao-formulario-local.png.
Limitação: URL sintética exercita o fluxo pendente, não valida vídeo real.
Próximas funcionalidades: solicitação persistente de jogo não encontrado,
validação real de vídeos e administração autenticada/moderação. Publicação
automática continua dependente da verificação completa do conteúdo.

## Checkpoint — metadados Twitch reais (2026-10-20)

Servidor local agora configura createTwitchClipVerifier. O catálogo IGDB expõe
accessToken somente para composição de servidor, reutilizando seu cache existente.
Novo server/games/twitch-mapping.ts lê jogo ativo IGDB do banco e consulta Helix
Get Games por igdb_id; respostas ambíguas/inconsistentes/falhas não confirmam jogo.
Referência: https://dev.twitch.tv/docs/api/reference#get-games

Sete testes focados (mapeamento + clipes), lint completo e build passaram.
Consulta real somente leitura a um clipe retornou existence=confirmed,
shortFormat=confirmed, gameMatch=confirmed, moderation=unavailable. Nenhum clipe
foi gravado ou publicado nessa verificação. Servidor HTTPS reiniciado com a
integração; sessões anteriores precisam ser renovadas automaticamente pelo cliente.
Ainda faltam análise audiovisual, integração das demais fontes e administração.

## Checkpoint — publicação automática por validação técnica (2026-10-20)

Decisão explícita do usuário: ausência de análise audiovisual não deve impedir
publicação se existência, formato e jogo estiverem confirmados. decision.ts agora
aplica essa política. Flags de ameaça/ódio/violência real/inconsistência e verdict
flagged continuam pendentes, assim como qualquer validação técnica inconclusiva.
verify.ts preserva flagged em vez de sobrescrevê-lo por unavailable.

Nove testes focados, seis testes de transações no emulador, lint e build passaram.
A suíte de concorrência agora usa moderation=unavailable e comprova publicação,
limite diário, deduplicação e reserva após remoção com a nova política. Não houve
publicação na nuvem. A integração local atual permite confirmar metadados Twitch;
YouTube/TikTok ainda não têm todas as verificações técnicas necessárias.

Pendências autorizadas: título original automático editável com original mantido
no servidor; botão de denúncias e fila administrativa. Denúncias iniciais NÃO
ocultam conteúdo. Volume elevado poderá ocultar temporariamente, mas limiar e
proteções contra manipulação precisam ser definidos antes da ativação. Notificação
externa ao administrador fica para etapa futura. Nenhum novo serviço aprovado.

## Checkpoint — título automático editável (2026-10-20)

Adicionada prévia POST /api/shorts/preview com sessão assinada, origem exata,
corpo limitado, URLs aceitas e contador privado videoPreviewAttempts separado da
cota e das tentativas de envio. Retorna somente título validado; não grava short
nem reserva vídeo. Reutiliza adaptadores do servidor; fonte não configurada
retorna indisponível, sem inventar título original.

Formulário consulta após 600 ms, cancela/ignora respostas antigas ao trocar link
ou fechar e não sobrescreve edição manual. Campo Título opcional até 500 caracteres,
sem controles. Envio aceita title, jamais originalTitle do cliente. Servidor
consulta novamente a fonte e grava originalTitle separado (null se indisponível).

19 testes focados passaram; lint completo e build passaram. Validação no navegador
com link Twitch real preencheu Legends, permitiu editar para Teste local — título
editado e publicou automaticamente no emulador. Leitura REST confirmou title
editado, originalTitle=Legends e moderationStatus=published. Nenhum deploy ou
gravação na nuvem. Screenshot titulo-automatico-validado.png no workspace do chat.

Próximo: botão de denúncias e persistência privada com deduplicação/limites; fila
administrativa e notificações pendentes. Não ativar ocultação por volume até
limiar/proteções serem definidos. Outras fontes ainda precisam integração técnica.

## Checkpoint — denúncias privadas sem ocultação (2026-10-20)

Adicionado botão Denunciar vídeo dentro de FirestoreShortDialog, formulário com
motivos definidos, confirmação de envio e bloqueio de submissão/fechamento durante
requisição. Cliente estabelece sessão, não repete gravações automaticamente e
aceita resposta idempotente. Fluxo demonstrativo permanece inalterado.

POST /api/reports exige origem, sessão assinada, JSON limitado e contador separado
reportAttempts. Serviço usa transação: reports/{hash(shortId,visitor)} registra
uma denúncia por identidade e reportSummaries/{shortId} agrega contagem privada
para futura fila administrativa. Somente shorts publicados são denunciáveis.
Nenhuma denúncia altera visibilidade, cota ou reserva de vídeo. Identidades são
sessões anônimas, não pessoas comprovadamente distintas; não ativar ocultação por
contagem simples. Painel autenticado, notificação e limiar de ocultação continuam
pendentes conforme decisões do usuário.

Cinco testes HTTP/cliente/composição e dois testes reais no emulador passaram:
concorrência/deduplicação, agregação, publicação preservada, cotas intactas e
regras negando leitura/gravação de denúncias ao visitante. Lint completo e build
passaram. Servidor HTTPS reiniciado; validação visual do formulário ainda pendente.
Nenhum deploy, nova dependência ou alteração no Firestore da nuvem.

## Checkpoint — denúncia validada no navegador (2026-10-20)

Teste visual concluído sobre registro fictício criado exclusivamente no emulador:
short ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
jogo report-test, título TESTE LOCAL — fluxo de denúncias. O emulador estava vazio;
nenhum conteúdo real ou registro na nuvem foi denunciado.

Formulário exibiu motivos, recebeu denúncia e bloqueou repetição da mesma sessão
com confirmação visível. Leitura REST confirmou count=1 e vídeo published após
duas tentativas. Acesso sem credencial ao resumo privado retornou 403. Evidência
visual denuncia-validada.png no workspace do chat. Não houve alteração de código;
testes/lint/build anteriores não repetidos. Próximo: autenticação administrativa
para consultar a fila privada; notificações e ocultação automática seguem pendentes.

## Checkpoint — avaliação Firebase Authentication/MFA (2026-10-20)

Authentication inicializado pelo botão Vamos começar no projeto clipzone-db02a.
Nenhum provedor habilitado, usuário criado, credencial emitida ou faturamento
ativado. Assistente de upgrade Identity Platform inspecionado até confirmação
final, SEM confirmar. Console confirma manutenção do Spark e cota de 3.000
usuários autenticados/dia, mas avisa que upgrade NÃO pode ser revertido.
Naquela inspeção, a aprovação ainda estava pendente. Posteriormente o proprietário autorizou e o upgrade foi concluído; consulte o estado vigente no início deste documento.
Não clicar em upgrade Blaze. Não confundir ativação de Identity Platform com
MFA configurado: TOTP ainda exige configuração adicional e cadastro do usuário.
Referência oficial: https://firebase.google.com/docs/auth/web/totp-mfa
Proposta: Firebase Auth + segundo fator TOTP, autorização administrativa no
servidor por identidade explicitamente permitida; visitantes sem login continuam
na sessão assinada atual. Nenhum acesso administrativo foi liberado.
Evidência: firebase-auth-confirmacao.png no workspace do chat. Nenhuma alteração
de código ou repetição de testes neste bloco. Após aprovação, concluir configuração
gratuita, validar disponibilidade TOTP e solicitar participação na conta/credenciais.

## Checkpoint — Etapa 0 regularizada

Escopo autorizado: expectativa antiga do teste, documentação vigente e organização
do versionamento do trabalho existente. Nenhuma implementação funcional alterada.

Alterações desta etapa:
- tests/tiktok-video.test.mjs: caso do roteador renomeado e expectativa alterada
  para published quando existência/formato/jogo estão confirmados; a asserção
  moderation=unavailable permanece. O teste do oEmbed incompleto continua pending.
- docs/continuidade.md: estado vigente do Identity Platform e aprovação por etapa.
- docs/api-local.md: removida a indicação antiga de validação local ainda pendente.

Verificação executada:
node --test tests/tiktok-video.test.mjs tests/metadata-publication.test.mjs tests/publication-decision.test.mjs
Resultado: 10 testes passaram, zero falhas. Nenhuma suíte completa, lint/build ou
novo teste visual executado: código funcional e arquivos de denúncias não mudaram.
Resultados anteriores das denúncias (HTTP, concorrência/regras no emulador e
navegador) permanecem aplicáveis. Os 10 arquivos desse bloco foram conferidos
por hash antes/depois e preservados integralmente, inclusive os não rastreados.

### Versionamento organizado — dois commits propostos, nesta ordem

1. feat: adiciona denúncias privadas com deduplicação por sessão
   Incluir somente os arquivos do bloco preexistente:
   - server/http/public-api.ts
   - server/security/attempt-limit.ts
   - server/http/reports.ts
   - server/reports/report-short.ts
   - src/features/shorts/components/FirestoreShortDialog.tsx
   - src/features/reports/ReportForm.tsx
   - src/features/reports/report-api.ts
   - src/lib/validation/report-input.ts
   - tests/reports.test.mjs
   - tests/firestore/reports.test.mjs

2. test: regulariza expectativa de publicação e documentação da etapa zero
   - tests/tiktok-video.test.mjs
   - docs/continuidade.md (inclui os checkpoints históricos ainda não commitados)
   - docs/api-local.md

Nenhum git add, commit, push, reset ou stash foi executado nesta regularização.
Não incluir arquivos de ambiente, certificados, logs ou dados do emulador.
A separação mantém código e testes de denúncias juntos; documentação e correção
da expectativa antiga ficam no segundo commit. Etapa 1 recomendada: autenticação
administrativa, TOTP e autorização no servidor; aguarda autorização individual.

## Checkpoint — Etapa 1 em implementação: Google/TOTP/autorização

Proprietário autorizou Etapa 1 e escolheu Conta Google. Implementada tela /admin
com SDK Firebase existente: login Google, desafio TOTP, cadastro manual no app
autenticador sem biblioteca QR, autenticação apenas em memória e saída. Nenhum
código/chave TOTP foi obtido, armazenado em arquivo ou preenchido pelo agente.
Nenhum painel ou ação de moderação foi implementado nesta etapa.

Adicionados server/auth/firebase-admin.ts e server/http/admin.ts: validação
RS256 via crypto nativo Node com certificados oficiais Firebase, issuer/audience/
timestamps, e-mail verificado, UID explicitamente autorizado, Google, TOTP e estado
atual da conta via API oficial (desativação/revogação/fator removido). Certificados
com cache; estado de conta não é cacheado. Rotas /api/admin/config (config pública
somente) e /api/admin/session (origem, sessão assinada e limite separado). O runner
local usa FIREBASE_AUTH_API_KEY, FIREBASE_AUTH_APP_ID e CLIPZONE_ADMIN_UIDS; sem
configuração ou UID, acesso fica bloqueado. Firestore e regras existentes intactos.
Adaptador crypto Node exige revisão de compatibilidade no runtime do deploy futuro.

Validação: nove testes focados de autorização/composição e dois novos de rotas
administrativas passaram. Lint completo e build passaram após ajuste de lint na
nova tela. Não repetidas suítes Firestore ou testes visuais anteriores.

Configuração externa AINDA NÃO CONCLUÍDA: formulário do provedor Google está
preparado no console, sem salvar, aguardando confirmação no momento da alteração
de acesso e aprovação do e-mail de suporte rafaelcpalhano@gmail.com. Solicitação
assíncrona enviada. TOTP do projeto ainda não ativado; app Web/API config e UID
ainda não configurados. gcloud não encontrado; nada instalado. Referência e roteiro
em docs/autenticacao-admin.md. Próximo: confirmar provedor/suporte, obter config
pública do app, ativar TOTP com autenticação do proprietário, login real, confirmar
UID e cadastrar fator pelo próprio proprietário. Não declarar a etapa completa
antes de validação real. Nenhum deploy/commit/push/faturamento.

## Checkpoint — provedor Google ativado; app Web aguardando proprietário

Autorização explícita recebida para nome público Clipzone e suporte no e-mail
atual, provisoriamente. Provedor Google salvo e confirmado ativado. Configurações
gerais confirmaram Spark, US$ 0/mês; SMS permanece desativado. Nome/suporte não
são critérios de autorização: mudanças futuras não alteram o UID administrativo.
Evidência: google-ativado.png no workspace do chat. Nenhuma informação pessoal
adicional foi publicada; nenhum deploy ou acesso ao Firestore real.

Console não tinha apps registrados. Preparado formulário Clipzone Web, sem
Hosting; Registrar app NÃO foi acionado pelo agente. Solicitada participação do
proprietário na criação/configuração de credenciais conforme condição anterior.
Próximo: proprietário clicar Registrar app e avisar quando configuração estiver
exibida; não enviar senhas/tokens/chaves pelo chat. Depois configurar valores
públicos no ambiente local, ativar TOTP, efetuar login real, aprovar UID e cadastrar
fator. Sem testes repetidos neste bloco: somente configuração externa/documentação.
Documentação atualizada em docs/autenticacao-admin.md; etapa continua pendente.

## Checkpoint — app Web registrado; domínio local pendente

Proprietário confirmou registro de Clipzone Web. Configuração pública do Firebase
adicionada a .env.server.local, com exclusão Git verificada e demais valores
preservados; nenhuma credencial privada foi exibida. Servidor HTTPS local e
emulador Firestore iniciados. Nenhum serviço de produção foi publicado.

Login pelo proprietário retornou domínio não autorizado. Console confirmou
localhost autorizado e ausência de 127.0.0.1. Formulário preparado apenas para
127.0.0.1; proprietário autorizou, domínio salvo e confirmado no console.
Depois: repetir login Google, confirmar UID autorizado, ativar TOTP do projeto
com participação do proprietário e validar cadastro/desafio/autorização real.
TOTP ainda não ativado; acesso administrativo não foi concedido.
Nenhum teste repetido: somente configuração local e documentação. Sem commit,
push, deploy ou faturamento. Etapa 1 permanece em andamento.
## Checkpoint — login Google informado; UID e TOTP pendentes

Proprietário informou login Google bem-sucedido após autorizar 127.0.0.1.
A aba local acessível ao agente ainda mostra Entrar com Google; não foi recarregada
neste bloco. Solicitado somente UID da página conectada para identificar a conta
administrativa, sem solicitar tokens ou códigos. Allowlist não alterada.

Cloud Shell oficial aberto pelo console Firebase para preparar ativação TOTP via
API documentada. Primeiro uso exige revisão dos termos; checkbox e botão Iniciar
não acionados pelo agente. Participação do proprietário solicitada para revisar,
aceitar se concordar e concluir eventuais autorizações. Nenhuma chamada de
configuração TOTP executada. Não ativar faturamento, SMS ou novos serviços pagos.
Sem alterações funcionais, testes repetidos, instalação, commit ou deploy.
## Checkpoint — UID configurado; consulta MFA aguardando proprietário

Proprietário informou o UID da conta conectada. Configurado somente esse UID em
CLIPZONE_ADMIN_UIDS no .env.server.local; exclusão Git reconfirmada, demais valores
preservados. API HTTPS local reiniciada; TOTP obrigatório permanece sem bypass.
Proprietário iniciou Cloud Shell. Controle da aba falhou ao operar terminal embutido;
a entrada inicial da consulta ficou incompleta, sem resultado de execução. Solicitado
Ctrl+C e execução manual de consulta GET que mostra somente a configuração MFA.
Não houve PATCH nem ativação TOTP neste bloco. Próximo: obter configuração MFA
atual, preservar demais opções na ativação, proprietário cadastrar autenticador,
refazer login com Google/TOTP e verificar autorização no servidor.
Somente ambiente local e documentação alterados; sem testes repetidos ou deploy.
## Checkpoint — autenticação administrativa validada (21/10/2026)

Proprietário executou PATCH de configuração MFA no Cloud Shell e compartilhou
somente resposta de configuração: state ENABLED, TOTP ENABLED, adjacentIntervals 1.
Máscara de atualização limitada a mfa.state e mfa.providerConfigs; SMS não adicionado.
Proprietário cadastrou o autenticador e informou "Acesso administrativo verificado."
A confirmação é do proprietário; o agente não capturou tela de segredo/código nem
obteve tokens. Etapa 1 concluída localmente; próxima etapa aguarda autorização.
Neste fechamento, apenas docs/autenticacao-admin.md e docs/continuidade.md alterados;
verificação de whitespace, sem repetir testes funcionais já aprovados.
Alterações anteriores preservadas, sem staging, commit, push ou deploy.
## Checkpoint — painel administrativo implementado (21/10/2026)

Git estava limpo ao iniciar. Implementadas filas paginadas de denúncias e vídeos
pendentes, detalhes com fonte original e histórico, motivo obrigatório e confirmação.
Servidor valida Google/TOTP/UID e estado da conta em cada rota. Revisões atômicas
com controle de concorrência e audit log; publicação pendente revalida fonte/jogo e
cota do autor no dia da aprovação. Remoção mantém reserva e não devolve cota.
Arquivamento mantém visibilidade; nova denúncia preserva marco reviewedCount e reabre fila.
Sem ocultação automática por volume, novos serviços, dependências ou deploy.

16 testes HTTP/autorização/denúncias e 6 testes transacionais no emulador isolado
8081 passaram. Lint e build passaram. API local reiniciada com as novas rotas;
proprietário solicitado a verificar acesso e Carregar fila para conferência manual.
Dados do emulador de desenvolvimento 8080 preservados. Índices somente em arquivo.
Documentação de uso e limites em docs/painel-administrativo.md. Nenhum commit/push.
Conferência manual: proprietário confirmou painel visível sem erros aparentes;
agente confirmou carregamento real de denúncias e pendentes, ambas vazias.
Captura painel-administrativo-2026-10-21.png no workspace do chat, sem e-mail/UID.
Critério da auditoria inclui restaurar conforme política; solicitada definição
explícita sobre restauração administrativa do registro original. A reserva contra
novos envios será preservada em qualquer opção. Implementação dessa ação aguarda
resposta; não declarar toda a etapa encerrada antes dessa definição.
## Checkpoint — restauração administrativa implementada (21/10/2026)

Proprietário autorizou restaurar o registro original, mantendo a reserva contra
novos envios. Adicionadas fila de removidos e ação restaurar com motivo/confirmação.
Destino obtido no servidor de moderationStates privado, gravado atomicamente na
remoção e vinculado à revisão. Publicado exige revalidação técnica/jogo ativo;
pendente volta a pendente. Nenhuma cota é cobrada novamente ou devolvida.
Registros sem histórico confiável permanecem removidos, sem inventar destino.

13 testes relacionados passaram (3 entrada/HTTP e 10 transacionais), incluindo
restaurações concorrentes, dias distintos, pendentes, histórico ausente, falhas,
dados alterados, reserva e privacidade. Lint e build passaram; suítes Auth não
repetidas. API local reiniciada com a implementação. Sessão em memória encerrada;
solicitado novo login Google/TOTP e carregamento da fila Vídeos removidos.
Sem novos serviços/dependências, mudanças na nuvem, commit, push ou deploy.
## Encerramento da Etapa 2 (21/10/2026)

Proprietário confirmou nova fila de removidos sem erros após login Google/TOTP.
Fila vazia é esperada: nenhum registro removido no ambiente de desenvolvimento.
Cenários com conteúdo, remoção/restauração e concorrência passaram em testes
no emulador isolado; não foram inseridos registros artificiais no ambiente 8080.
Etapa 2 concluída localmente. Próxima recomendação conforme auditoria: Etapa 3,
players oficiais e elegibilidade, ainda sem autorização de implementação.
Git permanece com alterações desta etapa, sem staging/commit/push ou deploy.
## Checkpoint — players oficiais e elegibilidade (21/10/2026)

Etapa 3 autorizada pelo proprietário. Player compartilhado entre demo e Firestore,
iframe apenas após escolha do usuário, autoplay/loop desativados e início pelos
controles nativos. Um player ativo; limpeza ao fechar/trocar, ocultar aba ou deixar
a área visível. URLs canônicas/identidade coerentes, HTTPS, parent Twitch real,
área útil mínima e fallback preservando fonte. Mensagens TikTok validam origem/janela.
Nenhuma regra de publicação, cota, autenticação ou serviço externo alterada.

Seis testes focados, lint e build passaram. Os três links fornecidos pelo dono
reproduziram voluntariamente uma vez em conferência local do componente real.
Verificados zero iframes antes de carregar/ao fechar e um ao ativar outro player.
Modal real: Twitch 508×300 úteis e desmontagem ao fechar. Último ajuste CSS de
bordas teve conferência localizada, sem repetir testes de outras funcionalidades.
Arquivos temporários player-check.html/tsx removidos. Sem posts de teste no 8080,
sem nova dependência, commit/push/deploy ou contadores internos de visualizações.
Limites de erros cross-origin/restrições e fontes oficiais em docs/players-oficiais.md.
Etapa 4 (fontes YouTube/TikTok e títulos) aguarda autorização individual.
## Checkpoint — fontes e títulos conectados; avaliação de automação (21/10/2026)

Retomado do formulário sem refazer funções existentes. Conectados TikTok oEmbed,
YouTube oEmbed sem chave e adaptador Data API opcional; Twitch preservado.
YouTube Data API consulta duração sem inferir formato/jogo positivo. Duração maior
que 181s rejeita formato, com tolerância documentada de um segundo. Nenhuma chave,
serviço externo ou faturamento foi ativado. Inconclusivos continuam pendentes.
18 testes focados, lint e build passaram. Ajuste localizado da tolerância teve cinco
testes YouTube aprovados; demais suítes não repetidas. Título YouTube preenchido na
tela; edição manual preservada quando TikTok não retornou título. Sem publicar,
criar jogos ou consumir cota de publicação. Formulário cancelado; API local ativa.

Proprietário autorizou avaliar verificação adicional para automação, sem ativar
serviços/custos. Referências oficiais consultadas: dados públicos não comprovam
sempre formato e jogo; OAuth de criador TikTok limita vídeos ao dono; Research API
não é alternativa geral. Opções, impactos e limites em docs/fontes-titulos.md.
Etapa 4 continua incompleta quanto à publicação automática YouTube/TikTok.
Aguardar escolha de política/acesso antes de implementar alternativa ou avançar.
Git preservado sem staging, commit, push, deploy ou novas dependências.
## Checkpoint — proposta de confiança por origem (21/10/2026)

Proprietário autorizou detalhar política de origens previamente avaliadas, sem
ativar serviços ou custos. Elaborada docs/politica-origens-avaliadas.md: confiança
por criador/jogo e escopo, ID oficial estável, avaliação inicial, validade proposta,
auditoria, suspensão/expiração, proteção contra concorrência e cotas preservadas.
Confiança não é confirmação técnica; autorizar exceção de formato exige decisão
expressa. Recomendado piloto de jogo único com formato ainda técnico. TikTok continua
limitado pela ausência de verificação oficial estável de autoria na composição atual.
Nenhuma regra ou código alterado neste bloco, nem novas permissões, serviços, tokens,
commit ou deploy. Sem repetir testes funcionais: somente documentação e diff check.
Aguardar aprovação/ajustes da política e escopo do piloto antes de implementar.
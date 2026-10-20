# Continuidade da aplicação — checkpoint

## Decisões confirmadas pelo proprietário

- Publicação automática de shorts válidos de games das plataformas aceitas.
- Revisão somente para denúncias, inconsistências, sinais de abuso ou verificação inconclusiva.
- Combate fictício normal do jogo não equivale a ameaça, discurso de ódio ou violência real.
- Vídeos removidos mantêm sua reserva de identidade e não podem ser republicados.
- Apenas shorts efetivamente publicados consomem a cota de cinco no dia civil de São Paulo.
- Tentativas rejeitadas precisam de proteção antiabuso independente.
- Pesquisa persistente deve continuar encontrando qualquer trecho do título.
- Priorizar IGDB, com atribuição visível quando a integração estiver ativa.
- Não existem ainda projetos Firebase/Cloudflare configurados para esta aplicação.

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

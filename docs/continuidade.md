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


# Firestore local — etapa 4

## Estado

Integração de leitura no emulador oficial, sem conta Firebase, login, cobrança,
serviço na nuvem ou deploy. O modo demo permanece padrão e funcional em 5173.
O modo de leitura local usa 5174. Não misturamos publicações em memória com o
feed do emulador: publicação, cadastro e envio de comentários ficam desabilitados
neste modo até existir backend validado.

## Preparação e execução

Requisitos: Node 24, npm e Java 21. Java 21 portátil Eclipse Temurin foi baixado
do endpoint oficial api.adoptium.net e conferido por SHA-256 antes da extração
em .tools/java/. Esse diretório é ignorado pelo Git e não acompanha o clone.
Em outro computador, instale Java 21 pelo fornecedor oficial ou coloque sua
distribuição portátil em .tools/java/<distribuição>/bin/java.exe.
O script escolhe a distribuição local quando existir; caso contrário usa o PATH.
Não é necessário modificar o PATH global do Windows.

1. npm ci
2. npm run emulators (manter este terminal aberto)
3. Em outro terminal: npm run seed:firestore
4. npm run dev:firestore
5. Abrir http://127.0.0.1:5174/

Para voltar ao protótipo: npm run dev, normalmente em http://127.0.0.1:5173/.
Não é necessário criar .env. .env.example documenta o modo padrão.

O emulador liga somente em 127.0.0.1:8080, projeto demo-clipzone. A UI do emulador
está desativada. O SDK usa cache em memória e consultas ao servidor, sem
persistência offline. A configuração não aceita destinos de produção.

O comando seed grava somente os IDs de teste locais conhecidos; não limpa a
coleção inteira. São 32 shorts, dois jogos e dois comentários, um aprovado e um
pendente. As URLs dos vídeos são ilustrativas e não comprovam conteúdo real.
Ele usa a ferramenta de testes para ignorar regras somente nesse emulador.

O encerramento normal do comando emulators exporta dados para .emulator-data/,
reimportados na próxima execução. Encerramento forçado pode impedir a exportação.

## Arquitetura

- src/lib/firebase/client.ts: configuração exclusivamente local.
- models.ts: contratos dos documentos persistentes.
- public-repository.ts: consultas e conversão de documentos para modelos de UI.
- FirestoreFeed: estados de carregamento, erro, vazio, catálogo e navegação.
- FirestoreShortDialog: leitura paginada de comentários aprovados.
- FirestoreGamePage: consulta de uma ficha ativa e feed relacionado.
- Os módulos Firebase são carregados sob demanda; o modo demo mantém suas fontes.

Regras públicas permitem somente games ativos, shorts publicados e comentários
aprovados cujo short esteja publicado. Uma leitura de comentário é bloqueada
quando seu short deixa de ser público. Nenhuma escrita do navegador é permitida,
mesmo com uma claim admin. Coleções privadas são negadas por padrão.

O backend futuro precisará de autorização própria e IAM: credenciais de servidor
podem ignorar Firestore Rules. As regras atuais não implementam transações,
antifraude, moderação, unicidade ou cotas de publicação.

## Consultas, cursores e custos

- Shorts: moderationStatus == published, gameId opcional, createdAt decrescente,
  documentId decrescente. Exibe 15; consulta no máximo 16 para detectar próxima.
- Jogos: status == active, officialName e documentId crescentes. Exibe até 50
  opções por carregamento; busca até 51. Catálogo adicional é explícito.
- Comentários: shortId e moderationStatus == approved, data e ID decrescentes.
  Exibe até 20; busca até 21. Comentários são consultados ao abrir um short.
- Nomes dos jogos são resolvidos somente para os jogos da página atual.
- Nenhuma contagem total nem leitura integral de shorts é executada.
- Voltar a uma página usa seu cursor. Atualizar reinicia os cursores.
- A navegação expõe páginas visitadas e o botão Próxima, sem calcular todas.
- Consultas sucessivas não são um snapshot transacional global: novas publicações
  aparecem ao atualizar; remoções podem reduzir uma página durante a navegação.

Limites nas regras restringem o tamanho de uma consulta, não a quantidade de
requisições de um usuário. Proteção contra abuso e orçamento ficam para o backend.
As consultas a documentos relacionados nas regras também podem gerar custo em
produção. O emulador não comprova custos, comportamento de produção ou implantação
dos índices. firestore.indexes.json ainda precisa ser validado no projeto real.

## Busca

O campo de busca persistente fica desabilitado com uma explicação visível.
A busca por qualquer trecho continua no modo demo. A escolha entre índice textual
externo e outra solução precisa ser aprovada; não há busca apenas sobre a página
atual disfarçada de busca global, nem redução silenciosa para busca por prefixo.

## Modelagem e estados

games mantém officialName, normalizedName, aliases, status, createdAt, updatedAt
e identidade externa opcional. Só documentos active são públicos. Metadados
editoriais e externos serão adicionados junto à integração da fonte aprovada.

shorts mantém originalUrl, normalizedUrl, platform, platformVideoId, title,
channelName, gameId único, createdAt e moderationStatus.
Estados propostos: pending → published ou rejected; published → removed.
Nenhuma transição é exposta nesta etapa.

comments mantém shortId, content, createdAt e moderationStatus.
Estados propostos: pending → approved ou rejected; approved → removed.
Se análise falhar, continuará pending. Não armazenar informações privadas em
documentos públicos: regras não ocultam campos individuais de uma leitura.

gameRequests tem requestedName, normalizedName, createdAt e status.
Decisões futuras incluem decidedAt, decidedBy, reasonCode e gameId quando aplicável.
Estados propostos: pending → approved (novo jogo validado), linked (jogo existente)
ou rejected. A implementação das transições e gravações depende da etapa seguinte.

submissionLimits, moderationLogs, adminConfig e videoIdentities são reservadas e
inacessíveis ao cliente. Seus modelos finais, retenção e operações atômicas ainda
precisam ser aprovados. Políticas confirmadas: manter a identidade após remoção e contar apenas publicações efetivas. Consulte continuidade.md para o núcleo transacional já implementado e as integrações ainda pendentes.

## Verificações

- npm run lint
- npm run build
- npm test (15 testes de URLs, entradas, data civil, decisão automática e IGDB)
- npm run test:firestore (14 testes de acesso, consultas e publicação concorrente)

test:firestore inicia e encerra o emulador com projeto demo-clipzone-tests, separado
do projeto de desenvolvimento. Usa portas próprias: Firestore 8081, hub 4401,
logging 4501 e websocket 9151. Pode rodar junto ao desenvolvimento. Os testes limpam somente o projeto de
testes; o helper não aceita projeto real ou host remoto.

Cobertura: páginas 15/15/4 com datas iguais sem repetição, filtro por jogo, catálogo
ativo, consultas amplas negadas, comentários pendentes/rejeitados/removidos ocultos,
comentário de short privado negado, coleções privadas protegidas e escritas
negadas inclusive para cliente autenticado com claim administrativa.

## Dependências

Firebase 13, firebase-tools 15 e rules-unit-testing 6 foram registrados no lockfile.
O override @grpc/grpc-js 1.14.6 corrige a dependência antiga fixada pelo Firestore;
a integração foi testada com essa versão.

npm audit --omit=dev não reportou vulnerabilidades após a correção.
A auditoria completa ainda registra sete avisos transitivos nas ferramentas de
desenvolvimento (quatro moderados e três altos), envolvendo firebase-tools,
OpenTelemetry, uuid/gaxios e braces/chokidar. Não foi executado audit fix --force
nem downgrade de ferramentas. Revisar atualizações antes de uso em CI ou nuvem.
A auditoria não é garantia de ausência de vulnerabilidades.

## Fora desta etapa

Autenticação administrativa, servidor Cloudflare, publicação real, limite diário,
deduplicação atômica, revisão de jogos, integração de metadados, moderação externa,
busca persistente e deploy permanecem pendentes.

## Continuação após revisão
O núcleo de publicação e o adaptador IGDB avançaram após esta etapa. O estado consolidado está em [continuidade.md](continuidade.md).

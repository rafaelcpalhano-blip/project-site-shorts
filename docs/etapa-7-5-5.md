# Etapa 7.5.5 — curtidas internas do Clipzone

## Entrega local — 21/10/2026

Proposta aprovada pelo proprietário: Firestore como único banco, curtidas sem cadastro,
contador nos cards e botão no visualizador, 20 tentativas/minuto por identidade,
controle transacional/idempotente e retenção sem faturamento, TTL ou agendamentos.
Sem ranking, seletor de relevância ou reativação da busca textual nesta etapa.

## Armazenamento e integridade

- shorts.likeCount: inteiro seguro não negativo; ausência em legados equivale a zero,
  sem migração ou escrita na visita. Valor presente inválido fecha a leitura/operação.
- shortLikes/<SHA256(namespace + shortId + hash privado da sessão)>: shortId, liked,
  revision, createdAt e changedAt. Não armazena IP, e-mail, fingerprint ou hash bruto
  da sessão no documento. A chave varia por vídeo/identidade. Consulta apenas por ID.
- createdAt preserva a primeira curtida desse registro mesmo após descurtir/curtir;
  changedAt registra a última mudança efetiva. Sem log ilimitado de cliques.
- likeAttempts/<hash da sessão>: reutiliza o limitador existente em escopo separado,
  máximo 20 chamadas de estado/alteração na janela fixa de 60 segundos. Não altera
  cotas de cinco publicações, comentários ou denúncias.
- /api/likes/state e /api/likes/set: POST JSON limitado, mesma origem HTTPS,
  cookie assinado HttpOnly/Secure/SameSite, sem cache, erros sem dados privados.
- Curtir/descurtir exige short publicado e jogo ativo, lidos na mesma transação que
  o estado privado e o contador. Somente o servidor determina o incremento/decremento.
  Nenhuma identidade pública, nem alegação admin no SDK, lê ou escreve os registros.
  As regras existentes de negação já cobrem as novas coleções; não foram ampliadas.
- Pedido envia estado desejado e revisão privada. Duplicar estado não grava contador;
  pedido antigo para estado diferente falha 409. Uma resposta perdida exige atualizar
  o estado antes de uma nova decisão. Não há repetição automática do POST no cliente.
- Revisão, título, moderação, datas, metadados e vínculos do short permanecem intactos.
  Ocultar/banir preserva curtidas e contagem; não aceita novas interações nem expõe
  estado pessoal enquanto indisponível. Restaurar não publica shorts removidos.

## Interface

Cards recebem a contagem junto ao feed existente, sem consulta individual por card.
O visualizador consulta o estado pessoal apenas ao abrir, apresenta botão acessível
com aria-pressed e confirma a resposta antes de atualizar seu botão e o card aberto.
Botão bloqueado durante operação; modal aguarda conclusão. Falha mantém o contador
sem incremento especulativo e oferece Atualizar curtida. Estado pessoal não vai para
localStorage, lista pública ou métricas externas. Sem polling/listener automático.
Modo demonstrativo não recebe números de curtida fictícios.

## Retenção e custo

Curtidas ativas permanecem enquanto o short existir (hoje não há exclusão física).
Descurtidas e registros de tentativas com mais de 90 dias podem ser removidos pela
manutenção explícita local, 30 documentos examinados por chamada, cursor por ID:

    node scripts/cleanup-likes.mjs inspect shortLikes
    node scripts/cleanup-likes.mjs apply shortLikes
    node scripts/cleanup-likes.mjs inspect likeAttempts

Para continuar outra página, passar o cursor next como último argumento. apply em
likeAttempts segue o mesmo formato. Não foi executada limpeza no desenvolvimento.
O script é fixo em demo-clipzone:8080, sem credencial de nuvem ou endpoint público.
Antes de excluir, relê o registro em transação; reativação concorrente o preserva.
Não altera contadores e preserva registros inválidos para avaliação. Curtidas
inativas são retidas além dos 30 dias de validade do cookie, evitando reuso de uma
revisão apagada por requisições antigas válidas. A limpeza não é automática.

Custos estimados, excluindo emissão de nova sessão/repetições de transação:
- Consulta do estado: 4 leituras e 1 escrita (3 documentos + limitador).
- Mudança efetiva: 4 leituras e 3 escritas (contador + estado + limitador).
- Repetição idempotente: 4 leituras e somente a escrita do limitador.
- Feed: contagem projetada na mesma leitura, sem nova leitura por card.
- Limpeza: até 30 leituras da página, releitura de cada elegível no apply e uma
  exclusão por registro confirmado; nenhuma leitura de todos os shorts.

Campos de shortLikes/likeAttempts sem índices de campo no manifesto; apenas nomes
são necessários à consulta/limpeza. likeCount usa índices padrão do short. Nenhum
índice de ranking antecipado. Manifesto não publicado. Armazenamento cresce por
combinação visitante/vídeo, não por clique; ativos ainda crescem com o uso e precisam
monitoramento. Dados e timestamps permitem a futura proposta de relevância sem
escolher fórmula nem contar alternâncias de curtida como novos eventos automaticamente.

## Limitações e validação

Não garante uma pessoa/um voto: limpar cookies, outro navegador ou expiração gera
nova identidade e perde acesso à curtida anterior, cuja contagem fica preservada.
A sessão existente dura 30 dias. No runner local, reiniciar muda o segredo em memória
como já ocorria, invalidando cookies; produção futura exige segredo persistente e
controles de admissão antes de disponibilizar endpoints. Não foi feito deploy.
O contador único por short pode sofrer contenção sob pico; adaptador já repete
transações ABORTED limitadamente. Sem shards/serviços extras antes de necessidade
comprovada. Limites por identidade não eliminam bots que renovam identidades.
O contador exibido é fotografia da última leitura/ação, sem sincronização entre
navegadores em tempo real. Contagem corrupta não é corrigida com valores inventados.

29 testes passaram: 14 de lógica/HTTP/cliente/retenção, 8 regressões de leitura pública
atingidas pelo novo DTO e 7 REST/regras no emulador isolado. Cobrem concorrência,
idempotência, revisão atrasada, origem/sessão/limites, exposição privada, moderação,
retenção e preservação de cotas/duplicatas. Lint e build completos aprovados.
Conferência visual do proprietário pendente após reinício da API local. Nenhuma
curtida artificial foi criada nos shorts de desenvolvimento por estes testes.

Próxima etapa: 7.5.6 — proposta de relevância e quatro ordenações, mediante autorização.

## Conferência HTTPS local após reinício

Sessão 204; /api/likes/set sem cookie 401; feed 200 com 10 cards, IDs únicos e
contadores válidos; /api/likes/state 200. Apenas leitura do estado, sem criar votos
nos shorts de desenvolvimento. API local em execução; proprietário deve atualizar
a página para obter a sessão atual e testar curtir/descurtir no visualizador.

Observação de continuidade: o log anterior ao código de curtidas tinha aviso React
de chave duplicada às 18:34. O feed consultado após reinício retornou IDs únicos;
a origem visual do aviso não foi reproduzida/diagnosticada nesta etapa. Investigar
se voltar a aparecer, sem presumir relação com as curtidas nem alterar outro módulo.

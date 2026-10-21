# Etapa 7.5.4 — proposta técnica para aprovação

Situação: subentregas A e B implementadas e validadas localmente após autorização explícita.
Subentrega C continua não implementada. Data: 21/10/2026.

## Resultado da subentrega A

- POST /api/feed, /api/shorts/detail e /api/comments/list com origem HTTPS, sessão
  assinada, corpo limitado, limitador independente publicReadAttempts, DTO público
  e respostas sem cache. Falhas internas não expõem metadados privados.
- Feed busca até dois lotes de 15 candidatos (máximo 30), retorna até 15, verifica
  jogo ativo e reutiliza sua leitura dentro da chamada. Cursor vinculado ao jogo;
  comentários em lotes de 20 com consulta até 21 e cursor vinculado ao short.
  DTO inclui nome do jogo, evitando releitura do nome por card no caminho ativo.
- Nenhum índice adicional necessário: consultas reutilizam os filtros/ordenações
  existentes. Nenhum novo campo persistente em games/shorts/comments. A coleção
  privada publicReadAttempts reutiliza o mecanismo de limites já existente.
- Repositório usa API para shorts/comentários e mantém SDK apenas para catálogo/fichas.
  Firestore nega leituras diretas de shorts/comments, inclusive clientes com claim admin;
  administração autorizada continua pela API. Regras aplicadas somente no emulador.
- Política compartilhada isVisibleGame/shortGameVisible. Comentários/denúncias
  verificam jogo na transação; aprovação/restauração de comentários também. Publicação,
  confirmação IGDB e restauração de shorts reutilizam a condição ativa já existente.
- Modal só monta player/formulários após leitura autorizada; indisponibilidade impede
  exibição do player. Atualizações de estado são percebidas nas próximas consultas,
  sem monitoramento em tempo real ou revogação de conteúdo já entregue ao navegador.
- Página pode ficar parcial/vazia com continuação; lote exato pode exigir chamada
  final vazia. Nunca informar esgotamento apenas por atingir 30 candidatos.
- O orçamento exclui leituras/gravações do limitador, mínimos de consultas e tentativas
  transacionais. Comentários verificam short+jogo antes de consultar aprovados.
  Limitação por sessão não garante identidade única por pessoa nem substitui a
  preparação de antiautomação/retenção da etapa de produção.
- 61 testes relacionados aprovados: 38 unitários/HTTP/cliente/regressões e 23 no
  emulador isolado (9 acesso público, 6 comentários, 2 denúncias, 6 pesquisa preservada
  e publicação/deduplicação/cota). Reexecuções limitadas aos casos/fixtures corrigidos.
  Lint completo e build aprovados pela integração estrutural; último ajuste em teste
  conferido com ESLint localizado. Nenhuma suíte completa de todos os testes.
- API de desenvolvimento reiniciada; HTTPS real conferido: feed 200 com 3 registros,
  comentários 200 e pesquisa textual 404. Dados existentes preservados; sem migração,
  exclusão, publicação de conteúdo, dependências, configuração externa ou deploy.
- Conferência visual final pelo proprietário ainda necessária: atualizar feed,
  filtrar por jogo, abrir short, carregar/enviar comentário normal. Sessões locais
  em memória encerraram com o reinício.

As seções abaixo registram o desenho aprovado e as partes ainda pendentes.

Especificação aprovada: Clipzone_Prompt_Etapa_7_5_Atualizado.md, anexada pelo proprietário.
Não reabre publicação automática, classificação declarada pelo visitante ou suporte provisório.

## Diagnóstico

- Cadastro manual existe apenas pela revisão administrativa de gameRequests.
- confirmGame preserva IDs IGDB e já impede reutilizar registro não ativo.
- submitShort valida jogo ativo dentro da transação e mantém duplicatas/cota.
- public-repository lê shorts e comentários pelo SDK; regras dos shorts verificam apenas moderationStatus.
- Portanto alterar somente games.status não oculta seus vídeos/comentários. Alterar somente React deixa leituras diretas abertas.
- Regras Firestore não são filtros. Consultas globais não podem simplesmente descartar registros proibidos; depender de consultas cruzadas também introduz limites de acessos às regras.
- Não atualizar todos os shorts numa única transação nem apagar vídeos/vínculos. Bases grandes e interrupções exigiriam propagação retomável; esta proposta evita essa dependência.

## Ajuste arquitetural aprovado — implementado na subentrega A

Usar a API existente para leituras públicas de shorts e comentários. Firestore permanece único banco;
sem novo serviço, biblioteca, plano pago, deploy ou infraestrutura adicional.

- Reutilizar contratos, mapeamento público, validações, cursores e composição HTTP existentes.
- Negar leituras diretas de shorts/comments pelo cliente; servidor verifica jogo + short + comentário.
- Catálogo e fichas de jogos podem continuar no SDK, com visibilidade expressamente permitida.
- API não deve transmitir campos privados nem nomes/motivos de jogos ocultos; respostas sem cache.
- Reutilizar origem HTTPS, sessão anônima assinada e limites de tentativas. Identidade anônima não equivale a pessoa única.
- Autorizações administrativas continuam Google/TOTP e UID permitido, com revisão e motivo.
- Verificar disponibilidade do jogo também ao comentar, denunciar, restaurar/publicar vídeo e confirmar jogo IGDB; vídeo só fica visível se sua própria moderação e o jogo permitirem.
- O código de pesquisa textual continua inativo e preservado; eventual reativação deverá incorporar a política de visibilidade.

### Feed e custo proposto

Mais recentes primeiro; devolver até 15 shorts; examinar no máximo 30 candidatos por chamada,
em até dois lotes de 15, consultando o estado de cada jogo distinto uma vez por chamada.
Cursor no último candidato examinado, sem pular resultados buscados mas não examinados.
Não percorrer coleção inteira para preencher página. Havendo candidatos ocultos, a página pode
ter menos de 15 itens ou ficar vazia com continuação explícita; não alegar esgotamento nesse caso.

Orçamento: até 30 documentos candidatos + até 30 documentos de jogos distintos; acrescentar
leituras/gravações de sessão/limitação, mínimos de consulta e novas tentativas transacionais quando
aplicáveis. Não é limite total de 30 leituras. Jogo/nome resolvido pode vir no DTO para evitar nova
leitura por card. Filtrando por jogo, validar o jogo antes de consultar seus vídeos.
Não prometer ganho de custo frente ao SDK atual; o objetivo deste ajuste é integridade de acesso.
Comentários: validar short e jogo antes da consulta paginada existente de aprovados; sem varrer coleção.
Índices apenas dos filtros e ordenações realmente usados, definidos na implementação.

## Entregas propostas, uma por vez

### A — Base de integridade e visibilidade

Implementar API de leitura + integração do repositório público + regras de segurança e testes.
Preparar funções compartilhadas de visibilidade para todas as ações de publicação/revisão.
Preservar registros e estados antigos; sem exclusões ou migrações automáticas.
A alteração de regras locais e a troca de leitor devem ser verificadas juntas no emulador;
nenhuma aplicação parcial em produção.

### B — Inclusão manual autônoma

#### Parâmetros aprovados e implementados

- Manter o limite existente de 20 tentativas por minuto por identidade assinada,
  com contador separado de tentativas de cadastro; sem aumentar esse teto.
- Limitar a 3 jogos manuais novos efetivamente criados por identidade/dia de São Paulo.
  Reaproveitamento de jogo existente, falhas e recusas não gastam esse limite diário;
  tentativas continuam sujeitas ao limitador existente. Não afeta os 5 shorts/dia.
- Contagem e reserva de nome na mesma transação; concorrência/repetições não geram
  novo jogo nem incremento duplicado. Sem cadastro/login obrigatório do visitante.
- Chaves privadas de nomes/variantes e limite diário no mesmo Firestore. Sem consulta
  do catálogo inteiro a cada cadastro, sem novo banco, índice textual ou dependência.
- Normalizar acentos, caixa, compatibilidade e espaços; comparar chave conservadora
  de pontuação/caracteres visualmente semelhantes. Colisões não mesclam IDs oficiais
  ou manuais. Ambiguidade deve orientar seleção existente/correção de nome. Cobertura
  contra grafias abusivas é limitada e não equivale a uma classificação universal.
- Novo endpoint separado para inclusão autônoma, preservando o contrato e os registros
  da fila antiga de solicitações. Reutilizar os validadores e a criação manual atual.
- Provisório é qualificação de revisão separada do status ativo necessário ao acesso;
  sem descrição/imagem inventadas, com seleção automática no formulário após sucesso.
- Centralizar o suporte fictício de desenvolvimento, sem mailto/envio. Cadastro autônomo
  não implica que já há um canal de suporte operacional ou que houve aprovação humana.

#### Preparação local aprovada e executada sem colisões

Preparar e executar diagnóstico paginado somente no emulador demo-clipzone:8080,
sem ler a coleção inteira de uma vez, identificando nomes/variantes conflitantes e
registros não ativos. Preservar IDs, status, metadados e solicitações existentes.

Se o diagnóstico não apresentar colisões, preencher somente as reservas privadas de
nomes em lotes limitados/transações, com prontidão bloqueada durante o processo e
retomada idempotente após interrupção. Não remover nem renomear jogos. Não transformar
rejeições antigas em banimentos. Registros não ativos não podem ser recriados pela
nova rota. Se houver colisão ou inconsistência, apresentar o caso e aguardar antes
de qualquer correção/migração correspondente; não escolher automaticamente um ID.

Ativar a nova inclusão somente quando a preparação estiver íntegra. Nada em produção,
sem serviços externos, sem deploy. Limites e preenchimento local receberam aprovação explícita antes da execução.

Testes previstos: normalização/colisões, concorrência, repetição entre visitantes,
3 criações/dia, falhas/reuso sem consumo, meia-noite São Paulo, jogos bloqueados,
proteção da reserva contra cliente público e preenchimento interrompido/retomado.
Validação do formulário: seleção automática e preservação de todos os outros campos.


Reaproveitar validação de nome (1–100 caracteres), cadastro sem metadados e seleção automática.
Representar provisório como qualificação separada da visibilidade: registro público elegível
com status ativo e revisão provisória; administração distingue esse estado de um jogo validado.
Não chamar um registro provisório de aprovado pelo administrador.

Criar registro privado de identidade normalizada do nome, ligado ao ID canônico do jogo, com
reserva transacional: cadastro concorrente reutiliza o mesmo registro, banimento não perde reserva.
Preservar IDs IGDB e manual existentes. Escritores de confirmação IGDB/cadastro administrativo
precisam compartilhar essa reserva para não recriar nomes banidos por outra rota.

Normalização: caixa, acentos, espaços e formas de compatibilidade; avaliar conjunto conservador
de caracteres visualmente confundíveis, sem unir silenciosamente jogos distintos. Nome ambíguo
retorna necessidade de corrigir/selecionar o registro existente, sem inventar metadados nem exigir
aprovação prévia de toda inclusão comum. Não prometer detectar qualquer grafia maliciosa.

Jogos legados precisam ser considerados antes de ativar novas reservas. Preparar ferramenta
local de diagnóstico e preenchimento dos registros privados, sem alterar IDs ou apagar dados;
executar apenas com autorização específica. Colisões devem ser apresentadas, não mescladas.
Não definir agora uma migração remota ou remover solicitações antigas.

Reutilizar limitação de tentativas e propor teto separado de cadastros aceitos antes da ativação;
não descontar cadastro de jogo da cota de cinco shorts. Repetições devem ser idempotentes.
Não afirmar que há antiautomação infalível ou novos filtros ofensivos já implementados.
Fluxo só muda de solicitar revisão para selecionar jogo após a base de visibilidade pronta.
Preservar gameRequests existentes, sua revisão e histórico; não converter rejeições antigas em
banimentos automaticamente. Nova inclusão recebe histórico de criação automática identificável.

Centralizar placeholder teste.suporte@clipzone.com como contato fictício não operacional no
ambiente local, sem envio de email/mailto. Configuração real e verificação de todas as aparições
são requisitos de lançamento, não tarefa de serviço externo desta etapa.

#### Resultado da subentrega B (21/10/2026)

- POST /api/games/manual usa o handler seguro já existente: sessão assinada, mesma
  origem, JSON/corpo limitado e gameRequestAttempts (20/min configurados na API local).
  API antiga /api/games/requests e todos os registros/estados legados preservados.
- createManualGame valida nome de 1–100 caracteres, rejeita controles/invisíveis e
  usa triagem de texto local existente, com suas limitações. Suspeitas são recusadas
  para correção do nome; não se afirma haver classificador semântico ou revisão de
  nomes implementada. Nenhum serviço de moderação externo adicionado.
- 3 criações aceitas por identidade/dia São Paulo, em transação com nome, jogo e
  auditoria privada. Reuso/repetições/recusas não gastam cota de criação; tentativas
  continuam limitadas. Shorts conservam sua própria cota de cinco por dia.
- Registro manual novo: ID determinístico compatível com o padrão anterior, status
  ativo + reviewStatus provisional, sem descrição/imagens/metadados inventados.
  Seleção automática no formulário e ficha pública identificada como provisória.
- Reservas privadas gameNameKeys: duas chaves SHA-256 por nome (exata normalizada e
  comparação visual conservadora); cada chave suporta até dez IDs oficiais distintos,
  sem mesclá-los. Ambiguidade impede inclusão manual automática; visitante deve
  selecionar um cadastro existente ou conferir o nome. Reuso exige correspondência
  real do nome com a referência, não apenas confiança no índice.
- Banidos/inativos, reserva órfã, estado de preparação inválido, quota ou referência
  corrompida falham fechados. Confirmação IGDB e criação administrativa compartilham
  as reservas para não contornar bloqueios. Origem oficial continua com ID IGDB.
- Comparação visual cobre acentos, caixa, compatibilidade, espaços/pontuação e um
  conjunto limitado/versionado de caracteres confundíveis e leetspeak. Pode gerar
  falso positivo e não detecta qualquer grafia, alias, tradução ou similaridade
  semântica. Não unificar automaticamente jogos diferentes por esse critério.
- Cadastro comum é automático, sem aprovação administrativa, conta do visitante ou
  autorização do criador. É preciso tentar a busca oficial na interface; falha da
  fonte não é apresentada como ausência comprovada e não impede acesso à inclusão.
  Backend não confia em declaração do frontend de que o jogo existe ou foi aprovado.
- Suporte fictício centralizado em src/config/support.ts, operational false; nenhum
  mailto, envio, criação de conta ou apresentação como canal operacional.
- Preparação: diagnóstico local 6 jogos/12 chaves/zero colisões; API parada antes de
  apply; 6 jogos processados e prontidão true. Apenas reservas e marcador privados
  escritos; jogos/IDs/solicitações preservados. Diagnóstico posterior confirmou os
  mesmos 6 jogos e zero colisões. Scripts têm destino demo-clipzone:8080 fixo.
- Aplicação de reservas tem lease de dois minutos, propriedade por execução, releitura
  transacional de cada jogo e retomada idempotente; falha mantém prontidão false.
  Diagnóstico retém apenas nomes/IDs/estado necessários em memória, proporcional ao
  catálogo, com páginas de até 30 e sem carregar metadados completos. Campo games
  no marcador é o total da preparação, não um contador vivo do catálogo.
- Ferramenta seed-firestore invalida prontidão antes de escrever fixtures diretamente,
  impedindo uso de um índice desatualizado; não foi executada nesta entrega. Depois
  de usá-la, diagnosticar novamente com API parada antes de preparar as reservas.
- Custo típico de criação: 5 leituras + 5 gravações na transação, mais 1 leitura e
  1 gravação do limitador; reuso único: 4 leituras + limitador (1 leitura/1 gravação).
  Estimativas excluem repetições transacionais e armazenamento/indexação automática.
  Zero novos índices compostos, bibliotecas, bancos ou serviços; sem tradução/API
  externa para cadastro manual. Retenção das quotas e proteção adicional contra
  recriação de identidade permanecem requisitos operacionais da etapa 8.
- 53 testes relacionados distintos aprovados: 39 unitários/HTTP/cliente/regressões
  e 14 no emulador isolado (5 novos, 3 confirmação IGDB, 6 solicitações legadas).
  Incluem concorrência, limite diário, meia-noite São Paulo, variantes banidas,
  integridade/retomada, dados privados, duplicatas e cinco shorts por dia.
  Lint e build aprovados; últimos ajustes locais com ESLint/tipagem e script syntax.
  Verificação temporária React confirmou botão/seleção/campos preservados e suporte
  sem mailto. Sem suíte completa repetida ou novas dependências.
- HTTPS local: inclusão de Portal retornou 200/reused, sem criar jogo ou gastar
  quota diária; feed retornou 200. Novas criações reais foram testadas no emulador
  isolado, sem inserir jogo fictício adicional no ambiente de desenvolvimento.
- Conferência visual final pelo proprietário ainda necessária. A nova API local foi
  reiniciada, encerrando sessões administrativas em memória. Nenhum deploy ou
  configuração externa alterada. C continua aguardando autorização; ainda não há
  catálogo administrativo completo de provisórios/banidos nesta entrega.

### C — Catálogo e decisões administrativas

Listar jogos por createdAt DESC + ID DESC, 20 por página, consulta até 21 para próxima página.
Abas: todos, ativos, provisórios, ocultos e Jogos banidos. Exibir origem e datas.
Reutilizar autenticação, confirmação explícita, controle de revisão concorrente, motivos e UID
em moderationLogs. Todos os comandos administrativos fechados a identidade pública.

Excluir/desativar é ocultação lógica, nunca exclusão física nesta etapa. Banir também reserva o
nome/variantes para impedir novos cadastros. Desbanir/restaurar é decisão explícita auditada;
respeitar estado próprio do vídeo, sem transformar vídeo removido em publicado.
Não remover vínculos, contagens ou histórico. Sem atualização em cascata dos vídeos.
Contagem de shorts só sob consulta explícita eficiente, via agregação se viável no adaptador;
se indisponível, mostrar não calculada, nunca um zero inventado. Não criar contador antecipado.

## Principais arquivos

Existentes:
- server/games/requests.ts e confirm-game.ts
- server/submissions/submit-short.ts
- server/comments/submit-comment.ts e review-comment.ts
- server/moderation/review-short.ts e reports.ts/queue.ts conforme verificações necessárias
- server/firestore/atomic-store.ts e rest-store.ts
- server/http/public-api.ts, game-requests.ts e admin-moderation.ts
- server/security/attempt-limit.ts
- src/lib/firebase/public-repository.ts
- src/features/games/components/OfficialGamePicker.tsx e GameInfo.tsx
- src/features/games/services/catalog-api.ts e game-details.ts
- src/features/submissions/components/PersistentSubmissionDialog.tsx
- src/features/admin/pages/AdminPage.tsx e components/GameRequestPanel.tsx
- src/features/shorts/components/FirestoreFeed.tsx
- firestore/firestore.rules e firestore.indexes.json

Novos módulos pequenos para políticas/identidade de jogos, leitura pública, catálogo administrativo,
cliente HTTP e testes respectivos; nomes finais definidos somente no escopo da subentrega.
Não modificar likes/ranking/miniaturas, pesquisa textual ou integrações externas.

## Validação proporcional

A: API/DTO/cursor/filtro, dados ocultos em feed/ficha/leitura direta/comentários; emulador e integração.
B: normalização, nomes ambíguos/banidos, idempotência e concorrência, limites, seleção e metadados vazios.
C: autorização sem MFA/UID, concorrência, confirmação, auditoria, paginação e restauração sem reativar
vídeos indevidos. Regressões de duplicatas/cota de shorts e solicitações legadas quando atingidas.
Lint/build quando integração estrutural ocorrer; sem repetir suítes sem alteração relacionada.

## Decisões solicitadas

1. Aprovado e implementado localmente: leituras públicas pela API, bloqueio das leituras diretas,
   orçamento explícito e páginas eventualmente parciais.
2. Aprovados e executados na B: três criações/dia e preparação local condicionada a diagnóstico
   sem colisões. Manutenções ou migrações fora desse escopo exigem nova autorização.
3. Sem deploy, faturamento ou alterações externas. Demais regras do documento permanecem aprovadas.

## Fontes técnicas

https://firebase.google.com/docs/firestore/security/rules-query
https://docs.cloud.google.com/firestore/native/docs/security/rules-conditions
https://firebase.google.com/docs/firestore/query-data/aggregation-queries
https://firebase.google.com/docs/firestore/pricing

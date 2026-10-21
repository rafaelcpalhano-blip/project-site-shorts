# Etapa 7.5.4 — proposta técnica para aprovação

Situação: subentrega A implementada e validada localmente após autorização explícita.
Subentregas B/C continuam não implementadas. Data: 21/10/2026.

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
2. Posteriormente aprovar limite operacional de cadastro e execução local do preenchimento das
   reservas de nomes legados. Não executar diagnóstico/escrita migratória sem escopo autorizado.
3. Sem deploy, faturamento ou alterações externas. Demais regras do documento permanecem aprovadas.

## Fontes técnicas

https://firebase.google.com/docs/firestore/security/rules-query
https://docs.cloud.google.com/firestore/native/docs/security/rules-conditions
https://firebase.google.com/docs/firestore/query-data/aggregation-queries
https://firebase.google.com/docs/firestore/pricing

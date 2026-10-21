# Painel administrativo de denúncias e revisão

Etapa autorizada em 21/10/2026. Implementação local; sem deploy ou alteração de serviços externos.

## Uso

1. Abrir /admin, entrar com Google/TOTP e verificar acesso no servidor.
2. Escolher Denúncias abertas, Vídeos pendentes ou Vídeos removidos e Carregar fila.
3. Abrir Revisar, conferir a fonte original, título, jogo, denúncias e as últimas dez decisões.
4. Informar motivo (5 a 500 caracteres), escolher a ação e confirmar.

Arquivar denúncias não muda a visibilidade. Novas denúncias de outras sessões reabrem a fila.
Remover muda o estado para removed; preserva a reserva de identidade e não devolve a cota já consumida.
Publicar só se aplica a pendentes: exige nova confirmação técnica de existência, formato curto e incorporação quando verificada pela fonte,
jogo ativo e reserva/autor válidos. Consome um dos cinco lugares do autor no dia civil da aprovação
em São Paulo. Cota esgotada ou verificação inconclusiva mantém o vídeo pendente. O cliente não
escolhe o autor nem a data da cota. Restauração administrativa do registro original foi aprovada e implementada; regras abaixo.

Combate fictício normal do jogo é distinto de violência real, ameaça e discriminação.
Análise humana pode resolver sinais de conteúdo, mas não substitui evidência técnica inconclusiva.
O jogo é declaração do visitante e precisa permanecer ativo no catálogo; comprovação externa
da correspondência não é exigida na aprovação nem na restauração.
No runner atual, Twitch valida metadados de clipes; YouTube requer Data API, duração positiva
até 180 segundos e incorporação permitida. oEmbed serve apenas para título.
Novos envios tecnicamente inconclusivos retornam falha recuperável sem criar pendência/reserva;
pendências já existentes não são migradas ou publicadas em massa.
TikTok ainda carece de evidência de duração; não foi introduzida lista de criadores confiáveis.

## Segurança e consistência

- POST /api/admin/queue, /api/admin/detail e /api/admin/review verificam em cada chamada
  UID autorizado, Google/TOTP, estado atual da conta, origem, sessão assinada e limite de tentativas.
- Nenhuma leitura de coleções privadas pelo SDK do navegador; regras Firestore não foram abertas.
- JSON limitado a 8192 bytes; campos e cursores estritos; erros não expõem documentos ou respostas de provedores.
- Filas com 20 itens + 1 sentinela, ordenadas por data e ID; detalhes de denúncias também paginados.
  Histórico mostra somente as dez decisões mais recentes. Não há varredura integral ou polling automático.
- Detalhes retornam motivo/data de denúncias, sem hashes de visitantes, tokens ou lista de administradores.
- Revisão transacional valida revisão do vídeo e contagem de denúncias. Concorrência ou novos relatos
  exigem reabrir os detalhes; reenvio da mesma decisão não duplica cota ou histórico.
- Alteração do vídeo, resumo, cota (quando aplicável) e audit log são atômicos. Logs privados guardam
  UID do ator verificado no servidor, motivo, estados anterior/posterior, contagem e horário.
- Denúncias individuais permanecem como evidência imutável de recebimento. O resumo guarda
  reviewedCount como marco de análise; status pending do registro original não define a fila atual.
- Denúncias continuam sem ocultação automática por volume. Limiares e notificações externas
  dependem de definição e autorização futuras.

Índices adicionados ao arquivo local: reportSummaries (status/lastReportedAt), reports
(shortId/createdAt) e moderationLogs (contentId/createdAt), todos com desempate por nome.
Nenhum índice foi publicado na nuvem. O adaptador REST existente foi ampliado com consultas
restritas; Firestore permanece o único banco.

## Verificação

- 16 testes focados HTTP/autorização/denúncias passaram.
- 6 testes no emulador isolado demo-clipzone-tests:8081 passaram: paginação, privacidade,
  decisões concorrentes, reabertura, bloqueio de republicação, cota, falhas e corrida com denúncia.
- Lint e build completos passaram após a integração.
- Conferência manual: proprietário confirmou painel sem erros aparentes. Agente confirmou carregamento real das duas filas vazias com Google/TOTP, sem erros. Decisões com dados foram verificadas no emulador isolado, sem inserir conteúdo de teste no ambiente de desenvolvimento.

## Restauração aprovada

Restaurar vídeo exige motivo, confirmação e autorização Google/TOTP/UID no servidor,
como as demais decisões. O registro volta ao estado anterior à remoção, obtido de
moderationStates/{shortId}, coleção privada no mesmo Firestore. O cliente não escolhe
o estado de destino. Remoção e gravação desse marco são atômicas; a restauração exige
que removedRevision coincida com a revisão atual do vídeo.

Se antes estava publicado, existência/formato/incorporação são revalidados e o jogo deve estar
ativo. Se antes estava pendente, volta para a fila pendente sem aprovação automática.
Reserva de identidade e cotas são preservadas: não há novo registro, novo envio ou
nova cobrança de publicação, inclusive se a restauração ocorrer em outro dia.
A aprovação futura de um pendente continua exigindo a cota normal.

Registros antigos sem marco confiável não são restaurados por suposição. Falha de
verificação, dados alterados ou decisão concorrente preservam o estado removido.
O audit log inclui restauração, motivo, ator verificado e estados anterior/posterior.

Validação da restauração: 3 testes focados de entrada/HTTP e 10 testes transacionais
passaram; lint e build passaram. Não repetidas suítes de Auth sem alterações.
A fila de removidos foi conferida pelo proprietário em 21/10/2026, sem erros; vazia no ambiente de desenvolvimento. Casos com conteúdo e restauração foram validados no emulador isolado, sem inserir dados artificiais no ambiente de desenvolvimento. Etapa 2 concluída localmente.

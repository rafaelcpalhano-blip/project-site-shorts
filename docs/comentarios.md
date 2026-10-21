# Comentários persistentes e moderação de texto — Etapa 5

Estado: Etapa 5 concluída e validada no ambiente local em 21/10/2026, incluindo
conferência administrativa com Google/TOTP real. Sem deploy ou alteração de serviço externo.

## Funcionamento aprovado

Visitantes comentam sem nome ou conta em vídeos publicados. Texto de 1 a 500 caracteres,
normalizado em NFC, preserva acentos e quebras de linha; controles inválidos e campos
extras são recusados. Conteúdo é renderizado como texto pelo React, nunca como HTML.
A seleção de jogo e as regras YouTube/TikTok/Twitch não são alteradas.

Triagem local publica automaticamente textos sem sinais detectados. Ameaças explícitas,
algumas expressões discriminatórias, linguagem ofensiva e sinais simples de spam ficam
pending, ocultos. Proprietário escolheu revisar também palavrões isolados.
Combate fictício normal (por exemplo, matar o boss) não é classificado como ameaça.
Não há serviço externo, modelo semântico, análise audiovisual ou garantia de detectar
todas as ofensas. Gírias, ironia, citações e evasões podem gerar falsos positivos/negativos.

## Envio seguro e duplicatas

POST /api/comments exige origem canônica HTTPS, JSON de até 8192 bytes, cookie assinado
e limite independente de tentativas. No runner atual: 20 tentativas/minuto por sessão,
sem consumir a cota de cinco publicações de vídeos.
JSON permite apenas shortId, content e requestId UUID v4; o visitante não informa
autor, hash, estado de moderação ou carimbo de data.

UUID é preservado no formulário após falhas de rede para reenvio manual idempotente.
Não há repetição automática. Reutilizar UUID com outro conteúdo gera conflito.
Texto idêntico do mesmo visitante no mesmo vídeo, com UUID diferente em menos de
60 segundos, é recusado como duplicata recente. Não há bloqueio permanente de texto.
Relógio confiável e registros inválidos falham de forma conservadora.

A transação verifica vídeo publicado, recibo, deduplicação e grava comentário, recibo,
marco de deduplicação e audit log atomicamente. Concorrência não cria comentários
duplicados na mesma tentativa. Sessões anônimas não representam pessoas verificadas.

## Persistência e privacidade

comments: shortId, content, createdAt, moderationStatus e reviewVersion.
commentRequests (privado): hash do visitante, impressão do payload, sinais de triagem
e data; a chave do documento vincula visitante+UUID por SHA-256.
commentDedup (privado): impressão do texto/visitante/vídeo, último comentário e data.
commentAttempts (privado): limite operacional separado.
moderationLogs (privado): decisões automáticas e administrativas.

Regras existentes preservadas: browser não escreve diretamente, nem com claim admin.
Só approved de vídeo published pode ser lido publicamente, com páginas de até
20 comentários + 1 sentinela. Remover vídeo bloqueia novas leituras/envios de comentários.
Hashes, recibos e sinais não entram nos documentos públicos.
Coleções privadas novas ficam abrangidas pelo deny-all existente. Nenhum novo banco.
Recibos e marcos de tentativas/deduplicação ainda não têm limpeza/TTL configurada;
retenção deve ser definida antes de produção, sem ativar serviço automaticamente.

## Revisão administrativa

POST /api/admin/comments/queue, /detail e /review reutilizam a autorização já existente
em cada chamada: UID permitido, Google, TOTP, origem, sessão e limite de operações.
Filas pending/approved/rejected/removed têm 20 itens por página e cursores por data+ID.
Detalhe contém texto, estado do vídeo, sinais e as últimas dez decisões; não contém
identificadores anônimos, payload hashes, tokens ou UID do moderador.

Publicar pendente/rejeitado, rejeitar pendente, remover publicado e restaurar removido
exigem motivo de 5 a 500 caracteres e revisão esperada. A transação impede decisões
obsoletas e registra ator verificado/estados/data em histórico privado.
Publicar/restaurar exige vídeo ainda publicado. Não há cota diária de comentários;
limite antiabuso e deduplicação são independentes.

O painel não varre coleções inteiras nem faz polling. Na interface pública há atualização
manual e atualização após envio aprovado; erro preserva texto. Modo demonstrativo mantido.

## Verificação

30 testes distintos passaram:
- 13 de comentários/triagem, HTTP/cliente, UUID, privacidade, limites e revisão;
- 11 regressões de API/autorização administrativa e validação compartilhada;
- 6 no emulador isolado demo-clipzone-tests:8081, com REST real, regras públicas,
  concorrência, paginação, parent removido e ações auditadas.
Reexecutados somente testes locais afetados pelo reforço de integridade.
Lint/build completos aprovados pela integração entre funcionalidades.

Navegador real: comentário de teste normal publicado e palavrão mantido oculto.
Registros criados somente no emulador demo-clipzone:8080, no vídeo local existente.
Evidência no workspace do chat: comentarios-etapa5-triagem.png.
Proprietário entrou com Google/TOTP. No novo painel, a fila pendente carregou o teste
com palavrão, o detalhe mostrou o sinal de linguagem ofensiva e o histórico automático.
O agente rejeitou somente esse comentário de teste, com motivo explícito; o painel
confirmou Decisão registrada e a fila pendente ficou vazia. Demais conteúdos preservados.
Fila Rejeitados também recarregou o comentário, confirmando a decisão persistida.
Evidência no workspace: comentarios-etapa5-admin.png, sem dados pessoais na imagem.
Nenhuma senha, código ou chave foi coletado. Etapa 5 encerrada localmente.

Índice local acrescentado: comments por moderationStatus/createdAt/__name__.
Nenhum índice ou regra publicado na nuvem; projeto Spark preservado.
Pendência de aviso React no feed, registrada anteriormente, não foi refatorada nesta etapa.

## Arquivos

- server/comments/{moderate-text,submit-comment,review-comment,queue}.ts
- server/http/{comments,public-api,admin-moderation}.ts
- server/firestore/{atomic-store,rest-store}.ts e server/security/attempt-limit.ts
- src/lib/validation/comment-input.ts
- src/features/comments/components/PersistentCommentForm.tsx e services/comment-api.ts
- src/features/admin/components/CommentModerationPanel.tsx,
  services/{comment-moderation-api,moderation-api}.ts e pages/AdminPage.tsx
- src/features/shorts/components/FirestoreShortDialog.tsx e pages/HomePage.tsx
- firestore/firestore.indexes.json
- tests/comments.test.mjs e tests/firestore/comments.test.mjs
- docs/{comentarios,continuidade,api-local,painel-administrativo,firestore-local}.md

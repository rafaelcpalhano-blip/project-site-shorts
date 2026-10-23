# Etapa 7.6.9-D — recuperação de falhas móveis

Concluída localmente em23/10/2026, sob autorização do proprietário. Git iniciou limpo. Escopo: erros do feed/comentários, recuperação manual e preservação do rascunho no visualizador. E–I e Etapa8 não iniciadas.

## Comportamento implementado

### Feed e leitura pública

Falhas de transporte deixam de mostrar texto técnico como Failed to fetch. A mensagem orienta verificar a conexão e tentar novamente; timeout tem orientação própria. Erros HTTP conhecidos conservam suas mensagens específicas, inclusive ranking/paginação e pesquisa quando habilitada. Exceções inesperadas e respostas malformadas recebem mensagem genérica, sem exibir corpo de servidor ou detalhes internos.

Um erro tipado distingue conteúdo indisponível404 de falha de sessão e limite429. O cliente de leitura verifica o status antes de tentar interpretar JSON de erro, inclusive se404 vier com HTML. Falha de sessão interrompe a sequência antes da consulta. Validação dos dados de sucesso, limites, sinais de cancelamento e regras de cursores permanecem.

O botão de recuperação do feed mantém filtro/ordem existentes e reinicia a paginação conforme o comportamento anterior; foco volta ao conteúdo principal. Não há nova política de cache, alteração de consulta ou leitura automática ao recuperar a rede.

### Comentários e rascunho

Na primeira abertura, o campo continua condicionado à consulta bem-sucedida: uma falha não concede disponibilidade. Agora uma explicação informa por que o campo ainda não apareceu.

Depois da primeira confirmação, o formulário permanece montado durante atualização/falha. Assim, texto e identificador de tentativa não desaparecem por uma nova consulta. Enquanto a leitura está pendente ou falha, o textarea fica **somente leitura**, permitindo consultar/copiar o texto, e o botão e o handler de envio ficam bloqueados. Conteúdo indisponível, falha de sessão e outros erros não liberam envio, curtida, denúncia ou moderação. Interações relacionadas também são bloqueadas durante revalidação.

O textarea suspenso não fica disabled por causa da falha de leitura. Isso é importante: a proteção existente de troca de vídeo continua reconhecendo um campo com texto e pergunta antes de descartá-lo. Permissões e validações do servidor permanecem independentes do bloqueio visual.

Ao recuperar a consulta manualmente, o texto volta a ser editável. O botão Tentar novamente posiciona o foco no título dos comentários. Não há reenvio automático, inclusive após retorno da conexão. Tentativas manuais com o mesmo texto mantêm o requestId anterior; a deduplicação/idempotência existente no servidor não foi alterada.

**Limite de persistência:** o rascunho fica apenas na memória do formulário daquele vídeo enquanto o visualizador permanece aberto. Fechar a janela, recarregar a página ou confirmar descarte/troca continua encerrando esse estado; não foi criada persistência em localStorage/IndexedDB nem recuperação de rascunho entre sessões. Não afirmar que esta etapa salva texto permanentemente.

A falha de envio preserva o texto e explica que o resultado pode não ter sido confirmado; orienta consultar os comentários antes de reenviar. Um erro de envio anterior pode continuar visível após uma consulta bem-sucedida: recuperar a listagem não confirma por si só o resultado daquele POST.

## Arquivos de aplicação

- src/lib/http/read-failure.ts — novo erro tipado e mensagens seguras para leitura.
- src/lib/firebase/public-read-api.ts — classificação de erros HTTP antes do parsing, sem mudar sucesso/permissões.
- src/features/shorts/services/ordered-feed-api.ts — erros conhecidos tipados mantendo orientações.
- src/features/shorts/services/title-search-api.ts — conserva as orientações específicas da pesquisa no novo tratamento; feature flag inalterada.
- src/features/shorts/components/FirestoreFeed.tsx — mensagem amigável e foco no retry.
- src/features/shorts/components/FirestoreShortDialog.tsx — distingue disponibilidade inicial de formulário já confirmado; pausa interações e preserva a instância.
- src/features/comments/components/PersistentCommentForm.tsx — modo suspenso somente leitura/bloqueio no handler e mensagem de envio não confirmado.

Sem mudança do código backend, auth, cookies, regras Firestore, moderação, protocolo de publicação, tempo limite de20s ou coordenação dos players. A sessão existente não é apagada pela recuperação.

## Testes e verificações

**80 testes relacionados aprovados:**

-66 entre mobile-recovery (7 novos), public-read, performance-7-6-5-a, ranking-engagement, comments, short-sequence-components e short-sequence.
-14 em title-search e title-search-disabled, conferidos após atualizar o tratamento das mensagens específicas.

Casos relevantes: status404 com HTML, sessão falha antes da leitura, transporte sem retry automático,429, timeout, erro inesperado sem vazamento de detalhes, ranking indisponível, formulário somente leitura/submissão bloqueada, guarda de rascunho e idempotência/controle de acesso existentes.

Na conferência adicional, dois testes de title-search-disabled falharam porque o simulador não fornecia createOrderedFeedClient/feedOrderLabels já usados pelo feed e ainda esperava o título antigo Últimos compartilhados. O simulador passou a fornecer a dependência real e esperar o título atual Últimos Postados, sem alterar a aplicação ou enfraquecer as verificações de pesquisa desativada/filtro/paginação. Os14 testes então passaram. Arquivo atualizado: tests/title-search-disabled.test.mjs. Novo arquivo: tests/mobile-recovery.test.mjs.

ESLint localizado nos arquivos alterados, TypeScript/build em VITE_DATA_MODE=firestore-emulator e git diff --check aprovados. Avisos conhecidos de porta HMR dos testes e chunk principal>500kB persistem sem falha; não tratados nesta etapa. Sem suíte completa, teste Firestore transacional em dados reais ou repetição de Lighthouse.

## Conferência da interface —390×844, Chromium desktop

Proxy temporário5175 simulou falhas sem afetar a origem normal5174. Não foi necessário alterar dados/moderação do emulador.

| Cenário | Evidência |
| --- | --- |
| Falha de rede do feed | Mensagem orientando conexão; retry recuperou15 cards e foco main-content, sem overflow horizontal. |
| Falha inicial de comentários | Player independente; zero textarea, mensagem clara explicando a condição do campo. |
| Retry inicial | Campo disponível após consulta bem-sucedida. Rascunho de teste digitado, sem publicação. |
| Falha ao atualizar com texto | Mesmo texto; textarea readOnly=true/disabled=false e envio desabilitado. |
| Próximo vídeo com rascunho suspenso | Confirmação de descarte apareceu; Continuar neste vídeo preservou texto e posição1/15. |
| Reconexão manual | Texto intacto, editável, envio disponível após sucesso; foco em Comentários publicados. |
| Duas tentativas manuais de envio | Ambas interceptadas com503 antes do upstream; mesmo requestId, inclusive após Atualizar comentários. Exatamente2 tentativas, sem repetição automática observada. |
| Conteúdo404 após confirmação anterior | Texto preservado/somente leitura, envio bloqueado e controles de curtida ausentes. |
| Falha de sessão | Texto preservado e envio bloqueado; retry após retirar a falha recuperou edição. |
| Fechamento | Zero iframes/diálogos,15 cards, overflow do body restaurado. |

Os testes de falha de envio interceptaram o POST no proxy antes de chegar ao emulador, não criaram comentários/curtidas/denúncias. O corpo do rascunho não foi gravado no log; somente metadados de simulação e requestId de teste. Não foi necessária autenticação Google/TOTP nem teste de credenciais rotacionadas.

Foi aberta uma reprodução Twitch oficial para conferir o visualizador; nenhum adaptador/player foi alterado. Ao fechar, o iframe foi removido. Não foi feito teste prolongado de memória ou experiência física no Motorola. Não foram desconectados USB/Wi-Fi reais: a falha de transporte foi simulada na resposta da API. Timeout e429 foram cobertos por testes focados, sem esperar20s artificialmente no navegador.

## Evidências, entrega e limites

Pasta externa: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-9-d/.

- ui-checks.json, send-check.json e faults.jsonl: resultados e duas tentativas interceptadas.
- draft-preserved.png: campo somente leitura, mensagem de pausa e envio bloqueado durante a falha de sessão; também mostra a mensagem de envio anterior não confirmado.
- serve-before.mjs: cópia do servidor de auditoria antes dos interceptadores, restaurada ao concluir.

Falhas artificiais retiradas, servidor de auditoria normal restaurado, aba temporária fechada e viewport restaurado.5175 serve a build atualizada, sem coletor injetado na URL simples. API5174 e Firestore8080 preservados. Backend e sessões existentes não reiniciados. Sem instalação de dependências, infraestrutura, produção, commit ou deploy.

A causa dos episódios móveis originais continua não demonstrada. Esta etapa melhora tratamento e recuperação de falhas reproduzíveis, não prova que HMR, alterações do Codex ou algum provedor tenham causado aqueles episódios. O timeout do Lighthouse/canal Firestore permanece separado e não foi silenciado.

Commits sugeridos, não executados:

1. fix: preserva rascunho e melhora recuperacao de falhas —7 arquivos de aplicação e2 arquivos de testes listados.
2. docs: registra recuperacao de falhas moveis —este registro e entrada em docs/continuidade.md.

Próxima proposta: **7.6.9-E — reduzir JavaScript administrativo carregado na entrada pública**, aguardando nova autorização. Sem avanço automático.

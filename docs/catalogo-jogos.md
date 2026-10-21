# Catálogo de jogos, IGDB e fichas informativas

Implementação local autorizada em 21/10/2026. No relatório de 20/10 este bloco é a Etapa 6; a Etapa 5 de comentários já foi concluída. Sem novo serviço, dependência, banco, credencial ou deploy.

## Funcionamento

- Reutiliza busca IGDB, confirmação por ID no servidor e cadastro canônico igdb-ID já existentes. Não reimplementa classificação de vídeos nem exige correspondência do jogo pela API externa.
- /jogos/:gameId lê os metadados já persistidos: descrição, capa, aliases, gêneros, modos, plataformas e lançamento. Mostra campos ausentes explicitamente e atribuição IGDB. Textos são renderizados pelo React, sem HTML inserido; links e imagens aceitam somente HTTPS, hosts e caminhos IGDB previstos, sem credenciais/porta personalizada. Registros antigos sem metadados continuam utilizáveis.
- No formulário de publicação, uma busca sem resultados oferece Solicitar inclusão deste jogo. POST /api/games/requests aceita apenas name (1–100 caracteres, sem controles). Origem, sessão assinada, corpo limitado e limite próprio gameRequestAttempts são verificados pelo servidor.
- Solicitação não publica o vídeo, não cria um jogo livre e não consome cota de vídeos. Campos do formulário permanecem enquanto o modal estiver aberto; não há armazenamento do rascunho após fechar/recarregar a página.
- gameRequests é uma coleção privada no Firestore existente. O identificador SHA-256 usa visitante e nome normalizado, garantindo idempotência por essa identidade, inclusive com concorrência. Repetir o envio consulta o estado vigente; solicitação resolvida pode selecionar o jogo se ainda estiver ativo. Nome igual de outro visitante pode criar outra solicitação.
- Painel /admin: Catálogo e solicitações de jogos, com filas pendentes/vinculadas/rejeitadas e paginação 20 + sentinela. Cada chamada usa a autorização já existente Google/TOTP/UID no servidor e o limite administrativo.
- Para vincular, pesquisar e confirmar o jogo oficial pelo seletor IGDB existente. A confirmação cadastra o jogo ou reutiliza o registro ativo; depois selecionar Vincular, informar motivo e confirmar a decisão. Também permite rejeitar com motivo. Também permite cadastro manual administrativo, conforme regra posterior abaixo.
- Confirmação de catálogo e decisão da solicitação são operações separadas: se a decisão falhar, o jogo confirmado permanece no catálogo e a solicitação continua disponível para nova análise. Nenhum vídeo é publicado por essas ações.
- Revisão transacional valida estado pendente e revisão esperada, além da identidade IGDB e estado ativo do jogo. Uma decisão concorrente vence; a outra recebe stale-review, sem gravação parcial. Motivo e transição ficam no registro e auditoria privada moderationLogs, com UID apenas no servidor. Não há exclusão física nem reabertura automática de solicitações rejeitadas.
- Índice local gameRequests: status / createdAt desc / __name__ desc. Regras Firestore preservadas: todas as escritas do cliente e leitura das coleções privadas negadas, inclusive com claim admin. Nenhum índice ou regra foi publicado na nuvem.

## Verificações executadas

25 testes distintos relacionados passaram:

- node --test tests/game-catalog-stage.test.mjs tests/igdb.test.mjs tests/game-confirmation.test.mjs tests/game-search.test.mjs tests/game-catalog-client.test.mjs — 21 testes. O arquivo novo cobre URLs seguras/metadados incompletos, idempotência, validação estrita, privacidade, concorrência, revisão, paginação, origem/sessão/corpo, autorização e limite próprio.
- node scripts/firebase-local.mjs test game-requests.test.mjs — 4 testes reais no emulador isolado demo-clipzone-tests:8081. Cobrem concorrência REST, ficha lida pelo repositório público, bloqueio de leituras/escritas privadas, auditoria, falha sem gravações parciais e paginação com datas iguais.
- Após adequar a checagem de controles ao lint, somente os 7 testes do arquivo diretamente afetado foram repetidos; passaram. npm run lint e npm run build passaram no conteúdo final. Não foi executada a suíte completa.
- git diff --check sem erros. Nenhum commit foi criado.

## Conferência visual pendente

A ferramenta de navegador recusou acesso à URL local por sua política de segurança. Não foi contornado o bloqueio e não há aceite visual desta etapa. API HTTPS e emulador de desenvolvimento foram iniciados; sessões administrativas precisam de nova verificação após reiniciar a API.

Roteiro do proprietário:

1. No formulário, consultar e confirmar um jogo conhecido. Abrir sua ficha /jogos/igdb-ID e conferir informações, fonte IGDB e layout também no celular.
2. No mesmo formulário, preencher link/título, buscar um nome inexistente e solicitar inclusão. Conferir mensagem de recebimento e preservação dos campos; o vídeo não deve ser enviado.
3. Em /admin, entrar com Google/TOTP, verificar acesso e carregar solicitações. Abrir a solicitação de teste, escolher o jogo correto pelo IGDB e vincular com motivo, ou rejeitar um nome sem correspondência.
4. Conferir a fila resolvida e pesquisar novamente o jogo no formulário. A publicação continua sujeita às validações de fonte, segurança, duplicatas e cota existentes.

## Limitações mantidas

Metadados não são traduzidos nem atualizados automaticamente em jogos já cadastrados; a ficha usa o retrato armazenado na confirmação. A busca oficial usa o mecanismo IGDB existente e não promete busca local global por trecho/aliases. Jogos ausentes no IGDB podem ser cadastrados manualmente apenas pelo administrador; visitantes não criam registros públicos diretamente. Não há notificação externa, polling, persistência do rascunho no navegador ou TTL/limpeza das solicitações e tentativas. A identidade anônima e os limites por cookie não garantem uma pessoa única; retenção e antiautomação de produção continuam pendentes. Nenhuma etapa de produção ou de busca global foi iniciada.

## Arquivos desta entrega

- firestore/firestore.indexes.json
- server/firestore/atomic-store.ts
- server/firestore/rest-store.ts
- server/games/requests.ts
- server/http/game-requests.ts
- server/http/admin-moderation.ts
- server/http/public-api.ts
- server/security/attempt-limit.ts
- src/features/admin/components/GameRequestPanel.tsx
- src/features/admin/services/game-requests-api.ts
- src/features/admin/services/moderation-api.ts
- src/features/admin/pages/AdminPage.tsx
- src/features/games/components/GameInfo.tsx
- src/features/games/components/GameInfo.module.css
- src/features/games/components/OfficialGamePicker.tsx
- src/features/games/pages/FirestoreGamePage.tsx
- src/features/games/services/game-details.ts
- src/features/games/services/catalog-api.ts
- src/lib/firebase/public-repository.ts
- tests/game-catalog-stage.test.mjs
- tests/firestore/game-requests.test.mjs
- docs/catalogo-jogos.md
- docs/continuidade.md
- docs/api-local.md
- docs/painel-administrativo.md

## Ajustes de apresentação após conferência do proprietário

O proprietário confirmou abertura da ficha e exibiu capturas de Portal e Tibia. Adicionado acesso Ver ficha do jogo abaixo do filtro na página inicial (src/features/shorts/components/FirestoreFeed.tsx; lint localizado aprovado). Conferência do fluxo administrativo de solicitações ainda pendente.

Capas: o mapeador público converte a miniatura oficial t_thumb para t_cover_big_2x no CDN IGDB, preservando a identidade da imagem e validando host/protocolo/caminho. Aplica-se também a jogos já cadastrados, sem migração nem gravação no banco. Tamanho documentado: https://api-docs.igdb.com/#images .

Vocabulário de gêneros e modos traduzido por dicionário local em src/features/games/services/game-labels.ts; marcas, nomes próprios, aliases e termos desconhecidos são preservados. Descrições continuam no idioma original: nenhuma tradução automática de texto livre foi integrada ou contratada. Opções para isso precisam de decisão do proprietário sobre serviço/custos ou conteúdo editorial.

Testes: tests/game-presentation.test.mjs (2 testes novos) e tests/game-catalog-stage.test.mjs (7 regressões) passaram; lint localizado e checagem de tipos do frontend passaram. Sem repetir testes do emulador, pois não houve alteração da persistência.

## Tradução opcional de descrições — implementação posterior autorizada

A limitação anterior de descrição apenas no idioma original passa a ter integração opcional com Workers AI, traduzida uma vez por versão e reutilizada no Firestore. Original preservado, cache vinculado à fonte e limites próprios. Configuração da credencial pelo proprietário e qualidade real ainda pendentes. Consulte [traducao-jogos.md](traducao-jogos.md); não confundir testes com fixtures com validação de tradução real.

## Conferência administrativa e navegação das filas

Proprietário confirmou recebimento da solicitação fictícia e mostrou rejeição persistida com motivo na fila Rejeitadas (21/10/2026). A troca de fila antes exigia um segundo clique em Carregar solicitações; ajustado GameRequestPanel.tsx para carregar a primeira página diretamente ao clicar Pendentes/Vinculadas/Rejeitadas, enviando explicitamente o novo estado para evitar consultar a fila anterior. Botão manual permanece como atualização/repetição após falha; estados de carregamento, erro, autenticação e bloqueio de cliques concorrentes preservados. Paginação e detalhe são reiniciados ao trocar a fila. A vinculação administrativa continua pendente de conferência visual.

## Cadastro manual sem IGDB — regra autorizada em 21/10/2026

A solicitação também permite aceitar jogos ausentes na fonte IGDB. No detalhe administrativo escolher Cadastro manual, conferir/ajustar nome (1–100 caracteres), informar motivo e confirmar Aceitar solicitação. Pesquisa/vínculo IGDB permanece como opção alternativa.

A nova ação create usa a autorização Google/TOTP/UID já existente. Nome validado no servidor; identidade manual-SHA256(nome normalizado), com reutilização de jogo manual ativo de mesmo nome e prevenção de criação concorrente. Não resolve aliases, semelhanças nem duplicatas entre registros IGDB e manuais: administrador deve conferir o catálogo. Não reativa jogos desabilitados. Campos arbitrários, descrição, imagem, source, identidade e gameId enviados no modo manual são rejeitados. Criação do jogo, decisão da solicitação e auditoria são uma transação, sem jogo órfão em conflito/revisão obsoleta.

Registro manual ativo usa source=manual e não possui externalId, descrição, capa ou metadados inventados. A ficha informa cadastro administrativo sem associação IGDB; tradução não é chamada para esse registro. Na ficha, suporte previsto teste.suporte@clipzone.com aparece como texto, com aviso explícito de que o endereço ainda não existe/não recebe mensagens, sem link mailto. Cadastro de conteúdo editorial, imagens, caixa de email ou domínio não foi implementado/ativado.

Ao ser aprovado, o jogo aparece no catálogo público e pode ser selecionado nos envios; não publica vídeos nem consome a cota sozinho. As regras técnicas das plataformas, moderação, duplicatas e cinco publicações/dia permanecem iguais.

Verificação: 24 testes locais relacionados passaram (incluindo 4 casos novos de cadastro manual); 6 testes do fluxo de solicitações passaram no emulador isolado (2 novos). Incluem autorização, validação estrita, concorrência, criação/vínculo/auditoria, estado obsoleto, privacidade e publicação de vídeo com jogo manual mantendo cota e duplicatas. Lint/build completos passaram; tipos e lint do componente aprovados após proteção final do envio. Nenhuma suíte completa repetida. Conferência visual do caminho manual pendente com o proprietário.

Arquivos deste ajuste: server/games/requests.ts; src/features/admin/components/GameRequestPanel.tsx; src/features/admin/services/game-requests-api.ts; src/features/games/services/catalog-api.ts; src/features/games/services/game-details.ts; src/features/games/components/GameInfo.tsx; tests/game-catalog-stage.test.mjs; tests/firestore/game-requests.test.mjs; docs/catalogo-jogos.md; docs/painel-administrativo.md; docs/continuidade.md.

# Correções mobile, retorno ao feed e organização administrativa — 25/10/2026

Status: implementação e validação técnica concluídas; proprietário confirmou os dois catálogos e a lista ancorada no celular/5175. Navegação contextual completa e visual administrativo ainda aguardam homologação. Não iniciar Etapa 8.

## A — Catálogo mobile

O feed lia shorts pela API HTTPS, mas nomes do catálogo e detalhes dos jogos ainda usavam o SDK Firestore diretamente em 127.0.0.1:8080. Consulta ADB somente leitura confirmou aparelho conectado e encaminhamentos 5174/5175, sem 8080. Sem esse encaminhamento, o loopback do aparelho não alcança o emulador do PC. Os dois locais reutilizavam o mesmo repositório: filtro inicial e formulário de publicação.

A dependência problemática foi removida dessas leituras: /api/games/list e /api/games/detail passam pela mesma origem HTTPS da página, usando sessão, validação de origem/corpo e limite público existentes. O servidor continua usando o emulador local; ele não foi resetado nem exposto ao aparelho. Nenhuma URL/configuração de produção, certificado, regra de autenticação, permissão ou moderação foi alterada. Não há evidência para atribuir o relato original a um defeito específico do Chrome ou do certificado.

O catálogo busca 50 jogos + 1 indicação de continuação por página, somente status ativo, com projeção ID/nome e ordenação por nome/ID. A interface reúne todos os lotes e ordena em pt-BR; inclui jogos manuais provisórios ativos, não inclui ocultos/banidos. Não limita o seletor ao primeiro lote. O cache público de 30 segundos, compartilhamento de consultas concorrentes e invalidação existente foram preservados. Erros não ficam em cache; o filtro agora oferece Recarregar catálogo. O formulário mantém seu recarregamento existente.

A ficha pública recebe apenas campos mapeados e validados; registros ocultos/ausentes retornam indisponível. Não transmite campos administrativos do documento. Essas consultas públicas já não dependem de encaminhar 8080; não removemos os encaminhamentos existentes nem alteramos os serviços de autenticação.

## B — Navegação

Preservado contexto público do feed na aba: página, cursores/páginas já visitadas, filtro, ordem e posição de rolagem. Links Ver jogo, ficha do jogo e link do jogo no visualizador levam uma referência à origem. O botão Voltar ao início da ficha usa esse contexto quando válido. O Voltar do navegador pode recuperar a entrada anterior; o logotipo continua gerando uma página inicial padrão.

O retorno contextual substitui a entrada atual da ficha, sem inserir cópias artificiais dela no histórico. Estado é limitado a 10 entradas, com validade de 5 minutos, apenas em memória da aba; não grava visitantes, comentários, rascunhos ou segredos no armazenamento. Acesso direto, recarga completa sem contexto em memória, origem inválida ou contexto expirado caem na página inicial padrão. Isso evita restaurar cursores indefinidamente. Atualizar feed continua renovando a consulta; uma publicação bem-sucedida força uma leitura nova, não recupera uma fotografia antiga do feed.

O foco do conteúdo principal usa preventScroll para não desfazer a restauração da posição. A posição exata no aparelho, inclusive após mudanças de orientação/teclado, ainda requer conferência manual.

## C — Apresentação administrativa

- Espaçamento superior de 16 px na seção Excluir comentários; regras de seleção, confirmação e exclusão intactas.
- Catálogo, comentários e vídeos organizados em seleção, identificador, informação principal e ações. Quebra controlada de IDs longos; grade de duas colunas no celular, com conteúdo e ações na coluna de leitura.
- Atualizações organizadas em conteúdo e ação de leitura, com adaptação para uma coluna no celular.
- Abrir na fonte original junto da plataforma nos detalhes da atualização, com quebra de linha permitida. URL validada pelo parser existente e compatibilidade com a plataforma; hosts/esquemas arbitrários não ganham link. Mantidos target/rel de nova aba e demais ações.

Nenhuma mudança nos IDs, estados, decisões, seleção individual/lote, endpoints administrativos, ordenação ou paginação administrativa. Não foram executadas decisões administrativas sobre os registros de uso.

## Validação executada

41 testes direcionados passaram: catálogo/API/transportes/retry/cache, retorno, navegação contínua, leituras públicas, recuperação mobile, catálogo administrativo e fonte validada. O teste de retorno cobre páginas 1/2/3/5, isolamento entre origens e expiração. Testes SSR do Vite em paralelo emitiram avisos de porta HMR 24678 ocupada; encerraram aprovados, sem interromper o servidor de uso.

1 teste REST real adicional passou em demo-clipzone-tests:8081: 120 jogos paginados 50/50/20, nomes empatados, provisórios, ocultos/banidos e projeção pública. Fixtures e limpeza somente no emulador isolado; 8080 preservado. Rechecados os 2 testes de retorno após o ajuste que evita restaurar estado antigo depois de publicar.

Lint, tipos cliente/servidor, build com VITE_DATA_MODE=firestore-emulator e git diff --check aprovados. Build 5175 atualizada e HTTP 200 confirmado; /api/games/list respondeu 405 para GET tanto na API quanto no proxy 5175, confirmando a rota POST carregada após reinício pelo proprietário.

Navegador 5174 com API reiniciada: catálogo com jogos, formulário carregando, pesquisa Tibia, seleção e cancelamento sem publicar; ficha Tibia via nova API; retorno contextual e Voltar do navegador preservando Tibia/Primeiro Postado. Conferidos também retorno à página 3 e logotipo reiniciando na página 1. O teste de página 3 foi feito antes do reinício da API, usando a navegação disponível mesmo com a ficha em estado indisponível.

Não foi repetido Lighthouse: proprietário enviará as leituras após a conferência. Não foi feita publicação real nem consumo de cota de postagem pelos testes. A validação por navegador foi na 5174; a 5175 teve conferência HTTP/build, sem afirmar inspeção visual completa dessa build.

## Conferência do proprietário — na 5175

Confirmação recebida: os dois catálogos carregaram no celular e a lista ficou junto ao campo com teclado aberto. O carregamento mobile foi validado; isso não substitui os demais testes de navegação, publicação e administração.

- [x] Celular/5175: catálogo disponível no filtro e no formulário; lista ancorada corretamente com teclado aberto.

- [ ] Celular: filtro mostra o catálogo, em ordem alfabética; selecionar e limpar filtro.
- [ ] Celular: abrir Compartilhar short, pesquisar e selecionar jogo com teclado aberto; não deslocar lista para o topo.
- [ ] Se houver falha de catálogo, Recarregar catálogo recupera após a conexão voltar; não precisa resetar dados.
- [ ] PC e celular: páginas 1/2/3 e posteriores disponíveis → Ver jogo → Voltar ao início retorna à mesma página, filtro, ordem e posição aproximada.
- [ ] Voltar do navegador preserva contexto; URL direta cai no início padrão; logotipo reinicia filtros e página.
- [ ] Administrador: espaço antes de Excluir comentários adequado, seleção/confirmar/cancelar intactos.
- [ ] Quatro abas administrativas: alinhamento, códigos extensos, ações e seleção/lote usáveis no PC e celular; sem overflow global.
- [ ] Atualizações: fonte na linha da plataforma, URL correta e nova aba segura; leitura e Abrir moderação preservados.
- [ ] Retomar checklist geral e só depois executar uma leitura Lighthouse Mobile e uma Desktop, salvando HTML/JSON.

Conferência mobile do catálogo aprovada pelo proprietário; a rodada completa ainda depende das demais verificações acima. Sem novas dependências, deploy, alterações de infraestrutura/produção ou avanço à Etapa 8.

## Arquivos e commits

Comandos completos: [commits-mobile-navegacao-admin.md](commits-mobile-navegacao-admin.md). Os grupos A e B compartilham FirestoreFeed.tsx e ficam em um commit funcional conjunto para evitar estágio parcial ambíguo; visual administrativo e documentação ficam separados. Nenhum commit/push foi executado automaticamente.

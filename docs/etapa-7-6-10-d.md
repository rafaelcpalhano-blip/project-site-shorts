# Etapa 7.6.10-D — JavaScript inicial e visualizador sob demanda

Concluída em 24/10/2026. Escopo autorizado: separação localizada, sem trocar SDK, mudar persistência, contratos de autenticação, API ou catálogo. Sem dependências novas, deploy, infraestrutura ou gravações de conteúdo. E/F e Etapa8 não iniciadas.

## Diagnóstico e decisão

A home importava estaticamente ShortSequenceDialog pelo FirestoreFeed. Esse módulo trazia comentários, denúncias, moderação e player antes de qualquer abertura. O feed demonstrativo também importava ShortDialog/player pela entrada; apenas separar o visualizador Firestore deixaria dependências compartilhadas antecipadas. Ambos agora usam importação dinâmica exclusivamente quando há seleção de vídeo.

O catálogo continua exigindo public-repository/Firestore na home; removê-lo exigiria migração de contrato/API fora desta etapa. Administração e formulário persistente já tinham limites lazy; não foram reescritos. Não confundir JavaScript não usado durante a auditoria com código morto. Não aplicar manualChunks só para redistribuir bytes sem reduzir o grafo inicial.

## Alteração e recuperação

DeferredDialog mantém uma janela Modal com carregamento, fechamento e Escape enquanto o módulo está pendente. Se falhar, mantém a home e oferece Tentar novamente; não aciona o erro fatal global. createDeferredModule só chama o importador na primeira solicitação, compartilha a promessa pendente, conserva sucesso em memória e libera nova tentativa após rejeição, incluindo exceção síncrona. O efeito ignora resultado após desmontagem. Isso não tenta abortar download de módulos ESM.

Ao carregar, o componente original recebe todos os callbacks/props: sequência, fronteiras de páginas, atualização de contadores, moderação e fechamento. Arquivos dos players, comentários, autorização, catálogo, formulário e dados não foram alterados. Carregamento simultâneo não abre duas janelas. Não há prefetch nem player na home; módulos seguintes usam o mecanismo de dependências do Vite. Fechar/reabrir reutiliza o módulo disponível.

## Medição reproduzível

Comparação imediata contra a etapa C, mesma configuração VITE_DATA_MODE=firestore-emulator, mesma versão Vite, dist atual. Manifesto gerado por opção CLI --manifest, sem mudar vite.config ou servidor. Travessia dos imports estáticos de index.html e do FirestoreFeed, deduplicados, incluindo o feed porque é carregado automaticamente na home. A contagem não é somente do entry nem do dist inteiro.

| Medida | Antes (C) | Depois (D) | Diferença |
|---|---:|---:|---:|
| JS inicial bruto | 890.454 B | 851.236 B | -39.218 B / -4,40% |
| Arquivos JS do grafo inicial | 9 | 8 | -1 |
| Soma gzip offline, zlib padrão | 276.025 B | 263.766 B | -12.259 B / -4,44% |
| Chunk FirestoreFeed | 37.890 B | 10.924 B | -26.966 B |
| Chunk de entrada | 348.170 B | 339.500 B | -8.670 B |

A meta de 10% era exploratória e não foi atingida. Aceita-se o ganho menor por ser localizado e verificável, sem sacrificar funcionamento ou migrar catálogo. O código não desapareceu: player/visualizador passam para a primeira interação. Essa primeira abertura depende de novas requisições de JS/CSS; há feedback e recuperação, mas não se promete ausência de atraso em rede lenta. O gzip é estimativa offline e não tráfego do servidor5175, que continua sem Content-Encoding. Não comparar esses bytes diretamente com os bytes de transferência Lighthouse incluindo headers. A referência A tem outra build; a comparação principal é antes/depois imediato da C.

Sem nova auditoria Lighthouse: não há resultado novo de FCP/LCP, CLS ou nota. Não foi comprovada correção do aviso de timeout/IndexedDB. A causa investigada em A permanece limitada pela evidência existente.

Evidências fora do Git: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-10-d/ — before.json, after.json, measure.mjs, tests.log, fixture-results.json e viewer.png. Os manifestos e seus tamanhos permitem reproduzir a soma.

## Validação

node scripts/test-performance.mjs D: 90 testes passaram, zero falhas. Inclui novos casos de início sob solicitação, coalescência, cache e recuperação de rejeição; build real em memória verifica visualizadores/players/admin/formulário fora do grafo inicial, disponibilidade dos chunks e orçamento inicial <870.000 B. O catálogo permanece presente. Grupo ampliado com sequência, componentes, áudio e player, além dos contratos D de cache, preview, links compartilhados, envio, recuperação móvel e autorização. Teste de grafo não escreve dist ou consulta banco.

ESLint dos seis arquivos de código/testes/ferramenta alterados, npm run build (TypeScript cliente/servidor + Vite) e git diff --check aprovados. A geração adicional de manifesto serve apenas à comparação dos grafos. Fixture temporária removida antes da build final e servidor5178 encerrado.

Navegador real da build5175: home com 15 cards e zero iframes; preloads observados sem visualizador/player. Primeira abertura YouTube trouxe metadados e campo de comentários; troca para Twitch manteve sequência, link externo e um iframe oficial. Twitch exibiu reprodução e controles. Fechamento removeu iframe/janela e devolveu foco ao card do vídeo atual. Formulário abriu separadamente com campos preservados e zero iframes; não houve publicação nem moderação. YouTube apresentou falha de reprodução externa neste navegador; disponibilidade externa/autoplay não são garantidos pelos testes.

Fixture isolada React StrictMode, sem API/banco: fechar com importação pendente deixou zero janelas e foco no botão; após resolução, continuou fechada. Rejeição exibiu erro local e nova tentativa abriu um único conteúdo, com duas chamadas totais. A fixture testou rejeição do importador, não indisponibilidade real de CDN/chunk. Em uma atualização que remova arquivos antigos, uma URL de chunk ausente pode continuar falhando e exigir recarregar a página; política de retenção/cache da hospedagem fica para preparação autorizada, não foi alterada aqui.

Conferência efetiva do visualizador: desktop1280, sem overflow global. Tentativa de viewport do navegador não mudou as dimensões observadas desta aba; não contabilizar como validação mobile. Teclado/toque físico, larguras320/375/390/400/430, regressão integrada e novo Lighthouse continuam nas etapas E/F. Nenhuma necessidade de repetir auditoria agora.

## Risco e continuidade

Risco: primeira abertura agora depende do download adicional; falhas têm fechamento/retry locais. Módulo resolvido não abre conteúdo após fechar. Cache de módulo não altera cache do catálogo ou dados. Reversão: retirar DeferredDialog das duas integrações e restaurar importações diretas; nenhuma migração ou restauração de dados necessária.

Serviços5174/API,5175/build e8080/emulador existentes preservados; sem reinício do backend. Atualizar a página5175 para receber a build atual. Próxima etapa7.6.10-E: regressão integrada e conferência responsiva do conjunto, aguardando autorização. Commits manuais separados: código, testes/ferramenta e documentação.

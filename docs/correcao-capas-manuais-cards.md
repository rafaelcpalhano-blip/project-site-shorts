# Correção — capa manual no fallback dos cards

23/10/2026. Complemento da 7.6.8-C, sem iniciar D. Alterações anteriores da C ainda pendentes no Git foram preservadas.

## Causa e correção

A edição e a ficha já aceitavam a capa manual, mas publicShort só projetava capas de jogos IGDB e cardArtwork só validava URLs IGDB. Por isso, a URL nunca entrava no fallback do card manual.

publicShort passa a incluir a capa de registros manuais usando manualGameCoverUrl, reaproveitando o jogo que a consulta já leu. Jogos oficiais continuam com gameCoverUrl estrito; fontes desconhecidas não ganham capa. cardArtwork passa a aceitar as mesmas capas manuais validadas, preservando prioridade: miniatura oficial válida → capa do jogo → Clipper. Falha da imagem conserva o fallback existente.

A projeção é compartilhada pelo feed cronológico, modos de ordenação/ranking e cards da ficha. Não há cópia da capa para cada short, migração, nova validação remota por visita ou leitura Firestore adicional. Atualizações da capa aparecem na próxima consulta/Atualizar feed; não foi criado listener em tempo real. Páginas já abertas precisam consultar novamente. O cache limitado de URLs que falharam continua em memória; a URL nova de uma capa substituída não herda a falha da anterior.

## Validação

27 testes focados aprovados: card-artwork (7), public-read (9), ranking-generation (11). Incluem capas manuais externas/estáticas, prioridade da miniatura, fallback em erro, projeção atualizada, fontes desconhecidas, URL inválida, privacidade, memória limitada e não reutilização da falha de URL antiga. ESLint localizado, build e git diff --check aprovados. Build conserva aviso conhecido >500 kB, principal 509,01 kB.

UI real, sem gravação de negócio: os cards yu-gi-oh teste jogo e Ragnarock carregaram suas capas atuais no feed; o card da ficha de yu-gi-oh também carregou a mesma URL da ficha. Miniaturas oficiais restantes mantidas; nenhum player aberto. Captura fora do Git. Abas temporárias encerradas.

API local reiniciada para a projeção atualizada; dados do emulador preservados. Sem novo serviço, biblioteca, faturamento, Firebase remoto ou deploy.

## Commits

Aplicar este complemento depois dos dois commits de implementação da 7.6.8-C, se ainda não tiverem sido feitos. Próxima etapa continua 7.6.8-D, aguardando autorização.

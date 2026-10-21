# Etapa 7.5.6-C — métricas elegíveis e ordenação integrada

Implementação local autorizada em 21/10/2026. Sem dependências, serviços, faturamento,
modificações na nuvem ou deploy. Busca textual continua desativada.

## Funcionamento

- Seletor Filtrar por relevância: Ultimo Postado (padrão), Primeiro postado,
  Mais Curtidos e Mais Relevante. Geral, filtro por jogo e ficha do jogo usam o mesmo
  endpoint /api/feed/ordered. Trocar filtro/ordem reinicia cursor; navegar páginas
  conserva a escolha. Entrar em outra ficha monta feed novo no padrão.
- Ordenação realizada no Firestore: até 15 itens e 30 candidatos por chamada.
  Sem ordenar coleção no navegador ou recalcular ranking por visita.
- Snapshot/cursor conserva desempate e precisão do readTime, inclusive quando
  curtidas mudam. Cursor HMAC vinculado à origem, modo, jogo, snapshot e geração;
  expira em 30min. Alterações/fabricação são rejeitadas. Mudança da epoch de métricas
  invalida a relevância em andamento. Reiniciar API local troca a chave/sessão.
- Página parcial/vazia pode ter continuação, sem alegar fim prematuramente. Lote
  exatamente cheio pode levar a próxima página vazia. Reconsulta short e jogo atuais
  em todas as modalidades: remoção/banimento prevalecem sobre snapshot.
- Mais Curtidos usa contador total atual no início da paginação. Mais Relevante usa
  a geração completa mais recente, informa data-base e recusa geração com mais de
  90min. Não troca silenciosamente a ordem quando ranking está indisponível.

## Métricas e inicialização

Pesos/decadência aprovados preservados: publicação 2/24h, curtidas 1/12h,
comentários 0,25/12h e bônus 0,3/6h para jogo cadastrado há menos de sete dias na
publicação do short. Não importa engajamento de plataformas externas.

Transações existentes atualizam rankingMetrics e rankingSignals privados.
rankingHours limita primeiras 20 curtidas/10 comentários por short/hora UTC;
rankingDays admite um comentário por identidade anônima/short/dia UTC. Esses caps
limitam contribuição ao ranking, sem limitar contadores normais ou publicação.
Aprovação de texto, e não sentimento positivo/negativo, determina elegibilidade.
Suspeitos/rejeitados não pontuam. Remover/descurtir retira contribuição; restaurar
ou reativar conserva a data original, mesmo após retenção do registro descurtido.
Admissões gastas não são devolvidas. Idempotência não cria contribuição adicional.
Não há garantia de pessoa única: novas identidades anônimas ainda podem abusar;
limites existentes e moderação posterior continuam necessários.

Preparação histórica exclusivamente local, com API pausada:

    node scripts/ranking-local.mjs metrics-inspect
    node scripts/ranking-local.mjs metrics-prepare

Snapshot único das cinco fontes (shorts, games, shortLikes, comments, commentRequests),
30 por lote, máximo 3.000 documentos/300 shorts. Conferência de datas, jogos e
contagem exata de curtidas antes da primeira escrita; nunca reconstrói recência a
partir de totais. Comentário sem recibo verificável fica visível conforme sua
moderação, mas não contribui e é informado no diagnóstico. Fontes não são alteradas.
Epoch privada com ready:false durante preparo; somente conclusão libera ready:true.
Interrupção não libera ranking; após lease de cinco minutos pode reiniciar com outra
epoch. Preparo de módulo já inicializado é recusado. Não executar concorrente com
outros escritores; CLI recusa se porta HTTPS local 5174 estiver ocupada.

## Geração, retenção e custos

Runner HTTPS local gera ao iniciar e a cada hora, somente com métricas prontas;
retomada agenda o próximo instante devido, sem esperar uma hora adicional. Não é
agendamento da aplicação Codex nem da nuvem. Depende de processo/emulador ativos.
Produção ainda exige runtime/agendamento e aprovação próprios.

Limites da B mantidos: 100 vídeos elegíveis/300 fontes por geração, reserva de
762 leituras/124 gravações por tentativa, teto diário UTC do módulo 20k leituras,
4k gravações e 4k exclusões. Exceder não publica ranking truncado. Staging, lease e
promoção completa preservam geração anterior em falha. Reserva de falha não é
reembolsada. Sucesso libera apenas sobra de leitura, contabilizando leituras
executadas pelo gerador + margem 32; reserva de gravações permanece integral.
Isso deixa espaço para manutenção sem aumentar limites; não é medidor financeiro.
Controles, consultas rejeitadas/vazias, índices, retentativas e outros módulos também
consomem recursos e precisam monitoramento antes de produção.

Após geração bem-sucedida, tenta limpar a geração fora da atual/anterior, maior
que duas horas, até quatro lotes de no máximo 30 exclusões incluindo metadata.
Limpeza protege lease e orçamento. Falhas/interrupções de manutenção são registradas
sem derrubar geração válida; cache antigo remanescente/execuções falhas exigem
prune manual limitado, já existente. Não há TTL nem crescimento silenciosamente
tratado como armazenamento gratuito ilimitado.

Custos adicionais aproximados de manutenção de métricas, além da operação original:

| Operação efetiva | Leituras | Gravações |
| --- | ---: | ---: |
| Primeira curtida elegível | 4 | 3 |
| Descurtir/reativar sinal existente | 3 | 2 |
| Primeiro comentário elegível | 5 | 4 |
| Novo short com módulo pronto | 1 | 1 |

Sem retentativas; idem repetido não executa coleta. Campos de rankingSignals,
rankingHours e rankingDays dispensam índices; manifesto local atualizado, sem
publicar índices. São registros por fonte, hora e identidade/dia, não log por clique.
Sinais/guardas permanecem para evitar renovação de idade e reciclagem de cap;
retenção/compactação desses dados requer política futura, sem apagar proteções
arbitrariamente. Parcial de inicialização interrompida pode deixar epoch antiga
privada para manutenção. Observar crescimento e armazenamento antes de produção.

Páginas: caso típico 15 shorts/um jogo ~32 leituras + uma escrita de limitador;
primeira relevância acrescenta duas leituras de controle (~34), continuação uma.
Pior caso 30 candidatos/30 jogos ~91; relevância inicial ~93. Não inclui entradas
cobradas de índices, sessões e retries. Nenhuma franquia gratuita é garantida por
esses limites internos.

## Verificação

71 testes distintos relacionados aprovados: 57 Node (11 elegibilidade/inicialização/
cursor/cliente, 11 base ranking, 14 curtidas, 13 comentários, 8 leitura pública) e
14 REST/regras no emulador isolado 8081 (6 integração C + 8 base/geração/retenção).
Teste de 22 escritas concorrentes inicialmente esgotou oito retries do Firestore;
prova ajustada confirmou que recusas ABORTED não escrevem parcialmente e o reenvio
idempotente conclui corretamente. Limite de retries preservado; sob contenção a
interface pode pedir nova tentativa. Testes já aprovados sem mudança relacionada
não foram repetidos. Lint/build completos passaram; arquivos alterados depois
receberam lint localizado. diff --check aprovado.

Desenvolvimento 8080: 10 shorts/19 documentos de fonte, zero sinais históricos.
Inicialização concluída; hashes confirmaram preservação integral dos metadados.
Primeira geração completa de 10 shorts; carga interna de leitura 70 e reserva de
124 gravações. Nenhum voto, comentário ou vídeo fictício inserido.
API HTTPS: quatro modos HTTP 200, filtro correto, ausência de cookie 401 e cursor
forjado 400. Rotina local ativa; nenhuma configuração de serviço externo alterada.

Conferência visual pelo proprietário: atualizar https://127.0.0.1:5174/, experimentar
quatro opções/filtro e abrir ficha. Ainda não confirmada nesta entrega; com todos
os contadores zero, Mais Curtidos desempata por recência. Aceitação visual não
substitui testes de paginação com 37/40 fixtures no emulador isolado.
Próxima: 7.5.7 — miniaturas e prévias; depende de autorização e avaliação por fonte.

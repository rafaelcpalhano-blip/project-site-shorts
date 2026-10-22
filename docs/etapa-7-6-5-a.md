# Etapa 7.6.5-A — diagnóstico localizado de desempenho e acessibilidade

Executada mediante autorização em 22/10/2026. Git inicialmente limpo. Escopo A somente: medições e correções comprovadas; B/C/D/E e Etapas 8/9 não iniciadas.

## Método e limites

Instrumentação temporária no feed: React Profiler por feed/card, PerformanceObserver de recursos HTTP locais /api/ e tarefas longas. Somente caminhos sem query, contagens, duração, fase de commit e número de iframes/modais; nenhum conteúdo, cookie ou credencial registrado. Sem ferramentas/dependências novas. Observers e Profiler de diagnóstico removidos antes de lint/build e entrega; confirmado probe-stop e ausência de referências no código final.

Amostras: uma abertura/encerramento/fechamento Twitch antes e depois, mais viewport estreito 390x844. Os primeiros dois casos podiam carregar uma mídia oficial por ação explícita; sem loops ou reprodução em massa. Viewport estreito não emula CPU, memória ou hardware de um celular real.

Registro bruto fora do Git: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/medicoes-7-6-5-a.json
Captura de conferência fora do Git: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/revisao-7-6-5-a.png

## Resultados medidos

| Observação | Antes | Depois |
|---|---:|---:|
| HTTP /api/comments/list na mesma abertura de desenvolvimento | 2 | 1 |
| Commits dos dez cards atribuíveis à confirmação de curtida já igual | 10 | 0 |
| Maior commit React na janela desktop | 11,2 ms | 6,4 ms |
| Iframes simultâneos observados no desktop | até 1 | até 1 |
| Iframes/modais após encerrar e fechar | 0/0 | 0/0 |
| Botão fechar no viewport estreito | 37,44 x 34,39 px | 44 x 44 px |

As durações são amostras, não benchmark estatístico nem promessa de ganho percentual. Nenhuma entrada longtask registrada nas janelas, mas isso não demonstra ausência de travamento em todos os cenários.

A segunda janela desktop atravessou a atualização periódica de um minuto: ambos os totais brutos tiveram 30 commits de cards. Antes: 10 abrir + 10 confirmação redundante + 10 fechar. Depois: 10 abrir + 10 relógio + 10 fechar. A eliminação é atribuída à confirmação, não ao total bruto sem separar causas. Fonte e timestamps no registro bruto.

Consultas de comentário observadas: 52/64 ms antes, 71 ms depois; estado de curtida 90 ms antes e 120 ms depois. Isso não indica melhora de latência da rede. O benefício medido é remover trabalho, sem alegar acelerar a resposta individual.

A entrada inicial do feed após instrumentação registrou /api/feed/ordered em 2.155 ms; render do feed com cards em 8 ms. A duração do HTTP não equivale a bloqueio de CPU; não foi isolada a causa dessa latência de servidor/rede. Cada abertura não refez /api/feed/ordered durante as medições.

StrictMode permanece ligado. Desenvolvimento executa configuração/limpeza adicional dos efeitos, exposta no probe-start/stop/start. Sessões dos clientes ainda podem produzir chamadas extras/abortadas nesse modo; não foi criada cache global de autenticação nem enfraquecida a emissão/validação de cookies. Não extrapolar redução de duas para uma consulta para redução de 50% na produção. Contagens HTTP não são contagem de documentos ou estimativa exata de cobrança Firestore.

## Correções

1. public-read-api aceita AbortSignal também em listComments; verifica cancelamento antes de iniciar cada POST e após ler a resposta. FirestoreShortContent cancela ao fechar, trocar de vídeo/página de comentários ou substituir a consulta. Mantidos active guard, validação, cursor, limite, sessão assinada e ausência de repetição automática. Cancelar não desfaz leituras que já tenham chegado ao servidor.
2. Confirmação de contagem de curtida igual conserva referências da página/item selecionado. Mudança real ainda atualiza contagem e mantém ordem, cursor e demais dados. Nenhuma mudança em persistência, proteção de curtidas ou relevância.
3. Modal: alvo de fechar ampliado para mínimo 44x44. Correção de acessibilidade do componente compartilhado; não antecipou reorganização visual dos blocos B/D.

## Recursos e acessibilidade

- Observados no máximo um iframe ativo e zero após fechar; fonte já tinha cleanup de ResizeObserver, IntersectionObserver, listeners e timers. Preservado, sem refatoração preventiva.
- Cada card tem um relógio de 60s com cleanup. As atualizações foram observadas e não demonstraram gargalo; não trocado por arquitetura de relógio compartilhado sem necessidade.
- Miniaturas continuam lazy/contain, com fallback e sem players de hover. Não foram repetidas consultas externas de metadados para os 404 já documentados.
- Em 390x844, modal clientWidth/scrollWidth 339/339, sem transbordamento, sem iframe Twitch abaixo do mínimo. Desktop e viewport padrão restaurados ao finalizar.
- Fechar mediu 44x44 também no formulário de compartilhamento. Tab do último campo vazio voltou para Fechar janela. Zero botões do main sem texto ou nome ARIA na inspeção simples; isso não é auditoria completa de leitor de tela.
- Cores existentes calculadas sem mudar identidade: texto principal/fundo 17,36:1; texto secundário/superfície 9,97:1; destaque/superfície 7,79:1. Não equivale a certificar todos os estados, overlays e imagens.
- Regras de foco visível e movimento reduzido existentes preservadas. Não houve teste com leitor de tela real nem perfil de CPU/memória de celular físico.
- Consulta limitada aos logs de erro/aviso da aba retornou zero entradas; não declarar resolvidos todos os problemas históricos/recursos externos com base nisso.

## Validação e estado

- tests/performance-7-6-5-a.test.mjs: 7 aprovados (imutabilidade, atualização real, zero ausente, cancelamento prévio/durante sessão/durante leitura e sucesso com cursor).
- tests/public-read.test.mjs: 8 aprovados, reexecutados por alteração no cliente compartilhado (limites, paginação, vínculo de cursores, indisponibilidade, origem/sessão, resposta validada e sem retry).
- npm run lint e npm run build completos aprovados pela integração cliente/feed/visualizador; sem suíte completa.
- git diff --check aprovado. Nenhuma dependência, serviço, regra, índice ou backend alterado. Nenhuma publicação, comentário, denúncia ou curtida enviada/moderada. Controle normal de sessões/tentativas existente não foi desativado.

## Limitações e próxima ação

Travamento prolongado relatado não foi reproduzido nas amostras; não há evidência suficiente para apontar uma única causa ou afirmar eliminação total. Memória, CPU/GPU dos processos externos e dispositivo físico não foram medidos. Se persistir, coletar dispositivo/navegador, ação e duração antes de outra otimização.

A concluída com duas reduções de trabalho e um ajuste de acessibilidade. Próxima proposta: 7.6.5-B — cards e visualizador, aguardando autorização individual. C/D/E seguem separados; nenhuma Etapa 8 iniciada.

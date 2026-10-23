# Etapa 7.6.9-A — referência de desempenho

Iniciada em 23/10/2026. **Status: levantamento da etapa A concluído, com referência diagnóstica qualificada pelo timeout. Não é benchmark definitivo sem avisos.** Nenhuma otimização autorizada nesta etapa. B–I e Etapa 8 não iniciadas.

## Referência preservada

Reutilizada a build de produção da auditoria anterior, gerada com `VITE_DATA_MODE=firestore-emulator`. Não houve alteração de aplicação desde aquela compilação; nenhum rebuild ou repetição de suítes foi necessário. O manifesto registra HEAD, status Git, nomes, bytes e SHA-256 de index.html e chunks JS/CSS para conferir a referência antes das próximas comparações.

- Frontend compilado: **https://127.0.0.1:5175/**, sem Vite/HMR e sem script diagnóstico nessa URL simples.
- API/local normal: HTTPS 5174; Firestore emulador em 8080, preservados.
- Servidor temporário 5175 usa HTTPS/certificado local existente, bind loopback e proxy para a API 5174. Reiniciado somente esse servidor para atualizar o coletor externo; falhas artificiais desligadas.
- Sem instalação de bibliotecas, acesso a produção, alteração de infraestrutura de deploy, seed/reset, publicação de dados ou modificação de players.
- Conteúdo dinâmico: ordem latest, página inicial, catálogo local existente; tempo relativo e respostas de serviços externos podem variar. Não alterar os dados durante a comparação.
- Servidor diagnóstico sem compressão nem ETag; transferência local não representa o futuro cache/CDN de produção.

As evidências anteriores permanecem em [Auditoria pré-Etapa 8](auditoria-desempenho-pre-etapa-8.md). Nota 35/LCP 7,2 s/CLS 0,496 continuam sendo resultados informados pelo proprietário, sem JSON original; não são a nova referência de build.

## Captura complementar: identificar o candidato LCP

Executada uma navegação, sem abrir vídeo, em `/?audit=baseline-a-return-390`. O coletor já existente recebeu identificação textual e retângulo do candidato LCP; ferramentas ficam fora do código da aplicação. A URL instrumentada não deve ser usada no Lighthouse.

Condições:

- Navegador interno, Chrome/155.0.0.0 em Windows, linguagem pt-BR; viewport 390 × 844, DPR 1.
- Sem boas-vindas abertas: preferência já dispensada somente na origem de auditoria. Armazenamento original não foi apagado.
- Sem limitação de rede/CPU, cache não limpo; não é simulação de hardware Android nem auditoria Lighthouse.
- FCP e último candidato LCP: **172 ms** nesta captura exploratória.
- Candidato: parágrafo do rodapé “Seu jogo não está no catálogo? Solicite a inclusão ao compartilhar um short. Para complementar a descrição, capa e outras informações, entre em contato com o suporte.”
- Retângulo registrado no momento do candidato: x=16, y≈777,83; largura=343 e altura≈92,44 px. Não era uma miniatura de vídeo.
- **CLS 0,3558566**: deslocamentos ~0,18644 em 439,7 ms e ~0,16942 em 948,7 ms, envolvendo rodapé, balões e paginação.
- Ao final: 15 cards, zero iframes, nenhum alerta e sem overflow horizontal. Sem interação com players, curtidas ou comentários.

Esse candidato aparece antes de a grade terminar de carregar; portanto, o número rápido não comprova que a experiência móvel esteja boa. Também não identifica o candidato do Lighthouse anterior. Não escolher preload/eager de todas as miniaturas com base nessa captura.

Sem novas suítes completas: verificados o carregamento da página, arquivo de evidências, referência visual e integridade documental. Viewport restaurado e aba temporária fechada ao terminar.

## Pendência: Lighthouse no Chrome, sem instalação

O executável/pacote Lighthouse não foi encontrado nas dependências do projeto, comandos disponíveis ou diretórios npx verificados. O navegador automatizado disponível não oferece uma ferramenta Lighthouse/controle do painel DevTools. Não foi feita instalação para contornar a restrição. **É necessária uma execução manual no painel Lighthouse do Chrome para concluir A.**

Procedimento de referência:

1. Usar uma janela anônima do Chrome, separada da sessão normal, e abrir **https://127.0.0.1:5175/**. Manter API/emulador ativos. Não usar 5174 nem a URL com `?audit=`.
2. Abrir DevTools (F12 ou Ctrl+Shift+I), acessar Lighthouse; se oculto, procurar entre as abas adicionais. Selecionar **Navigation**, **Mobile** e somente **Performance**. Não é necessário repetir as quatro categorias nesta etapa.
3. Nas configurações Lighthouse, selecionar **Simulated throttling** para a referência e registrar o valor. Deixar Network/CPU fora do Lighthouse sem limitação manual adicional, para evitar duplicação acidental. Registrar versão do Chrome/Lighthouse e as condições finais do relatório.
4. Primeira visita: permitir Clear storage **somente nessa janela anônima de teste**, sem mexer na sessão normal. Rodar a análise sem fechar as boas-vindas, rolar a página ou abrir vídeo durante a captura. Confirmar no resultado/filmstrip que as boas-vindas apareceram.
5. Salvar o relatório em JSON e HTML, com nomes `7-6-9-a-mobile-first.json` e `.html` na pasta externa de evidências indicada abaixo. Guardar os avisos mesmo se houver timeout; não interpretar captura interrompida como medição válida completa.
6. Referência de retorno, em uma segunda execução apenas: dispensar as boas-vindas antes de iniciar, desmarcar Clear storage, manter os demais ajustes iguais. Confirmar no filmstrip que não há boas-vindas. Salvar `7-6-9-a-mobile-return.json` e `.html`. “Retorno” aqui descreve a preferência armazenada; o estado efetivo do cache deve ser registrado, não presumido como aquecido.
7. No resultado, guardar FCP/LCP/CLS/TBT, nota, bytes e detalhes do elemento LCP. Se o relatório não identificar o elemento ou houver timeout, abrir o trace no painel Performance e salvar o trace correspondente, sem repetir auditorias completas à tentativa.

Fechar tarefas pesadas durante as duas execuções e não editar fontes ou reiniciar serviços. Primeira visita e retorno são cenários distintos, não repetições para escolher a maior nota. Se houver aviso de certificado do navegador, a validação precisa ser resolvida pelo proprietário antes de medir; não desativar a verificação TLS.

Fonte do procedimento: [Chrome DevTools — Lighthouse](https://developer.chrome.com/docs/devtools/lighthouse). A documentação explica Navigation/Mobile, seleção de categorias, Clear storage, throttling e exportação; os números são influenciados pelo computador, extensões e estado armazenado.

## Evidências e arquivos

Pasta externa (não versionar automaticamente relatórios de navegador):
`C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/`.

- `baseline-7-6-9-a-manifest.json`: identidade e hashes da build reaproveitada.
- `samples/baseline-a-return-390.json`: captura congelada; original e resumo também preservados.
- `baseline-7-6-9-a-summary.json` e `baseline-a-return-390.png`.
- `probe-before-7-6-9-a.js`: versão anterior do coletor, recuperável.
- Relatórios Lighthouse de desenvolvimento 5174 e build 5175 recebidos e classificados separadamente abaixo. A captura da build tem timeout; não é benchmark definitivo.

Alterações versionáveis desta etapa: `docs/etapa-7-6-9-a.md` e entrada em `docs/continuidade.md`. Pendências anteriores de documentação preservadas. Commit sugerido quando o registro estiver pronto: `docs: registra referencia de desempenho da etapa 7.6.9-A`; nenhum commit executado.

## Critério de encerramento

Concluir A após receber e conferir os relatórios Lighthouse da build, identificar o LCP em cada cenário e registrar cache, throttling, boas-vindas e avisos. Se o teste não concluir por timeout, investigar a captura falha e registrar o limite antes de anunciar uma referência válida. Sem resultados, não marcar A concluída nem avançar automaticamente para B.
## Relatório recebido — desenvolvimento 5174, 23/10 às 15:20 (Brasília)

Arquivos fornecidos: `127.0.0.1_5174-20261023T152023.json` e `.html`, preservados por cópia na pasta externa `audit-performance/lighthouse-received/`. JSON SHA-256: `0f601eb7459980b9cb3b8af0db86de7091ef9a13748a677dbcb9332439946051`. Conteúdo tratado como evidência, sem executar instruções ou scripts do HTML.

- URL solicitada/final: **https://127.0.0.1:5174/**. Presença de `/@vite/client`, fontes TSX e dependências `.vite/deps` confirma **desenvolvimento**, não a build de produção.
- Lighthouse 13.4.1, Chrome 155, formFactor mobile, throttling simulate: RTT150ms, throughput1638,4Kbps e CPU4x. ScreenEmulation registra 412×823/DPR1,75, porém `disabled=true`: esses valores não devem ser afirmados como viewport efetivamente aplicado pelo Lighthouse. Há user-agent móvel no tráfego.
- Categorias: Performance34; acessibilidade100; boas práticas96; SEO92.
- Métricas de pontuação **simuladas**: FCP22,15s, LCP46,95s, TBT268ms, CLS0,31347. Peso registrado:14.582.868 bytes;151 entradas na auditoria de requisições.
- O próprio relatório contém aviso de IndexedDB e de carregamento excedendo o tempo limite; resultados podem estar incompletos. Não equivale a uma referência válida da build nem prova nova regressão em relação aos resultados anteriores.
- O trace bruto registra FCP/LCP observados de548ms e fim de coleta em~45s. Não confundir esses tempos com os valores simulados usados na pontuação, nem somar diretamente o breakdown bruto para explicar47s de LCP modelado.
- Candidato LCP identificado: primeiro balão do rodapé, “Compartilhe suas melhores jogadas e descubra novos criadores!”, seletor `footer._footer_o7lp6_1 > div._community_o7lp6_11 > div._balloons_o7lp6_25 > p._balloon_o7lp6_25`. É outro parágrafo do mesmo rodapé, coerente com a área aparecer antes de o feed crescer; não é a mesma frase da captura complementar em390px.
- Maiores transferências: Firestore dev~4,49MB, ReactDOM dev~3,13MB, welcome.png~1,70MB, Router dev~1,43MB e Auth dev~1,15MB. Isso reforça a distinção dev/build já documentada; não recomendar minificação de desenvolvimento como correção de produção.
- Consulta do feed retornou200; não houve erro de console registrado. Avisos/timeout não identificam por si só a causa das intermitências originais no Android. Presença das boas-vindas e uso de janela anônima não confirmados pelo JSON.

**Próximo passo necessário:** executar o procedimento desta etapa na URL **https://127.0.0.1:5175/** (sem `?audit=`), em janela anônima, modo Navigation/Mobile/Performance, guardando JSON/HTML e os avisos. Não repetir as quatro categorias. A permanece pendente até conferir essa referência; B não iniciada.
## Relatório recebido — build 5175, 23/10 às 15:24 (Brasília)

Proprietário confirmou explicitamente **janela anônima**. JSON/HTML `127.0.0.1_5175-20261023T152440` copiados para `audit-performance/lighthouse-received/`, sem executar HTML. JSON SHA-256 `293f4d5ce3520efcb1f8aafcbc674c33361791f2b1e8af0340605f69a35f828d`; HTML SHA-256 `9b8be2b89593a05b55db5924232ac37884040c70a96c0588581c61b8edb63b1a`.

### Condições e métricas

- URL final **https://127.0.0.1:5175/**, sem diagnóstico injetado. Somente três chunks de aplicação, com nomes correspondentes ao manifesto; sem Vite/HMR/fontes de desenvolvimento nas requisições.
- Lighthouse13.4.1, Navigation, mobile, apenas Performance, throttling simulate: RTT150ms, throughput1638,4Kbps e CPU4x. `screenEmulation.disabled=true` impede tratar os valores configurados 412×823/DPR1,75 como emulação efetiva garantida; manter essa configuração explícita na comparação futura.
- As miniaturas do filmstrip em375ms e3000ms mostram respectivamente shell de carregamento e feed pronto; sem modal de boas-vindas nesses quadros. Nenhuma interação com vídeo indicada. Não confundir com referência de primeira visita com boas-vindas; a preferência pode ter sido dispensada antes da análise.

| Métrica do relatório | Valor |
| --- | ---: |
| Performance | 46 |
| FCP simulado | 5,21s |
| LCP simulado | 6,67s |
| CLS | 0,3725006 |
| TBT numérico | 4ms (interface arredonda para0ms) |
| Transferência registrada | 3.403.159 bytes (~3,40MB) |
| Entradas de requisições | 19 |

Não atribuir a diferença em relação ao dev a uma correção: nenhuma foi implementada, são ambientes distintos e os dois relatórios contêm timeout. Servidor estático local sem compressão/ETag não reproduz a futura entrega de produção.

### LCP e layout identificados

LCP: parágrafo do rodapé “Seu jogo não está no catálogo? Solicite a inclusão ao compartilhar um short...”, seletor `div._shell_p4bz2_1 > footer._footer_o7lp6_1 > div._information_o7lp6_49 > p`. Mesmo texto identificado pela captura complementar. O rodapé aparece inicialmente e depois sai da área visível quando a grade ocupa espaço.

O CLS é composto por deslocamentos do rodapé de0,1970119 e0,1754887. Lighthouse também associa o primeiro à imagem do Clipper como “Unsized image element”. O HTML tem width1024/height1536; CSS usa largura112px (88px móvel) e height:auto. A associação é uma pista adicional a conferir na futura etapa B, não prova de ausência de atributos nem justificativa para remover a imagem. Verificar reserva efetiva antes de decodificar a imagem e separar sua contribuição da inserção da grade.

O JS inicial transferiu~1MB sem compressão; `welcome.png` sozinho~1,70MB, aproximadamente metade dos3,40MB registrados. Reforça as prioridades de layout e imagens, sem recomendar preload para uma suposta imagem LCP: o candidato neste relatório foi texto.

### Timeout investigado até o limite desta evidência

O relatório registra os mesmos avisos de IndexedDB e carregamento excedendo o tempo limite, mesmo em janela anônima confirmada. Não concluir que o proprietário executou o procedimento incorretamente nem que precisa apagar seu armazenamento normal.

- Trace terminou em~45,012s, perto de `maxWaitForLoad=45000ms`.
- Uma requisição do transporte Firestore em `http://127.0.0.1:8080/google.firestore.v1.Firestore/Listen/channel` tem status200 e **finished=false**. As outras18 entradas estão concluídas. Canal em aberto é uma explicação candidata para a espera de rede, não causalidade provada nem vazamento.
- API `/api/session` concluiu204 em~22ms; `/api/feed/ordered` concluiu200 em~419ms. Não há evidência de o feed ter esperado45s para responder. Os tempos são brutos da captura, não tempos simulados móveis.
- O trace bruto registra FCP/LCP145ms e última mudança visual~1,195s; as métricas modeladas5,21s/6,67s são diferentes por simulação. Não chamar o145ms de LCP móvel real nem usar o breakdown bruto para decompor diretamente6,67s.
- Sem erro fatal do Lighthouse informado. Ainda assim, o aviso declara que os resultados podem estar incompletos: **nota46 e LCP6,67s são referência diagnóstica provisória**, não benchmark definitivo nem medição de produção real.

### Encaminhamento da etapa A

Referência da build, elemento LCP, condições, bytes e limitações registrados. Não repetir agora auditorias completas para perseguir nota ou mudar infraestrutura/SDK para silenciar o timeout.

Para eliminar a ressalva e concluir a validação definitiva, aproveitar o **mesmo relatório já gerado**: abrir o trace no painel Performance e exportá-lo, se disponível, para verificar a espera de rede e o canal Firestore. Isso não exige nova medição. Sem o trace adicional, manter a referência com restrição explícita. O diagnóstico já sustenta a proposta B de estabilidade de layout, mas B depende de autorização própria e não foi iniciada.

Arquivos versionáveis atualizados: este registro e `docs/continuidade.md`. Arquivos externos adicionais: `prod-5175-summary.json`, relatórios originais copiados e miniaturas do filmstrip extraídas sem alteração. Sem otimização/correção, instalação, novo teste completo, dados de produção, commit ou deploy.
## Trace recebido — conclusão do levantamento A

Arquivo: `Trace-20261023T153346.json.gz`, 2.350.960 bytes comprimidos e136.140 eventos. Preservado em `audit-performance/lighthouse-received/`; resumo derivado em `prod-trace-summary.json`, com URLs de transporte sem parâmetros. SHA-256 do original: `74f6432b38d2afabaa851effe1c0670a9e28e9f59f92b298d3228b0f571d35b5`.

Apesar do nome indicar exportação às15:33, a origem monotônica7752157470 e a navegação para5175 coincidem exatamente com `observedNavigationStartTs` do relatório das15:24. Portanto, é o **trace da mesma execução**, não outra medição.

### O que ficou comprovado

| Evento bruto do trace | Tempo desde a navegação |
| --- | ---: |
| DOMContentLoaded / load | ~82ms |
| FCP e candidato LCP textual, nodeId41 | 144,512ms |
| Consulta do feed iniciada | 435,748ms |
| Consulta do feed concluída200 | 856,306ms |
| Deslocamentos do rodapé | 426,650 e905,671ms |
| Última imagem registrada concluída | ~1.102,621ms |
| Último pacote do canal Firestore aberto | 30.488,652ms |
| Final da captura | 45.011,927ms |

Esses são tempos de execução local do trace, **sem o modelo de throttling móvel aplicado às métricas de pontuação**. Não substituem FCP5,21s/LCP6,67s simulados do relatório.

A consulta do feed durou~420,6ms entre eventos SendRequest/Finish; a diferença em relação aos419,3ms do relatório vem dos marcadores usados, não de outra execução. As imagens externas observadas concluíram200. O candidato LCP foi apenas um P/texto, coerente com o parágrafo do rodapé identificado pelo relatório.

Das19 requisições da página mapeadas no trace,18 têm evento de término e uma continua sem Finish: transporte Firestore Listen/channel, status200. Esse canal recebeu cinco pacotes:~459,960ms,460,065ms,470,691ms,484,438ms e30.488,652ms. Não é uma imagem ou a consulta HTTP do feed aguardando45s.

Thread principal da página, somando a interseção dos eventos RunTask completos com cada janela:

- Primeiros2s:~356,4ms ocupados; uma tarefa acima de50ms, com51,6ms.
- De2 a10s:~0,8ms ocupados; nenhuma tarefa acima de50ms.
- De10 a45s:~34,2ms ocupados; nenhuma tarefa acima de50ms.

Esta contagem é do trace bruto e do processo/thread da página, não uma reprodução do cálculo TBT simulado nem medida de CPU de todo o navegador. Ela descarta a interpretação de45s de bloqueio contínuo da thread principal nesta captura. Não prova ausência de custo em Android físico.

### O que continua limitado

O canal aberto com atividade tardia, enquanto os recursos visuais/API já terminaram, **reforça a hipótese de espera pelo transporte/ociosidade de rede no coletor**. O trace não contém a decisão interna que disparou o aviso Lighthouse; portanto, não é prova isolada de causalidade. Não remover Firestore, alterar SDK, desativar proteção ou elevar o timeout como suposta otimização a partir disso.

Há dois detalhes que devem permanecer explícitos:

- O primeiro evento LayoutShift traz `had_recent_input=true`, embora o relatório inclua ambos os deslocamentos no CLS0,3725006. Não recalcular o CLS oficial apenas somando esses registros nem alterar o relatório para0,175. Nas verificações de B, conferir métrica e entrada recente no mesmo coletor, sem interagir durante o carregamento. A divergência não elimina a evidência visual de movimentação do rodapé.
- ResourceFinish da sessão registra `didFail=true` apesar de resposta204 e relatório indicando204; a consulta do feed em seguida concluiu200. Esse sinal sozinho não comprova falha funcional de sessão, e não deve ser confundido com o bug móvel relatado. Não foram observados erros de console no relatório.

### Encerramento e próxima etapa

**Levantamento A concluído com limitações documentadas:** build identificada e preservada, condições e janela anônima confirmadas, relatório HTML/JSON e trace da mesma execução arquivados, LCP identificado, timeout investigado até o limite da evidência. Não é necessário pedir nova auditoria completa agora.

A referência de comparação é diagnóstica: Performance46, FCP5,21s/LCP6,67s simulados, CLS0,3725006, TBT4ms e3,403MB, **com aviso de timeout/IndexedDB**. Não apresentar como benchmark definitivo sem avisos. Uma comparação futura deve manter a mesma configuração e reportar a ressalva, ou estabelecer uma referência nova separada se mudar a metodologia de coleta. O texto histórico de pendência acima foi superado pelo recebimento e análise deste trace.

A próxima proposta permanece **7.6.9-B — estabilidade do layout**, reservando espaço do feed/estabilizando barra de rolagem e conferindo reserva efetiva do Clipper no rodapé. Escopo e implementação dependem de autorização do proprietário. Não aplicar otimizações de imagens, auth, catálogo ou backend antecipadamente.

Validação desta entrega: correspondência exata de timestamps entre trace/JSON; eventos de pintura/layout/rede e tarefas da thread principal analisados; hashes e arquivos preservados; diff documental verificado. Nenhuma execução adicional de Lighthouse/build/suíte funcional, instalação, escrita de negócio, alteração de produção, infraestrutura ou deploy. Código da aplicação permanece inalterado.

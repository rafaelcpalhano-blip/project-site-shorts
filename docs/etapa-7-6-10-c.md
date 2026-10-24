# 7.6.10-C — Miniaturas e avaliação de prioridade

Concluída em24/10/2026 sob autorização. Escopo restrito ao card e à seleção de miniaturas; nenhum backend, registro existente, player ou URL assinada foi alterado.

## Solução conservadora

Fonte Google: https://developers.google.com/youtube/data/reference/rest/v3/thumbnails documenta medium320x180 e maxres1280x720. Consultas limitadas a três pares públicos já presentes nos relatórios confirmaram JPEG, HTTP200, tamanhos16:9 e enquadramento adequado no card. Não foram consultadas credenciais ou APIs de publicação para essa medição.

Novo youtubeCardImage permite srcset somente para thumbnail YouTube já validada, identidade correspondente, hosts i.ytimg.com/img.youtube.com, caminho exato /vi/IDde11caracteres/maxresdefault.jpg e sem query. Variante conhecida mqdefault.jpg320w e original1280w; original permanece no src e nos dados, com validade e identidade preservadas. Não extrapolar para vi_webp, outras qualidades, URLs com parâmetros ou outras plataformas.

sizes conserva margem de resolução: até450px de viewport usa calc(100vw - 34px); acima usa320px. O grid existente tem cards menores no desktop. Navegador usa medium somente quando considerar resolução suficiente; telas densas/cards maiores podem manter original. Não cortar, esticar ou alterar CSS para encaixar nova fonte.

Erros da variante são lembrados no cache de falhas limitado já existente e fazem tentar original antes de capa/Clipper. Original expirado, inválido ou com erro mantém a cadeia de fallback. Também se verificou em navegador que CDN pode retornar imagem genérica120x90 e disparar load; variante4:3 inesperada é rejeitada e original conhecido com esse placeholder pequeno também segue para capa/Clipper. Esse teste do original não se aplica às miniaturas high4:3 ou URLs arbitrárias e não rejeita maxres retrato/alta resolução válido. Metadados do short não são modificados.

## Avaliação de prioridade

loading lazy, decoding async e referrerPolicy existentes mantidos. Nenhum fetchpriority high/eager/preload de player foi adicionado. Motivo: LCPmobile da referência é h1; desktop foi o quinto card, dependente de conteúdo/viewport. Priorizar primeiros5cards indiscriminadamente poderia aumentar tráfego mobile sem ganho provado. Tema foi avaliado e essa mudança foi descartada nesta etapa, sem manipular medição ou prometer ganho de LCP.

## Amostras de bytes e qualidade

| Vídeo público | Maxres | Medium | Redução aproximada |
|---|---:|---:|---:|
|28nFy4tGcwI|107.824B|8.512B|92,1%|
|bm6yXlEcCfs|167.103B|12.707B|92,4%|
|vSWPz8owUTM|79.510B|4.216B|94,7%|

Três originais354.437B versus variantes25.435B. Isso demonstra oportunidade por imagem escolhida, não redução garantida do total da página. Imagens maiores já em cache podem ser reutilizadas pelo navegador. Em375/390/400/430px, seleção do original foi intencional para não usar320 abaixo da resolução necessária. Economia é principalmente em cards pequenos/desktop de baixa densidade; não alegar LCPmobile melhorado por estes dados.

Comparação visual a200x112 confirmou mesmo enquadramento e legibilidade nas três amostras; diferenças RGB médias2,0–3,6/255, esperadas por resolução/compressão JPEG. Sem reprocessar ou armazenar imagens de terceiros no projeto; amostras apenas na pasta de evidências local. JavaScript do entry cresceu aproximadamente0,9KB frente a B por seleção/recuperação; custo documentado e pequeno frente aos bytes economizados quando a variante é escolhida. Não substitui a análise de JS da etapaD.

## Validação

Novo tests/youtube-card-image.test.mjs protege domínio/identidade/qualidade/query, exclusão de URLs não elegíveis, recuperação original→capa→Clipper com cache de falhas, placeholder genérico incluindo correção de densidade, originais retrato/4:3 válidos, preservação de campos, lazy/sem eager e fontes assinadas Twitch/TikTok byte a byte. Incluído nos gruposC/E.

GrupoC final:39testes em7arquivos aprovados; lint3arquivos de implementação/utilitário, build firestore-emulator e diff aprovados. Após tratar o placeholder reproduzido,14testes afetados foram revistos e o grupoC final repetido por alteração efetiva de código. Não é suíte inteira ou Lighthouse. Avisos não fatais de WebSocket24678 nas fixturesSSR continuam documentados, sem falha dos testes ou mudança de HMR da aplicação. Uma build intermediária detectou somente tipos de fixture temporária; fixture foi removida antes da build final aprovada.

Build real5175: primeira conferência desktopDPR1 escolheu mqdefault nos cards elegíveis, opacity1 e imagens completas; Twitch manteve suas URLs e fallbackClipper da etapaB funcionou. Seis larguras320/375/390/400/430/1280px:zeroiframes/sem overflow.320px escolheu medium;375–430px original. Na volta a1280 após carregar imagem maior, navegador reutilizou original em cache: comportamento permitido, sem pressupor downgrade automático. Altura/reserva/hover CSS não foram modificados.

Fixture isolada com vídeo inexistente reproduziu load de placeholder, não errorHTTP: inicialmente medium→original; após tratamento final, original→capa real da fixture, com mesmo título/canal/jogo e zeroiframes. Observações foram feitas em navegações distintas, algumas reutilizando fonte maior em cache; não afirmar que todos os três eventos ocorreram num único registro. Cadeia completa/cache também coberta em teste determinístico. Log inicial da fixture causava overflow por JSON sem quebra; apenas logs foram ajustados, resultado final sem overflow. Nenhum registro real foi criado.

DPR real das conferências foi1. Retenção da fonte1280para2x segue srcset/sizes e contratos; não foi emulado hardwareDPR2 pelo controle disponível. Conferência física pode validar aparência em tela densa no checklist. Não houve auditoria Lighthouse nova, medição comparável de FCP/LCP ou promessa de melhoria numérica dessas métricas.

## Evidências e continuidade

C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-10-c/ contém provider-samples.json, dimensions-quality.json, comparacao-miniaturas.png, responsive.json, desktop-build.png, failure-chain.json/failure-chain-final.json e tests-final.log. Arquivos de fixture retirados/5178encerrada; viewport restaurado e abas temporárias fechadas.

Arquivos versionáveis: src/features/shorts/services/youtube-card-image.ts, src/features/shorts/components/ShortCard.tsx, tests/youtube-card-image.test.mjs, scripts/test-performance.mjs e documentação. API5174/PID19512, build5175/PID24152 e Firestore8080/PID7860 preservados sem reset/restauração/publicação/deploy/infraestrutura/produção/commit.5175já serve build final, sem reinício de backend. Próxima7.6.10-D: avaliar JavaScript inicial sob evidência, aguardando autorização. E/F e Etapa8 não iniciadas.
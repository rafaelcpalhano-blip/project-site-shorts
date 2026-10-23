# Etapa 7.6.9-H — capas estáveis e avaliação de LCP

Concluída localmente em 23/10/2026, sob autorização do proprietário. Git iniciou limpo após G. Escopo final: reserva de espaço na ficha pública do jogo, sustentada por medição de imagens lentas/quebradas. Sem commit, produção, deploy, nova biblioteca ou mudança de infraestrutura.

## Evidência e decisão

A auditoria e a etapa A identificaram texto como candidato LCP, inclusive o rodapé no relatório móvel anterior. ShortCard já reserva proporção16:9 com imagem posicionada dentro da área. Não havia evidência suficiente para trocar indiscriminadamente lazy por eager, aumentar prioridade/preload ou modificar a qualidade das miniaturas oficiais.

A oportunidade comprovada nesta etapa foi a capa da ficha: img com height:auto, sem área reservada antes de receber dimensões; ao falhar, a ausência de img fazia a grade mudar de duas colunas para uma. Isso deslocava os textos e o conteúdo posterior.

Fixture temporária usou o GameInfo real com uma imagem retida no servidor até o botão de teste liberá-la. A resposta veio um segundo após a interação, para não excluir o deslocamento por hadRecentInput. Amostras de posição antes/depois e PerformanceObserver guardadas. Sem Firestore/API nessa fixture.

| Cenário controlado | Antes: deslocamento do conteúdo seguinte | CLS observado antes | Depois: deslocamento | CLS observado depois |
| --- | ---: | ---: | ---: | ---: |
| Retrato lento, viewport390×844 | +210px | 0,176053 | 0px | 0 |
| Imagem quebrada, viewport390×844 | +21,75px | 0,055952 | 0px | 0 |
| Imagem quebrada, viewport1280×900 | +0,97px no marcador, com mudança de colunas/textos | 0,113333 | 0px | 0 |

CLS do caso quebrado móvel corresponde à mesma sessão de dois eventos consecutivos. São medidas da fixture e do carregamento/falha da capa, não CLS de toda a aplicação nem promessa de Lighthouse zero. Os textos/imagens da fixture são dados de teste, sem alteração de cadastros.

## Implementação final

- src/features/games/components/GameInfo.tsx: envolve GameCover em coverSlot somente quando há URL de capa na ficha pública.
- src/features/games/components/GameInfo.module.css: caixa2:3,160×240px no desktop e até140×210px em telas menores. Imagem e fallback ocupam a mesma caixa; object-fit:contain mostra a imagem inteira. A condição de grade agora verifica a existência da caixa, preservando as colunas quando a imagem falha.

GameCover e ManualGameEditor permanecem sem alterações. As regras globais de tamanho da prévia administrativa foram preservadas; a altura fixa e o alinhamento do fallback são restritos aos filhos de coverSlot na ficha pública. Sem URL, não há caixa vazia e o texto continua em uma coluna.

A imagem mantém a proporção natural dentro da caixa: capas horizontais/quadradas podem ter margem vertical, como contrapartida da reserva previsível. Não há recorte, distorção, ampliação por transform ou alteração dos arquivos/imagens cadastrados. O espaço2:3 é o formato da área de exibição, não uma declaração de que todos os arquivos têm essa proporção.

Lazy loading, decoding async, referrerPolicy, validação de URLs, descrição, links e tratamento de erro existentes permanecem. Sem preload, fetchPriority high, nova imagem, upload ou alteração do player. Não houve mudança de backend, API, catálogo ou autenticação.

## Validação da versão final

11 cenários controlados na fixture final:

- Retrato lento em320,375,390,400,430e1280px.
- Paisagem em390e1280px.
- Quadrado em390px.
- Falha404 em390e1280px.

Todos mantiveram o marcador seguinte na mesma posição antes/depois, sem layout shifts registrados e sem overflow horizontal. Fixtures não interceptaram imagens de terceiros: retrato usou arte WebP local existente; paisagem usou uma captura local; quadrado usou PNG mínimo de teste. Essas amostras testam proporções/layout, não a qualidade visual de um provedor remoto.

Caso sem capa: zero imagens/coverSlot, grade de uma coluna e nenhum overflow. As duas fichas reais também foram verificadas na build5175 em390×844:

- Tibia: capa IGDB528×704, caixa140×210, carregada, object-fit contain, sem overflow.
- Jogo manual yu-gi-oh: capa externa1200×800, caixa140×210, carregada e inteira, sem overflow.

Qualidade/fonte não foram alteradas; não há afirmação de validação física de DPR2/3 ou do Motorola. Reserva CSS não impede mudanças de layout causadas pela chegada dos dados da ficha, alteração de conteúdo, fontes ou outros componentes; o ganho isolado demonstrado é no carregamento/falha da capa.

9 testes relacionados existentes aprovados:

- tests/manual-game-presentation.test.mjs —3, incluindo ficha manual, navegação e estrutura do editor.
- tests/game-presentation.test.mjs —2, capas oficiais seguras e vocabulário.
- tests/short-sequence-components.test.mjs —4, navegação/players/fallbacks/cards preservados.

ESLint localizado, TypeScript/build com VITE_DATA_MODE=firestore-emulator e git diff --check aprovados. Aviso conhecido de portaHMR24678 dos testes SSR apareceu sem falha; não foi tratado fora do escopo. As medições foram repetidas após restringir a implementação à ficha pública; after.json contém a versão final. Fixtures removidas ao concluir.

## LCP e miniaturas: o que não está demonstrado

Captura contextual da home em5175, sem vídeo/interação e sem throttling, durante a etapa: viewport1280×720/DPR1, janela25s,15cards,0iframes eCLS0. Último candidato LCP foi o título Pequenos clipes. Grandes jogadas., em136ms brutos. Essa observação desktop/cache atual não representa comparação controlada antes/depois, perfil móvel Lighthouse nem Android físico.

Ela não justifica aumentar prioridade de todas as miniaturas. O LCP móvel original e a hipótese de miniatura lazy responsável por demora continuam exigindo conferência nas mesmas condições de medição. Qualidade/peso das imagens externas e requisições aos provedores não foram modificados sem evidência adicional. Nenhuma nova nota Lighthouse foi gerada; não afirmar que os7,2s originalmente informados foram resolvidos.

## Evidências e entrega

Pasta externa C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-9-h/:

- before.json e after.json: medições das três referências anteriores e onze casos finais.
- no-cover.json, real-game.json e manual-game.json: conferências sem imagem e das fichas reais.
- game-mobile.png e manual-mobile.png: capturas reais da build.
- home-measurement.json: cópia da captura contextual da home; original em audit-performance/h-home.json.
- Fontes anteriores e scripts de medição fora do repositório; after-initial.json é histórico da primeira alternativa, não resultado da implementação final.

Arquivos temporários __cover-audit.html e __cover-audit.tsx removidos; servidor temporário5178 encerrado; abas criadas fechadas e viewport restaurado. API5174, build5175 e emulador8080 preservados nos mesmos processos. Build5175 atualizada com o código final. Nenhuma escrita de jogos, shorts ou comentários, reset/seed ou acesso à produção.

Commits sugeridos, não executados:

1. fix: estabiliza layout das capas nas fichas dos jogos — GameInfo.tsx e GameInfo.module.css.
2. docs: registra validacao de capas e LCP — este relatório e docs/continuidade.md.

Próxima etapa conforme plano: 7.6.9-I — conferência final de desempenho e estabilidade antes da Etapa8. Comparar Lighthouse em condições equivalentes, revisar o conjunto de mudanças e testar no Motorola, registrando limitações e pendências. Não iniciada; aguarda autorização. Etapa8 não iniciada.

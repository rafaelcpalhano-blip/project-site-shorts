# Etapa 7.6.9-C — imagens do Clipper

Concluída localmente em23/10/2026. Proprietário autorizou seguir para a próxima etapa; esclarecido que5174 é desenvolvimento e5175 é a build do mesmo projeto, atualizada após compilação. Git iniciou limpo, após os commits da etapaB e documentos anteriores.

## Implementação

As três artes existentes foram redimensionadas de1024×1536 para512×768 com Lanczos3 e codificadas em WebP lossless. Não houve geração/reinterpretação da identidade do mascote, recorte, mudança de cores, fundo ou composição. Alpha preservado. A resolução atende até3× o maior tamanho CSS atual de150×225px; ampliações futuras deverão reavaliar a resolução.

Usado Sharp0.35.5/libwebp1.6.0 já fornecido no runtime do ambiente; nenhuma instalação ou dependência de projeto adicionada. Conversão feita fora do fluxo da aplicação, sem serviço de imagem remoto. PNGs originais preservados no Git e em cópia externa; retirados de public por não haver mais referência, evitando ativos mortos. Não duplicar o conjunto antigo dentro da build.

| Arquivo | PNG anterior | WebP atual | Redução |
| --- | ---: | ---: | ---: |
| welcome | 1.698.946B | 198.180B | 88,34% |
| load-failure | 1.486.681B | 180.746B | 87,84% |
| image-unavailable | 1.770.794B | 230.978B | 86,96% |
| Total dos três arquivos | 4.956.421B | 609.904B | 87,69% |

A economia total é do conjunto de arquivos, não promessa de redução igual em toda navegação: nem todos são solicitados em todas as páginas, e URLs repetidas podem ser reutilizadas pelo navegador. Não há nova nota Lighthouse ou comparação de LCP simulado nesta etapa.

Atualizadas as URLs nas boas-vindas, rodapé, login administrativo, estado de falha/404 e fallback dos cards. Atributos intrínsecos agora512×768, conservando proporção2:3 e dimensões de exibição CSS. Tamanhos explícitos e reserva de layout da etapaB mantidos. Nenhuma alteração em lazy loading, prioridade, política de cache, API, auth, dados ou players.

## Fidelidade e validação

- As imagens WebP foram decodificadas e comparadas com o mesmo original redimensionado: **zero diferenças nos canais visíveis e no alpha**. RGB de pixels totalmente transparentes foi normalizado pelo codificador; a comparação binária de todos os bytes RGBA não é idêntica por esse motivo, sem alteração visível. Não alegar igualdade pixel a pixel com o original de maior resolução.
- Todas mantêm alpha e512×768. As artes originais e capturas do site foram inspecionadas visualmente.
- HTTPS5175 respondeu200 e Content-Type image/webp nos três arquivos, com os tamanhos da tabela.
- Home real:15 cards, fallback carregado, natural512×768. Desktop card199,6×112,3px e Clipper rodapé112×168px. Em390×844, card341×191,8px e rodapé88×132px; object-fit contém a arte, sem distorção/overflow horizontal.
- Página não encontrada móvel: imagem de falha carregada150×225px, natural512×768, rodapé88×132px; composição e retorno ao início preservados.
- Boas-vindas e login verificados nos testes SSR existentes: imagem WebP, textos e comportamento estrutural preservados, sem nova autenticação/publicação para testar imagens.
- **8 testes relacionados aprovados**: clipper-welcome, clipper-communication e short-sequence-components. Asserções de URL atualizadas, sem enfraquecer verificações de texto, acessibilidade ou fallback.
- ESLint localizado, TypeScript/build com VITE_DATA_MODE=firestore-emulator e git diff --check aprovados. Busca em src/tests não encontrou referência aos PNGs retirados.
- Avisos conhecidos do HMR de testes e chunk>500kB persistem, sem falha. Não tratados fora do escopo.

Não foi repetido Lighthouse completo nem o conjunto de testes de backend, pois não houve mudança de lógica/persistência. Não houve teste físico no Motorola ou confirmação visual em telas DPR2/3 reais; resolução suficiente para3× foi conferida pelos tamanhos, não por uma sessão física em cada densidade. Navegadores antigos sem WebP ficam fora da cobertura observada, feita no Chromium atual. Se surgir necessidade de suporte legado, avaliar fallback separadamente.

## Arquivos

Ativos: retirados public/clipper/welcome.png, load-failure.png e image-unavailable.png; adicionadas as três versões .webp no mesmo diretório.

Referências:

- src/components/clipper/ClipperWelcome.tsx
- src/components/clipper/ClipperFailure.tsx
- src/components/layout/SiteFooter.tsx
- src/features/admin/pages/AdminPage.tsx
- src/features/shorts/services/card-artwork.ts

Testes: tests/clipper-communication.test.mjs e tests/short-sequence-components.test.mjs.

Documentação: docs/etapa-7-6-9-c.md e entrada em docs/continuidade.md.

Evidências e originais externos: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-9-c/, com conversion.json, summary.json, ui.json, home-desktop.png, footer-mobile.png e failure-mobile.png. O nome footer-mobile é histórico de captura; a conferência visível do rodapé e da imagem de falha está em failure-mobile.png.

## Entrega

5174 mostra o desenvolvimento alterado;5175 serve a nova build compilada. Não são projetos diferentes. Nenhum restart de API/emulador, alteração de credenciais, acesso a dados de produção, infraestrutura, instalação ou deploy. Validação das credenciais rotacionadas continua separada, sem assumir que novos valores foram confirmados.

Commits sugeridos, não executados:

1. perf: reduz peso das imagens do Clipper — ativos,5 referências e2 testes acima.
2. docs: registra otimizacao das imagens do Clipper — este relatório e continuidade.

Próxima proposta:7.6.9-D, tratamento/recuperação de falhas móveis, aguardando nova autorização. Não iniciada automaticamente.

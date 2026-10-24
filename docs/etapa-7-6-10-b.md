# 7.6.10-B — Variantes locais do Clipper

Concluída em24/10/2026 sob autorização. Escopo: welcome.webp e image-unavailable.webp; originais preservados. Sem otimização de miniaturas externas, players, API, autenticação ou infraestrutura.

## Alteração

Quatro variantes WebP:160x240 e320x480 para cada imagem. Redimensionamento Lanczos a partir do RGBA original; compressão WebP lossless/method6/exactTrue com Pillow já disponível no runtime. Nenhuma biblioteca instalada. Os bytes RGBA decodificados de cada variante são exatamente iguais à referência redimensionada; alpha contém transparência e opacidade completas. Não foi usada regeneração de arte.

srcset com candidatos160w/320w/original512w; src original permanece fallback. sizes usa100/130px nas boas-vindas,112/128px no rodapé,104px no login e144px conservadores para o conteúdo do mascote no card. Seleção de imagem é do navegador e pode variar por DPR/cache; telas densas ainda podem escolher o original. Originais512x768, CSS, caixas, proporção, textos e quadros tickle1–3 não foram alterados. Cards só recebem esse srcset quando artwork.kind é clipper; miniaturas oficiais e capas não recebem variantes do mascote.

## Bytes

| Imagem | Original | Variante160 | Redução | Variante320 | Redução |
|---|---:|---:|---:|---:|---:|
| welcome |198.180B|30.224B|84,75%|91.122B|54,02%|
| image-unavailable |230.978B|34.182B|85,20%|104.666B|54,69%|

Quando ambas são carregadas uma vez:429.158B originais versus64.406B nas variantes160, ou195.788B nas320. Não multiplicar essa economia pelo número de cards que compartilham a mesma URL. Todas as variantes superaram o alvo de50% mantendo qualidade. Total de arquivos em public cresce porque originais de reversão/alta densidade foram mantidos; o benefício é transferência da variante escolhida.

Metadados de srcset aumentam ligeiramente JavaScript/HTML; entry passou de346.861B para aproximadamente347,25KB, acréscimo inferior a0,4KB de arquivo, justificado pela redução de imagens. Isso não é otimização de JS da etapaD nem promessa de melhoria de LCP. Nenhum Lighthouse foi repetido nesta etapa.

## Testes e evidências

Novo tests/clipper-image-variants.test.mjs protege: hashes dos originais, existência de cada candidato, dimensões/proporção/alpha, orçamento de bytes, referências responsivas dos três contextos de welcome, geometria intrínseca512x768, ausência de frames antecipados e restrição do srcset ao fallback, preservando metadados/cards sem iframe. O grupoB e os gruposC/E passaram a incluir esse arquivo.

node scripts/test-performance.mjs B:27testes em7arquivos, todos aprovados. Lint de6arquivos de implementação/utilitário, build firestore-emulator e diff aprovados. Houve um aviso não fatal de portaWebSocket24678 já em uso durante fixturesSSR; nenhum teste falhou, nenhum servidor existente foi interrompido e os fixtures concluíram. Não houve alteração de HMR da aplicação para contornar esse aviso.

Conferência da build real5175 em320/375/390/400/430/1280px: ambas selecionaram variantes160 no navegadorDPR1; zeroiframes e sem overflow global. Rodapé112x168 móvel/128x192desktop preservados. Teste de décimo clique: quatro balões aguardando renovação, original com opacity1, risadaopacity0 e três frames ainda montados; após espera os quatro balões voltaram. Sem alteração da interação.

Fixture isolada com ShortCard real: normal e404 de todas as imagens fallback mantiveram a caixa de arte em200,25px; na falha o img foi removido e legenda Miniatura indisponível permaneceu, sem overflow. Isso preserva o comportamento anterior de falha, sem loop/retry novo. Boas-vindas no fixture selecionaram160 e mantiveram130x195; botão Vamos explorar continuou funcionando. Não houve autenticação nem escrita de conteúdo nesse ensaio. Arquivos temporários retirados/5178encerrada.

Qualidade visual: folha comparativa original/variantes renderizadas em130x195 para1x e260x390 para2x, conferida em fundo escuro. Diferença RGB média de0,395 a0,602 em escala255. Comparação de2x é rasterização determinística, não emulação real de dispositivoDPR2; controle do navegador expõe dimensões, não override deDPR. Seleção nativa observada no navegador foiDPR1. Inspeção física em tela densa permanece possível no checklist do proprietário, sem alegar garantia universal de aparência.

Evidências foraGit: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-10-b/ contém assets.json, quality.json, comparacao-1x-2x.png, responsive.json, failure.json, interaction-after-reset.json e clipper-mobile.png. Screenshot corresponde à build real, após retorno à pose original.

## Arquivos e continuidade

Código/assets: quatro novas variantes, src/components/clipper/image-sources.ts, ClipperCommunity.tsx, ClipperWelcome.tsx, src/features/admin/pages/AdminPage.tsx e src/features/shorts/components/ShortCard.tsx. Testes: tests/clipper-image-variants.test.mjs e scripts/test-performance.mjs. Alteração em AdminPage é exclusivamente imagem responsiva decorativa; Google/TOTP/UID e autorização não foram modificados.

API5174/PID19512, build5175/PID24152 e Firestore8080/PID7860 preservados, sem reset/restauração/deploy/produção/commit. Builddist atualizada e5175 já serve as variantes; não foi necessário reiniciar backend. Override de viewport removido e abas temporárias fechadas. Próxima7.6.10-C (miniaturas externas/prioridade), aguarda autorização. Timeout permanece hipótese documentada daA; Etapa8suspensa.
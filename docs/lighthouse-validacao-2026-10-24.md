# Lighthouse da build local — 24/10/2026

Relatórios enviados pelo proprietário, sem executar novas auditorias ou otimizações. Proprietário confirmou janela anônima nos dois testes, um após o outro, com boas-vindas do Clipper já fechadas. Capturas finais mostram feed carregado. HTML copiado para preservação, não executado.

## Resultados

| Métrica | Desktop 19:38:47 | Mobile 19:40:37 |
|---|---:|---:|
| Performance | 86 | 65 |
| Acessibilidade | 100 | 100 |
| Boas práticas | 96 | 96 |
| SEO | 100 | 100 |
| FCP | 0,97s | 4,81s |
| LCP | 2,36s | 6,87s |
| CLS | 0 | 0 |
| TBT | 0ms | 11ms |
| Speed Index | 0,97s | 4,81s |
| Transferência | 2.402KiB | 1.879KiB |

Lighthouse13.4.1/Chromium155; URL https://127.0.0.1:5175/ sem parâmetros. Desktop formFactor desktop/RTT40ms/10.240Kbps/CPU1x; mobile formFactor mobile/RTT150ms/1.638,4Kbps/CPU4x. screenEmulation.disabled=true nos dois JSONs, portanto não interpretar os números width/height do bloco como viewport imposto pelo Lighthouse. Capturas/layouts confirmam desktop em múltiplas colunas e mobile com uma coluna; o retângulo do card mobile tem378px numa área de412px. Sem vídeo aberto nas capturas recebidas.

## Conclusões e limites

- CLS0 nas duas medições confirma estabilidade de layout nessas navegações. Não garante ausência de deslocamentos em todas as interações/telas.
- Mobile ainda demora para exibir conteúdo. TBT11ms indica pouco bloqueio da thread principal nesta execução; não priorizar refatoração genérica de CPU sem evidência.
- Ambos têm avisos de IndexedDB e de tempo limite, embora o proprietário confirme anonimato. Não concluir que testou na janela errada; os resultados podem estar incompletos.
- Há requisição Firestore Listen/channel com HTTP200 e finished:false nos dois relatórios. Conexão prolongada pode contribuir para a espera de rede/timeout, mas a causalidade não foi provada por estes arquivos; não tratá-la como consulta duplicada/listener vazando nem desativá-la sem investigar.
- Insights de LCP usam tempos observados, enquanto a tabela acima usa valores simulados do Lighthouse. Não misturar essas escalas. No mobile, o nó LCP informado é o h1 “Pequenos clipes. Grandes jogadas.”; no desktop é uma miniatura YouTube lazy. Logo, não atribuir todo o LCP mobile às imagens.
- Servidor temporário serve dist sem compressão HTTP e usa Cache-Control:no-cache. Esses resultados não representam uma hospedagem final já configurada com compressão/cache. A eventual melhora de hospedagem não elimina os excessos reais de imagens/JS.

## Gargalos e prioridades recomendadas, sem implementação autorizada

1. Imagens locais e miniaturas, benefício alto/complexidade baixa a média/risco visual moderado. image-unavailable.webp tem230.978B e welcome.webp198.180B, exibidas muito menores; YouTube maxresdefault1280x720 atende cards de200x112 desktop ou378x213 mobile. Lighthouse estima redução de imagens de1.392KiB desktop/847KiB mobile, não promessa de ganho real ou soma garantida. Examinar ShortCard.tsx, miniaturas e assets public/clipper. Validar resolução em DPR alto, proporções, qualidade, fallbacks e eventos de erro antes de qualquer troca.
2. JavaScript inicial e dependência do SDK Firebase, benefício potencial alto no mobile/complexidade média a alta/risco funcional alto. public-repository462KB e index347KB transferidos sem compressão dominam scripts; auditoria aponta aproximadamente504KiB de JS não usado na navegação. Isso é cobertura da execução, não prova de código morto removível. Mapear importações e trabalho necessário para o primeiro conteúdo em public-repository.ts/client.ts/entrada React; preservar catálogo, comentários, publicação e administração. Não migrar SDK/leitura/infraestrutura sem plano e aprovação.
3. Descoberta/prioridade da imagem LCP desktop, benefício potencial médio/complexidade média/risco de aumentar tráfego. Miniatura LCP usa loading=lazy. Considerar prioridade somente para imagens realmente iniciais, após verificar seleção/viewport; não transformar todas em eager. Validar desktop/mobile, filtros e paginação.
4. Timeout/Firestore e avisos de ambiente, diagnóstico prioritário/ganho ainda não quantificado. Inspecionar o canal prolongado, encerramento e quietude sem repetir Lighthouse inteiro. Boas práticas96 está associado a issue de Cookie nas requisições HTTP do emulador8080; classificar como dependência do ambiente local até validação na integração final.
5. Cache/compressão: item da preparação aprovada da hospedagem, sem mudar infraestrutura agora. Separar recursos próprios dos terceiros; não prometer controlar cache de YouTube/Twitch. CSS bloqueante estimado150ms mobile é secundário perante FCP4,8s.

O relatório também lista30 ocorrências de label-content-name-mismatch apesar da nota de acessibilidade100. Registrar para inspeção dos rótulos antes de concluir conformidade plena; não alterar sem conferir elementos/ações reais.

## Comparação com referência anterior

Referência5175 de23/10: Performance46/FCP5,21s/LCP6,67s/CLS0,3725/TBT4ms/3.403.159B. Agora mobile65/FCP4,81s/LCP6,87s/CLS0/TBT11ms/1.924.527B. Há melhora observada da nota, estabilidade e bytes; LCP mobile não melhorou. Conteúdo/feed, versão da aplicação e execução diferem, e ambos têm timeout; comparação indicativa, não experimento controlado ou causalidade comprovada por uma correção específica. Não comparar desktop86 com mobile46 antigo como ganho equivalente.

## Evidências e próximos passos

Originais HTML/JSON preservados com SHA256 em C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/lighthouse-20261024/manifest.json, além de achados e capturas extraídas. Não contém novo teste de Lighthouse. Revisão anterior de7.6.9-I permanece histórica; os novos relatórios atendem ao envio de evidência mobile/desktop, mas timeout e condições limitam o fechamento definitivo da medição.

Próxima decisão do proprietário: aprovar plano localizado de imagens/JS e diagnóstico de timeout, ou manter como pendências documentadas. Antes de implementar, definir escopo e validações de regressão específicas. Depois das mudanças aprovadas, fazer uma comparação controlada, sem repetir auditorias só para obter nota maior. Etapa8 continua suspensa; nenhuma alteração de aplicação/produção/infraestrutura/deploy nesta análise.
# Etapa 7.6.8-C — avaliação de capas manuais

Avaliação em 23/10/2026; alternativa ainda aguarda aprovação antes de implementação. Git iniciou limpo. Não houve alteração funcional, dependências, serviços, faturamento, Firebase remoto ou deploy.

## Estado existente

ManualGameEditor já possui imageUrl. manualGameCoverUrl permite /images/games/arquivo.png|jpg|jpeg|webp, com nome simples, e capas IGDB normalizadas por gameCoverUrl. Endereços arbitrários, scripts, data URLs, traversal e SVG não são aceitos. Edição manual exige a autorização/revisão/motivo/confirmação existentes; jogos oficiais não são editáveis por essa rota. GameInfo oculta a capa com erro, enquanto miniaturas possuem a cadeia de fallback existente. Upload não existe; arquivo estático precisa ser incluído previamente no projeto.

## Comparação

1. Arquivos estáticos do próprio site: opção preferencial para o baixo volume atual. Controle sobre arquivo, endereço e disponibilidade; sem serviço de armazenamento separado. No desenvolvimento arquivo fica em public/images/games; no futuro acompanha os assets da publicação. Adição/substituição de arquivo exige publicação de assets em produção; editar só a URL no Firestore não envia a imagem. Há custo operacional de revisão e versionamento no repositório. Não é upload instantâneo pelo painel.

2. URL HTTPS externa: economiza espaço local e permite trocar link sem publicação de assets. Porém nenhum endereço externo garante permanência. URL compartilhada do Drive não equivale necessariamente a bytes de imagem: pode abrir HTML, exigir permissões ou redirecionar. HTTPS/extensão não garantem formato/tamanho. Só seria recomendável aceitar URL direta de hospedagem sob controle do projeto ou domínios explicitamente avaliados/permitidos. Não foi informado domínio adicional controlado pelo proprietário. Sem concessão genérica a qualquer host ou proxy para contornar restrições.

3. Upload administrativo: tecnicamente viável, e o volume estimado é pequeno. Exige armazenamento persistente, autorização de escrita, validação efetiva/reprocessamento de imagens e ciclo de substituição/exclusão. Salvar em disco somente no runner local não resolve produção em Cloudflare. Firebase Storage exige plano Blaze/faturamento. R2 tem franquia, mas exige assinatura/checkout e permite cobrança de excedentes. Não atende à preferência atual por não habilitar faturamento. Nenhuma dessas opções foi ativada.

## Espaço e tráfego estimados

Com capas otimizadas de 200 kB (estimativa decimal): 100 capas ~20 MB; 1.000 ~200 MB. Dez mil carregamentos sem cache dessas capas somam ~2 GB de tráfego; cache reduz transferências repetidas, sem garantia universal. Espaço ocupado não é o principal impedimento para uploads neste volume.

Firestore mantém somente imageUrl e metadados/histórico já existentes. Nenhum arquivo em base64 ou leitura de documento adicional por carregar a imagem. Leitura de imagem é tráfego da hospedagem, separado de leituras Firestore. Arquivos estáticos não entram no bundle JS, mas aumentam tamanho do conjunto de assets e histórico do repositório.

## Segurança e ciclo de vida propostos (não implementados)

Para fluxo estático: PNG/JPEG/WebP raster, meta de 100–300 kB, limite inicial proposto de 500 KiB e dimensões máximas de 2048 px por lado. Verificar bytes e dimensões, não só extensão; rejeitar formatos ativos e arquivos inválidos, otimizar antes de incluir. Manter arquivos somente sob caminho aprovado. Nome versionado por atualização, preservando o anterior enquanto houver referência útil, com limpeza revisada posteriormente; nunca apagar automaticamente só por substituir a URL.

Para URLs externas: allowlist explícita, HTTPS sem credenciais/portas arbitrárias, caminho restrito, rejeição de endereços locais/privados e redirecionamentos fora da política. Se houver consulta do servidor, limite de bytes/tempo, validação DNS/IP e de cada destino, MIME mais assinatura/dimensões; extensão ou HEAD não bastam. Busca arbitrária no backend abre superfície SSRF. Exibição direta no navegador evita SSRF do servidor, mas não comprova formato/tamanho e depende de disponibilidade/hotlink da origem; manter no-referrer e fallback. Sem download/proxy automático nesta avaliação.

Se upload for autorizado futuramente: somente administrador com MFA, confirmação/motivo e auditoria, validação/reprocessamento no servidor, limites por arquivo/operação, nomes não executáveis e não controlados livremente, remoção de metadados quando possível. Gravação do arquivo e mudança do documento precisam tratar falhas sem perder capa anterior. Limpeza de órfãos/versões deve ser deliberada, com retenção e backup definidos. Serviço/biblioteca/limites dependem de autorização própria.

## Fontes oficiais consultadas

- Firebase Storage: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024 — plano Blaze/conta de faturamento, requisito vigente desde fevereiro de 2026.
- R2: https://developers.cloudflare.com/r2/get-started/ — assinatura com checkout; https://developers.cloudflare.com/r2/pricing/ — Standard inclui 10 GB-mês, 1 milhão operações A e 10 milhões B/mês, egress gratuito, excedentes cobrados. Franquia não é teto de gasto nem dispensa faturamento.
- Assets Cloudflare Workers: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ — requisições diretas de assets gratuitas/ilimitadas e sem custo extra de armazenamento; chamadas de Worker têm regras próprias. Escolha da hospedagem final continua para Etapa 8.
- Cloudflare Pages: https://developers.cloudflare.com/pages/platform/limits/ — plano Free até 20.000 arquivos/site, 25 MiB por arquivo e 500 builds/mês. Esses limites são do site inteiro, não exclusivos das capas.
- Compartilhamento Drive: https://support.google.com/drive/answer/2494822 — acesso depende de configuração de compartilhamento. Não oferece, nessa referência, garantia de hospedagem permanente de imagens para este uso.

## Recomendação única e decisão pendente

Manter capas próprias como arquivos estáticos do Clipzone nesta fase, com inclusão/otimização revisada e caminho no campo já existente. É a menor mudança arquitetural e não requer faturamento, novas coleções ou serviços. Após aprovação, refinar instrução/prévia/fallback e a validação local dos assets dentro do escopo acordado. Não liberar Drive/URLs arbitrárias nem implementar upload administrativo agora.

Não foram executados testes ou build: análise/documentação somente. git diff --check deve ser conferido na entrega. Não considerar C implementada ou avançar D sem autorização.

## Decisão posterior do proprietário — URLs externas

Em 23/10/2026, o proprietário decidiu: “seguiremos com o uso de URL externa ou Drive”. Essa escolha substitui a recomendação inicial de arquivos estáticos. Não é necessário pedir novamente aprovação da alternativa. Upload, Storage e R2 continuam fora do escopo.

Implementação ainda não iniciada: foi solicitado um exemplo de URL pública, acessível sem login e sem tokens, para confirmar o formato de imagem direta, origem e comportamento de redirecionamentos. A definição do host/caminho permitido depende desse exemplo; não liberar todo host HTTPS ou toda a rede googleusercontent.com indiscriminadamente. Preservar capas IGDB e caminhos estáticos existentes por compatibilidade.

Arquivos diretamente afetados após definição: validador manual-game-details, ManualGameEditor, validação do endpoint administrativo se houver verificação remota, GameInfo/fallback e testes de edição/apresentação. Sem novo armazenamento ou arquivo em base64. Manter motivo, MFA, revisão e auditoria existentes. Evitar proxy de imagem e consultas por visita; eventual verificação remota deve acontecer na edição, com limites e proteção SSRF, sem fazer fetch de destinos arbitrários só para uma prévia.

Drive: webViewLink abre o visualizador, não é imagem direta. webContentLink é link de download para arquivos binários, não garantia de incorporação permanente. thumbnailLink é temporário (ordem de horas) e a documentação não o destina ao uso direto em aplicações web. Não armazenar thumbnailLink como capa permanente, nem inventar conversão não documentada de URL. Fontes adicionais: https://developers.google.com/workspace/drive/api/reference/rest/v3/files e https://developers.google.com/workspace/drive/api/guides/manage-downloads . Avaliar o link concreto antes de prometer suporte ao Drive; qualquer necessidade de API/credencial/serviço adicional deve ser explicitada antes de integrar.

Somente registro da escolha e análise do fluxo; sem mudança funcional ou teste desnecessário nesta atualização. Próximo passo: receber e validar a URL de exemplo e implementar a alternativa escolhida dentro das restrições acordadas.

## Implementação posterior

O proprietário forneceu um link direto mlstatic e autorizou domínios públicos variados. A implementação de URLs externas foi concluída, conforme [resultado da 7.6.8-C](etapa-7-6-8-c.md). Os trechos anteriores registram a análise e decisões históricas, não uma pendência atual de aprovação. Sem upload ou novo serviço.

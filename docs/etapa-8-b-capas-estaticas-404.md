# Etapa 8-B — imagens estáticas ausentes sem fallback SPA

25/10/2026. Base limpa `ad0ec29`. Autorização: prosseguir com a adaptação mínima proposta na revisão de capas. Implementação local e optativa; não publicada nem ativada nos servidores5174/5175.

## Mudança

Novo `server/runtime/static-game-cover.ts`, usado pela entrada `server/runtime/worker-entry.ts` exclusivamente em `/images/games/`. O adaptador aceita o mesmo formato restrito de nome/extensão dos caminhos estáticos do formulário. Métodos permitidos: GET e HEAD; outros retornam405 com Allow. Caminhos inválidos retornam404 antes de consultar assets.

Respostas200/206 devem ter MIME correspondente à extensão: PNG, JPEG ou WebP. HTML de fallback, redirects e outras respostas inesperadas são cancelados e substituídos por404 vazio com `no-store`; o adaptador não segue redirects. Respostas de imagem válidas mantêm corpo, cache, tamanho, ETag e metadados de range; acrescenta `nosniff`. HEAD não transmite corpo.304 é preservado em pedido condicional. Não há análise de bytes/decode nesse adaptador: são assets preparados pelo responsável pelo projeto, não upload ou URL arbitrária.

As demais rotas continuam com o comportamento de assets/SPA existente e a API mantém sua fronteira. Não foram alterados formulário, inspetor de capas remotas, fontes autorizadas, banco, vídeos ou players. Não foi criada capa nem pasta de imagens de negócio. Arquivo ausente continua precisando ser incluído pelo responsável em publicação futura.

## Composição e implantação futura

No laboratório, o roteamento reserva `/images/games/*` para execução do Worker antes do fallback SPA. O caminho também foi integrado à fábrica `createWorkerEntry`. A composição de publicação futura precisa carregar esse módulo **e** reservar o namespace na configuração de assets; importar apenas o módulo sem roteamento não basta. Nenhum arquivo de configuração de produção foi criado ou alterado.

Essa reserva faz os pedidos de capas locais passarem pelo Worker; custo de invocações/cache deve entrar na revisão de publicação, sem prometer gratuidade. Não extrapolar o resultado para rotas de outros assets. Se o binding lançar uma exceção, a fronteira geral da entrada mantém erro genérico503; respostas inesperadas retornadas pelo binding nesta rota viram404, sem repassar HTML ou detalhes internos.

## Evidências

- 35 testes Node relacionados aprovados, sem falhas/skips: novo adaptador, entrada Workers e regressões existentes de edição manual/inspeção remota.
- 7 verificações de contrato/edição mantidas no workerd.
- 5 verificações reais de assets: PNG com bytes/tipo corretos; imagem ausente404 vazio; HEAD sem corpo; ETag304; página com fallback SPA preservado.
- TypeScript estrito e ESLint aprovados nos módulos/probe afetados.
- Build e diff-check registrados na conclusão desta rodada.

Resumo sanitizado: [evidência JSON](evidencias/etapa-8-b-capas-estaticas-404.json). O relatório anterior permanece como evidência histórica do200HTML observado antes do ajuste; seu JSON não foi sobrescrito. Wrangler4.152.0/workerd1.20261019.1 existentes no laboratório externo, sem instalação nova, login, serviço remoto ou conteúdo real.

## Limites e próxima parte

Este ajuste resolve o impedimento de roteamento estático reproduzido localmente. Não resolve nem desativa a inspeção de HTTPS de outros hosts, cujo transporte permanece incompatível. A edição de caminhos IGDB/estáticos permanece testada; não representa disponibilidade real de cada arquivo ou imagem externa.

8-B permanece aberta por fontes externas e confiança do ingresso. Próxima parte: definir os hosts/caminhos externos considerados autorizados para que uma adaptação mínima possa ser revisada, preservando a opção estática; não introduzir upload, R2, Firebase Storage, outro armazenamento, Node hospedado ou fetch irrestrito. Publicação desta parte continua pendente conforme decisão do proprietário. OAuth/IAM8-C e recursos remotos não foram iniciados. Não é necessário repetir Lighthouse ou testes de celular para um adaptador ainda não ativo no site em uso.

# Etapa 9-A — nomes acessíveis e robots.txt

28/10/2026. Preparação local autorizada; nenhum deploy realizado. Referência publicada: `ffec1d98-360b-43ea-bcb4-f3dbc29da2eb`. [Evidência](evidencias/etapa-9-a-acessibilidade-robots.json).

## Correção dos previews

Os relatórios recebidos identificaram dez falhas de label-content-name-mismatch, apesar de Acessibilidade 100. O teste anterior apenas procurava partes do texto no aria-label e não reproduzia a obtenção do nome pelo navegador.

O preview deixa de substituir o nome nativo por aria-label. Plataforma, legenda de fallback quando presente e jogo formam o início do nome a partir do conteúdo real. Um trecho somente para leitores de tela acrescenta “Abrir vídeo” e o título, preservando identificação entre vídeos do mesmo jogo. Imagens do preview passam a ser decorativas (alt vazio), pois o jogo e a indisponibilidade já têm texto; evita inserir descrição duplicada entre as palavras visíveis. Nenhuma imagem, URL, callback, posição de controles ou regra do player foi alterada.

Nove casos com componente React e CSS reais foram examinados na árvore de acessibilidade do Chrome headless, em perfil temporário isolado: YouTube/Twitch/TikTok, cada um com thumbnail, capa ou fallback. Nomes obtidos começam pelo texto visível e incluem a ação/título; imagens decorativas e recorte visual do trecho adicional conferidos. CSP bloqueou os recursos externos da fixture. Isso é prova do nome nativo calculado no Chrome, não execução do axe/Lighthouse nem teste de clique/hidratação. A auditoria específica deve ser conferida depois do deploy autorizado.

## Robots na homologação

Adicionado public/robots.txt com User-agent: * e Disallow: /. Cabeçalho específico define text/plain; charset=utf-8 e cache com revalidação. O arquivo existente impede o fallback SPA nessa rota. Não foi liberado rastreamento para buscar SEO 100. Robots é uma orientação voluntária de crawlers, não controle de acesso ou garantia de remoção de resultados; autenticação administrativa continua independente. Revisar a política explicitamente antes do lançamento público.

Seis contratos do servidor local Workers Assets/Wrangler passaram: home, /admin, bundle com hash, imagem fixa, robots e rota API em fixture. Robots devolve os bytes do arquivo e MIME/cache corretos, preservando cabeçalhos de segurança, fallback /admin e política independente da API. Nenhuma chamada a serviço real ou credencial foi necessária.

## Validação e pacote

A execução geral paralela teve 888 sucessos e um timeout do CLI Firebase em 15 segundos, durante carga concorrente no computador. Cinco testes do toolchain passaram isolados. Sem alterar prazo/asserções ou dependências, uma execução integral em série passou em 889 testes. Tipos, build, lint, verificador local de segredos, diff e dry-run aprovados. Firestore não foi repetido: servidor, banco, regras e fluxos de dados não mudaram.

Pacote API-mode congelado com 44 arquivos (antes 43). Mudanças fixas restritas a _headers e novo robots.txt; bundles com hash/HTML reconstruídos. Demais assets fixos preservados. O bundle da API é byte a byte o mesmo do deploy atual: `e9c81ab6a913414c7a263dce7ceab2bbd03a39130d65e850f21e8b688324ea87`. Mesmas nove referências privadas, arquivo de segredos não aberto, ranking/jobs desligados, sem cron/piloto/retenção. Não há mudança de TikTok, tradução, autenticação, quota ou plano.

Próximo passo: autorização específica para esse pacote em homologação; conferir versão ativa/configuração antes e hashes/rotas depois. Retestar nomes, navegação e painel e executar auditoria Lighthouse relevante após publicação, registrando que a política de rastreamento permanece bloqueada. Não é autorização de lançamento público.


## Deploy específico autorizado e verificado

Publicado em 28/10/2026 às 21h42 de Brasília: `7ec6774e-b1f8-4da5-bf3b-ce1c41d16bf4`, ativo em 100%. Referência de rollback: `ffec1d98-360b-43ea-bcb4-f3dbc29da2eb`. Pacote de 44 arquivos, com 43 arquivos públicos conferidos por hash; `_headers` é configuração. Bundle da API idêntico, nove valores de segredos existentes preservados e arquivo privado inalterado após uso autorizado no deploy. Robots respondeu texto/plain UTF-8, cache revalidado e Disallow: /, sem fallback HTML. Três ordenações retornaram 200 com treze vídeos cada; sessão exigida 401 e relevant recusado 400. Cabeçalhos e shell /admin aprovados. Ranking/jobs/diagnósticos desligados, tradução preservada e cron vazio. Nenhum conteúdo primário alterado; consultas de conferência usam estado operacional normal de sessão/limites. Nenhum teste de provedor, tradução, alteração de plano ou lançamento público.

Aguardam confirmação: sessão administrativa/navegação no PC e celular e auditoria Lighthouse específica dos nomes dos botões e robots da versão publicada. Não declarar a regra axe/Lighthouse aprovada apenas pela prova local do nome nativo.


### Reteste humano pós-deploy confirmado

O proprietário respondeu “Tudo funcionou” ao pedido de atualização no PC/celular, abrir/fechar vídeo, conferir layout e acesso administrativo na sessão habitual. Navegação/layout/painel pós-deploy confirmados; modo standalone não foi individualizado. Não houve solicitação de novo login, publicação ou consulta de provedor pelo agente. Aguardam os relatórios Lighthouse da versão 7ec6774e-b1f8-4da5-bf3b-ce1c41d16bf4 para verificar a auditoria específica dos nomes acessíveis e robots.


## Auditoria recebida: correções confirmadas

Lighthouse de 28/10 às21h56 aprovou label-content-name-mismatch e robots.txt nos dois perfis, sem falhas dessas regras. Performance desktop99/mobile94; Acessibilidade100/BoasPráticas100. SEO66 decorre do bloqueio de rastreamento autorizado. Ambos têm aviso de IndexedDB: não são baseline limpa de performance. Ver relatório etapa-9-a-lighthouse-fechamento.md. Não pedir nova rodada idêntica nem alterar robots para perseguir nota100.

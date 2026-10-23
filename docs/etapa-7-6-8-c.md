# Etapa 7.6.8-C — capas externas de jogos manuais

Concluída localmente em 23/10/2026 após escolha explícita de URLs externas/Drive e esclarecimento de que links diretos públicos podem vir de diversos sites. Recomendação inicial de arquivos estáticos foi substituída, preservando compatibilidade com esses arquivos e IGDB.

## Funcionamento

O campo existente aceita HTTPS com hostname público válido, sem lista restrita de provedores. URLs com IP literal, credenciais, portas diferentes da padrão, fragmentos, controles, hosts locais/reservados e extensões de conteúdo ativo são recusadas. Query strings de provedores de imagens podem ser mantidas; devem ser usados links públicos, não credenciais ou links privados.

Ao salvar uma capa HTTPS não IGDB, a edição autorizada faz uma preleitura do jogo/revisão antes de qualquer conexão externa. Depois verifica DNS e imagem fora da transação de escrita; a transação final repete todas as verificações de identidade/estado/revisão/reservas. Falha da inspeção não altera os metadados nem cria auditoria parcial. Fonte IGDB permanece não editável; suas capas preservam validação e normalização anteriores.

O endereço final aprovado após redirecionamentos é guardado em imageUrl, com motivo, confirmação e histórico antes/depois existentes. Sem coleção, índice ou upload novo. Os bytes são lidos temporariamente em memória para validação, nunca armazenados no Firestore, disco ou serviço de imagens. Não há proxy/download do backend por visita; o navegador carrega a URL externa, sujeito ao cache e à disponibilidade da origem.

## Limites e segurança

- PNG, JPEG ou WebP; máximo 500 KiB e 2048 pixels por lado.
- MIME e assinatura/cabeçalhos/dimensões compatíveis, tamanho declarado e recebido, resposta completa; HTML/SVG/login e conteúdo comprimido por HTTP são recusados.
- No máximo três redirecionamentos, todos HTTPS e revalidados; prazo total de 15 segundos para DNS/transferência.
- Resolução rejeita IPs privados, loopback, link-local, multicast e faixas especiais/documentação/transição. Respostas DNS mistas com endereço não público também são recusadas.
- IP aprovado fixado no lookup da conexão HTTPS, com SNI e certificado verificado; sem resolver novamente no transporte, agente/proxy global, cookies ou cabeçalhos de autenticação. Isso evita rebinding no acesso do servidor.
- Não se trata de decodificação/reprocessamento completo de arquivo. O navegador ainda pode recusar uma imagem corrompida; fallback cobre erros de renderização. Um host pode mudar DNS/conteúdo, excluir a imagem ou passar a exigir login depois da inspeção; URL externa não garante permanência. Redirecionamentos futuros do navegador também não são controlados pelo backend.
- A implementação de transporte usa Node HTTPS/DNS no runner local. O adaptador equivalente com garantias de rede precisa ser validado na Etapa 8 para o runtime Cloudflare escolhido; não substituir por fetch irrestrito ou desativar verificações para fazer funcionar.

## Administração e apresentação

ManualGameEditor explica link direto e limites. A prévia mostra a capa já salva, sem carregar automaticamente cada URL digitada antes da verificação. Durante edição, a capa salva anterior continua identificada como tal. GameCover reutilizável mostra imagem sem referrer e com carregamento adiado; falha mostra Capa indisponível. A ficha usa os metadados atualizados nas próximas consultas. Identidade, vídeos vinculados, cotas e moderação não foram alterados.

Drive é aceito somente quando o endereço efetivamente entrega uma imagem pública validável, sem cookies/login. Links de visualizador/compartilhamento que retornam HTML são recusados; não há conversão automática para endpoints não documentados, API/credencial nova ou promessa de suporte a qualquer link Drive. thumbnailLink temporário não é adotado como capa permanente. Ver fontes da avaliação em etapa-7-6-8-c-avaliacao.md.

## Exemplo real fornecido

https://http2.mlstatic.com/D_NQ_NP_827505-MLB104802198232_012026-O.webp

Validado uma vez pelo transporte real: HTTP 200, image/webp, 36.366 bytes, 322 × 500 px. Não foi cadastrado em jogo do emulador de desenvolvimento. A imagem foi mostrada em fixture com salvamento simulado, não atribuída a um cadastro real.

## Testes e conferências

26 testes locais distintos aprovados: remote-game-cover (11), manual-game-edit (5), manual-game-presentation (3), admin-auth (7). Cobrem URLs, IPs/DNS, pinagem TLS, redirecionamentos, bytes/MIME/dimensões, corpo excessivo/truncado, timeout DNS, falha sem escrita, concorrência durante inspeção, auditoria, autenticação e capas IGDB intactas. Um fixture novo esperava undefined para capa inicial, mas o cadastro usa null; corrigida apenas essa expectativa.

Dois testes reais REST no Firestore isolado demo-clipzone-tests:8081 aprovados: falha sem gravação, sucesso com URL final/auditoria e SDK bloqueado; edição concorrente entre pré-verificação e escrita final sem sobrescrita. Tráfego de imagens nesses testes simulado; emulador de desenvolvimento 8080 não foi limpo.

ESLint localizado, TypeScript/build e git diff --check aprovados. Aviso conhecido de chunk principal: 509,04 kB minificado /156,89 kB gzip. Sem suíte completa.

UI com editor e ficha reais, dados/salvamento simulados, imagem pública real: sucesso, capa salva exibida, erro mantendo dados/URL digitada e capa anterior, Cancelar, fallback e 390px sem overflow. Fixtures removidas, abas temporárias encerradas, viewport restaurado; capturas fora do Git. Smoke local da edição com sessão anônima e sem bearer retornou 401. API reiniciada para carregar validação; dados locais e segredos preservados, nova verificação administrativa pode ser necessária.

## Impacto e próximo passo

Para uma edição com capa externa: uma leitura transacional de pré-verificação adicional, até quatro transferências HTTP limitadas (redirecionamentos), mais a transação/auditoria já existentes. Não há nova consulta Firestore por imagem em visita pública. Falha de rede gera erro ao salvar e preserva dados; não há retry automático.

Sem biblioteca, serviço pago, Storage, R2, Firebase remoto ou deploy. Próxima 7.6.8-D — Clipper e comunicação, somente após autorização.

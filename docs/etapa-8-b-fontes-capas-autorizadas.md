# Etapa 8-B — fontes de capas autorizadas

25/10/2026. Decisão expressa do proprietário: somente caminhos estáticos seguros em `/images/games/` e imagens HTTPS de `images.igdb.com`, no formato esperado. Outros domínios ficam pendentes de decisão futura. Sem upload, proxy, novo armazenamento, integração ou infraestrutura. Esta decisão resolve o escopo das capas para a preparação Workers; não autoriza publicação.

## Política aplicada

`manualGameCoverUrl` agora aceita somente o caminho local restrito existente ou o resultado de `gameCoverUrl`. Retirada apenas a aceitação de outros hosts nesse validador compartilhado. A política se aplica à validação de novas edições, projeção pública dos dados, ficha do jogo e escolha de imagem/fallback dos cards. Não é uma configuração exclusiva de teste.

Caminhos locais: `/images/games/` seguido de nome de1–100 caracteres alfanuméricos, hífen ou sublinhado, começando alfanumérico, e extensão PNG/JPG/JPEG/WebP minúscula. Não aceita subpastas, travessia, espaços/controles, URLs absolutas, barras invertidas, parâmetros ou fragmentos. A origem é relativa ao site; o arquivo precisa ser incluído na publicação. Não foram criados arquivos de capa.

IGDB: HTTPS, hostname exato `images.igdb.com`, sem credenciais, porta não padrão, query, fragmento, controles ou barras invertidas, com caminho `/igdb/image/upload/t_<tamanho>/<identificador>.<jpg|png|webp>`. Mantida normalização para `t_cover_big_2x`. Não aceita subdomínio alternativo, hostname com sufixo falso ou extensão ativa. Não há busca no backend, proxy, verificação de disponibilidade em tempo real ou seguimento de redirects pelo servidor para essa fonte: o navegador carrega a URL aprovada, como antes.

O texto do formulário administrativo foi atualizado para explicar exatamente essas duas opções; removida a orientação anterior de colar qualquer link HTTPS público. Mantidos os demais campos, motivo, confirmação, edição versionada e identidade dos jogos.

## Preservação dos dados e fallbacks

Não houve migração, exclusão ou gravação em registros do emulador8080 ou em banco remoto. Um registro antigo com URL de outro domínio permanece armazenado; as projeções usam ausência de capa, e os componentes mantêm o fallback existente. Tentativa de nova edição com fonte não autorizada é recusada antes de inspeção remota e sem auditoria parcial. Uma edição futura que escolha outra capa ou a remova continua sendo uma ação explícita do administrador, com confirmação e auditoria.

Miniaturas de YouTube/Twitch/TikTok não usam essa autorização de capas de jogos e não foram alteradas. A prioridade miniatura oficial → capa autorizada → Clipper continua testada, incluindo expiração, cache de falha e substituição de capa. Players, navegação e conteúdo de vídeos não mudaram.

O código de inspeção externa e seus testes de transporte/DNS/limites permanecem no repositório como suporte não habilitado pela política atual. Não foi substituído por fetch irrestrito nem flexibilizado. As provas antigas de sucesso de edição em outros domínios foram atualizadas para a recusa agora exigida; testes diretos das proteções do inspetor foram mantidos. O cenário antigo de concorrência durante inspeção não pertence mais ao caminho aceito; a recusa de versões obsoletas e a auditoria continuam cobertas por edição manual e integração REST.

## Compatibilidade Workers e evidências

O caminho estático e o IGDB reconhecido não entram no inspetor de HTTPS pinado. Assim, o impedimento anterior desse transporte fica fora do escopo de capas autorizado, sem alegar compatibilidade para domínios não autorizados. A rota local de imagens ausentes continua404; GET/HEAD, ETag304 e fallback SPA de páginas permanecem preservados. A futura configuração de publicação precisa reservar `/images/games/*` antes dos assets, conforme relatório do ajuste404.

- 35 testes Node relacionados aprovados: política de fontes, cards/fallbacks, edição, apresentação do formulário, proteções antigas de rede e roteamento estático.
- 7 checks de contrato/edição no workerd e5 de assets aprovados.
- 1 integração REST no emulador8081/demo-clipzone-tests aprovada: fonte não autorizada não grava; fonte local salva com ID/criação/auditoria preservados; gravação direta por SDK continua negada; revisão obsoleta recusada. Mensagens PERMISSION_DENIED são esperadas nas tentativas negativas.
- Build, TypeScript estrito do probe, ESLint e diff-check aprovados na conclusão da rodada.

Evidência Workers sanitizada: [JSON](evidencias/etapa-8-b-fontes-capas-autorizadas.json). Fixtures somente locais. Não houve chamada real à IGDB, nova leitura Lighthouse ou teste manual desnecessário. Nenhum processo5174/5175/8080 foi reiniciado. A build foi gerada, mas o servidor5175 não foi verificado ou reconfigurado para servi-la; não presumir atualização em um processo já em execução. Para API5174 iniciada anteriormente, atualização do código do servidor poderá exigir reinício manual posterior; não solicitado nesta validação.

## Estado e próxima parte

Escopo de capas definido e compatível localmente com as duas opções autorizadas. Publicação de outros domínios continua pendente; não bloqueia a prova local dessas opções.8-B ainda precisa consolidar a composição/confiança do ingresso antes de avançar para a preparação8-C. Credenciais/IAM reais, banco remoto vazio, política de ingresso no edge e CPU publicada seguem seus controles posteriores; nenhum dado real ou recurso foi criado. Não reabrir escolha de upload/R2/Storage ou runtime Node sem nova instrução do proprietário.

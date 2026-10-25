# Refinamentos 7.6.11 — análise de impacto antes das fases persistentes C/D/E

Escopo autorizado no prompt de24/10/2026: interface, cadastro/pesquisa, avaliação de IDs, tratamento/monitoramento de players e caixa administrativa. Sem deploy, infraestrutura, migração de dados reais ou alteração de autorização. A/B são independentes de migração. Esta análise precede qualquer novo contador/alias/registro persistente ou automação de moderação; não representa execução de migração.

## Identificadores atuais e estratégia proposta (fase C)

- Jogos manuais: manual- +SHA256 do nome normalizado; usados em games, shorts.gameId, gameNameKeys, solicitações antigas e moderationLogs.contentId. IGDB: igdb-ID oficial. Alterar chaves exigiria reescrever referências/reservas, invalidaria links/cursors e exigiria migração expressamente aprovada. Não fazer isso.
- Comentários: SHA256 de visitante anônimo +requestId; receipts/deduplicação, histórico e ações administrativas usam esse ID. publicationNumber controla Comentário #1/#2 por short e deve permanecer independente. Trocar ID quebraria idempotência e relacionamentos.
- Recomendação: aliases alternativos permanentes publicId, com mapa privado alias→tipo/ID interno. Nunca usar o alias como prova de autorização, nem truncar hashes ou atribuir números só no navegador. IDs internos e campos relacionais permanecem iguais.
- mn0000–mn9999:10.000combinações se incluir0000. Um contador backend transacional e uma reserva de alias na mesma transação garantem unicidade; criação concorrente precisa repetir com controle de conflito. Reservas nunca são apagadas/reutilizadas, inclusive após exclusão lógica. Contador ausente/corrompido não pode sobrescrever mapa existente. Capacidade pequena para crescimento de longo prazo.
- co000000000–co999999999:1.000.000.000combinações. Extensão sugerida, sujeita a definição antes de persistir: coA00000000..coZ99999999, depois duas letras+sete dígitos, etc, em faixas disjuntas. Não reutiliza nomes numéricos anteriores; evita aleatoriedade/colisão, mas introduz formato alfanumérico que precisa estar centralizado em validação. Não substituir publicationNumber.
- Contador global de comentários adicionaria contenção e leituras/escritas a toda criação. Comparar contador transacional simples versus reserva de blocos no backend (lacunas possíveis, complexidade maior) antes de ativar em volume. Preservar recibos e cotas em todos os retornos idempotentes; nenhuma nova atribuição em retry.
- Novos registros poderiam receber alias sem migrar anteriores; anteriores continuariam com ID existente até eventual backfill autorizado. Para mostrar aliases em todos os registros atuais, será necessário um backfill real específico; não executado. Denúncias e logs não mudarão de IDs automaticamente.
- Esgotamento mn precisa de regra de produto: expandir formato, manter cadastro pelo ID interno sem novo alias ou bloquear novos jogos manuais. Não bloquear o cadastro ou inventar quinto dígito por inferência. Nenhum contador/alias foi ativado enquanto essa decisão não estiver definida.

## Monitoramento (fase D) e confiança dos sinais

A API atual possui cookie anônimo HMAC/HttpOnly/Secure/SameSiteStrict de30dias, limites de tentativas/rede, transações e revisão otimista por reviewVersion. Identidade de navegador não prova pessoa única: limpar cookies/trocar navegador pode gerar outra. Preservar controles existentes e não coletar IP bruto ou dados pessoais na ocorrência.

YouTube disponibiliza onError;100 é indisponibilidade que não distingue removido de privado,101/150 incorporação,153 identificação/configuração,2 parâmetro,5 player/HTML5; autoplay é evento distinto. TikTok fornece sinais específicos via postMessage com origem/source validados;3002 não deve contar como falha de conteúdo. Twitch Clips não oferece a mesmaAPIYouTube; não inventar eventos internos. Timeout/onError de iframe/rede são sinais contextuais, não prova de conteúdo removido. Botão explícito manual registra indicação não verificada.

Proposta de dados: recibo por visitante+short+ciclo, resumo por short/ciclo com contadores separados e datas, código limitado à enumeração, sem textos arbitrários/identidade pública. Toda operação valida sessão/origem/abuso no backend; evento do navegador é alegação não confiável. Retry e reabertura no mesmo período não criam nova ocorrência. Janela temporal não foi especificada pelo proprietário: decidir antes da regra persistente. Sugestão7dias, alternativas24h/30dias. O limite15 isolado não autoriza ocultação por qualquer erro.

Para ocultar automaticamente: além de15identidades elegíveis recentes, exigir confirmação negativa atual pelo verificador de fonte confiável no servidor; falha de rede/credenciais ou verificação desconhecida não é confirmação negativa. Os indícios de cliente não podem autorizar ocultação sozinhos. Onde o provedor não dá evidência confiável, somente revisão. Reutilizar o estado pending/administrativeBlock/reviewVersion e as ações de aprovação já existentes, preservando shorts, comentários, reservas e cotas, em vez de criar moderação paralela. Após restauração/aprovação, novo ciclo deve ignorar todas as ocorrências antigas e exigir novas identidades elegíveis; não reocultar pelo contador histórico. Ativação só após testes de dedup/concorrência/abuso e política temporal definida.

Arte necessária: versão manutenção com ferramentas não foi localizada entre os assets atuais. Implementação pode prever slot para esse asset, usando fallback da identidade Clipper já existente; não gerar mascote diferente ou afirmar investigação individual antes de recibo confirmado.

## Caixa administrativa (fase E)

Há moderationLogs para publicação e decisões, mas denúncias atualmente são registradas em reports/reportSummaries sem novo evento de caixa. Reutilizar o histórico existente com classificação server-only para novos eventos, sem apagar ou converter registros históricos. Novas notificações não podem ser criadas arbitrariamente pelo visitante. Preferir eventos publicados/denunciados/limiar de reprodução gravados na transação que confirma a operação. Idempotência impede duplicatas. Não criar notificação para cada retry.

Leitura: cronológica paginada20+1, filtros por categoria, detalhe e vínculo com módulo atual. Reaproveitar middleware administrativo/Google/TOTP/UID em cada endpoint; sem novas permissões. Sem polling/listener global de coleção. Marca de leitura deve ser privada por administrador e evento, independente do log original, com referência à versão do evento se ele puder mudar. Estimar até21leituras por página de eventos e até20marcas de leitura, além de dados de detalhe necessários; gravação de leitura não apaga evento. Índices/configuração de persistência a preparar e testar isoladamente, sem aplicar infraestrutura/produção nesta tarefa. Histórico anterior sem novos marcadores não deve ser varrido integralmente ou migrado automaticamente.

## Pontos que precedem implementação persistente

1. Regra ao esgotar mn de4dígitos: não há escolha explícita no prompt.
2. Janela das15ocorrências recentes: não definida. Sem ela não ativar contador/ocultação com uma política arbitrária.
3. Definir aliases somente para novos registros versus eventual backfill separado; nenhuma migração real autorizada.
4. Validação isolada de novos índices/recibos/read-state e restauração, com testes que não toquem8080existente. Autorização administrativa permanece a mesma.

A/B podem ser concluídas enquanto essas decisões são esclarecidas. C é avaliação de estratégia/capacidade/risco; nenhuma migração real. D/E não devem ser declaradas implementadas por existir esta análise.

## Decisões recebidas e implementação compatível — 25/10/2026

O proprietário definiu explicitamente expansão numérica de mn após quatro dígitos e janela de 30 dias. As dúvidas acima registram o momento anterior à resposta; estão resolvidas por essas escolhas. Implementados aliases somente para novos jogos/comentários, sem backfill nem alteração de IDs internos. Comentários usam as faixas disjuntas propostas; capacidade total 8822318478336 aliases, mantidas nove posições após co. Jogos crescem até o limite inteiro seguro do backend; overflow falha fechado, nunca reinicia sequência. A numeração histórica por short permanece independente.

Monitoramento usa ciclos fixos de até 30 dias, iniciados na primeira ocorrência do ciclo; não uma janela móvel com varredura de recibos. Qualquer revisão que incremente reviewVersion inicia novo ciclo na próxima ocorrência. As contagens são conservadoras: podem descartar ocorrências ainda recentes na virada de ciclo e não promovem um recibo manual já contado para um segundo voto de maior confiança. Isso reduz automação, sem criar ocultações por relatos antigos.

A ocultação exige 15 sinais elegíveis de maior confiança no ciclo e confirmação negativa atual no servidor. No verificador YouTube existente, resposta vazia, privado e problemas de credenciais/rede retornam unknown; portanto esses casos ficam para revisão. A confirmação operacional disponível é embeddable=false com vídeo identificado. A função também aceita existence=missing apenas quando um verificador confiável fornecer esse veredito. TikTok/Twitch e sinalização manual não ocultam automaticamente nesta composição. Não afirmar que todo vídeo removido será detectado automaticamente.

Índices foram apenas acrescentados ao arquivo versionado, sem aplicação na nuvem. Regras não foram alteradas. Teste real utilizou somente demo-clipzone-tests:8081, descartável e separado de demo-clipzone:8080. Não houve migração ou publicação de conteúdo na base de uso.

## Autorização posterior específica — jogos manuais locais

Em25/10/2026 o proprietário autorizou atribuir códigos aos jogos manuais já cadastrados no emulador local. Atribuição aplicada com snapshot prévio, preservando IDs internos e referências, conforme aliases-jogos-manuais-locais.md. Essa atualização substitui a pendência de backfill apenas para esses jogos locais; não autoriza migração de produção ou comentários antigos.

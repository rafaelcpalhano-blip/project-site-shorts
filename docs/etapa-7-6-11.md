# Etapa 7.6.11 — refinamentos, aliases e monitoramento

Implementação autorizada no prompt “CLIPZONE — REFINAMENTOS VISUAIS, IDENTIFICADORES, PESQUISA E MONITORAMENTO ADMINISTRATIVO”. Retomada e concluída em 25/10/2026. Sem deploy, migração real, nova dependência, alteração de credenciais/permissões ou aplicação de infraestrutura. Análise prévia: [impacto](refinamentos-7-6-11-impacto.md). Comandos por fase: [commits](commits-7-6-11.md).

## Complemento autorizado posteriormente

Os jogos manuais antigos da base local também receberam aliases após autorização específica do proprietário:13atribuições,1aliasexistente preservado,14/14manuais identificados. IDs internos e36vínculos de shorts preservados. Ver [resultado e snapshot](aliases-jogos-manuais-locais.md). As limitações de backfill descritas na entrega original continuam aplicáveis a produção e comentários antigos.

## Entrega por fase

| Fase | Funcionalidade e correção | Arquivos principais | Evidência / impacto |
|---|---|---|---|
| A — interface | 47 frases exatas centralizadas, quatro balões/sorteio/interações preservados; título antes do canal; setas de 52px e área de toque >=44px; remoção de Atualizar comentários; frase administrativa em duas linhas desktop; rodapé centralizado; sucesso verde de 5s com cancelamento | messages, FirestoreShortDialog, ShortSequenceDialog CSS, SiteFooter CSS, AdminPage CSS, HomePage e publication-notice | Banco validado inclusive por hash do texto autorizado; temporizadores/ciclos testados. Desktop real: frase 46,09px/23,04px de linha; setas 52×60,25px. Sem polling de comentários. Remoção do fluxo anterior consolidada no arquivo compartilhado AdminSections da fase E; registros/endpoints históricos preservados. |
| B — pesquisa/cadastro | Confirmação e botão manual adjacentes, cautela avermelhada, diálogo explícito, cancelamento mantém pesquisa, bloqueio de duplo envio; busca local normalizada/parcial/reordenada/aproximada; paginação IGDB explícita | game-options, GameCombobox, OfficialGamePicker, catalog-api, igdb, game-search | Fixture: duas consultas para 16 resultados; nenhuma inclusão antes de confirmar; duplo clique resultou numa chamada; cancelamento manteve Portal. Dez resultados + um de lookahead por página. Sem chamada por tecla. |
| C — aliases | publicId alternativo para novos jogos manuais/comentários, reservas e contadores transacionais; histórico aceita alias; interfaces usam alias quando existente | public-identifiers, manual-game, submit-comment, review-comment, admin-catalog, history, rest-store e DTOs/linhas administrativas | mn0000→mn10000; co000000000→coA00000000→coAA0000000 em faixas disjuntas. IDs internos, IGDB, referências e Comentário #n preservados. Teste REST concorrente e replay passaram. Nenhum backfill. |
| D — reprodução | Clipper de falha, retry, fonte preservada, recibo confirmado antes de “sinalizado”; classificação limitada, deduplicação e abuso; 15 elegíveis/30 dias para revisão, ocultação conservadora com prova atual do servidor | OfficialPlayer, PlayerFailure, playback-failure-api, record-failure, playback-failure HTTP, limites, roteador e update-event | Retry/reabertura simulados geraram só um POST de falha. Rede/autoplay não ocultam. Casos com 15 identidades, concorrência, prova desconhecida/negativa, verificação atrasada e restauração testados. Uma única instância e zero iframes ao fechar. |
| E — Atualizações | Categorias, detalhes, origem, situação atual, acesso à revisão existente, paginação, indicação de novos e marca individual por versão; eventos somente em operações confirmadas do servidor | updates backend/API/UI, AdminSections, ModerationPanel, submit-short, report-short, review-short, history-labels e índices locais | 20+1 eventos por página; ordenação por data+ID; sem polling/listener global. UID/TOTP/origem continuam obrigatórios. Leitura não apaga evento. Versão nova volta a aparecer mesmo após leitura anterior. Abertura da mesma revisão pode ser repetida sem reaproveitar detalhe antigo. |
| F — validação | Testes direcionados, Firestore descartável separado, evidências visuais e continuidade | testes relacionados, refinements-7-6-11.test.mjs, documentação | Rodada integrada 145/145; verificações pontuais adicionais aprovadas; Firestore isolado 3/3; build/lint/diff-check aprovados. |

## Validações executadas

- Rodada integrada: 145 testes, sem falhas, cobrindo novas regras e regressões de jogos, comentários, publicação, relatórios, segurança, áudio e navegação. Não foi executado npm test global nem repetido Lighthouse.
- Complemento administrativo: 35 testes passaram e uma expectativa antiga falhou por procurar “Entrar com Google”. HEAD já utilizava “Login Administrativo” antes deste trabalho; a asserção foi corrigida sem mudar o login. Arquivo administrativo completo e novas atualizações: 12/12 na verificação final. Outro subconjunto de player/frases/atualizações: 17/17.
- Emulador REST real somente demo-clipzone-tests:8081: 3/3; aliases concorrentes únicos; replay não consome sequência; números de comentário 1/2/3; limiar/dedup/ocultação/caixa integrados; leitura/escrita direta em coleções privadas negada. Emulador descartável encerrado. As mensagens PERMISSION_DENIED nesse teste são o resultado esperado.
- Vite SSR em testes concorrentes emitiu um aviso de porta WebSocket 24678 ocupada; asserções passaram. Nenhum serviço de uso foi parado por isso.
- Navegador: fixture isolado com respostas fictícias e callbacks simulados, sem criar jogos/shorts na base de uso. Validou confirmação/cancelamento, duplo clique, retry, recibos e filtros/leitura.
- Larguras reais do viewport conferidas: 320,375,390,400,430,1280. Twitch: iframe 400×300 nos cinco viewports móveis e 926×520 no fixture desktop; sem escala, controles mantidos e overflow só interno. Estado de falha sem iframe e sem overflow horizontal de página; retry em 320 recuperou 400×300.
- Build integrada 5175: feed com dados existentes, quatro balões e zero iframes; visualizador mostrou título antes do canal, navegação e comentários; Próximo abriu Twitch real, e Fechar deixou zero iframes. O YouTube vSWPz8owUTM continuou apresentando erro de plataforma já conhecido, agora com interface de falha, sem alegação de recebimento quando a API anterior ainda não tinha o endpoint.
- API reiniciada pelo proprietário ao final. GET em /api/playback/failure e /api/admin/updates passou a retornar 405 (rotas presentes, POST obrigatório); antes retornava 404. Não foram criadas ocorrências artificiais na base 8080 para testar os endpoints.
- Evidências locais: pasta C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/refinements-7-6-11, com JSONs de picker, frase, viewer, falhas, tamanhos e caixa, além de capturas de tela. Fixtures temporários retirados do repositório. Autenticação administrativa real não foi automatizada.

## Consultas, gravações e desempenho

- A: banco local sem Firestore; sucesso apenas temporizador; comentários consultados ao abrir/trocar/publicar e atualizados após ações existentes, sem polling novo.
- B: filtro aproximado local; cada clique Pesquisar/Carregar mais faz sessão+GET e uma consulta IGDB de até 11 itens; limites existentes mantidos. Não há busca oficial aproximada exaustiva nem consultas por caractere: a tolerância local aplica-se ao catálogo carregado e à ordenação dos candidatos já devolvidos pela IGDB.
- C: nova criação tem duas leituras extras (contador/reserva) e duas escritas extras. Replays/seleção de registro existente não atribuem alias novo. Contador global de comentários adiciona contenção em volume; falha fechada e retries transacionais preservam unicidade. Medir antes de uma futura estratégia de blocos; não implementada.
- D: uma sessão + um POST por short/tipo em memória, cache limitado a 128 entradas; backend mantém dedup mesmo após reload/evicção. Em ocorrência nova: short+jogo+resumo+recibo (4 leituras), recibo+resumo (2 escritas); no limiar, mais um evento. Rate limiting adiciona sua transação própria por visitante e, se configurado, por rede. Verificação externa somente após limiar forte, no máximo uma tentativa por 10min por ciclo, em resposta a nova ocorrência; não existe job/polling. Prova negativa adiciona transação final de short/resumo/log. Retry duplicado não grava ocorrência novamente, embora consuma orçamento técnico de tentativa.
- E: até 21 leituras de eventos +20 de marcas +20 de shorts +20 de resumos de reprodução/denúncias = até81 documentos por página (61 em página só de publicações), além do controle técnico administrativo. Marcar leitura: até2 leituras/1 escrita, nenhuma exclusão. Publicação usa o log já gravado; nova denúncia acrescenta um log; limiar de reprodução coalesce num evento. Detalhes na página não fazem consulta extra; abrir moderação usa endpoint existente.
- Mantidos carregamentos separados/lazy de player/admin. Build final: player ~11,9KB JS bruto/~4,73KB gzip; seção administrativa ~51,3KB bruto/~14,8KB gzip. Não tratar isso como nova medição Lighthouse.

## Limites e riscos conhecidos

- Identidade anônima representa navegador, não pessoa verificada; cookies apagados e dispositivos diferentes podem criar novas identidades. Limites assinados/de rede continuam aplicados; somente relatos não autorizam ocultação.
- Janela implementada em ciclos fixos de até30dias, não varredura móvel. Nova reviewVersion reinicia o ciclo. O evento antigo conserva seu snapshot de encaminhamento/bloqueio; os contadores/datas correntes vêm do resumo somente quando o ciclo corresponde ao evento. Uma atividade mais recente não é atribuída ao ciclo histórico anterior.
- YouTube100 não distingue privado/removido. O verificador existente devolve unknown para respostas vazias e falhas de chave/rede; nesses casos há somente revisão. A ocultação operacional exige confirmação explícita de impossibilidade de incorporação na API confiável. TikTok/Twitch/manual: revisão sem auto-ocultação nesta composição. Não inventados eventos Twitch.
- Os sinais de cliente, inclusive códigos oficiais, são alegações não confiáveis no backend; os contadores fortes não bastam sem prova atual da fonte. Elegível manual já contado não vira um segundo voto ao receber sinal posterior.
- Arte de manutenção com ferramentas ainda necessária. Usada a identidade Clipper de falha já existente, com slot preparado em PlayerFailure.tsx para a futura arte aprovada; nenhum personagem substituto foi criado.
- Registros antigos não recebem alias ou notificações retroativas. Migração/backfill continua dependendo de autorização específica. Read-state e recibos privados não possuem exclusão automática nesta etapa; retenção/TTL de produção requer desenho próprio e autorização de infraestrutura.
- Índices apenas versionados; não aplicados na nuvem. A validação de índices e ambiente de hospedagem continua pertencendo à integração futura. Não houve nova liberação administrativa.
- Testes reduzem o risco; não garantem ausência absoluta de regressões nem reprodução de todos os vídeos externos.

## Conferência manual restante

- [ ] No celular real, conferir pesquisa com teclado, cancelar e confirmar inclusão manual apenas se desejar criar dado de teste.
- [ ] Conferir a disposição final de título/canal, setas, fonte, comentário e erro/retry nas três plataformas.
- [ ] Com administrador autorizado, abrir Atualizações → Atualizar, conferir categorias, leitura e abertura da revisão. Não haverá importação automática de eventos antigos.
- [ ] Após uma publicação real desejada de teste, conferir sucesso verde por5s e evento novo; os testes isolados já validaram temporização e evento sem consumir a cota da base de uso.
- [ ] Revisar a estética na5174 quando o proprietário estiver disponível; pendência visual anterior mantida.

Próximo passo: revisão manual e commits por fase. Etapa8 não iniciada. Nenhuma decisão estrutural adicional é necessária para este código; nova arte, migração histórica, retenção e infraestrutura ficam explicitamente separadas.

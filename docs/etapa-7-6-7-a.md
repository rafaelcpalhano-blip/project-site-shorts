# Etapa 7.6.7-A — metadados, formulário e reprodução

Concluída localmente em 22/10/2026. Autorização individual do bloco A; B–F e produção não iniciados. Sem instalação, serviço, faturamento ou alteração no Firebase real.

## TikTok

Reaproveitada a mesma consulta oEmbed e a validação existente de provedor/URL/identidade. Prioridade: title utilizável; description textual opcional, caso venha no mesmo JSON oficial. O suporte a description é defensivo: não afirmar que esse campo é garantido pelo contrato do oEmbed. A legenda documentada pelo TikTok aparece em title; description=1 no player apenas controla sua exibição, sem fornecer uma API extra de metadados ao backend. Não foi adicionado um endpoint nem OAuth, scraping, leitura de HTML ou extração de texto do iframe. caption é apenas inspecionado no diagnóstico, não tratado como um novo campo documentado de título.

Preservados emojis, hashtags, acentos e NFC, normalização de quebras/tabulações, limite de 500 sem truncamento; candidatos acima de 4096 não são processados. Texto inutilizável/ausente não invalida identidade confirmada nem a exceção de duração do TikTok. Edição manual preservada. YouTube e Twitch não tiveram adaptadores de metadados alterados.

Duas consultas reais em 22/10/2026: @oluckk/video/7653251223201647892 e @jogatinadovini/video/7695508739616492821. Ambas retornaram HTTP 200, identidade confirmada e iframe em html, mas sem title, description, caption ou thumbnail_url. Não inferir que a legenda visível no player está disponível no JSON. Não foi executado HTML recebido. Ferramenta check-tiktok-metadata.mjs informa presença/tamanho desses campos, nunca seu conteúdo, scripts ou URLs assinadas.

## Áudio e canal

Não havia configuração explícita de mudo no código anterior. Agora TikTok solicita muted=0 e volume_control=1; Twitch Clips muted=false. YouTube mantém parâmetros documentados existentes e nenhum mute forçado. Um player por visualizador; feed continua sem iframe/áudio. Não foram introduzidos postMessages para forçar volume, cliques artificiais ou reprodução passiva. Ajuda expansível Sem som? orienta o uso de volume/Play nativos.

Conferência real separada: YouTube sikb7c45XGs mostrou controle Desativar som (estado com som habilitado); Twitch BoldSoftStorkSMOrc-wv9DKZcBIoM-uojc ainda mostrou Clique para restaurar o som/Tirar do mudo; TikTok 7653251223201647892 mostrou Unmute/volume zero mesmo com muted=0. A origem exata do mudo nos iframes não foi comprovada; navegador/plataforma podem exigir interação. Não afirmar que áudio foi ouvido nem prometer áudio inicial universal. Controles oficiais mantidos. Ao fechar cada visualizador, zero iframes; somente um durante cada abertura. Não houve curtida, comentário ou publicação real nesses testes.

Nome do canal aparece na linha das curtidas: texto à esquerda, botão/contador à direita, com quebra em telas pequenas. Ausência vira Não informado, sem nome inventado. Texto é escapado pelo React; nenhuma consulta adicional por vídeo.

## Cursor após Curtir

Proprietário informou que acontecia no Chrome e não no navegador do Codex. Conferiu a opção Navegar pelas páginas com um cursor de texto, encontrou-a ativa e confirmou que desativá-la removeu o cursor piscando. Causa identificada na configuração do navegador; nenhuma alteração em LikeButton, caret-color, contenteditable ou outline. Foco acessível preservado.

## Formulário e confirmação

- URL: mantém debounce de 600ms e cancelamento da prévia anterior. Colar uma URL ou pressionar Enter indica intenção de avançar ao título após resposta bem-sucedida. Se o visitante sair do campo ou continuar editando a URL, a resposta não rouba foco. Erro de prévia não avança; Enter permite nova tentativa explícita. TikTok confirmado sem título avança ao campo vazio para edição manual.
- Título: Enter vai ao select de jogo; metadados não sobrescrevem texto editado, inclusive durante resposta tardia.
- Jogo: select HTML nativo preserva setas/typeahead/Tab. Setas não deslocam foco; Enter confirma seleção e avança ao canal. Escolha por mouse/toque avança após change. O caminho abreviado não foca o disclosure, mas ele permanece no percurso normal de Tab e disponível por clique/toque. Cadastro manual existente preservado.
- Canal/Compartilhar: abre confirmação visual na mesma Modal, sem dialog aninhado. Texto Tem certeza de que deseja compartilhar este short?, botões Cancelar e Confirmar publicação. O formulário original fica oculto, mantendo os valores. Foco inicial no Cancelar; Escape/fechar retornam ao formulário e ao controle de origem.
- Validação nativa e validateSubmissionInput antes da confirmação e validação final antes do cliente existente. Só Confirmar publicação chama o serviço. Ref de bloqueio síncrono e controles desabilitados durante a chamada impedem reenvio; não há retry automático. Falha reabre os campos preservados; sucesso usa onSubmitted já existente.
- Enter com modificadores e composição IME não é interceptado pelo fluxo abreviado. Não há handler global interceptando textareas. As regras do servidor de jogo, cota, duplicatas, segurança e moderação permanecem as mesmas.

Para testar sem gravar conteúdo, o componente admite serviços de prévia/listagem/envio injetáveis, com defaults para os mesmos clientes/repositório de antes. A página de conferência temporária usou respostas simuladas e foi removida. Isso não concede permissões nem contorna o backend real: a publicação real continua sendo validada no servidor.

## Validação

36 testes relacionados aprovados: player (9), TikTok (10), apresentação/formulário (2), cliente de publicação (4), HTTP de publicação (5), prévia (6). Incluem limites/duplicatas, origem/sessão/campos privilegiados, ausência/erro de título, descrição alternativa, preservação de Unicode e prioridade do título, URL/identidade/volume e texto escapado. Build, lint localizado e diff aprovados. Não repetidos testes Firestore de concorrência/cota inalterados, nem suíte completa.

No componente real com serviços simulados, conferidos: URL por Enter e por colagem; título manual → jogo → canal; seleção por setas sem salto, Enter confirmando; cancelamento por botão e Escape; campos e foco preservados; erro de metadados sem avanço; título ausente com preenchimento manual; resposta tardia sem sobrescrever edição/roubar foco; jogo obrigatório bloqueando confirmação; controles desabilitados durante envio; uma chamada simulada por confirmação; falha preservando dados; sucesso removendo o diálogo e restaurando foco. Confirmação em 390px sem overflow. Não foi feita publicação real para repetir essas provas.

Capturas fora do Git no workspace da conversa: etapa-7-6-7-a-confirmacao.png, etapa-7-6-7-a-confirmacao-mobile.png e etapa-7-6-7-a-canal-audio.png. Páginas __check-7-6-7-a.html/tsx removidas e abas temporárias fechadas. API local reiniciada uma vez para carregar o adaptador atualizado, com emulador/segredos persistentes preservados. Nenhum novo índice, coleção, migração ou armazenamento adicional.

## Referências verificadas

- [TikTok oEmbed](https://developers.tiktok.com/docs/en/embed-videos)
- [TikTok Player](https://developers.tiktok.com/docs/en/embed-player)
- [Twitch Clips](https://dev.twitch.tv/docs/embed/video-and-clips/)
- [YouTube parâmetros](https://developers.google.com/youtube/player_parameters)
- [Chrome: navegação por cursor de texto](https://support.google.com/accessibility/answer/10129654?hl=pt-BR)

Próximo: 7.6.7-B — investigação da moderação e simplificação da exclusão em lote, aguardando autorização individual. Sem iniciar Etapa 8.

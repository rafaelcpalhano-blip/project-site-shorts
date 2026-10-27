# Etapa 9-A — retorno humano, Lighthouse e correções locais

27/10/2026. Relatórios recebidos da versão publicada a0d58723-b19c-4439-a2d2-85a402571691. **Correções preparadas localmente, sem deploy, ativação de tradução remota, geração de ranking ou alteração de planos.** TikTok permanece em standby.

## Retorno de uso

Proprietário informou PC Windows11 e celular Moto g53 5G; Android/PWA confirmado no texto, iPhone ainda não testado. Campo PWA foi colado com duas alternativas, mas a observação explícita de Android prevalece; não registrar aprovação iPhone/Safari. Painel PC/mobile, YouTube/Twitch, formulário, comentários e PWA marcados funcionais pelo proprietário. A02 não descreve sessão existente versus desafio Google/TOTP novo, portanto não é prova de autenticação nova. W01/W02 marcados pelo proprietário, sem telemetria coordenada nesta rodada; sucesso funcional não fornece CPU. Comentários existentes/paginação ampliada só recebem a cobertura realmente relatada, sem inferir volume.

F02 ficou desmarcado em PC/mobile. Embora F03 esteja marcado, o relato específico de entrada no fim da ficha **reabre a navegação como problema confirmado pelo proprietário**. Não apagar o checklist original para forçar uma aprovação. Originais HTML/JSON e texto recebido preservados no workspace privado, não copiados integralmente para Git.

## Lighthouse recebido

| Métrica | Desktop 00:07:55 | Mobile 00:08:35 |
| --- | --- | --- |
| Performance | 99 | 94 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 92 | 92 |
| FCP | 0,7 s | 2,4 s |
| LCP | 0,7 s | 2,7 s |
| TBT | 0 ms | 10 ms |
| CLS | 0,020 | 0,032 |

Horários São Paulo em27/10; fetchTime UTC03:07:55/03:08:35. Lighthouse13.4.1, Chrome155 no userAgent. Sem runWarnings/runtimeError nos JSONs. Clipper fechado conforme relato. Os relatórios se identificam formFactor desktop/mobile, mas ambos têm screenEmulation.disabled=true, throttlingMethod=simulate e disableStorageReset=false. Não afirmar que são perfis visuais padrão distintos ou celular físico; preservar esses parâmetros numa comparação posterior. Não pedir repetição antes de publicar uma correção relevante.

Achados: nomes acessíveis de previews/comentários não contêm o texto visível na ordem esperada (auditoria específica falhou apesar da categoria Accessibility100); robots.txt retornou HTML/21erros, coerente com arquivo ausente no public e fallback SPA; imagens externas, cache dos CDNs, JavaScript não usado e CSS bloqueante. Não ajustar cache do YouTube/Twitch como se fosse controlado pelo Clipzone nem introduzir proxy/armazenamento. Estimativas Lighthouse são oportunidades, não economia medida ou promessa de nova nota. Política robots/indexação fica para decisão explícita de homologação/lançamento; não liberar indexação pública nesta correção.

## 1. Entrada na ficha — corrigida localmente

GamePage não definia rolagem ao entrar; layout movia apenas foco com preventScroll. O usuário podia herdar a posição baixa do feed durante o fallback/lazy e após o conteúdo carregar. Adicionado useLayoutEffect no wrapper da rota, por gameId e chave de navegação: scroll instantâneo ao topo antes da pintura. Não esperar os dados chegarem, não usar efeito global na home nem rolar no clique antes do feed guardar seu snapshot. O retorno por histórico à home mantém a lógica existente de filtro/página/scroll.

Três regressões usam o wrapper real transpiliado, com lazy/Firebase não resolvidos e hooks/rolagem controlados: efeito na fase layout com fallback; nova chave/novo jogo sem repetir a rolagem a cada render; snapshot do feed preservado. São testes de contrato do componente, não simulação de DOM/layout real. Retorno ao feed/paginação também passaram. Confirmação física Android/PC só após deploy específico autorizado.

## 2. Acessibilidade dos cards — corrigida localmente

Nome do botão preview agora inclui título, plataforma, jogo e legenda visível de fallback quando aplicável. Comentários usa “Comentários N publicados”, mantendo texto/contador visíveis na mesma ordem, inclusive total desconhecido. Não muda onOpen, player, URL, IDs ou dados. Dois novos casos cobrem plataformas/fallback/contagem; expectativas anteriores de nomes foram atualizadas. Auditoria Lighthouse real após deploy continua necessária; não prometer mudança na nota100.

## 3. Tradução IGDB — causa identificada e ligação Workers preparada

A tradução no projeto é camada opcional Workers AI, separada do catálogo IGDB. dev-api já conectava createGameTranslation, mas cloudflare-application não fornecia gameTranslation. A entrada publicada também não lia a flag/configuração AI; por isso o original em inglês era o fallback esperado.

Preparada ligação opt-in no Workers: CLIPZONE_TRANSLATION_ENABLED precisa ser exatamente true; exige configuração privada da conta/token AI. Ausência da flag mantém o caminho anterior sem consulta AI. Configuração explicitamente habilitada e inválida falha de forma sanitizada. Rotação altera a assinatura de configuração em memória. O serviço existente mantém modelo fixo, orçamento de até20tentativas/dia no projeto, leases/cache, proteção de nomes e originais, limites de texto/resposta, falha sem desfazer cadastro e uso do fetch limitado da invocação. Nenhuma tradução em visita à ficha. Só confirmação/reconfirmação IGDB solicita tradução; jogos existentes não recebem varredura automática.

Quatro testes novos usam a composição real transpiliada, portas externas/REST/Auth simuladas e serviço real de tradução/cache: desligada sem consultas; ligada traduz/persiste/cacheia uma vez; configuração inválida recusa sem segredo; flag explícita/rotação/desligamento no main. Não comprovam qualidade semântica, permissões AI reais ou CPU remota.

Antes de ativar: verificar Workers Free/AI e quota da conta; autorizar configuração do token AI existente como segredo privado do Worker e flag; não criar credencial ou binding por inferência; publicar pacote específico e testar uma tradução legítima com CPU observada. A franquia AI é compartilhada de10.000neurons/dia no Free, sem uso acima dela sem mudança de plano;20tentativas não equivalem a uma garantia de neurons restantes. Não habilitar Workers Paid, AI Gateway/créditos ou modelos pagos. Fontes: [preços/limites Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/), [modelo Qwen utilizado](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/).

## 4. Mais Relevante — falta geração publicada, sem ativação nesta rodada

Duas leituras pontuais via sessão CLI confirmaram rankingState/current ausente e rankingState/metrics presente/version1/ready=true. Nenhum documento foi escrito. O erro da imagem é a recusa prevista pelo servidor para ranking não preparado ou vencido; não é falha de carregamento geral nem motivo para reduzir validações.

Não inicializar métricas novamente por suposição: já existem métricas preparadas. A próxima operação deve conferir pré-requisitos e construir uma geração segmentada, publicando o ponteiro apenas ao concluir. Dados primários (shorts, comentários, curtidas e jogos) não devem ser editados para fabricar pontuações; dado legado incompatível deve interromper o processo, sem preparação corretiva silenciosa.

O leitor aceita geração por90minutos e o gerador considera renovação após1hora. Uma geração única é só ensaio e volta a vencer. O gerador segmentado processa até15fontes e20itens de staging por etapa, até300fontes/100vídeos, com lease de5minutos e prazo de construção de30minutos. A atualização recorrente precisa respeitar todos esses prazos, orçamento de chamadas e CPU por invocação. Não propor simplesmente cron de1hora com uma única etapa, pois não garante conclusão dos lotes.

Reservas internas por geração segmentada:900leituras/180escritas, limite diário interno20.000R/4.000W; não são medição contábil nem reserva exclusiva de quota do Spark. O scheduled atual também executa retenções quando ranking não está due; **ativar CLIPZONE_JOBS_ENABLED não é ativar somente ranking**. Preparar pacote operacional específico e medir custo/CPU antes de pedir ativação recorrente; não acionar cron/retention por inferência deste relato. Nenhuma geração ou job foi executado nesta rodada. Não mascarar “Mais Relevante” como outra ordenação.

## Validação e artefatos

- Suíte Node completa:757/0, executada em série (59,4s), incluindo nove novos testes desta rodada e os testes de backup adicionados após a antiga baseline704. Não somar resultados focados de novo. Rede/Firestore nos casos novos são fictícios.
- Tipos frontend/servidor e lint global aprovados.
-20contratos workerd locais de entrada/cabeçalhos aprovados. Não certificam inferência AI ou CPU de tradução real.
- Build frontend modo api em pasta isolada fora de dist; dry-run Workers aprovado (log46entradas; pacote fisico depois conferido com43arquivos), sem segredos, com tradução/jobs false. É artefato local de compilação, não configuração operacional completa autorizada para upload.
- Nenhum deploy, alteração de plano, nova dependência, token AI real aberto, chamada de tradução real, escrita Firestore ou consulta TikTok. Apenas duas leituras de estado do ranking.

## Próximos passos separados

1. Preparar/aprovar deploy específico do pacote de rolagem/acessibilidade, preservando os oito segredos existentes e tradução/jobs desligados se ainda não aprovados. Retestar Ver jogo/Voltar em Android/PC na versão publicada.
2. Homologar a tradução existente com ativação explícita, quota Free confirmada e uma descrição legítima; depois definir atualização controlada dos jogos já cadastrados, sem lote automático.
3. Preparar primeira geração e estratégia periódica do ranking, com orçamento, namespace derivado, medição CPU, parada/rollback e aprovação remota específicos. Não ativar retenções junto sem revisão.
4. Após ajustes publicados, repetir apenas os casos afetados e a comparação Lighthouse com condições registradas; iPhone segue pendente de relato. Segurança9-B/GitHub9-B.5 e TikTok continuam bloqueios aplicáveis ao lançamento.


## Atualização — deploy específico autorizado e verificado

Em 27/10/2026, após aprovação explícita do proprietário, publicado uma única vez na homologação o pacote congelado. Worker ativo em 100%: `42c847fa-f9c8-4497-9e9c-c4d0f16e6de9`; referência anterior para eventual rollback: `a0d58723-b19c-4439-a2d2-85a402571691`. Bundle SHA256: `739bd045d5756927e51666df4b5c6ebe68062ed5ff72a1651fc74197176b29e0`.

Conferidos os hashes dos 42 arquivos públicos; o 43º arquivo, `_headers`, é configuração. Treze contratos remotos de assets/API passaram, incluindo no-store/HSTS/nosniff/no-referrer da API, rejeição de origem inválida e ausência de emissão de cookie nesses testes. A conferência usa `/` para o HTML, pois `/index.html` tem redirecionamento canônico; a primeira checagem interrompeu nesse redirecionamento e foi ajustada, sem novo deploy. Oito valores de segredo enviados foram preservados e o arquivo privado permaneceu idêntico. Tradução, jobs e diagnósticos seguem desligados. Sem escrita editorial, ativação de serviço, mudança de plano ou lançamento público.

Reteste Ver jogo/Voltar no PC e Android e continuidade da sessão administrativa solicitado, aguardando proprietário. CPU real e pontuação Lighthouse não foram medidas nesta publicação. TikTok, tradução operacional, ranking recorrente, iPhone e demais gates continuam pendentes; publicação deste pacote não encerra 8-F/9-A.

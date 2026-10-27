# Tradução de descrições IGDB para pt-BR

Integração autorizada em 21/10/2026, após avaliação documental. Implementada localmente; credencial criada pelo proprietário e amostras reais salvas, com conferência local confirmada pelo proprietário em 21/10/2026. Nenhuma conta, plano pago, faturamento, Worker público ou deploy foi criado.

## Fluxo e segurança

- Adaptador nativo fetch, sem SDK/dependência nova. Endpoint fixo api.cloudflare.com e modelo fixo @cf/qwen/qwen3-30b-a3b-fp8. Nenhuma entrada do visitante escolhe modelo, host ou prompt.
- Ativação explícita no servidor: CLIPZONE_TRANSLATION_ENABLED=true, CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_AI_TOKEN, somente em .env.server.local (ignorado pelo Git). O token deve ser restrito à conta e permissões Workers AI Read/Edit. O proprietário cria e salva a credencial; não enviá-la pelo chat. Permanecer em Workers Free, sem créditos pré-pagos/AI Gateway nem faturamento.
- Cadastro/confirmação por ID usa o fluxo IGDB existente. Após confirmar o registro, o serviço tenta traduzir sua descrição persistida. Jogos antigos podem ser reconfirmados no seletor para receber a tradução. Não há varredura, migração nem tradução em acesso à ficha. A atualização automática dos metadados IGDB não foi acrescentada.
- description e officialName permanecem originais. games/{id}.translation armazena texto pt-BR, locale, modelo, hash da fonte/nomes/versão, cópia da descrição e nome usados e data. A ficha só mostra a tradução se estiver vinculada ao original e nome atuais; permite expandir Ver descrição original e indica tradução automática.
- Título oficial não é traduzido. Ocorrências do título e aliases conhecidos são protegidas com marcadores aleatórios e restauradas exatamente; ausência/repetição do marcador invalida a resposta. Nomes desconhecidos no corpo dependem da fidelidade do modelo; não há garantia universal de preservação ou correção sem revisão. Texto externo é tratado como dado, sem ferramentas ou execução de instruções.
- Texto fonte limitado a 8.000 caracteres, conteúdo protegido a 16.000 e 100 marcadores. Resposta HTTP limitada a 100 KB, texto a 24.000 caracteres, sem tags HTML/blocos de código/controles proibidos. Rejeita resposta vazia, excessivamente curta, inalterada e marcadores danificados. Esses controles não comprovam qualidade semântica ou completude: amostra real ainda necessária.
- Chamada externa fora das transações Firestore. gameTranslations/{gameId} é privado: reserva com lease de 2 minutos, verificação de titularidade/hash/estado na conclusão. Concorrência normal produz uma chamada; interrupções após a chamada podem ocasionar nova tentativa ao expirar a reserva. Não se promete exatamente uma chamada em caso de falha do processo.
- Limite operacional de 20 tentativas globais/dia UTC em translationUsage/{dia}, e 3 tentativas por jogo/versão/dia; falha espera 1 hora antes de outra tentativa. O dia seguinte permite tentar novamente. Uma nova confirmação ou comando explícito dispara a tentativa; sem agendador/polling. Tentativas contam mesmo se o provedor falhar. Limites não consomem a cota de cinco vídeos nem são promessa de franquia disponível na conta Cloudflare.
- Timeout de inferência de 12 segundos, sem repetição automática na mesma chamada; saída máxima 3.072 tokens. Confirmação do catálogo no cliente aguarda até 45 segundos, incluindo a consulta IGDB e tradução opcional. Falha na tradução não desfaz o cadastro: a ficha mantém o original. Desativação preserva traduções já salvas, sem novas chamadas.
- Coleções privadas reutilizam o Firestore existente; regras públicas inalteradas negam leitura/escrita direta, inclusive claims admin. Nenhum novo banco, índice ou endpoint de tradução público foi necessário. Não enviar dados de visitantes, tokens ou emails ao modelo. Erros privados são genéricos, sem corpo do provedor em logs.
- Aproximadamente 5 leituras e 4 gravações Firestore por tentativa concluída, além do cadastro existente; acerto no cache exige apenas leitura do jogo. Falhas/concorrência podem adicionar operações. Não há custo por visita referente à inferência. Respeitar as cotas gratuitas Firestore e Workers AI da conta inteira.

## Configuração e teste pelo proprietário

Abrir https://dash.cloudflare.com/?to=/:account/ai/workers-ai , selecionar a conta e usar Use REST API / Create a Workers AI API Token. Conferir Read/Edit apenas para Workers AI e apenas nessa conta. Revisar pessoalmente eventuais termos. Se exigir pagamento/cartão, interromper e informar; não fazer upgrade.

No arquivo privado .env.server.local:

    CLOUDFLARE_ACCOUNT_ID=seu_account_id
    CLOUDFLARE_AI_TOKEN=seu_token
    CLIPZONE_TRANSLATION_ENABLED=true

Depois de salvar, reiniciar a API local. Para avaliação explícita de um jogo já cadastrado no emulador:

    node --env-file=.env.server.local scripts/check-translation.mjs igdb-71
    node --env-file=.env.server.local scripts/check-translation.mjs igdb-9596

O comando usa somente demo-clipzone:8080 para dados e a API real Cloudflare para inferência. Imprime nome/descrição original/tradução, nunca credenciais. Não executar antes de o proprietário configurar a credencial. Atualizar as fichas no navegador; conferir naturalidade pt-BR, nomes, números, fidelidade, ausência de omissões e abertura do original. Não chamar tradução de pronta para produção antes desse aceite.

## Testes realizados

- tests/game-translation.test.mjs: 8 testes passaram com respostas controladas, cobrindo nomes (inclusive caracteres de regex), endpoint/modelo fixos, limites de resposta, concorrência, cache, descarte de fonte obsoleta, falhas, limites com retomada diária e compatibilidade do cadastro/ficha.
- Regressões: tests/game-confirmation.test.mjs (4), tests/game-catalog-client.test.mjs (3), tests/game-presentation.test.mjs (2) passaram. Não repetidas após ajustes exclusivamente internos ao servidor de tradução.
- tests/firestore/game-translation.test.mjs: 3 testes passaram no emulador isolado demo-clipzone-tests:8081. Concorrência real, orçamento global atômico, leitura pública pt-BR/original, regras privadas e descarte seguro de resultado obsoleto.
- 20 testes distintos relacionados aprovados. Lint e build completos passaram; após ajuste final no servidor, seus tipos/lint e os 8 testes relacionados foram novamente aprovados. Sintaxe dos dois scripts verificada. Sem suíte completa ou novo teste de fontes externas.
- Testes automatizados usam fixtures; amostra real posterior descrita abaixo. Não alegar fidelidade universal nem qualidade universal com base nas amostras.

## Arquivos deste ajuste

server/games/translate-description.ts; server/games/translation-store.ts; server/games/confirm-game.ts; server/http/game-confirmation.ts; server/http/public-api.ts; scripts/dev-api.mjs; scripts/check-translation.mjs; src/features/games/services/catalog-api.ts; src/features/games/services/game-details.ts; src/features/games/components/GameInfo.tsx; tests/game-translation.test.mjs; tests/firestore/game-translation.test.mjs; docs/traducao-jogos.md; docs/catalogo-jogos.md; docs/continuidade.md.

## Referências e condições

- https://developers.cloudflare.com/workers-ai/platform/pricing/ — usar somente plano/modelo gratuito; excesso no Free falha. Franquia compartilhada e sujeita a mudanças.
- https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/ — modelo e interface.
- https://developers.cloudflare.com/workers-ai/get-started/rest-api/ — token e permissões.
- https://developers.cloudflare.com/workers-ai/platform/data-usage/ — uso de conteúdo e exceções de retenção.
- https://huggingface.co/Qwen/Qwen3-30B-A3B-FP8 — licença do modelo.

Sem rotina de TTL/limpeza criada para contadores e tarefas; retenção continua como requisito operacional anterior à produção. Não usar configuração local como implantação pronta.

## Amostra real — 21/10/2026

O proprietário criou e salvou a credencial. Executado scripts/check-translation.mjs para Portal (igdb-71) e Tibia (igdb-9596): duas versões por jogo, quatro chamadas reais no total, somente descrições públicas enviadas e resultados gravados em demo-clipzone:8080. Sem faturamento/deploy, original preservado. Primeira versão tinha termos inadequados e alteração de nome do dispositivo de Portal; ajustados glossário e proteção heurística de expressões compostas com iniciais maiúsculas, versão interna 2. Amostras atualizadas salvas; Portal preserva Aperture Science Handheld Portal Device. Tibia ainda contém construções literais e mantém North America/South America em inglês por proteção de nomes compostos. Isso demonstra a limitação de heurísticas: proprietário confirmou a conferência local e autorizou seguir; não afirmar fidelidade universal.

Ajuste da reserva: prazo bloqueia trabalho em andamento e falha da mesma fonte, mas não atrasa uma versão nova depois de trabalho concluído. Oito testes locais relacionados, tipos/lint do servidor e três testes transacionais no emulador novamente verificados após o ajuste. API local reiniciada com a configuração nova, sem reiniciar o Firestore de desenvolvimento; sessão administrativa precisa de nova verificação.

## 27/10/2026 — adaptacao Workers preparada, ativacao remota ainda pendente

Retorno9-A mostrou descricoes originais em ingles. A composicao local dev-api ja passava gameTranslation, mas a entrada Workers nao o conectava. Preparada conexao opt-in com CLIPZONE_TRANSLATION_ENABLED=true, CLOUDFLARE_ACCOUNT_ID e segredo CLOUDFLARE_AI_TOKEN, reutilizando adaptador e armazenamento existentes com20tentativas/dia e sem traducao ao visitar ficha. Sem flag, nenhuma consulta AI. Configuracao habilitada invalida recusa; chaves/configuracao ficam privadas. Quatro testes novos de composicao aprovados; suite completa757/0, tipos/lint e compilacao Workers aprovados. Nenhum token AI real lido, inferencia remota, flag/binding remoto ou deploy. Detalhes, limites de Free/neurons e passos para jogos existentes em etapa-9-a-retorno-correcoes.md. A integracao publicada ainda precisa de configuracao e homologacao explicitamente aprovadas.

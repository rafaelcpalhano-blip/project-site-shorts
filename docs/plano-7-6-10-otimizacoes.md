# Plano 7.6.10 — Otimizações localizadas antes da Etapa8

Estado: A e B concluídas; C–F aguardam autorização. Consulte etapa-7-6-10-a.md e etapa-7-6-10-b.md para evidências, critérios e limites. Otimização em B restrita às imagens locais do Clipper. Base: Lighthouse mobile65/desktop86, CLS0 em ambos, mobileFCP4,81s/LCP6,87s/TBT11ms, avisos de timeout/IndexedDB. Boas-vindas fechadas e anonimato confirmados. Evidências e limites em lighthouse-validacao-2026-10-24.md.

## Compromisso de preservação

Não existe garantia absoluta de ausência de bugs. A entrega exigirá evidências de comportamento preservado, benefício mensurável e possibilidade de reversão por etapa. Não prometer nota Lighthouse ou ganho temporal antes de medir. Sem novas bibliotecas, deploy, infraestrutura, produção, reset de dados, afrouxamento de autenticação/moderação ou alteração desnecessária de players. Preservar originais das imagens para reversão. Trabalhar em etapas aprovadas, sem misturar refinos visuais futuros.

## A — Referência controlada, diagnóstico de timeout e matriz de regressão

Reaproveitar os dois relatórios recebidos e o manifesto da build. Registrar versão Git/build, conjunto de shorts, viewport/DPR, estado Clipper e configuração de rede. Separar compressão/cache do servidorlocal de custos da aplicação. Inspecionar ciclo de requisições Firestore e listeners sem atribuir o timeout ao canal200 aberto por suposição. Verificar limpeza de subscriptions/listeners realmente existentes e eventual repetição de consultas, sem removê-los por serem longos.

Mapear testes existentes; definir comandos focados por etapa e uma verificação integrada final. Criar testes de comportamento ausentes quando protegem risco concreto das próximas mudanças, usando Node/React/Vite e emulador isolado já disponíveis. Não instalar framework nem substituir infraestrutura. Congelar evidências de bytes/dimensões/importações iniciais. Sem repetir Lighthouse nesta fase.

Aceite: causas comprovadas versus hipóteses listadas; orçamento de bytes e cenários verificáveis definidos; dependências locais e externas distinguidas. Correção de timeout só será incluída se causa reproduzível e ajuste localizado estiverem comprovados; caso contrário, documentar e manter como investigação pendente, sem hacks de quietude ou alteração da medição para aumentar nota.

## B — Imagens locais do Clipper

Priorizar image-unavailable.webp e welcome.webp por peso comprovado. Avaliar variantes menores/densidades adequadas para os contextos usados, preservando originais, transparência, proporção e aparência. Gerar variantes apenas com ferramentas já disponíveis; se faltar ferramenta, reportar antes de propor instalação. Não mudar poses, textos, animações ou interação por otimização.

Automação: existência/formatos/dimensões/bytes das variantes e referências válidas; integração/renderização que preserve a cadeia de fallback e a geometria reservada; testes clipper-community/interactions/welcome/communication relacionados. Navegador: falha de miniatura, erro da própria imagemfallback, DPR1/2 e estados do Clipper afetados. Testes de comportamento existentes devem continuar cobrindo balões/risada/retorno sem duplicar implementação.

Aceite: redução concreta de bytes nas imagens utilizadas, qualidade visual conferida e caixa estável; nenhuma imagem quebrada ou regressão das interações. Risco baixo a médio, complexidade baixa a média.

## C — Miniaturas e prioridade de carregamento

Avaliar fontes menores oficiais/variantes somente onde a plataforma fornece formato conhecido e validado, principalmente maxresdefault YouTube. Não manipular URLs assinadas Twitch/TikTok nem consultar endpoints inventados. Preservar miniatura original, validade, fallback de capa/Clipper e dados armazenados. Não reescrever shorts existentes ou adicionar processamento remoto de imagens.

Avaliar eager/fetchpriority apenas nas imagens iniciais relevantes e somente se a descoberta delas for gargalo medido. Não tornar todo feed eager; não presumir que o LCP mobile é imagem, pois o relatório atual identifica h1. Não introduzir pré-carregamento de players.

Automação: fontes válidas/indisponíveis, mesma identidade do vídeo, expiração, fallback sem ciclos, lazy para cards fora da área inicial e nenhuma criação de iframe na home. Reusar thumbnails/card-artwork/official-player e acrescentar casos de seleção de variante/prioridade. Conferência em320/375/390/400/430 e desktop, incluindo imagens pequenas/alta densidade, paginação, filtro e hover.

Aceite: menos bytes sem perda inadequada de qualidade, piora de FCP/LCP ou aumento indevido de requisições; preservar controles e navegação. Risco médio, complexidade média.

## D — JavaScript inicial e trabalho do primeiro carregamento

Inspecionar importações que levam index/public-repository à home, distinguir dependência obrigatória de recurso usado apenas após interação. Avaliar importação sob demanda/divisão localizada quando reduzir bytes iniciais sem criar cascata de espera pior. JS não utilizado no relatório não é código morto automaticamente. Não remover/trocar SDK Firebase, migrar o catálogo para nova API, alterar persistência/cache/contratos de autenticação ou reescrever arquitetura como parte implícita desta etapa. Mudança desse porte exige proposta separada e aprovação.

Automação: build/manifesto para tamanho e dependências de entrada, presença de chunks de recursos sob demanda, contratos de catálogo/cache/rascunho e testes de preview/submission/shared-video-links. Conferir abertura de formulário durante carregamento, falha/retry de chunks e ausência de resultados tardios após fechar. Se tocar carregamento administrativo, executar admin-session e autorização backend sem credenciais reais em testes automatizados. Comparar bytes iniciais e cadeia de requisições, não apenas tamanho total do dist.

Aceite: benefício medido em bytes/descoberta/tempo de conteúdo, sem erro de chunk, chamadas duplicadas, perda de campos, autorização diferente ou atraso significativo ao abrir recursos. Se não houver benefício seguro, documentar e descartar a mudança. Risco médio a alto, complexidade média a alta.

## E — Regressão integrada e revisão do conjunto

Depois das etapas implementadas, executar uma vez o conjunto ampliado de testes pertinente ao que mudou, evitando suíte completa repetida em cada ajuste. Cobrir feed/ordenação/paginação contínua, catálogo/pesquisa/seleção, formulário e campos manuais, Twitch com apresentação, TikTok curto/canal, YouTube estrito, falha/retry, comentários/rascunho, viewer/troca/fechamento, Clipper, administração/autorização quando o grafo afetar esses recursos. Fixtures usam memória ou emulador separado; nunca limpar o8080 existente.

Conferência responsiva320/375/390/400/430 e desktop; iframe Twitch mínimo400x300 com scrollinterno, demaisplayers inalterados; sem overflow global e sem sobreposição de controles. Reutilizar testes oficiais/sequence/audio/mobile em vez de criar testes que apenas reproduzam detalhes internos. Testes não conseguem provar disponibilidade permanente de APIs ou substituir teclado/toque/autoplay/autenticador reais.

Aceite: testes relevantes verdes, lint/build/diff aprovados, revisão do diff, nenhuma mudança fora do escopo. Checklist físico curto para o proprietário valida aspectos não cobertos pela automação. Avisos de rótulos acessíveis registrados no Lighthouse ficam identificados; ajustes funcionais/visuais novos serão separados, a menos que uma otimização introduza regressão que precise ser corrigida.

## F — Nova medição e encerramento

Somente depois do conjunto estável: uma auditoria mobile e uma desktop com mesmo cenário documentado, navegador/configuração equivalentes, anonimato e boas-vindas fechadas. GuardarHTML/JSON, avisos, bytes, FCP/LCP/CLS/TBT e versão. Não rodar repetidamente para selecionar a melhor nota. Não misturar tempos observados com simulados nem comparar desktop com referência mobile.

Aceite: ganho avaliado contra referência pertinente, layout estável nos cenários controlados e regressões descartadas; se timeout persistir, relatar limitação e não declarar medição definitiva. Se conteúdo mudar, explicitar perda de comparabilidade. Não exigir nota90 como critério artificial. Listar pendências locais versus preparação da hospedagem, sem executar deploy ou mudar infraestrutura. Encerrar o ciclo e receber o próximo prompt de refinamentos; Etapa8 só começa com autorização própria.

## Rotina em cada ajuste

1. Definir hipótese, risco e resultado verificável antes de editar.
2. Reaproveitar teste existente; adicionar teste de regressão significativo se faltar cobertura.
3. Alterar um conjunto pequeno e revisar o diff.
4. Rodar testes focados, lint e build conforme impacto. Comparar evidências de custo e comportamento.
5. Se houver regressão ou benefício insuficiente, corrigir/reverter apenas a etapa, preservando alterações anteriores e dados.
6. Atualizar relatório/continuidade, entregar blocos PowerShell com arquivos explícitos por commit e informar próxima etapa. Commits executados pelo proprietário.

Prioridade: A obrigatória para referência/diagnóstico; B e C maior oportunidade inicial de redução de imagens; D condicionada à análise de importações; E e F obrigatórias para validar o conjunto. Início proposto:7.6.10-A, aguardando aprovação. Publicação/hospedagem permanecem fora deste plano.
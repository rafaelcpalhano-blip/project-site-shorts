# Validação recebida e latência inicial — 25/10/2026

Status da análise original: regressão de latência reproduzida. Posteriormente, o proprietário autorizou a correção localizada, implementada e testada em [correcao-contencao-leituras-publicas.md](correcao-contencao-leituras-publicas.md). As referências a código não alterado abaixo descrevem a rodada de diagnóstico. Etapa8 não iniciada.

## Evidências preservadas

Novos relatórios da build5175: 127.0.0.1_5175-20261025T040924 (Desktop,04:09 local) e 127.0.0.1_5175-20261025T041024 (Mobile,04:10 local), HTML/JSON. Cópias, hashes e comparação estruturada em C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/2026-10-25/. Não incluir esses arquivos brutos nem dados privados no Git.

Referência reutilizada: relatórios locais arquivados de24/10,21:09/21:10, etapa7.6.10-F. Não foi executado outro Lighthouse. As duas rodadas usam Lighthouse13.4.1, simulação de throttling e a mesma origem local. Conteúdo/cache e momento da sessão variam; uma leitura por perfil não prova significância estatística.

HEAD encontrado na análise:7ced7eb (documentação), código de paginação aba5813. Os assets dos relatórios novos coincidem com a build mais recente (index-B_lt40TS, FirestoreFeed-BHrLrC7l). O checklist recebido ainda informa5920f48; atualizar o campo de versão/data da build ao fechar a homologação, sem presumir que todos os testes de02:00 foram refeitos depois das mudanças.

## Comparação

| Métrica | Mobile24/10 | Mobile25/10 | Desktop24/10 | Desktop25/10 |
| --- | --- | --- | --- | --- |
| Performance |65|66|96|96|
| Acessibilidade |100|100|100|100|
| Boas práticas |96|100|96|100|
| SEO |100|100|100|100|
| FCP |4,73s|4,58s|0,94s|0,91s|
| LCP |6,42s|6,18s|1,21s|1,16s|
| CLS |0|0,032|0|0,021|
| TBT |11,5ms|3,5ms|0ms|0ms|
| Transferência |1.647.413B|1.558.504B|1.298.871B|1.176.839B|

Não houve piora geral dessas notas/tempos de pintura, mas isso não elimina atraso dos primeiros cards. O elemento LCP observado no relatório novo é o H1 Pequenos clipes. Grandes jogadas., não o conjunto de cards pronto. Tempos simulados das métricas e tempos observados da rede não são diretamente intercambiáveis. O aviso IndexedDB persiste; ele não prova sozinho que a janela deixou de ser anônima nem é a causa demonstrada desta lentidão. O aviso anterior de timeout não aparece nos relatórios novos.

## Regressão comprovada: leituras iniciais concorrentes

| Requisição observada | Referência | Novo Desktop | Novo Mobile |
| --- | --- | --- | --- |
| /api/feed/ordered |~96–99ms|~2.146ms|~2.223ms|
| /api/games/list |Ainda era leitura direta SDK|~2.024ms|~2.086ms|
| /api/session |~17ms|~10–11ms,duas chamadas|~12ms,duas chamadas|

Logs locais do runner de5175 corroboram: leitura pública feed/catalogo com duração2085/2221ms e, em outra ocorrência registrada,4148/4152ms. O atraso é do atendimento da API, não apenas uma estimativa de banda do Lighthouse. Não houve erro HTTP nessas requisições.

Após corrigir o catálogo mobile para usar HTTPS da mesma origem, o feed e o catálogo passaram a consultar simultaneamente o mesmo limitador public-read da identidade. Cada leitura executa uma transação sobre publicReadAttempts/<identidade>. A disputa nesse documento causa espera/retentativas no Firestore local. Antes, o catálogo direto pelo SDK não concorria por esse contador.

Diagnóstico direcionado executado somente em demo-clipzone-tests:8081, usando createAttemptLimiter, createRestStore, readOrderedFeed e readGames reais, com15shorts/jogo fictícios:

| Modo | Amostra1 | Amostra2 |
| --- | --- | --- |
| Feed e catálogo em sequência |346ms|170ms|
| Feed e catálogo em paralelo |4.406ms|2.254ms|
| Espera das transações no paralelo |4.282–4.372ms|2.140–2.170ms|
| Leitura do conteúdo feed no paralelo |100ms|79ms|
| Leitura do conteúdo catálogo no paralelo |14ms|15ms|

Em todos os casos, o contador final foi2 e os resultados15shorts/1jogo. Portanto, retirar ou relaxar a proteção não é solução. O experimento identifica contenção como mecanismo suficiente para reproduzir o sintoma; não atribui toda latência possível em produção a esse mecanismo. Os valores não são promessa de um ganho fixo em outro ambiente.

Arquivo bruto do diagnóstico: audit-performance/initial-latency-diagnostic.json no workspace. Teste temporário removido ao terminar. Emulador isolado encerrado,8080 e dados de uso preservados. Nenhuma modificação no código da aplicação, permissão, limite, sessão ou infraestrutura foi feita nesta análise.

## Outros achados e prioridades

1. **Alta: coordenar as leituras públicas iniciais da mesma sessão**, evitando que o catálogo e o feed disputem simultaneamente o contador. Caminho proposto: coordenação no cliente para essas leituras, mantendo cada validação/contagem no servidor, erros, cancelamento e retry manual. Não reintroduzir dependência mobile da8080 nem fazer prefetch. Avaliar primeiro se serializar o bootstrap é suficiente ou se o transporte público compartilhado deve coordenar leituras concorrentes. Nenhuma alteração nessa coordenação foi aplicada ainda. Risco: enfileiramento indevido ou respostas antigas; testar cancelamento, falha de uma leitura e isolamento entre contextos. Concorrência entre abas/instâncias ainda depende da transação distribuída; não confundir coordenação por aba com proteção global.
2. **Média: revisar espaço reservado para estado do catálogo.** CLS novo0,021/0,032; o relatório identifica a região results deslocada. Há texto Carregando jogos que é removido ao completar a consulta, provável contribuinte. A causa geométrica exata requer medição localizada; não afirmar que o seletor é a única causa só porque o feed se deslocou. Preservar mensagens/retry e layout mobile.
3. **Média: retirar dependência desnecessária do SDK Firestore nas leituras públicas já migradas para API.** O bundle public-repository ainda transfere~402KB e o Lighthouse classifica~362KB como não usados nessa navegação. O arquivo client.ts inicializa Firestore só para o objeto usado como chave do cache do repositório. Revisar essas importações, preservando cache compartilhado e autenticação administrativa separada. Não prometer que todos os402KB serão eliminados sem medir a build resultante.
4. **Posterior: imagens.** Estimativa de economia mobile~639KiB e desktop~248KiB. Exemplos: thumbnails YouTube1280×720 em cards378×213 e capa IGDB grande. Verificar formatos/tamanhos suportados e evitar substituir URLs de terceiros por suposições. Essas estimativas não são bytes adicionais além do peso total nem garantias de economia. Não são a causa comprovada da contenção da API.

O pequeno código de paginação não adicionou prefetch ou consultas para montar números e não explica essa disputa do contador. O momento da mudança percebida é consistente com o catálogo pela API, que precisa ser preservado para funcionar corretamente no celular.

## Validação da eventual correção

- Repetir somente diagnóstico de concorrência e testes de leituras públicas/cache/recuperação afetados, incluindo limite preservado, cancelamento de requisição enfileirada e falha seguida de retry manual.
- Medir prontidão do primeiro feed e catálogo, não só LCP/nota geral.
- Conferir no PC e celular físico: carregamento frio e retorno na mesma sessão, sem criar várias identidades anônimas.
- Preservar navegação, pesquisa/seleção, publicação, moderação e todos os dados de uso; usar fixtures isolados para limites/volume.
- Lint/build uma vez após ajustes; confirmar que a5175 serve os novos assets.
- Somente depois de estabilizar esse ajuste, decidir nova leitura Mobile/Desktop comparável. Não repetir Lighthouse agora para tentar confirmar pelo score algo já reproduzido no backend.

## Checklist recebido

72 marcações aprovadas e3desmarcadas nas seções recebidas2–9. Isso é relato do proprietário, não execução automatizada pelo Codex; alguns textos marcados aceitam também não execução com motivo, então não reinterpretar como prova detalhada além do informado.

- P01-MOB tem anotação histórica do catálogo. Correção/validação posterior já confirmada explicitamente pelo proprietário em5175; considerar esse problema específico resolvido, mantendo registro da correção.
- A02-MOB: proprietário esclareceu que apenas não testou as abas no celular; PC aprovado, outros menus administrativos aparentemente funcionavam. Não registrar como bug, nem marcar esse bloco como executado.
- A07-EXTRA: não executado no material recebido; conferir apenas se houver segundo administrador já autorizado, ou registrar não aplicável com justificativa. Não criar acesso novo só para testar.
- Seções de recuperação, testes técnicos e fechamento não vieram nesse trecho. Conservar as evidências técnicas anteriores, mas não declarar o checklist inteiro concluído.

Conclusão: a percepção de lentidão tem fundamento e existe uma regressão localizada reproduzível. Corrigir primeiro a contenção das leituras públicas antes de considerar encerrada a rodada pré-Etapa8. Relatório não autoriza deploy nem avanço de etapa.

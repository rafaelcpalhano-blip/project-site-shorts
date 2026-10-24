# 7.6.10-A — Referência e regressão automatizada

Concluída em24/10/2026, conforme autorização do proprietário. Sem otimizações na aplicação, alterações em infraestrutura ou nova execução do Lighthouse.

## Referência congelada

HEAD inicial5929484209ee9bb8852a4817fb864ab6d82ffaa0, árvore limpa. Build dist existente reutilizada,23arquivos em assets com bytes/hash/importações estáticas e dinâmicas. Recursos JS citados nos dois relatórios correspondem aos nomes da build congelada. Não reconstruir só para alterar a referência.

Relatórios24/10 desktop19:38:47 e mobile19:40:37, Lighthouse13.4.1/Chromium155, janela anônima, boas-vindas fechadas. Notas86/65, CLS0/0, FCP0,97/4,81s e LCP2,36/6,87s; demais métricas em lighthouse-validacao-2026-10-24.md. Configurações de throttling/emulação completas preservadas. screenEmulation.disabled=true: não inventar DPR efetivo com base no valor nominal1,75 do bloco desabilitado. Captura de página completa mostra largura1349 desktop e412mobile; suas alturas não são alturas do viewport. Na próxima medição registrar viewport/DPR efetivos.

Nove scripts carregados em cada relatório:890.777B transferidos incluindo overheadHTTP;889.145B de arquivos equivalentes. Gzip offline estimado275.567B, apenas estimativa, não transferência medida no servidor atual. AdminPage/PersistentSubmissionDialog não constam dessa lista inicial. Os maiores são public-repository462KB e index347KB. Importações congeladas ajudam avaliar cascatas futuras sem tratar tamanho total de dist como bytes iniciais.

Imagens locais prioritárias: image-unavailable.webp230.978B e welcome.webp198.180B, ambas WebPVP8L512x768 com alpha, total429.158B. SHA256 preservados; originais devem ser mantidos nas próximas etapas.

Snapshot público adicional da etapaA:15shorts da primeira página latest, IDs/identidades/jogos/títulos/hash registrados fora do Git. Ele congela o estado atual; não prova que todos esses registros eram idênticos aos testes anteriores. A referência histórica permanece o conteúdo capturado nos próprios relatórios, sem reconstruir registros ausentes por suposição.

Evidências em C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-10-a/: baseline.json, catalog-before-termination.json, catalog-after-termination.json, sdk-source-evidence.json e manifest.json com hashes. Fixtures de diagnóstico e runner também estão fora do Git; servidor temporário encerrado.

## Timeout: o que está comprovado

- Nos relatórios há uma única chamada /api/feed/ordered por navegação, HTTP200. Não há duplicação do endpoint do feed nessas capturas.
- O código da aplicação não usa onSnapshot. Catálogo usa getDocsFromServer, cache de páginas compartilhado por banco/30s e coalescência de promessas. Desmontagem de consumidores impede aplicar respostas tardias; isso não equivale a cancelar o transporte interno do SDK.
- Assinaturas locais de catálogo/playback/áudio/Clipper têm unsubscribe; useSyncExternalStore administra esses retornos. Provider administrativo limpa observer, sessão e visibilitychange. Feed cancela pager na troca/desmontagem. Nenhum vazamento comprovado nessa revisão localizada; não é auditoria exaustiva de todos os caminhos.
- @firebase/firestore4.18.0 instalado: fonte incluída no sourcemap mostra getDocsFromServer chamando firestoreClientGetDocumentsViaSnapshotListener(...,{source:'server'}). Logo, URL Listen/channel não prova um listener permanente criado pelo código da aplicação.
- Página isolada executou duas chamadas concorrentes ao catálogo pelo repositório existente e ambas concluíram com29jogos, sem erros. Instrumentação transparente do fetch observou três requisições de transporte, incluindo uma HTTP200 ainda pendente após os resultados. Não confundir três requisições HTTP internas com três consultas lógicas. Os testes de cache comprovam coalescência.
- Ao chamar terminate somente na instância SDK dessa página de diagnóstico, a conexão pendente encerrou e open passou de1 para0. O estado failed registrado no wrapper corresponde à interrupção intencional desse transporte, não a falha da leitura já concluída. Não foi chamado terminate nos clientes da aplicação nem no emulador.

Conclusão: conexão prolongada do SDK é hipótese reforçada para o timeout, reproduzida independentemente de players ou de inscrições do feed. Ainda NÃO está provada a causalidade exata do aviso Lighthouse, nem identificado listener vazando. Não alterar Firestore, encerrar SDK real, forçar rede offline ou manipular quietude do Lighthouse para melhorar a nota. Correção de timeout não incluída por falta dessa comprovação; permanece pendência delimitada de diagnóstico, não impede iniciar otimizações independentes de imagens.

IndexedDB: cliente de dados explicitamente usa memoryLocalCache. O aviso não prova cache persistente em uso por esse cliente ou erro do proprietário quanto à janela anônima. Nenhuma limpeza de storage foi feita.

## Separação de ambiente

HEAD real de um JS da5175 confirmou Cache-Control:no-cache, sem Content-Encoding e Content-Length346.861. no-cache exige revalidação; não significa que o navegador nunca armazene o recurso. Servidor temporário não entrega gzip/brotli nem cache longo de assets; tratar configuração final na etapa de hospedagem autorizada, sem introduzir essas mudanças aqui. HTTPS local validado pelo armazenamento CA do Windows, sem desabilitar verificação.

Servidor de auditoria deve ser iniciado com node --use-system-ca --env-file=.env.server.local seguido do caminho externo audit-performance/serve-production.mjs, a partir da pasta do repositório. Isso evita a falha anterior audit-proxy-UNABLE_TO_VERIFY_LEAF_SIGNATURE. API5174/PID19512, build5175/PID24152 e Firestore8080/PID7860 preservados;5178diagnóstica encerrada. Sem reset, seed, restauração ou gravação de conteúdo.

## Automação disponível

Criado scripts/test-performance.mjs, sem dependências novas, shellfalse e caminhos explícitos. Aceita A/B/C/D/E; --list mostra os grupos. Valida arquivos existentes antes de iniciar; falhas retornam exitcode de erro. E é união sem duplicações dos grupos mais verificações de navegação/áudio/toque, não a suíte inteira. Execução concorrente limitada a2 para evitar processos SSR excessivos. O utilitário não roda Lighthouse nem testes de integração que limpem o emulador existente.

| Grupo | Contratos protegidos | Arquivos de testes |
|---|---|---|
| A | Cache, coalescência, invalidação/unsubscribe, respostas antigas, feed/ordem/cursor/DTO, primeiro render sem players extras, sessão administrativa | game-catalog-cache, ordered-feed-concurrency, short-sequence-components, admin-session |
| B | Interações/boas-vindas/retorno Clipper, prioridade de fallback e card sem player | clipper-interaction, clipper-community, clipper-welcome, clipper-communication, card-artwork, short-sequence-components |
| C | Metadados/validade de miniaturas, fallback, card e players/controles oficiais/Twitch móvel | thumbnails, card-artwork, short-sequence-components, official-player, twitch-mobile-layout |
| D | Catálogo/cache, falhas/rascunho, links compartilhados, preview/publicação, YouTube/TikTok e autorização | game-catalog-cache, game-catalog-client, mobile-recovery, shared-video-links, video-preview, submission-client, youtube-preview-recovery, tiktok-profile-preview, admin-session, admin-auth |
| E | UniãoA–D e navegação contínua/áudio/toque/seletor | anteriores + short-sequence, player-audio, mobile-interactions, game-panel-position |

Comando: node scripts/test-performance.mjs A (trocar letra conforme etapa). Nesta etapaA foram executados apenas os quatro arquivos do grupoA:34testes passaram,0falhas. ESLint do utilitário e git diff --check aprovados. --list revisado. Build da aplicação não repetida porque nenhum arquivo da aplicação foi alterado; testes SSR exercitaram os componentes envolvidos usando o código atual.

Lacunas deliberadas para preencher junto às mudanças: B exige testes das variantes/dimensões/alpha/referências e orçamento; C exige casos de seleção de fonte/prioridade inicial; D exige verificação do grafo real de chunks e falha de importação conforme a alteração escolhida. Não criar testes que somente fixem a implementação atual ou uma nota Lighthouse. Atualizar os grupos com esses testes ao implementá-los. Testes atuais de fallback/semiframes/cache já existem; foram reaproveitados em vez de duplicados.

## Orçamentos e critérios de aceite das próximas etapas

- B: alvo inicial de ao menos50% menos bytes por variante servida frente ao original correspondente, condicionado à qualidade/alpha/DPR. Manter originais; não atingir alvo sacrificando aparência. Comparar bytes efetivamente utilizados pelo card/Clipper, não o total de assets incluindo originais de reversão.
- C: reduzir tráfego de imagens afetadas com mesma identidade, validade e cadeia de fallback. Não transformar todos os cards em eager nem modificar URLs assinadas. Medir contexto inicial e fora do viewport separadamente.
- D: referência890.777B de scripts transferidos/889.145B de arquivos iniciais; alvo exploratório redução>=10% em condições equivalentes, sem obrigação de reescrever arquitetura para alcançar. Registrar gzip offline separadamente. Qualquer crescimento exige justificativa/revisão; divisão sem ganho ou com waterfall pior não é aprovada só por reduzir um chunk.
- Todos: preservar layout estável nos cenários controlados e sem overflow global, zero players na home antes de abrir vídeo, nenhuma duplicação nova de feed/catálogo, nenhuma perda de título/canal/rascunho ou mudança de autorização. Priorizar comportamento sobre metas numéricas.
- Regressão implica corrigir/reverter a alteração isolada antes de prosseguir. APIs externas/toque/autoplay e aparência continuam exigindo conferência real; automação não oferece garantia absoluta.

## Encerramento

EtapaA concluída com referência/evidências/orçamentos/matriz e comando automatizado disponíveis. Nenhuma otimização aplicada. Próxima7.6.10-B (imagens locais do Clipper), somente após autorização. C–F, prompt posterior de refinamentos e Etapa8 não iniciados. Commits manuais em blocos separados para ferramenta e documentação.
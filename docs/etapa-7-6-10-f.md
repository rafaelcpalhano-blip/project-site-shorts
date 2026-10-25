# Etapa 7.6.10-F — Medição final e encerramento com ressalvas

Concluída a análise em 24/10/2026. Foram recebidas e analisadas uma auditoria mobile (21:09:03) e outra desktop (21:10:26), sem executar ou solicitar novas auditorias. O proprietário confirmou janela anônima, home com cards carregados, nenhum vídeo aberto e boas-vindas do Clipper fechadas nos dois casos. Os testes físicos da E e a avaliação visual5174 permanecem pendentes; este relatório não representa seu aceite.

## Resultado comparado

Referência: mobile19:40:37 e desktop19:38:47 do mesmo dia, antes das otimizações B–D. Horários locais de São Paulo; os JSONs novos registram 25/10 em UTC, equivalente a24/10 às21h locais.

| Métrica | Mobile antes | Mobile final | Desktop antes | Desktop final |
|---|---:|---:|---:|---:|
| Performance |65|65|86|96|
| Acessibilidade |100|100|100|100|
| Boas práticas |96|96|96|96|
| SEO |100|100|100|100|
| FCP |4,81s|4,73s|0,97s|0,94s|
| LCP |6,87s|6,42s|2,36s|1,21s|
| CLS |0|0|0|0|
| TBT |11ms|11,5ms|0ms|0ms|
| Transferência total |1.924.527B|1.647.413B|2.460.040B|1.298.871B|

Mobile: -277.114B/-14,40% de transferência, LCP -449,63ms/-6,55%, FCP -75,53ms/-1,57%. A nota permaneceu65: houve redução de peso, mas o carregamento móvel ainda precisa ser considerado uma pendência de desempenho. A variação de TBT0,5ms não comprova regressão isoladamente.

Desktop: +10pontos de Performance, transferência -1.161.169B/-47,20%, LCP -1.154,54ms/-48,87%, FCP -31,30ms/-3,23%. CLS permaneceu0 nas duas modalidades. Não prometer que esses tempos serão reproduzidos em toda execução, pois há um par por configuração e avisos de timeout.

## Comparabilidade e validade

Os JSONs antigos e novos de cada modalidade têm configSettings integralmente iguais, Lighthouse13.4.1, Chrome155 e mesmo hostUserAgent. Incluem Navigation/simulate, mobileRTT150ms/CPU4x e desktopRTT40ms/CPU1x, disableStorageReset=false e screenEmulation.disabled=true. O último campo significa que não se deve tratar os valores nominais412x823/DPR1,75 do bloco como viewport imposto pelo Lighthouse. Capturas completas têm412px de largura no mobile e1349px no desktop, iguais às respectivas referências. As alturas9464/2824 são da página completa, não da janela. Capturas finais conferidas visualmente mostram o feed, sem modal de boas-vindas ou vídeo.

Na preparação havia uma ressalva de possível mudança de conteúdo. A análise dos arquivos agora confirma que a sequência das URLs de imagens é a mesma depois de normalizar apenas mqdefault→maxresdefault e as variantes locais160/320→original. Isso reforça a comparabilidade dos recursos de imagem; não significa possuir um snapshot histórico integral de todos os campos/contadores da base ou controle de variações de rede.

Ambos os novos relatórios continuam com avisos de IndexedDB e tempo limite. Nenhum runtimeError fatal foi registrado. O proprietário confirmou anonimato: não atribuir o aviso a uma janela incorreta. Os resultados podem estar incompletos e não constituem uma medição definitiva livre de ressalvas. Não repetir auditorias para selecionar uma nota melhor.

O insight de LCP final aponta o h1 Pequenos clipes. Grandes jogadas. nos dois modos. No mobile já era o h1 antes; no desktop o LCP anterior era uma miniatura. Portanto a queda do LCP desktop também envolve mudança do elemento que define essa métrica. Não alegar que foi medido o mesmo vídeo carregando49%mais rápido. Tempos observados do insight não devem ser misturados aos valores simulados da tabela.

## Evidências dos ganhos entregues

| Recursos medidos pelo Lighthouse | Mobile antes/final | Desktop antes/final |
|---|---:|---:|
| JS bruto |889.145→851.236B|889.145→851.236B|
| Scripts |9→8|9→8|
| Imagens brutas |937.284→703.914B|1.471.927→354.930B|
| Imagens solicitadas |8→8|16→16|
| CSS bruto |21.082→15.690B|21.082→15.690B|
| Arquivos CSS iniciais |2→1|2→1|

Os oito scripts finais e seus tamanhos correspondem à build congelada index--bxgfUlq.js e ao grafo da D:851.236B. Transferência de scripts com headers:852.687B. Não confundir esses números com gzip offline ou total de assets do dist. Contra a referência Lighthouse anterior à B–D, a redução de JS é37.909B/-4,26%; os39.218B/-4,40% registrados na D usam uma referência imediata C ligeiramente diferente. Ambos os cálculos estão corretos para suas bases e não devem ser misturados.

B comprovada nas requisições: desktop carrega welcome-160.webp30.224B e image-unavailable-160.webp34.182B. Mobile carrega variantes320 de91.122B/104.666B, em vez dos originais198.180B/230.978B. Isso reduz exatamente233.370B de imagens brutas no mobile; as miniaturas YouTube continuaram maxres nessa largura/densidade. Não atribuir redução móvel à seleção mqdefault quando os registros mostram o contrário.

C comprovada no desktop: as sete miniaturas elegíveis YouTube passaram de maxresdefault para mqdefault, mantendo IDs/fontes; Twitch e capaIGDB conservaram suas URLs. Junto das variantes B, as imagens desktop reduziram1.116.997B brutos. Mantiveram-se16imagens: a economia não veio de remover conteúdo ou de uma falha geral do feed. Imagens retornaram200. Fontes grandes no mobile são uma escolha conservadora de resolução/enquadramento, com oportunidade residual condicionada a fonte oficial adequada; não sacrificar qualidade ou controles apenas para eliminar alerta.

D comprovada: o relatório inicial não solicita ShortSequenceDialog/OfficialPlayer/AdminPage/formulário persistente. Só existe o documento principal, sem navegação de iframe de player. Uma sessão204 e uma chamada feed/ordered200 por auditoria; não apareceu duplicação desse endpoint. Isso não permite afirmar ausência universal de duplicação em qualquer interação ou transporte Firestore.

## Limitações que continuam abertas

- FCP4,73s/LCP6,42s mobile continuam altos, mesmo com menos bytes e CLS0. Não declarar o desempenho móvel resolvido pela nota desktop96.
- JavaScript não utilizado estimado pelo Lighthouse:480.210B mobile/480.230B desktop, aproximadamente469KiB. Cobertura dessa navegação não é prova de código morto. Firestore continua necessário ao catálogo conforme arquitetura aprovada; não remover SDK, enfraquecer autenticação ou migrar API sem proposta própria.
- Economia potencial de imagens estimada:633.470B mobile/~619KiB e270.600B desktop/~264KiB. São estimativas, não promessa nem valores a somar ao ganho já entregue. Provedores/URLs assinadas e qualidade limitam mudanças seguras.
- Uma requisição Firestore Listen/channel HTTP200 permanece finished:false, como na referência. Pode estar relacionada à quietude/timeout, mas causalidade não foi provada; não chamar de vazamento ou consulta duplicada nem encerrar SDK para melhorar nota.
- Boas práticas96 continua associada a issue Cookie no transporteHTTP do emulador8080. Ambiente local não representa infraestrutura final; não prometer correção automática por upload.
- Acessibilidade100 coexiste com30ocorrências de label-content-name-mismatch, como antes. Nota100 não substitui a revisão específica dos rótulos; nenhuma correção de rótulos nova foi autorizada por estes resultados.
- Servidor5175 continua sem compressãoHTTP e com Cache-Control:no-cache. Gzip/cache/CDN reais pertencem à preparação da hospedagem autorizada; não foram modificados. Não comparar esta medição com produção como se já houvesse configuração final.
- Teclado virtual, toque, autoplay, densidade/nitidez e avaliação visual5174 continuam no checklist E. A restrição YouTube150 diagnosticada em dois vídeos continua separada de regressão do Clipzone.

## Evidências, validação e fechamento

Arquivos recebidos preservados com tamanho/SHA256 em C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-10-f/received-manifest.json. Cópias dos quatro HTML/JSON novos, comparison.json com métricas/recursos/configurações/URLs, achados separados e capturas210903-final.jpg/211026-final.jpg. HTML arquivado, não executado. readiness.json preserva hashes da build e referências originais. analyze.mjs permite reextrair os dados sem executar Lighthouse.

Nenhum arquivo da aplicação alterado, nova biblioteca, auditoria repetida, deploy, infraestrutura, reset, seed ou gravação em produção/dados locais. Reutilizadas as149aprovações da E, lint/build e os testes específicos B/C/D; não repetir testes sobre código inalterado só por chegada de relatórios. git diff --check da documentação conferido. Commits da E já feitos pelo proprietário; pendentes nesta entrega somente os três documentos F/plano/continuidade.

O ciclo autorizado7.6.10 está encerrado quanto às otimizações, regressão automatizada/em navegador e análise final disponível, com timeout e desempenho móvel ainda documentados como limitações e aceite físico pendente. Nenhuma nova correção começa por inferência. Próximo passo: receber o prompt de refinamentos anunciado pelo proprietário e manter o checklist físico para quando puder executá-lo. Etapa8/deploy/produção permanecem suspensos até autorização específica.

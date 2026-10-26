# Etapa 8 — pacote local consolidado para homologação

25/10/2026, America/Sao_Paulo. Base f23962c869aa91d9581ca8b17ac9211a36db20e4, limpa antes do trabalho; bundle de segurança criado/verificado fora do repositório. Proprietário autorizou agrupar os ajustes locais restantes e reservar decisões remotas para escopos concretos. **Nada publicado, nenhum recurso/credencial/permissão/plano/dado remoto alterado.**

## Entregas

| Parte | Mudança | Efeito e salvaguarda |
| --- | --- | --- |
| Testes da interface | Harness atualizado para carregamento adiado, paginação e contexto atuais | Usa o helper real onde apropriado; preserva asserções de feed/filtro/paginação e busca desativada |
| Build API | Modo api e script build-homologation; modo firestore-emulator mantido | Frontend usa API same-origin; cliente Firestore antes sem uso foi substituído pela mesma identidade compartilhada de cache, sem conexão8080/SDK Firestore no navegador |
| Credencial servidor | PKCS8/RSA2048–4096 com WebCrypto não exportável; fornecedor OAuth com cache sem transporte antigo | Segredo injetado explicitamente, sem leitura de arquivo/ADC; refresh usa budget da invocação atual; erros privados |
| Composição Workers | cloudflare-main e cloudflare-application optativos | Google/TOTP/UID/revogação, IP/contexto de ingresso, origem/cookies e quotas preservados; transporte único para banco, OAuth, providers, prévia e redirects TikTok |
| Banco vazio | Executor sem rota/CLI/default e proposta de3marcadores create-only | Exige escritores desligados, inspeção de raiz vazia e leituras antes de creates; recusa conteúdo/marcadores existentes; sem seed/import/reset |
| Ranking | Nova geração em passos persistidos, mantida implementação local anterior |15fontes processadas ou20itens staged por passo; snapshot fixo; só publica ponteiro depois de tudo; concorrência/retomada/falha não truncam geração pública |
| Manutenção | Retenções com limites opcionais, dispatcher de jobs optativo e cursores persistidos |8registros de rede/curtidas ou15itens de ranking por fatia; padrões locais30 mantidos; gerações vigente/anterior protegidas; limpeza tardia de runs falhos por ID |
| Admin | Batch transacional opcional de até4leituras; inbox e comentários sinalizados usam mesma transação | Mantém janelas20+1, flags, escopo/cursor, estado de leitura e autorização; reduz requests, sem confundir com redução de documentos faturáveis |
| Publicação | Template inativo e pacote remoto proposto | Endereço/bindings/segredos/cron/regras/deploy dependem de aprovação; nenhum comando de aplicação automática |

Arquivos principais: server/runtime/cloudflare-main.ts, cloudflare-application.ts, empty-database.ts, worker-maintenance.ts; server/auth/service-key.ts/service-token.ts; server/ranking/segmented-generation.ts; server/firestore/read-many.ts; scripts/build-homologation.mjs. Contratos antigos de leitura em lote e de auth mantidos.

## Evidências e métricas

- **116 testes Node relacionados aprovados**, abrangendo auth/TOTP/UID/revogação, publicação/prévia, comentários, inbox, catálogo, retenção, ranking, credenciais, cache e build. Não foi executada a suite completa indiscriminadamente.
- **16 cenários no workerd local aprovados**, rede externa bloqueada; ferramentas existentes Wrangler4.152.0/workerd1.20261019.1, sem instalar bibliotecas.
- **4 integrações reais em8081/demo-clipzone-tests aprovadas**: inicialização3marcadores/recusa de reset; ranking37itens/retomada/falha mantendo ponteiro; restauração157fixtures com checksum e creates; inbox e comentários sinalizados transacionais. Nenhuma leitura/gravação8080 ou remota.
- Ranking100jogos distintos:14invocações, maior passo **38 chamadas REST semOAuth**; uma renovação OAuth adiciona uma chamada sob o mesmo budget. Com300fontes/100itens:28passos, snapshot com26min na publicação no relógio simulado de1min/passo. A próxima geração é calculada a partir do snapshot para não somar atraso de publicação à janela horária.
- Retenção8registros de rede: **34 chamadas comOAuth incluído** e verificação de ranking not-due. Inbox20eventos: **18 chamadas de dados**; filtro de comentários: **8**; auth/limiters/OAuth são adicionais e continuam no budget compartilhado de48. Não são custos Firestore faturados: lotes continuam cobrando documentos, queries vazias/retries/índices podem acrescentar consumo.
- Build API sem inicialização do emulador nem módulos browserFirestore; grafo inicial de entrada+feed medido pelo teste existente: **378675bytes JS**, sem baixar visualizadores/players/admin antes da interação. Não equivale a transferência gzip, Lighthouse ou medição no celular.

JSON sanitizado: [etapa-8-pacote-local.json](evidencias/etapa-8-pacote-local.json). Chaves de testes são efêmeras; nenhum valor real incluído. Tipos/lint/build/diff-check conferidos na conclusão.

## Limites mantidos e operacionais

Geração continua limitada a100vídeos/300fontes, sem publicar prefixo ao exceder; snapshot/falha de métricas/epoch ou lease interrompem com geração anterior preservada. Checkpoint limitado128KiB, lease5min renovado a cada passo, validade máxima30min da construção segmentada. O código monolítico local antigo mantém seu contrato. O caminho novo espera cron aproximado de1min; atraso, quota ou CPU podem impedir retomada e deixar ranking indisponível quando ultrapassar a frescura exigida, sem servir dados falsamente novos. Isso deve ser homologado no destino.

Ranking reserva900leituras/180escritas por geração dentro dos budgets diários existentes20000/4000; sucesso reconcilia estimativa de leituras e contagem de escritas aplicadas. Falhas mantêm reserva conservadora; retries/concurrência/plataforma não são contabilização faturada global. O Firestore mantém sua própria franquia e outros fluxos também consomem. Não reduzir proteção ou habilitar cobrança se um limite interromper operação.

Não certificamosCPU real10ms nem disponibilidade das credenciais/providers/IAM no edge. O pool OAuth compartilha somente identidade/token/chave; não guarda fetch/budget de requisição anterior. Auth continua revalidando a conta atual. Reinicialização da composição por rotação dos bindings invalida seu cache. Nenhuma chave real criada/carregada. Configuração TOTP real ainda exige prova dedicada, sem substituir por SMS.

Nenhum player YouTube/Twitch/TikTok, lógica de navegação entre shorts ou interação do Clipper foi alterado. Os testes existentes relacionados sustentam os contratos alterados; não substituem os testes físicos finais PC/mobile. Não é uma garantia absoluta de ausência de regressão.

A nova query de descoberta de rankingRuns usa apenas nome de documento, sem novo composto nem mudança das15configurações. Os37+15arquivos de índices/regras continuam intactos. A inicialização proposta agora tem3marcadores; não aplicar a proposta histórica de2sem revisar esse acréscimo. Não inicializar marcador sobre histórico existente.

## Situação para avançar

Preparação local agrupada de8-C e operação8-D avançou com código/testes; entrada e template8-E preparados. **Etapa8 inteira ainda não concluída**: setup remoto8-C, TOTP/IAM/segredos reais, cron/origem/HTTPS e homologação8-E/F permanecem pendentes. O plano detalhado está em [etapa-8-pacote-remoto-proposto.md](etapa-8-pacote-remoto-proposto.md). PWA8.5 e auditoria9 não iniciadas.

Servidores5174/5175/8080 não reiniciados. A build dist foi gerada no modoAPI para homologação local; isso não publica o site nem confirma que um servidor5175 esteja em execução. Dados locais e backups de shorts/jogos preservados, sem migração. Não é necessário repetir Lighthouse ou reiniciar API neste momento para validar módulos Workers ainda optativos.

## Aproximação da publicação

Próximo gate deve ser o **pacote remoto8-C concreto**, e não outra rodada genérica de auditoria: alvo clipzone-db02a/(default), índices37+15, identidade/permissões mínimas e inicialização3marcadores sob aprovações específicas. Hand-off de credenciais quando necessário. Depois, autorização distinta para endereço gratuito e publicação HTTPS de homologação, medirCPU/ingresso/providers e validar fluxos reais antes de ativar jobs e cadastrar conteúdo definitivo.

Rollback: bundle de código anterior verificado e checkpoint final dos arquivos pendentes; nenhuma limpeza de banco. Teste de restauração apenas de fixtures não é backup real de produção; procedimento de backup privado/manual precisa ser decidido antes do conteúdo definitivo. Sem serviços de armazenamento/backup pagos adicionados.

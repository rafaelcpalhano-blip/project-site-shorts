# Etapa 8 — pacote remoto proposto para aprovação

25/10/2026. Documento de revisão; **não executado e não autoriza operações por si**. Alvo identificado por configuração/App ID/Project Number/console: `clipzone-db02a/(default)`, São Paulo, projeto818748049569. Não usar clipzone-db02a2. Planos Spark e Workers Free/sem Cloud Billing observados nas auditorias anteriores; reconferir antes de aplicar. Nenhuma regra local, índice, IAM ou credencial foi publicado/criado pelo pacote local.

## Aprovação remota 8-C sugerida — preparação, sem deploy

1. Reconfirmar projeto exato, Spark/sem billing e ausência de configuração inesperada. Se houver divergência, quota indisponível ou exigência de ativar API/billing, parar e relatar; não criar outro alvo ou migrar dados.
2. Aplicar exclusivamente `firestore/firestore.indexes.json`:37compostos e15configurações de campo revisados, sem exclusões automáticas ou pesquisa dormente. Esperar prontos e comparar definições/estado. Não publicar regras junto com índices. Publicação de índices é alteração remota e ainda aguarda aprovação separada.
3. Preparar identidade de runtime **proposta** `clipzone-runtime@clipzone-db02a.iam.gserviceaccount.com` e papel personalizado **proposto** `clipzoneRuntimeDatastore` no projeto confirmado, com os6candidatos de `etapa-8-c-iam-proposta.json`: datastore.databases.get, datastore.entities.get/list/create/update/delete. Conferir permissões reais por método antes da concessão; se não forem suficientes, apresentar a diferença. Sem Owner/Editor/Firebase Admin, administração de Auth/índices/billing/backup/import/export. Operador de setup separado da identidade runtime. Criação/concessão de acesso sensível requer aprovação específica no momento apropriado; não presumir a partir desta proposta.
4. Custódia de chave: o código importa PKCS8 somente de binding servidor explícito e usa chave não exportável. **Nenhuma chave real foi gerada.** O proprietário deverá acompanhar criação/inserção da credencial e segredos nos bindings aprovados quando chegarmos a esse ponto. Não enviar pelo chat ou screenshots. A criação e armazenamento de credenciais não estão incluídos em uma autorização de índices. Rotação troca a configuração privada/invalida cache; revogação da chave anterior somente após validação e aprovação.
5. Com todos os escritores/jobs desligados, reconferir ausência de coleções e metadados no alvo exato. A observação anterior de raiz vazia é pontual; não basta para escrita futura. Preparar inicialização **create-only** de **3**documentos: `gameNameState/v1`, `rankingState/metrics` e `adminQueueState/reportTitles`. O terceiro resolve a dependência da ordenação administrativa de denúncias encontrada na auditoria; ele não constava da proposta antiga de2documentos. Gerar epoch/data novos; não copiar fixtures. Confirmar alvo do inspector e store iguais, tratar conteúdo inesperado como interrupção. Sem exclusão, sobrescrita, reset, importação ou conteúdo de testes.

Cada item acima é apresentado para decisão, não uma ordem de execução. Pode-se autorizar o conjunto de preparação explicitamente, mantendo o handoff necessário para segredos/permissões sensíveis. O executor de inicialização não está ligado a rota HTTP nem existe CLI que o aplique por padrão. Não usar scripts locais de seed/prepare/backfill contra o remoto.

## Aprovação posterior 8-E — homologação HTTPS

Proposta de nome do Worker: `clipzone-homologacao`, sujeita à disponibilidade e aprovação; endereço gratuito final `<worker>.<subdominio-da-conta>.workers.dev`, ainda não criado/reservado. O template `examples/wrangler.homologacao.example.jsonc` é deliberadamente incompleto/inativo, com workers_dev=false, origem placeholder e jobsfalse. Não é um comando de deploy. Nenhum manifesto ativo foi criado na raiz e nenhum cron foi configurado.

Após aprovação explícita: definir endereço/origem canônicos, bindings e segredos; adicionar somente o domínio exato ao Auth, publicar regras revisadas no momento apropriado (leitura SDK somente de jogos ativos, escritas e privados bloqueados), publicar a build API e a entrada Workers, conferir assets/API e validar antes de ativar jobs. Alteração de domínio/regras/deploy requer escopo aceito, sem wildcard. Assets devem atender o estático diretamente; reservar /api, /api/* e /images/games/* para o Worker. Não ativar acesso público antes de autenticação/API/credenciais/domínio estarem prontos.

Bindings privados previstos, somente nomes: FIREBASE_SERVICE_PRIVATE_KEY, CLIPZONE_VISITOR_SECRET, CLIPZONE_NETWORK_SECRET, FIREBASE_AUTH_API_KEY, CLIPZONE_ADMIN_UIDS, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, YOUTUBE_API_KEY. App ID/Project ID/origem são metadados públicos; a chave Firebase do SDK pode ser devolvida pela configuração pública de Auth como exigido pelo SDK, sem conceder privilégio administrativo. Segredos de serviço/HMAC/Twitch nunca são devolvidos ao cliente nem devem usar VITE_*.

O fluxo exige Google+TOTP+UID no backend e revalidação da conta atual em cada ação privilegiada. Confirmação TOTP específica continua pendente no ambiente real; não substituir por SMS nem ampliar allowlist. O dono pode precisar participar do login/teste e da configuração segura de segredos; não é necessário reiniciar serviços locais agora.

Ativar agendamento somente após validar CPU/latência/IAM no destino. Proposta operacional: um evento por minuto, um passo limitado de ranking por evento; nos intervalos, uma fatia de manutenção. A operação não depende de visitantes. A configuração de cron não está aplicada. Se o limite10msCPU inviabilizar algum caminho real, interromper/rever antes de lançar; os testes locais não certificam CPU faturada.

## Checklist de liberação 8-F

- Confirmar endereço HTTPS, callback/domínio Google e TOTP/UID negando contas não autorizadas.
- Publicação/prévia em YouTube/Twitch/TikTok com credenciais e restrições reais revisadas. Egress Workers não é IP fixo: uma chave YouTube restrita ao IP residencial pode continuar falhando no remoto. Não modificar restrições sem aprovação.
- TikTok curto com redirects limitados, extração de link Twitch, players e links externos; controles Twitch mínimos400×300 e autoplay mobile com interação preservados.
- Sessão/cookies Secure/HttpOnly/__Host, origem/CSRF e transporte real Cloudflare; sem confiança em X-Forwarded-For arbitrário. Provas de cf locais continuam sintéticas.
- Feed, retorno/paginação, catálogo, comentários/curtidas/denúncias, inbox e filtros administrativos completos no PC/celular. Não marcar os testes físicos pendentes como aprovados.
- Ranking completo e retomada, retenção somente de dados elegíveis, cotas persistidas e falhas controladas; geração anterior preservada até troca atômica. Quota/CPU da plataforma pode impedir resposta personalizada ou log após commit: não prometer rollback global.
- Uma rodada Lighthouse comparável após estabilizar homologação; não repetir durante preparação local.
- Tradução IA continua opcional, **não habilitada na composição remota** e não alterada no ambiente local. Avaliar elegibilidade gratuita do modelo antes de configurar; não ativar serviço pago, omitir silenciosamente uma dependência exigida pelo produto ou prometer disponibilidade sem essa decisão.

## Rollback, backup e interrupção

Ponto de código anterior ao pacote: f23962c869aa91d9581ca8b17ac9211a36db20e4, bundle local verificado. Rollback de deploy futuro deve reutilizar versão anterior e desligar entrada de escritores/jobs de maneira aprovada; não limpar Firestore. A versão anterior não deve depender de metadados inexistentes.

Teste de restauração feito somente com157documentos fictícios em8081: checksum/detecção de corrupção, restauração create-only e recusa de sobrescrita. **Não é backup de produção nem serviço remoto de backup implementado.** Antes de conteúdo definitivo, definir procedimento de exportação/restauração manual autorizado para arquivo privado local, fora de Git/pastas públicas, com privilégio separado. Nenhum backup gerenciado, Storage/R2, TTL/PITR, banco adicional ou plano pago foi ativado. Dados locais de testes e backups existentes continuam preservados e não serão migrados.

Workers Free e Spark aceitam interrupção ao atingir franquias. Não ativar upgrade automático ou Cloud Billing; não usar serviços pagos como fallback. O budget de48dispatches limita a invocação e preserva1chamada de cleanup, mas não impede o tetoCPU da plataforma nem limita globalmente todos os consumidores do Firestore. Alertas/observabilidade e margens operacionais precisam ser conferidos na conta real sem criar serviços desnecessários.

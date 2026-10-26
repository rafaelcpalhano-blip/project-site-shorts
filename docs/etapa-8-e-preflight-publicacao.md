# Etapa 8-E — preflight da publicação autorizada

Atualização posterior: chave separada verificada,8bindings enviados,hostnameAuth adicionado e primeira publicação executada. Acesso público suspenso preventivamente após amostrasCPU11/15ms; estado atual em [etapa-8-e-publicacao-controlada.md](etapa-8-e-publicacao-controlada.md). O restante registra o preflight anterior.

26/10/2026. Proprietário autorizou prosseguir após o pacote de publicação/envio dos8bindings no endereço https://www.clipzone.workers.dev. Essa aprovação permanece válida; não solicitar novamente a mesma publicação por mudança de turno. A chave YouTube separada também foi autorizada. A publicação aguarda geração e armazenamento privado pelo proprietário, seguida da conferência de restrições; nenhum deploy executado.

## Confirmado

- Proprietário executou login oficial Wrangler e concluiu consentimento. whoami confirmou OAuth na conta esperada; não usamos conta temporária nem instalamos a ferramenta de agentes sugerida pela página. Não registrar token/cache privado ou dados de conta no relatório.
- Ambas as chaves Google configuradas pertencem ao projeto818748049569/clipzone-db02a. Consulta somente de metadados APIKeys, sem imprimir valores, nomes/IDs das chaves, IPs ou objetos de erro que carreguem a query privada. Nenhuma API ativada.
- YOUTUBE_API_KEY: restrita a youtube.googleapis.com e a7IPs específicos; nenhuma faixa0.0.0.0/0,::/0 ou equivalente universal. Esta arquitetura WorkersFree não tem egress estático configurado. A lista não garante operação estável de requisições vindas do Worker. É divergência de configuração verificada, **não falha real reproduzida no Worker ainda não publicado**.
- FIREBASE_AUTH_API_KEY: metadados browserKeyRestrictions vazio,API-targets Firebase; nenhuma alteração. GET público de configuração IdentityToolkit retornou200 com e sem Referer do endereço proposto. Novo hostname ainda ausente dos autorizados. Isso confirma somente uso da chave nesse endpoint,não loginGoogle/TOTP ou validação backend de token; essas provas continuam pendentes.
- Preparados7bindings em arquivo privado worker-secrets.pending.json sob LOCALAPPDATA/Clipzone/credentials,foraGit/dist. DoisHMACnovos independentes64hex,PKCS8validado,mesmo1UID e configs existentes Auth/Twitch. ACL do arquivo conferida:usuárioWindows+SYSTEM. A chaveYouTube local foi deliberadamente excluída;arquivo incompleto não pode ser usado para publicar. Nenhum valor de segredo em relatório/log/Git;nenhum segredo enviado ao remoto.

## Decisão autorizada

Recomendação: chave **separada** para YouTube no Workers, mesmo projeto clipzone-db02a, API restrita exclusivamente a YouTube Data API v3 (youtube.googleapis.com), sem restrição de aplicação por IP. A credencial permanecerá somente no secret servidor YOUTUBE_API_KEY; não usar restrição por Referer de navegador para chamadas do backend, não colocar no frontend nem compartilhar por chat. Manter chave local e seus7IPs inalterados.

Sem restriçãoIP, a posse do segredo permite consumir a API e sua quota, portanto a proteção passa por custódia no servidor,restrição de API e controles de uso já existentes. Não é uma chave irrestrita para todas as APIs. Nova chave não cria outra franquia de YouTube ou garante disponibilidade: compartilha projeto/quotas,que devem falhar controladamente;sem billing/upgrade. Não adicionar faixas de rede Cloudflare em massa nem contratar egress fixo,proxy/VM/serviço pago.

O proprietário autorizou expressamente a chave separada. Geração e inserção privada dependem da participação do proprietário, conforme regra de handoff para credenciais do controle do navegador. Nenhuma criação,remoção de restrição,rotação ou revogação realizada por suposição. Alternativa é aguardar antes de publicar; não desativar YouTube ou publicar recurso sabidamente incompleto sem decisão. Não alterar Auth/Twitch para contornar o problema.

## Retomada após armazenamento privado

1. Proprietário gerar a chave separada e salvar somente seu valor em LOCALAPPDATA/Clipzone/credentials/youtube-workers-key.txt. Arquivo vazio preparado sem sobrescrever existentes, ACL usuário+SYSTEM conferida. Não enviar chave por chat ou screenshot.
2. Conferir metadados/serviço/projeto da nova chave sem imprimir valor;completar somente o oitavo binding,sem regenerarHMAC nem mudarUID.
3. Reconferir conta/subdomínio/plano/manifesto;adicionar somente hostnameAuth preservando todos os existentes e TOTP;publicar pacote aprovado com jobsfalse/previewfalse/regrasdeny-all.
4. Validar HTTPS/segurança/provedores/CPU conforme proposta. Testes podem criar registros técnicos reais de sessão/limites;sem fixtures ou migração. Escritas de conteúdo e login/fator acompanhados conforme planejamento.

Nenhum Worker,domínioAuth,regra,IAM,índice,billing,serviço pago,conteúdo ou deploy alterado nesta rodada. Não reiniciados5174/5175/8080. Sem build/suíte/Lighthouse repetidos. Arquivo privado parcial permanece protegido para retomar;JSON original da conta de serviço preservado. Publicação aprovada não está cancelada:aguarda geração/armazenamento privado da chaveYouTube já autorizada e posterior conferência.

Evidência sanitizada: [etapa-8-e-preflight-publicacao.json](evidencias/etapa-8-e-preflight-publicacao.json). Referências: [restrições APIKeys](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys) e [boas práticas de chaves](https://docs.cloud.google.com/docs/authentication/api-keys-best-practices).

## Segurança dos IPs e cobertura dos provedores

Os sete IPs são origens permitidas para usar a chave local; não abrem portas, não concedem acesso à máquina nem são publicados no frontend. O histórico de cada entrada não foi confirmado. Excluir uma origem ainda utilizada pode interromper chamadas YouTube nos testes locais. Nenhum IP ou chave antiga alterado. Limpeza futura depende de revisão separada. Nova chave compartilha quota do projeto, sem franquia adicional ou billing.

Twitch/IGDB: client ID/secret ficam no servidor, token client credentials; player deriva parent do hostname atual. TikTok: oEmbed para metadados/canal, player oficial /player/v1 e resolvedor de links curtos com hosts validados e redirecionamentos limitados; sem chave TikTok no fluxo. Ambos inspecionados no código, sem mudança funcional. Os três provedores permanecem na homologação HTTPS pendente; revisão de código não equivale a teste remoto aprovado.

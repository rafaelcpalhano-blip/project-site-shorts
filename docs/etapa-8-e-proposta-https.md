# Etapa 8-E — proposta concreta de homologação HTTPS

26/10/2026. **Preparada, não publicada.** Autorização desta rodada cobre planejamento/verificações locais e leitura de configurações. Nenhuma aplicação criada, domínio adicionado ao Auth, segredo transmitido ou deploy efetuado. Atualização autorizada pelo proprietário: somente o subdomínio da conta Cloudflare foi trocado para clipzone.workers.dev; o nome www do Worker foi escolhido para produzir o endereço abaixo. A autorização anterior da8-C não é autorização de publicação.

## Endereço e arquitetura propostos

Worker `www`, origem canônica **https://www.clipzone.workers.dev**, na mesma conta Cloudflare cujo subdomínio confirmado agora é clipzone.workers.dev. Subdomínio da conta já salvo; o endereço da aplicação ainda não foi criado/publicado, pois não existe Worker www. Console autenticado exibiu0aplicações/0requisições hoje e planoFree atualUS$0. Não escolher outra conta/nome/domínio por suposição se houver divergência.

Uma implantação Workers com ASSETS para dist e API em /api na mesma origem; sem CORS wildcard, sem domínio comprado/DNS/Pages adicional/servidor Node pago. Assets servidos diretamente quando correspondem ao arquivo; Worker-first somente /api, /api/* e /images/games/*, preservando o tratamento404 das capas. SPA continua usando os caminhos da aplicação. Capas: /images/games/ seguras e HTTPS images.igdb.com exato; sem upload, proxy novo ou armazenamento adicional.

Template inativo docs/examples/wrangler.homologacao.example.jsonc atualizado somente com a origem proposta. Mantidos workers_dev=false, preview_urls=false, CLIPZONE_JOBS_ENABLED=false, sem rotas/cron/accountID/segredos e sem manifesto ativo na raiz. A troca para publicação é ação futura explicitamente aprovada. Não prometer privacidade por URL pouco conhecida: workers_dev=true torna o endereço público. Não configurar Cloudflare Access/ZeroTrust como serviço adicional sem decisão própria.

## Evidências novas

- Configuração Auth lida por GET do projeto exato (resposta canônica projects/818748049569/config): subtypeIDENTITY_PLATFORM, MFAENABLED e providerTOTPENABLED, adjacentIntervals1. Resolve a dúvida anterior de habilitação do TOTP; não prova login real em HTTPS. Nenhuma alteração MFA, política, fator ou lista de usuários.
- Domínios atuais: localhost,127.0.0.1,clipzone-db02a.firebaseapp.com,clipzone-db02a.web.app. O hostname proposto ainda não consta.
- Chaves de configuração necessárias presentes localmente; allowlist tem1UID (valores não registrados). PKCS8/OAuth/leitura do runtime já verificados na8-C. Restrições e quotas reais de YouTube/Twitch/Firebase ainda precisam de conferência compatível com egress Workers; não presumir que deploy resolve chaves restritas ao IP residencial.
- Frontend usa API HTTP para catálogo/feed; não inicializa Firestore browser. Apenas referência de tipo Timestamp permanece. **Não é necessário ampliar regras de leitura de games para esta entrada.** Proposta anterior de publicar regras locais fica substituída por manter deny-all remoto. Auth SDK é independente dessas regras; servidor continua via IAM e validadores próprios.
- Wrangler4.152.0 já instalado no laboratório externo empacotou localmente a entrada sem erro:287,83KiB de Worker,61,94KiBgzip e37arquivos de assets reconhecidos. --dry-run, sem upload/login/remoto/instalação; carregamento .env dev desativado,sem segredo lido. Esses números são do Worker,não do JavaScript do navegador nemCPU/Lighthouse. Não foi necessário repetir build/suíte completos.

## Pacote remoto para aprovação separada

1. Autenticar o operador no Wrangler oficial, sem criar token genérico Owner/Editor. Conferir conta/subdomínio/Free e destinoFirebase exatos antes de qualquer escrita. Login/consentimentos e campos privados exigem participação quando necessário. Não ativar billing/APIs/plano/serviço extra por conveniência.
2. Preparar arquivo privado foraGit para os8bindings listados abaixo. Dois HMACs novos independentes de64hex para homologação; não reutilizar sessões locais. Usar PKCS8 da identidade dedicada e configurações existentes, sem ampliar o1UID. A preparação/transmissão desses valores para o Worker na conta Cloudflare precisa estar explicitamente aprovada; nunca solicitar conteúdo pelo chat. Arquivo só temporário de operação em pasta com ACL privada; limpeza combinada, sem apagar o JSON original da conta de serviço.
3. Adicionar **somente www.clipzone.workers.dev** a authorizedDomains do Firebase Auth, preservando todos os existentes e o TOTP/intervalo1. Não criar OAuthclient/fator/usuário administrativo, alterar listaUID, SMS, regrasFirestore, IAM, índices ou metadados. Se for necessária mudança adicional de restrição de chave/OAuth, apresentar a divergência antes de alterar.
4. Publicar **primeira versão do Worker e assets** no endereço aprovado, com os8bindings privados completos na mesma operação planejada, origem exata, preview_urls=false e jobsfalse. Usar fluxo oficial com secrets-file privado; não executar secret put repetidamente, pois faz deploy imediato. Conferir que arquivo privado está fora de assets e nunca copiar segredo ao manifesto/vars públicas/bundle/log. Não publicar versão intermediária com proteções desativadas. Nenhum GitHubCI, cron, R2, Storage, DurableObjects, KV ou outro serviço adicional.
5. Validar domínio HTTPS/estáticos/API e auth/origem/cookies, preservando __Host/Secure/HttpOnly/SameSite, Google+TOTP+UID e revalidação de conta. Não confiar em X-Forwarded-For arbitrário; conferir ingresso Cloudflare real e rejeições. Owner realiza login/fator sem compartilhar códigos. Testes do site podem criar **registros técnicos reais de sessão, limites e recibos**; não representam importação de jogos/shorts, mas são escritas previstas do funcionamento da API. Não prometer leitura HTTP sem nenhuma escrita interna. Sem fixtures de conteúdo/migração; conteúdo definitivo e testes de publicação escolhidos pelo proprietário.
6. Medir CPU/erros do WorkersFree por cenários controlados, sem logar requests/headers/tokens brutos. Distinguir CPU de latência/rede e identificar valores indisponíveis em vez de inventar. Verificar publicação,curtidas,comentários,autenticação,ranking e moderação antes da liberação completa; operações que criam conteúdo e ativação de ranking/jobs ficam explicitamente coordenadas. Build/OAuthNode não certificam o teto10ms. Em excesso de quota/CPU/falha de proteção, interromper homologação e relatar,sem reduzir segurança ou upgrade automático.

| Binding privado | Origem prevista / regra |
| --- | --- |
| FIREBASE_SERVICE_PRIVATE_KEY | PKCS8 já validado, da conta clipzone-runtime; somente secret servidor |
| CLIPZONE_VISITOR_SECRET | Novo HMAC para homologação,64hex |
| CLIPZONE_NETWORK_SECRET | Outro HMAC independente,64hex |
| FIREBASE_AUTH_API_KEY | Configuração existente; não confundir com privilégio administrativo; SDK requer sua exposição pública controlada em /api/admin/config |
| CLIPZONE_ADMIN_UIDS | Mesmo1UID existente; não incluir novos administradores |
| TWITCH_CLIENT_ID | Identificador da integração existente, mantido no servidor |
| TWITCH_CLIENT_SECRET | Segredo existente; nunca devolver ao navegador |
| YOUTUBE_API_KEY | Chave existente; conferir restrições adequadas ao runtime sem mudá-las automaticamente |

Metadados públicos: origem,project/authProjectclipzone-db02a,AppID1:818748049569:web:c73f2f86ab6e589f6a88e0,serviceemail e jobsfalse. ASSETS é binding de arquivos,não credencial. Não adicionar nenhum VITE_* privado. A permissão IAM do runtime permanece a mesma: não receber administraçãoAuth/índices/billing para executar a aplicação.

## Gates e retomada

O pacote acima inclui publicação pública de homologação e transmissão explícita dos8valores privados ao Worker; ainda aguarda aprovação. Verificação de configuração TOTP está concluída, mas matrícula/login/fator e negação de contas não autorizadas só podem ser certificados no teste real. Preservar fatores existentes. Manter regrasFirestore deny-all; não publicar regras por hábito.

Jobs/agendamento permanecem desligados até medições/validação e aprovação própria; ranking inicial ainda não gerado no remoto,portanto não declarar relevância pronta. TraduçãoIA opcional segue não ativada na composição remota até confirmar elegibilidade gratuita e decisão; não prometer que todos os recursos foram homologados. Preservar IA local. Restauração/backup operacional de conteúdo definitivo e testesPC/mobile permanecem no checklist; PWA8.5eEtapa9 não iniciadas.

Primeiro deploy não tem versão de produção anterior para rollback. Se precisar interromper, proposta é desabilitar a rota pública e URLs de preview/deployment aplicáveis, conferir o bloqueio e manter dados,índices,IAM e credencial; não apagar banco/Worker ou revogar chaves por impulso. Se existir versão anterior posteriormente, restaurar somente versão compatível com os dados e sem religar jobs. Definir/autorizar a interrupção junto com a publicação; nenhuma alteração executada agora.

Uma rodada Lighthouse comparável e checklistPC/celular somente após estabilizar homologação, sem repetir durante planejamento. Caso qualquer operação peça plano pago,ativaçãoAPI ou alteração extra de acesso,parar nesse ponto e apresentar. CloudflareFree/Spark aceitam interrupção por franquia,sem billing/upgrade automático.

## Fontes e artefatos

Evidência sanitizada: [etapa-8-e-proposta-https.json](evidencias/etapa-8-e-proposta-https.json). Bundle seco foraGit em runtime-lab-8b/evidence/https-proposal-bundle. Nenhum secreto ouID privado de conta incluído.

- [Endereço workers.dev e exposição pública](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
- [Assets e Worker-first seletivo](https://developers.cloudflare.com/workers/static-assets/binding/).
- [Segredos e efeito de deploy de secret put](https://developers.cloudflare.com/workers/configuration/secrets/).
- [Consulta da configuração Auth](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/projects/getConfig).
- [TOTP no Firebase](https://firebase.google.com/docs/auth/web/totp-mfa).

## Atualização de nome aprovada — 26/10/2026

O proprietário recusou nome pessoal e a palavra homologacao no URL e aprovou www.clipzone.workers.dev. A verificação de disponibilidade confirmou clipzone.workers.dev livre como namespace da conta. Confirmado Update e conferido no painel: Subdomain clipzone.workers.dev e No projects found. Nenhum Worker, endpoint, token, binding, segredo, domínio Firebase ou deploy criado. A mudança afeta o namespace de todos os Workers dessa conta; na observação não havia aplicações existentes. O nome antigo não deve voltar a ser usado como origem/hostname de publicação.

Formato oficial nome-do-worker.subdominio-da-conta.workers.dev: usar name=www e conta=clipzone resulta em https://www.clipzone.workers.dev. clipzone.workers.dev isoladamente é namespace da conta, não o endereço padrão da aplicação. Esta aprovação de troca/nome não autoriza o pacote de publicação ou envio de segredos. O template continua inativo; o próximo gate de publicação se aplica somente ao endereço novo.

Mudança local apenas de metadados de nome/origem; configuração JSON conferida e workers_dev/preview_urls/jobs continuam desligados. O dry-run anterior valida a entrada/código/empacotamento antes desta troca, não uma publicação ou teste de DNS do endereço novo. Não repetidos build/testes/Lighthouse por mudança documental/de nome. Plano gratuito e Firebase preservados.

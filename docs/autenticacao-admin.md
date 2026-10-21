# Administração: Google, TOTP e autorização

Etapa 1 validada. O painel de denúncias e revisão foi autorizado posteriormente; consulte [painel-administrativo.md](painel-administrativo.md).

## Funcionamento e proteção

- Conta Google via SDK Firebase já instalado; autenticação em memória, sem persistir tokens no localStorage.
- Cadastro TOTP pelo SDK. A chave é exibida apenas à pessoa que configura o autenticador; não enviar por chat/captura, não salvar no Git. Sem SMS e sem biblioteca QR adicional.
- Após cadastrar TOTP, sair e entrar novamente com o segundo fator. Estar conectado não concede privilégio.
- Servidor exige UID na lista privada, assinatura RS256 verificada com os certificados oficiais Firebase, projeto/emissor corretos, token válido, e-mail verificado, provedor Google e segundo fator TOTP no token.
- Antes de cada autorização, consulta oficial ao estado da conta: desativação, revogação e fator removido invalidam acesso. Somente certificados públicos são armazenados em cache; autorização de conta não.
- `/api/admin/config` entrega só a configuração pública do app Firebase. Nenhuma lista de UIDs ou segredo é exposta.
- `/api/admin/session` exige origem exata, sessão de visitante assinada e limite privado separado. Retorna apenas confirmação de identidade/permissão; não abre coleções privadas.
- A aplicação Firestore existente continua no emulador. O app Firebase de Auth é separado e usa o projeto real clipzone-db02a. Não confundir autenticação real com deploy ou acesso a banco de produção.
- O verificador usa crypto nativo do Node, sem instalar dependência. Sua compatibilidade precisa ser revista no runtime de deploy escolhido, antes de qualquer publicação.

## Estado da configuração

Provedor Google ativado e confirmado no console em 20/10/2026, com nome público
Clipzone e e-mail atual do proprietário como suporte provisório, conforme
aprovação explícita. SMS continua desativado; plano Spark confirmado sem custos.
Nome público e e-mail de suporte podem mudar sem alterar o UID autorizado.
Não há liberação por nome/e-mail: a allowlist de UID e o TOTP continuam obrigatórios.
App Clipzone Web registrado pelo proprietário, sem Hosting. Configuração pública
adicionada ao ambiente local ignorado pelo Git, preservando os demais valores.
Domínio local 127.0.0.1 autorizado e UID informado pelo proprietário configurado
na allowlist privada local. API reiniciada com essa configuração.
Proprietário ativou TOTP pelo Cloud Shell: resposta com state ENABLED e provedor
TOTP ENABLED, adjacentIntervals 1, sem enabledProviders de SMS.
Em 21/10/2026, após o cadastro do autenticador e o roteiro de novo login,
o proprietário informou o resultado real: "Acesso administrativo verificado."
Etapa 1 concluída no ambiente local. Painel de moderação autorizado posteriormente e implementado localmente;
nenhum deploy nem acesso ao Firestore de produção foi realizado.

## Roteiro de configuração no Firebase (sem faturamento)

Identity Platform já está ativo no Spark. Não repetir o upgrade nem habilitar Blaze.

1. Provedor Google já habilitado; não repetir. Nome público e suporte provisório aprovados pelo proprietário.
2. Obter a configuração pública de um app Web do projeto (apiKey e appId). Se for preciso registrar um app, fazê-lo sem Hosting/deploy e respeitar participação do proprietário na configuração de credenciais.
3. Autorizar somente o domínio local usado pelo login, se necessário; não adicionar domínios genéricos. Não ignorar alertas TLS.
4. Ativar TOTP usando o endpoint de configuração documentado pelo Firebase, preservando demais opções; não habilitar SMS. Uma chamada administrativa requer autenticação do proprietário. Não inserir token administrativo em código, arquivo Git, URL de navegador ou chat. Não instalar ferramentas automaticamente.
5. Preencher em `.env.server.local`, sem remover as configurações existentes:

```dotenv
FIREBASE_AUTH_API_KEY=valor_publico_apiKey_do_app_web
FIREBASE_AUTH_APP_ID=valor_publico_appId_do_app_web
CLIPZONE_ADMIN_UIDS=
```

A API key Firebase identifica o projeto, não concede acesso administrativo; manter restrições de API apropriadas. Não usar chave de serviço aqui. A allowlist fica vazia até confirmar explicitamente o UID correto do proprietário.

6. Reiniciar o servidor local e abrir `https://127.0.0.1:5174/admin`.
7. Proprietário efetua o login Google. A página mostra o UID da própria conta; registrar o UID autorizado em `CLIPZONE_ADMIN_UIDS` e reiniciar o servidor. Não preencher usando e-mail como substituto do UID.
8. Proprietário cadastra a chave no aplicativo autenticador e confirma o código na própria página. Agente não deve capturar a chave ou preencher códigos.
9. Entrar novamente com Google e TOTP, clicar em Verificar acesso administrativo. Até todos os requisitos estarem corretos, o servidor deve negar acesso.

Não marcar a etapa como integralmente validada antes do fluxo real. O cliente não oferece remoção de MFA nem cadastro de administrador por autoaprovação.

## Recuperação

Se perder o autenticador, usar processo administrativo do proprietário no Firebase para recuperar a conta, revogar sessões e cadastrar novo fator. Não enfraquecer a exigência TOTP nem criar bypass no app. Manter a conta Google proprietária protegida e revisar a recuperação fora do repositório.

## Validação

Testes focados: `node --test tests/admin-auth.test.mjs tests/public-api.test.mjs`.
Cobrem assinaturas com chave real de teste, algoritmo/issuer/audience/tempo, UID não autorizado, ausência/SMS/remoção de MFA, conta desativada/revogada, falha de provedor e fronteira HTTP. Dados externos são controlados. Validação real local adicional: proprietário confirmou "Acesso administrativo verificado." em 21/10/2026; nenhum token, chave ou código TOTP foi coletado pelo agente.

Fontes oficiais:
- https://firebase.google.com/docs/auth/web/totp-mfa
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/lookup
- https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/UserInfo

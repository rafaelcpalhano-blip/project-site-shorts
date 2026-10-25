# Etapa 8-B — provas integradas locais no Workers

25/10/2026. Continuação autorizada para provas independentes da API, mantendo somente Workers como candidato. Parte concluída: autenticação X.509, fronteira de credenciais, leituras REST em lote e roteamento nativo de assets/API. Etapa8-B continua aberta; deployReady=false.

## Base e escopo

Base limpa observada: commit516c74c, após o proprietário commitar os trabalhos anteriores. Criados apenas dois ensaios em tests/runtime e documentação/evidência. Nenhuma alteração em código funcional server/src, dependências ou infraestrutura nesta rodada. O checkpoint original9782f90 e a cópia das alterações da rodada anterior permanecem preservados.

Wrangler4.152.0/workerd1.20261019.1 já autorizados e instalados no laboratório externo foram reutilizados, com compatibility_date2026-10-25. OpenSSL já disponível com o Git gerou certificado X.509 autoassinado e chave **exclusivamente de teste**, fora do repositório. Não foi instalada ferramenta nova. Node executa o CLI dos ensaios; não é servidor/candidato de hospedagem da API. A API sob prova executou em workerd.

Execução local em127.0.0.1:8798, sem conta, login, bindings remotos ou chamadas reais ao Google/Firestore. Todas as requisições de autenticação e banco usam fixtures injetadas; os assets HTML/JS são fixtures geradas no laboratório, não a aplicação completa. Configuração, estado temporário e chave privada de teste não entram no Git. As chamadas do ensaio são sequenciais; não certificam isolamento concorrente de um servidor de produção.

## Resultados: 17 verificações no runtime

- Assinatura RS256 validada a partir de certificado X.509 PEM; assinatura falsa, TOTP ausente e UID não permitido recusados.
- Certificado em cache não concede autorização: conta desativada, auth_time anterior ao validSince e fator MFA removido recusados usando o mesmo token anteriormente aceito.
- Duas novas autorizações releram a conta atual mesmo com certificado em cache. Falha503 do serviço de autenticação não concedeu acesso. Lista administrativa vazia falhou fechada.
- createRestStore recusou ausência de fornecedor de credencial. batchGet reordenado com documento ausente foi mapeado corretamente no Workers.
- O adaptador consultou o fornecedor novamente e enviou a credencial substituída na chamada seguinte. Quando esse fornecedor falhou, nenhuma requisição foi enviada.
- Feed visível preservou15 DTOs, ordem e cursor, com6 chamadas REST diretas para um jogo compartilhado. Feed com30 jogos ocultos manteve zero cards, limite/continuação e18 chamadas diretas. Essas contagens excluem limiter HTTP/OAuth/retries, já separados nas medições anteriores.

**O que isso não comprova:** o certificado é sintético e não verifica cadeia TLS do Google, configuração de login ou MFA de conta real. A troca de credencial é injetada; o fornecedor OAuth real de servidor ainda não existe. Não foi demonstrada renovação OAuth automática, configuração IAM ou acesso remoto ao banco. Não apresentar essas pendências como implementadas.

## Resultados: 8 verificações de roteamento nativo

Configuração de assets do próprio Wrangler/workerd, com not_found_handling=single-page-application e run_worker_first para /api, /api/* e a rota privada do ensaio:

| Caso | Resultado |
| --- | --- |
|GET / navegacional|HTML da SPA de teste|
|GET /jogos/fixture por acesso direto|HTML da SPA de teste|
|GET /assets/probe.js|JavaScript real, MIME JavaScript e conteúdo esperado|
|GET /api navegacional|404JSON, não index.html|
|GET /api/unknown navegacional|404JSON, não index.html|
|GET /api/collision.txt com asset existente no mesmo caminho|404JSON da API; asset não sombreia a rota|
|GET /api/admin/config sem configuração administrativa|503JSON, falha fechada|
|POST /api/session com cabeçalhos de IP forjados, sem contexto confiável|503; cabeçalhos não viram contexto por conta própria|

A fixture não extrai nem atesta IP do edge. O fornecimento de contexto confiável para a composição real continua pendente; rejeitar cabeçalhos na fixture não significa que o adaptador de transporte esteja implementado. Não habilitar todas as operações reais a partir deste arquivo de teste.

Referências de configuração: [SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/) e [ASSETS binding](https://developers.cloudflare.com/workers/static-assets/binding/).

## Evidência e repetição

[Evidência sanitizada](evidencias/etapa-8-b-integracao-workers.json): versões,17 checks de runtime,8 de roteamento e limitações; sem chave privada, token, cookie ou credencial real. Runner encerra a instância temporária em finally. Porta8798 conferida livre ao final.

```powershell
node tests/runtime/run-worker-integration.mjs `
  "C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/runtime-lab-8b" `
  "C:/Program Files/Git/usr/bin/openssl.exe"
```

O runner exige ferramenta já instalada e versão conhecida; não instala, não faz login e não publica. Gera as fixtures X.509/assets apenas no laboratório. TypeScript strict/NodeNext do probe, lint e sintaxe do runner aprovados. Repetido somente o novo ensaio após o ajuste da verificação MIME; sem suíte completa, build, Lighthouse ou testes manuais porque o código funcional não mudou.

## Continuação da 8-B

- Orçamento global de saída com retries/renovação e falha controlada, além de limites de CPU no destino. As reduções de lote não garantem o limite Free em toda condição.
- Projeto da entrada Workers completa e da origem/contexto de IP confiável. Configurações de deploy e acesso externo dependem dos gates seguintes.
- Capas externas: decisão segue aberta conforme a revisão Workers; sem upload, R2, restrição de domínio ou transporte alternativo implementado.
- Fornecedor real OAuth e IAM do Firestore para8-C; tarefas agendadas/segmentadas para8-D. Provas isoladas não autorizam banco real, serviço pago ou deploy.

Nenhum reinício de5174/5175/8080 e nenhuma intervenção manual no computador necessária nesta parte. PWA permanece8.5 depois da integração.

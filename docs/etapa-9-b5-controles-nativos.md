# Etapa 9-B.5 — controles nativos do GitHub

Aplicação autorizada pelo proprietário em 27/10/2026, retomada após indisponibilidade temporária da revisão automática por limite de uso. A tentativa bloqueada anterior não executou ação; não houve contorno da revisão. Snapshot de código: `736485e9f56ff11bfb0aab5ab6047c5f8936dd26` em main.

## Configurações aplicadas e persistência conferida

| Controle | Estado confirmado |
| --- | --- |
| Dependency graph | Ativado; configurações reabertas e conferidas |
| Dependabot alerts | Ativado; configurações reabertas e conferidas |
| Automatic dependency submission | Desligado |
| Dependabot security updates / grouped updates | Desligados; sem PRs automáticos |
| Actions externas permitidas | Apenas checkout/setup-node nos SHAs exatos abaixo |
| SHA completo obrigatório para Actions | Ativado e conferido após recarregar |
| Permissões padrão do token | Leitura; sem ampliação de escrita |
| Criar/aprovar PRs pelo Actions | Desligado |
| Workflows de PRs de forks privados | Desligados |
| Acesso por workflows de outros repositórios | Desligado |
| Retenção de logs/artefatos | 90 dias preservados |

Lista externa aplicada:

```text
actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1
```

A política nativa continua permitindo Actions/workflows locais e do proprietário; ela restringe quais Actions externas podem ser referenciadas, não todo código executável no job. O workflow usa instalação com scripts desabilitados e token contents:read. Atualizar um SHA exigirá revisão conjunta da política e do YAML. Não foram habilitados todos os Actions do GitHub ou de vendedores verificados.

O toggle Malware alerts apareceu após habilitar Dependabot e foi preservado desligado, pois não integra o pacote específico aprovado. Não foram instalados scanners, criados segredos, habilitados CodeQL/Copilot ou criado dependabot.yml.

## Alertas e validação

A página Dependabot informou arquivos checados às 19h12 de Brasília, zero alertas abertos e zero fechados na consulta inicial. Nenhum alerta foi dispensado pelo agente. Isso é um resultado momentâneo das dependências reconhecidas e vulnerabilidades conhecidas, não garantia de ausência de problemas.

Foi solicitada exatamente uma execução manual do workflow existente, em main, sem push: [run #3](https://github.com/rafaelcpalhano-blip/project-site-shorts/actions/runs/40593132908), evento workflow_dispatch. O workflow mantém Ubuntu padrão, timeout de 10 minutos e nenhum segredo de provedores. Resultado final: Success em 1min25s, job verify em 1min20s; instalação, varreduras, testes Node, build/tipos e lint aprovados, npm audit com zero vulnerabilidades. Não houve artefatos ou repetição automática. O evento PR e a recusa de um workflow propositalmente inválido não foram exercitados. Os 141 testes locais Firestore anteriores permanecem uma suíte separada, sem execução no CI deste pacote.

## Custo e escopo preservados

Antes da execução foram reconfirmados GitHub Free, 4 minutos usados de 2.000 incluídos, 0 GB de 0,5 GB e valor faturável Actions US$0. Orçamento Actions US$0 com Usage blocked preservado. Contadores podem atrasar; a validação consome franquia e não é isenta de contabilização. Nenhum orçamento/plano foi alterado nem recurso pago autorizado.

Nenhuma alteração no código da aplicação, dependências, dados, regras Firebase, credenciais, configurações Cloudflare, cron ou deploy. Nenhum commit, push, merge, exclusão ou reescrita de histórico pelo agente. O repositório permanece privado.

## O que ainda não está aprovado

- Publicar o repositório e aceitar a exposição permanente/copiável dos dados pessoais históricos exige confirmação específica final.
- Rulesets não têm enforcement no contexto privado Free observado. Não criar regra inefetiva ou contratar upgrade. A futura proteção de main deve ser combinada com a publicação autorizada, incluindo exigência de PR/check verify e bloqueio de force push/deleção, sem inventar um segundo revisor obrigatório para equipe individual.
- Secret scanning/push protection nativos não foram habilitados nem certificados neste repositório privado pessoal. Manter o scanner local/CI e conferir recursos gratuitos após eventual publicação aprovada; não publicar apenas para escanear.
- TikTok, tradução, CPU e renovação automática de ranking continuam com pendências próprias; este pacote não aprova lançamento do site.

Fontes oficiais da preparação: [Dependabot alerts](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-alerts), [política de Actions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository), [branches protegidas](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches). Ver [evidência sanitizada](evidencias/etapa-9-b5-controles-nativos.json).

# Clipzone

Plataforma comunitária para descobrir e compartilhar vídeos curtos de games, com
React, TypeScript, Firestore e uma API em Cloudflare Workers.

**Estado atual:** homologação controlada. O lançamento público e a divulgação deste
repositório ainda dependem da conclusão das revisões de segurança e funcionamento.
Não use configurações de homologação como receita automática de produção.

## Funcionalidades

- Feed paginado, catálogo e fichas de jogos, filtros e ordenações.
- Compartilhamento de links e reprodução pelos players oficiais de origem.
- Curtidas, comentários, denúncias e moderação administrativa.
- Autenticação administrativa com Google, TOTP e UID autorizado no backend.
- Clipper e instalação mobile como PWA, sem cache offline de dados privados.
- Ranking por gerações consistentes, com preservação da última geração completa.

TikTok, tradução automática, consumo de CPU e renovação do ranking continuam com
validações pendentes. O intervalo de ranking de30 minutos está preparado no código;
isso não significa que a rotina remota esteja ativada. Os vídeos permanecem nas
plataformas de origem; a disponibilidade depende delas.

## Arquitetura

| Camada | Tecnologia |
| --- | --- |
| Interface | React, TypeScript e Vite |
| API e arquivos estáticos | Cloudflare Workers e Workers Assets |
| Banco | Firestore, com acesso controlado pela API e regras de cliente |
| Autenticação administrativa | Firebase Authentication: Google + TOTP |
| Metadados e players | YouTube, Twitch, TikTok e IGDB, conforme disponibilidade |
| Testes | Node.js, emulador Firestore e contratos locais de Workers |

A premissa de infraestrutura é Workers Free + Firebase Spark, com limites e
interrupção controlada, sem ativação automática de planos pagos. O código público
não substitui nem concede as credenciais e permissões necessárias para um servidor.

## Executar a demonstração

Requisito: Node.js24 e npm. O modo padrão funciona com dados demonstrativos, sem
credenciais, banco remoto ou conta administrativa.

```sh
npm ci --ignore-scripts
npm run dev
```

Use o endereço exibido pelo Vite. `.env.example` documenta o modo demonstrativo.
Não coloque chaves em variáveis `VITE_*`: elas são destinadas ao código do navegador.

## Verificações

```sh
npm run security:check
npm run security:history
npm run security:audit
npm test
npm run build
npm run lint
```

O scanner de arquivos/histórico não envia dados para provedores e não imprime
valores suspeitos. O audit consulta o registro npm para avisos das dependências.
Nenhuma dessas verificações faz deploy ou publica dados.

Para os testes de regras, consultas e transações, é necessário Java21 e o emulador
Firestore. `npm run test:firestore` usa o projeto demonstrativo de testes e a porta
8081; confira que esteja livre. O ambiente de desenvolvimento usa8080.

```sh
npm run test:firestore
```

Configuração do emulador e seed fictício: [Firestore local](docs/firestore-local.md).
Não importar backups reais ou reutilizar credenciais de produção nesses testes.

## Segurança e contribuição

Leia [SECURITY.md](SECURITY.md) antes de reportar falhas ou enviar alterações.
Credenciais, arquivos de configuração privados, backups e logs não pertencem ao Git.
A chave da conta de serviço, os segredos HMAC e os tokens dos provedores ficam no
servidor, fora do frontend e do versionamento.

O workflow em `.github/workflows/security.yml` foi enviado ao GitHub e está
configurado para verificar push/PR. Usa permissões de leitura, ações oficiais
fixadas por SHA e nenhum segredo de provedor; não contém deploy. O workflow
não habilita Dependabot, proteção de branch ou altera visibilidade do projeto.
A franquia e o bloqueio de gastos foram conferidos; acompanhar o consumo futuro.

A primeira execução do workflow no GitHub foi aprovada em 27/10/2026;
[resultado e limites](docs/etapa-9-b5-ajustes-seguranca.md). O repositório continua
privado, com os controles nativos e a decisão de divulgação tratados separadamente.

## Documentação e direitos

- [Estrutura](docs/estrutura.md)
- [Autenticação administrativa](docs/autenticacao-admin.md)
- [Players oficiais](docs/players-oficiais.md)
- [Proveniência do Clipper](docs/clipper-prompts.md)
- [Inventário dos assets e direitos para o portfólio](docs/etapa-9-b5-assets.md)
- [Continuidade e decisões históricas](docs/continuidade.md)

A documentação de continuidade preserva etapas anteriores e pode descrever estados
já superados. Para publicação como portfólio, a revisão de dados pessoais e a decisão
sobre licença do código e dos assets ainda precisam de confirmação do proprietário.
Não há licença aberta concedida implicitamente por este README. Marcas, jogos,
vídeos e conteúdo externo permanecem sujeitos aos direitos de seus titulares.

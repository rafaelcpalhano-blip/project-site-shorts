# Clipzone

Uma comunidade para descobrir e compartilhar vídeos curtos de games, reunindo
**YouTube Shorts, Twitch Clips e TikTok** em uma mesma experiência — sem criar
conta, sem cobrança pelo uso e sem anúncios próprios do Clipzone.

O projeto nasceu de uma necessidade simples: ter um espaço para divulgar conteúdo
e encontrar outras pessoas com o mesmo interesse, com pouca burocracia. Foi pensado
especialmente para pequenos criadores de conteúdo e também para desenvolvedores que
queiram mostrar seus jogos, incluindo projetos independentes.

**Acesse:** [www.clipzone.workers.dev](https://www.clipzone.workers.dev/)

**Estado atual:** publicado em **29/10/2026**, com conferência técnica pós-deploy,
reteste manual e rodada final do Lighthouse concluídos. Anúncios e restrições dos players externos continuam sob
responsabilidade de cada plataforma.

## Proposta e desenvolvimento

O Clipzone é um projeto de estudo e portfólio, desenvolvido para transformar uma
ideia de comunidade em uma aplicação funcional: interface pública, integrações,
banco de dados, administração, segurança, testes e publicação em infraestrutura gratuita.

A proposta principal foi mantida durante o desenvolvimento. Ajustes de escopo e
refinamentos surgiram dos testes de uso, dos limites reais dos serviços e da busca
por uma experiência mais simples. A automação facilita a participação, enquanto as
decisões sensíveis continuam sob controle administrativo.

O desenvolvimento contou com assistência de IA por meio do Codex no planejamento,
na implementação, na investigação de falhas, na elaboração de testes e na
documentação. As artes do Clipper foram geradas e refinadas com ferramentas de IA.
A concepção do produto, a definição dos requisitos, as decisões de escopo e as
aprovações ficaram a cargo do autor, que também realizou testes de uso no PC e no
celular. As entregas foram verificadas por testes automatizados e conferências
manuais; a assistência de IA não substitui essas validações.

## Funcionalidades

### Compartilhar vídeos sem cadastro

O fluxo público não exige login nem criação de conta para compartilhar, curtir ou
comentar. Para publicar:

1. Cole um link de **YouTube Shorts**, **Twitch Clips** ou **TikTok**. A aplicação
   reconhece a fonte e valida o link; o servidor confirma os requisitos de publicação.
2. Confira os campos preenchidos e selecione o jogo relacionado.
3. Confirme o compartilhamento. O conteúdo fica sujeito às regras de validação,
   limites de uso e moderação.

YouTube e Twitch permitem obter automaticamente título e nome do canal quando a
fonte responde. Os campos podem ser ajustados. No TikTok, o identificador do canal é preenchido a partir do link quando disponível.
O título pode ser informado pelo usuário. Links curtos de compartilhamento também
são aceitos e resolvidos antes da validação.

São aceitos somente os formatos dessas três fontes, com validação no backend e
bloqueio de duplicatas. Um link com aparência válida não basta para dispensar a
verificação do vídeo. Restrições ou indisponibilidade da plataforma podem impedir
o envio temporariamente.

### Catálogo e fichas de jogos

- Seleção de jogos já cadastrados, com pesquisa no catálogo.
- Busca oficial pela **IGDB** para incluir jogos e preencher as informações
  disponíveis, como capa, descrição, lançamento, gêneros, plataformas e modos.
- Tradução automática das descrições para português, conforme disponibilidade e
  orçamento da integração, mantendo acesso ao texto original.
- Inclusão manual quando o jogo não é encontrado, contemplando também jogos indies
  ou em desenvolvimento. O cadastro fica provisório e sujeito à revisão.

Uma ficha manual pode começar sem os detalhes técnicos. Seu responsável pode
encaminhar as informações e imagens ao
[suporte do Clipzone](mailto:clipzone.suporte@gmail.com); o preenchimento e a revisão
são administrativos. Isso evita liberar edição pública irrestrita das fichas.

### Descoberta e reprodução entre plataformas

O feed reúne vídeos das três fontes, com filtro por jogo, paginação e ordenações
por **Últimos Postados**, **Primeiro Postado** e **Mais Curtidos**.

No visualizador, é possível avançar e voltar entre vídeos da sequência, inclusive
quando pertencem a plataformas diferentes. Rolagem e controles de navegação
permitem explorar, por exemplo, clipes de um mesmo jogo vindos de YouTube, Twitch
e TikTok, sem sair da experiência do Clipzone.

Os vídeos são reproduzidos pelos players oficiais e permanecem hospedados em suas
plataformas de origem. A aplicação não baixa nem republica os arquivos de vídeo.
Ao abrir uma ficha, a navegação posiciona o usuário no início das informações;
ao voltar, preserva o contexto e a posição do feed.

### Interações e moderação

Curtidas, comentários e denúncias permitem participar sem uma conta pública no
Clipzone. A ausência de cadastro não elimina as proteções: existem sessão técnica,
limites de uso e verificações no servidor para reduzir abuso.

Comentários passam por uma triagem automática baseada em regras para identificar
linguagem ofensiva, ameaças, ódio e padrões de spam. Textos sinalizados são
encaminhados para revisão em vez de aprovados automaticamente. É uma proteção
limitada, complementada por denúncias e moderação humana; não é uma garantia de
detecção de toda ofensa ou interpretação de contexto.

### Clipper, interface e instalação

O **Clipper** é o mascote do projeto. Ele apresenta orientações nas boas-vindas e
mensagens rotativas no final da página, com dicas de funcionamento e incentivo à
participação, de forma discreta.

A interface foi desenvolvida para desktop, tablets e celulares, com atenção a
navegação por teclado, foco, nomes acessíveis e adaptação a diferentes larguras.
Como **PWA**, pode ser instalada na tela inicial e aberta em modo independente,
conforme o suporte do navegador e do sistema. A instalação não transforma players
externos em vídeos offline nem armazena dados administrativos privados para uso offline.

## Administração e armazenamento

O **Cloud Firestore**, banco de documentos do Firebase, mantém jogos, publicações,
comentários, curtidas, denúncias e registros operacionais. A API aplica validação,
autorização e transações para preservar a consistência das alterações.

O painel administrativo possui acesso restrito com **Google, TOTP e verificação do
UID autorizado no backend**. A interface permite:

- Revisar o catálogo, aprovar cadastros provisórios e completar fichas manuais.
- Moderar vídeos, denúncias e comentários, com filas por estado.
- Consultar detalhes e históricos administrativos por identificador do registro.
- Organizar filas por data ou texto, conforme a seção, e atualizar suas listagens.
- Registrar decisões e motivos, preservando rastreabilidade das ações.

Os códigos públicos reduzidos, quando disponíveis, facilitam localizar registros
sem expor identificadores extensos na interface. Consulta por ID e ordenação por
data são recursos distintos; o painel não é uma ferramenta genérica de busca em
todos os eventos do banco.

A maior parte do uso público é automatizada. Revisões, fichas manuais e backups do
estado do banco continuam sendo tarefas de operação. A política definida é fazer
backup no lançamento e depois a cada 15 dias, com segunda cópia privada em HD
separado; o procedimento e sua implantação são tratados na documentação operacional.

## Arquitetura

| Camada | Tecnologia e responsabilidade |
| --- | --- |
| Interface | React, TypeScript e Vite |
| API e arquivos estáticos | Cloudflare Workers e Workers Assets |
| Banco | Cloud Firestore, com acesso controlado e regras de cliente |
| Autenticação administrativa | Firebase Authentication: Google + TOTP, com autorização no backend |
| Metadados de jogos | IGDB e tradução de descrições via Workers AI |
| Vídeos | Integrações e players oficiais de YouTube, Twitch e TikTok |
| Testes | Node.js, emulador Firestore e contratos locais de Workers |
| Integração contínua | GitHub Actions para testes, build, lint e verificações de segurança |

## Infraestrutura gratuita e decisões de desempenho

A arquitetura utiliza **Cloudflare Workers Free + Firebase Spark**, com a premissa
de não depender de custos recorrentes de infraestrutura nem de upgrades automáticos.

O refinamento buscou reduzir o **consumo de recursos da infraestrutura**: tempo de
CPU por execução, quantidade de requisições, leituras e gravações no banco e
transferência de dados. Paginação, cache de arquivos estáticos e limites de operação
ajudam a manter o projeto dentro das franquias, preservando as proteções contra abuso.

Como decisão de escopo, o ranking experimental de relevância ficou desativado nesta
versão. As três ordenações descritas no feed foram mantidas, evitando depender de
uma rotina cujo consumo não atingiu a margem pretendida no plano gratuito.

As franquias não são ilimitadas e seus períodos de renovação variam por serviço.
Um aumento de acessos pode causar indisponibilidade temporária de determinadas
operações, até a renovação da quota ou uma intervenção operacional. A meta de baixo
consumo não equivale a uma garantia de funcionamento em qualquer escala.

## Qualidade e validação

O desenvolvimento combina testes automatizados com verificações manuais no PC,
celular e PWA. A suíte cobre regras de negócio, validações, autenticação,
autorização, contratos de integração e cenários de regressão.

Na rodada final do **Lighthouse 13.5.0**, em **29/10/2026**, após o lançamento:

| Perfil | Performance | Acessibilidade | Boas práticas | SEO |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 100 | 100 | 100 | 100 |
| Mobile (Lighthouse) | 99 | 100 | 100 | 100 |

O SEO anterior de **66** refletia o bloqueio intencional de rastreamento durante a
homologação. Após a autorização de lançamento, as páginas públicas foram liberadas
para os buscadores e os novos testes registraram **100 em SEO nos dois perfis**.
Painel e API continuam excluídos na política de rastreamento, com orientação de
não indexação no HTML administrativo e autenticação preservada no backend.

As notas representam esta rodada, sem garantir o mesmo resultado em qualquer rede
ou dispositivo. Os relatórios trazem aviso de IndexedDB; o perfil mobile do
Lighthouse complementa os testes de uso em aparelho físico. Ainda existem
sugestões de otimização de imagens, JavaScript e recursos externos, registradas
para evolução do projeto. Lighthouse não substitui auditoria de segurança nem
mede o tempo de CPU do Worker.

[Relatório final, condições e comparação com a homologação](docs/etapa-9-c-lighthouse-final.md).

## Executar a demonstração

Requisito: **Node.js 24 e npm**. O modo padrão funciona com dados demonstrativos,
sem credenciais, banco remoto ou conta administrativa. Ele permite explorar a
interface; não equivale a iniciar todas as integrações do ambiente hospedado.

```sh
npm ci --ignore-scripts
npm run dev
```

Use o endereço exibido pelo Vite. `.env.example` documenta o modo demonstrativo.
Não coloque segredos em variáveis `VITE_*`, pois elas são destinadas ao navegador.

## Verificações locais

```sh
npm run security:check
npm run security:history
npm run security:audit
npm test
npm run build
npm run lint
```

O scanner de arquivos e histórico não envia dados para provedores nem imprime
valores suspeitos. A auditoria de dependências consulta o registro npm. Essas
verificações não fazem deploy nem publicam dados; seus resultados não comprovam
a ausência de toda vulnerabilidade.

Para testar regras, consultas e transações, são necessários **Java 21** e o emulador
Firestore. A porta de testes é 8081; o ambiente de desenvolvimento usa 8080.

```sh
npm run test:firestore
```

Veja [Firestore local](docs/firestore-local.md) para configuração e dados fictícios.
Não importe backups reais nem reutilize credenciais de produção nesses testes.

## Segurança e contribuição

Leia [SECURITY.md](SECURITY.md) antes de reportar falhas ou propor alterações.
Não publique credenciais, backups, logs sensíveis ou dados pessoais em issues.
Tokens de provedores, chaves de serviço e segredos de sessão ficam no servidor,
fora do frontend e do versionamento.

O workflow de segurança usa permissões de leitura e ações fixadas por SHA, verifica
pushes e pull requests e não realiza deploy. Mudanças de infraestrutura,
visibilidade do repositório e publicação do site são decisões separadas.

Sugestões e relatos de problemas devem explicar o comportamento esperado e os
passos de reprodução, evitando expor informações privadas.

## Documentação e direitos

- [Estrutura do projeto](docs/estrutura.md)
- [Autenticação administrativa](docs/autenticacao-admin.md)
- [Players oficiais](docs/players-oficiais.md)
- [Operação e recuperação](docs/guia-operacao-recuperacao.md)
- [Proveniência do Clipper](docs/clipper-prompts.md)
- [Inventário dos assets e direitos](docs/etapa-9-b5-assets.md)
- [Continuidade e decisões históricas](docs/continuidade.md)

A documentação de continuidade preserva etapas anteriores, inclusive decisões
substituídas. Não há licença aberta concedida implicitamente por este README.
Marcas, jogos, vídeos, dados e conteúdo externo permanecem sujeitos aos direitos de
seus titulares; sua integração não implica vínculo oficial com o Clipzone.

## Autor e contato

Projeto idealizado e desenvolvido por **Rafael Caron Palhano** como estudo e
portfólio profissional.

- [LinkedIn](https://www.linkedin.com/in/rafael-caron-palhano-33081118b/)
- [E-mail](mailto:rafaelcpalhano@gmail.com)
- [Outros projetos no itch.io](https://sedaking.itch.io/)
- [Suporte da plataforma](mailto:clipzone.suporte@gmail.com)

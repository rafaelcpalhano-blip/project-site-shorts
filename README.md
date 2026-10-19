# Site Autônomo Shorts

### Plataforma comunitária de divulgação de shorts de games

O **Site Autônomo Shorts** é um projeto de plataforma web voltada ao compartilhamento e à descoberta de vídeos curtos sobre jogos eletrônicos.

A proposta é criar um ambiente colaborativo, onde criadores de conteúdo e jogadores possam divulgar shorts, clipes e recortes publicados em diferentes plataformas, reunindo tudo em um único espaço organizado por jogos.

O principal objetivo é incentivar a descoberta de novos criadores, ampliar a visibilidade dos conteúdos e permitir que a própria comunidade mantenha a plataforma ativa, sem a necessidade de cadastro ou autenticação para visitantes.

> **Status do projeto:** Em desenvolvimento — fase inicial de estruturação e planejamento.

---

## Objetivo

Desenvolver uma aplicação web responsiva, intuitiva e de funcionamento autônomo, na qual os usuários possam compartilhar links de vídeos relacionados a games, explorar conteúdos de outros criadores e interagir por meio de comentários.

A plataforma funcionará como um agregador de conteúdos, preservando a hospedagem original dos vídeos e direcionando os visitantes às plataformas dos respectivos criadores.

## Funcionalidades planejadas

### Compartilhamento de vídeos

- Publicação de shorts por meio de links externos.
- Compatibilidade planejada com YouTube Shorts, TikTok, Twitch Clips e outras plataformas que permitam integração.
- Formulário simplificado, sem exigência de cadastro.
- Seleção obrigatória do jogo relacionado ao vídeo.
- Campo opcional para identificação do canal.
- Limite de cinco publicações diárias por visitante, com mecanismos de prevenção contra abusos.
- Bloqueio de links duplicados.

### Feed e navegação

- Página inicial com publicações organizadas cronologicamente, das mais recentes às mais antigas.
- Exibição de até 15 vídeos por página.
- Paginação dinâmica conforme o crescimento da comunidade.
- Pesquisa de vídeos pelos títulos disponíveis.
- Filtros por jogos.
- Cards padronizados, independentemente da plataforma de origem.
- Reprodução incorporada quando permitida e redirecionamento para a publicação original.

### Catálogo de jogos

Cada jogo contará com uma página própria, reunindo informações básicas e os vídeos compartilhados pela comunidade.

O catálogo deverá apresentar, conforme a disponibilidade das fontes consultadas:

- Nome oficial e descrição.
- Gêneros e características.
- Modos de jogo.
- Plataformas disponíveis.
- Informações de lançamento e desenvolvimento.
- Lista de shorts relacionados.

O cadastro de jogos será integrado a fontes externas de informações, com mecanismos de identificação, normalização de nomes e prevenção contra duplicidades.

Jogos não identificados de maneira confiável serão encaminhados para revisão administrativa.

### Comentários e interação

- Comentários anônimos vinculados aos vídeos.
- Interface simples e organizada.
- Moderação preventiva de linguagem ofensiva e conteúdos inadequados.
- Comentários suspeitos ocultos até revisão administrativa.
- Proteção contra spam e comportamentos abusivos.

### Administração e segurança

A plataforma terá um ambiente administrativo de acesso restrito, destinado ao gerenciamento e à moderação dos conteúdos publicados.

Entre os recursos planejados estão:

- Autenticação administrativa segura.
- Remoção de shorts e comentários mediante confirmação.
- Revisão de conteúdos sinalizados.
- Validação de links e dados recebidos.
- Proteção contra publicações automatizadas e tentativas de abuso.
- Controle de permissões e acesso ao banco de dados.

A moderação será implementada em camadas, considerando diferentes idiomas e formas de linguagem ofensiva, reconhecendo as limitações dos mecanismos automáticos.

---

## Tecnologias

O projeto será desenvolvido inicialmente com as seguintes tecnologias:

| Tecnologia | Aplicação |
|---|---|
| React | Construção da interface e dos componentes |
| TypeScript | Tipagem e organização do código |
| Vite | Ambiente de desenvolvimento |
| CSS | Estilização e responsividade |
| React Router | Navegação entre páginas |
| Firebase Firestore | Armazenamento persistente |
| Firebase Authentication | Autenticação administrativa |
| Cloudflare Pages | Hospedagem da aplicação |
| Cloudflare Functions / Workers | Processamento e validações no backend |
| Git e GitHub | Versionamento e gerenciamento do projeto |

A arquitetura será desenvolvida de maneira modular, com separação de responsabilidades entre componentes, serviços, funcionalidades e integrações externas.

As tecnologias e integrações poderão ser avaliadas e ajustadas conforme as necessidades técnicas identificadas durante o desenvolvimento.

## Infraestrutura e funcionamento

O sistema foi planejado para operar inicialmente utilizando serviços com planos gratuitos, respeitando seus limites de utilização.

Os vídeos permanecerão hospedados nas plataformas originais. O banco de dados armazenará principalmente links, metadados, informações dos jogos, comentários e registros necessários ao funcionamento da aplicação.

Essa abordagem busca reduzir o consumo de armazenamento, simplificar a manutenção e permitir o crescimento gradual da comunidade.

## Interface e experiência do usuário

O projeto prioriza:

- Design limpo e responsivo.
- Compatibilidade com computadores, tablets e celulares.
- Navegação dinâmica, sem recarregamentos desnecessários.
- Componentes reutilizáveis.
- HTML semântico e acessibilidade.
- Carregamento eficiente de conteúdos.
- Organização visual consistente entre diferentes plataformas de vídeo.


## Proposta de evolução

O Site Autônomo Shorts pretende evoluir gradualmente, acompanhando a participação da comunidade e a disponibilidade de novas integrações.

A prioridade será preservar a simplicidade da experiência, a organização dos conteúdos e a segurança da plataforma, mantendo a divulgação colaborativa de vídeos como sua principal finalidade.

---

**Projeto em desenvolvimento.** Este README documenta a proposta e as funcionalidades planejadas. Sua implementação, arquitetura e documentação serão atualizadas ao longo das etapas de desenvolvimento.

## Implementação local disponível

As etapas 2 e 3 entregaram a estrutura modular e o protótipo interativo. A etapa 4
adiciona leitura paginada no emulador Firestore, regras e testes de acesso.
As funcionalidades de produção descritas acima continuam planejadas.

- `npm ci`: instalar dependências (Node 24).
- `npm run dev`: executar o protótipo com dados em memória.
- `npm run emulators`: iniciar Firestore local (requer Java 21).
- `npm run seed:firestore`: carregar registros fictícios no emulador.
- `npm run dev:firestore`: abrir o modo local de leitura em localhost:5174.
- `npm run lint`, `npm run build` e `npm test`: verificações da aplicação.
- `npm run test:firestore`: testes isolados das regras e consultas na porta 8081, sem interromper o emulador de desenvolvimento.

Configuração, modelos, índices, limites e pendências estão em
[Firestore local](docs/firestore-local.md). Este estágio não exige projeto Firebase
real e não configura autenticação, publicação, serviços pagos ou deploy.
A busca por título permanece disponível no protótipo; sua integração persistente
aguarda definição. Escritas no modo Firestore estão bloqueadas.

O [checkpoint de continuidade](docs/continuidade.md) registra as decisões de
publicação automática, o núcleo transacional testado e as integrações ainda
necessárias. A aplicação completa de produção ainda não está disponível.

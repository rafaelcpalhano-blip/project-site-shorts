# Estrutura inicial — etapa 2

Esta etapa prepara navegação e organização. Não implementa feed, publicação,
catálogo, comentários, autenticação, persistência ou moderação.

## Diretórios implementados

- src/app: composição da aplicação e definição central das rotas.
- src/components/layout: cabeçalho, navegação, conteúdo principal e rodapé.
- src/components/ui: componentes de apresentação compartilhados e página 404.
- src/features/shorts/pages: página inicial provisória.
- src/features/games/pages: página provisória para a futura ficha do jogo.
- src/features/admin/pages: página provisória, sem ações administrativas.
- src/styles: estilos globais; estilos dos componentes usam CSS Modules.

## Rotas

- / — início.
- /jogos/:gameId — estrutura da ficha de jogo; não consulta nem valida catálogo.
- /admin — aviso de área em desenvolvimento; não representa autenticação.
- Demais endereços — página não encontrada.

BrowserRouter usa a History API. A hospedagem deverá servir index.html para
rotas da aplicação, preservando o tratamento separado de /api. Essa configuração
será validada na etapa de publicação. Nenhum serviço foi configurado nesta etapa.

## Dependências e comandos

Mantidos React, TypeScript, Vite e ESLint existentes. Adicionado react-router-dom.
Usar npm com package-lock.json; não criar lockfiles de outros gerenciadores.

- npm ci: instalar as versões registradas no lockfile.
- npm run dev: desenvolvimento local.
- npm run lint: análise estática.
- npm run build: TypeScript e build de produção.
- npm run preview: prévia local do build.

## Próximas etapas

Reproduzir a referência com dados simulados somente após aprovação da etapa 3.
Adicionar services, hooks e types quando necessários às funcionalidades reais.
Functions, Firestore, testes de regras e integrações serão criados nas etapas
correspondentes, sem diretórios vazios ou serviços fictícios.

As quatro decisões funcionais permanecem obrigatórias: identidade canônica
única de vídeo, um gameId válido por short, jogos não identificados em revisão
e comentários suspeitos ocultos. As garantias definitivas serão do servidor.

Segredos nunca devem usar prefixo VITE_: essas variáveis são expostas no bundle.
O README original e o histórico Git foram preservados.

## Atualização da etapa 3
A interface demonstrativa já foi implementada. Consulte [interface.md](interface.md) para o estado atual, verificações e limites. As seções acima registram o escopo original da etapa 2.

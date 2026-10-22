# Etapa 7.6.5-D — Administração e apresentação

Concluída em 22/10/2026, somente o bloco autorizado.

## Alterações

As quatro áreas usam a mesma faixa visual de filtros: botões e refresh existentes, seletor compacto de até 18rem alinhado à direita, com quebra de linha em espaços menores. Em até 600px o seletor ocupa a linha seguinte. Ordenações da fila completa, callbacks de carregamento, cursores, seleção, estados e travas de operação foram preservados.

Descrições aprovadas ficam abaixo da faixa. A descrição acompanha hover de mouse/caneta, foco pelo teclado ou filtro selecionado pelo toque. A última modalidade de interação determina a prévia; a informação também está associada ao botão por aria-describedby com identificadores únicos. Sem janela flutuante cobrindo os controles, sem aria-live anunciando cada movimento do mouse e sem consulta de dados para explicar filtros. Seleção mantém aria-pressed e ganha indicador inferior, além da cor.

Título principal menor, roxo já existente (accent), com quebra natural apenas quando necessário. Estilo compacto é opt-in na página inicial; títulos de jogos e administração conservam suas dimensões. Rodapé centralizado em fluxo normal; shell em coluna flexível e conteúdo expansível garantem distância do conteúdo e posição inferior em páginas curtas, sem posicionamento absoluto.

## Validação

Quatro testes focados aprovados: dois novos de integração SSR das quatro seções/ordenações/descrições/desabilitação/IDs e dois existentes selecionados por nome para cabeçalho e página inicial. A expectativa antiga de h1 foi ajustada para aceitar a classe visual. Lint e build aprovados; lint localizado após ajuste de prioridade entre foco e ponteiro. Sem testes de backend, pois contratos, consultas e regras não mudaram.

Conferência no navegador: página inicial com título roxo de 26,4px no desktop e 19,2px em 390px, uma linha nas larguras observadas; sem overflow horizontal. Rodapé centralizado e após o conteúdo na tela estreita. Prévia local descartável renderizou os mesmos controles administrativos: seletor à direita no desktop, quebra em 390px sem overflow; foco em Ativos exibiu sua descrição sem mudar seleção de Todos; clique mudou seleção. Preview não executou consultas administrativas e foi removido junto com sua aba; viewport restaurado. Não afirmar autenticação/filas reais homologadas nesta conferência. Conferência positiva Google/TOTP e leitura das filas reais permanece para a validação integrada E com participação do proprietário, se necessária. Toque físico e leitor de tela não foram usados; caminhos de clique, foco e associações semânticas foram conferidos.

Capturas no workspace da conversa, fora do Git: admin-7-6-5-d.png, admin-mobile-7-6-5-d.png e inicio-mobile-7-6-5-d.png. A prévia usou dados estáticos, sem credenciais ou alteração de registros.

Sem mudanças no backend, Firestore, índices/regras, serviços externos, dependências ou deploy.

Próxima: 7.6.5-E — validação integrada dos refinamentos, aguardando autorização individual. Etapas 8/9 não iniciadas.

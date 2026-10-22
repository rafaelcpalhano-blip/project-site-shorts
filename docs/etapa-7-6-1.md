# Etapa 7.6.1 — interface e acessibilidade

Implementação autorizada e verificada localmente em 22/10/2026. Git limpo no início.
Sem alteração de infraestrutura, dados, backend, autenticação, players ou serviços.
Sem dependências, deploy, refatoração geral ou commit executado pelo assistente.

## Alterações

- Cabeçalho: Comunidade de Games, sem transformação visual para maiúsculas.
  Botão administrativo permanece para 7.6.2, conforme sequência aprovada.
- Página inicial: removido O próximo GG está aqui.; o texto Pequenos clipes. Grandes
  jogadas. passa a ser o h1, preservando título semântico. Compartilhar short fica
  compacto, com área mínima de 44px. Aviso extenso local/protótipo substituído por
  indicação discreta apenas em DEV. Não há indicação de ambiente na interface de build.
- Últimos Postados e Primeiro Postado corrigidos, preservando chaves internas,
  ordem padrão, filtros e paginação. Demais modalidades e regra de 15 inalteradas.
  Removida a frase técnica redundante ao pé da paginação e o resumo redundante do
  modo demonstrativo. Mensagens de falha públicas não mandam verificar emulador.
- Função compartilhada relativeTime: agora; minutos antes de 60min; horas antes
  de 24h; dias antes de 30 dias; depois meses completos de 30 dias, sem converter
  para anos. Singular/plural e acentos preservados. Futuro usa agora; timestamp/
  relógio inválido usa Data indisponível. Card não lança erro ao gerar datetime
  inválido. Reutilizado no card comum aos feeds; mantém timer de atualização existente.
- Pesquisa de jogos: botão Pesquisar e Enter compartilham consulta existente, sem
  submeter o formulário de publicação; Enter vazio não consulta e composição IME
  não dispara pesquisa. IDs únicos associam labels mesmo com múltiplos seletores.
  Jogo não encontrado aparece em vermelho e é anunciado como status.
- Texto de inclusão simplificado conforme especificação. Mensagem de novo cadastro:
  Nome cadastrado com sucesso! Ainda será avaliado pela administração. Pode seguir
  sua postagem normalmente! Mensagem verde com role=status; resultado de jogo já
  existente mantém texto distinto, sem afirmar novo cadastro.
- Inclusão mantém callback e jogo selecionado no formulário pai; nenhum reset dos
  demais campos foi adicionado. Após cinco segundos, recolhe details. Se o foco
  estiver dentro, devolve-o ao summary; se estiver fora, não o desloca. Status de
  sucesso permanece fora da seção recolhida, sem interromper leitura assistiva.
  Nova ação/edição, clique no resumo, fechamento ou desmontagem cancela o timer;
  callback já enfileirado torna-se inerte. Respostas tardias não alteram UI desmontada.
- Seleção de jogo inclui marca visual além da cor, decorativa para leitores de tela;
  estado selecionado continua no radio nativo. Summary mantém foco e área de clique.

## Contato de suporte

Endereço teste.suporte@clipzone.com continua fictício, provisório e não operacional;
nenhuma conta de e-mail foi criada. Removida a linha pública redundante sobre sua
inexistência. Novo filtro compartilhado só o exibe em desenvolvimento. Em build,
contato não operacional ou endereço placeholder conhecido é omitido, mesmo se a
flag operational for marcada por engano. Aplicado ao seletor e à ficha de jogo
manual; nenhuma outra referência pública direta ao campo permaneceu.
Isso controla apresentação, não cria canal de suporte nem bloqueia compilação.
Substituir/verificar endereço real antes de autorizar produção; não considerar
um e-mail público incorporado no bundle como segredo.

## Acessibilidade — critério permanente

Nos próximos blocos, preservar HTML semântico, labels associados, foco visível,
teclado, gerenciamento de foco em diálogos e devolução de foco, feedback de carga/
erro/sucesso, nomes acessíveis nos botões de ícone, contraste e áreas de clique.
Imagens informativas têm alt adequado; elementos decorativos não são anunciados
sem necessidade. Identificar seleção também por forma/estado, não apenas cor;
respeitar movimento reduzido e não adicionar ARIA redundante a controles nativos.
A revisão desta etapa é localizada, não uma certificação completa de acessibilidade.

## Verificações

- Dez testes relacionados distintos aprovados: seis de limites de tempo, relógios
  inválidos/futuros, contato de produção e timers (5s, cancelamento e callback já
  enfileirado); quatro de renderização real React via Vite SSR, usando dependências
  já instaladas e cache de teste separado do ambiente local.
- Renderização verifica labels únicos, status fora do details, texto/semântica de
  página/cabeçalho, tempo do card e tolerância a data inválida. SSR não demonstra
  interação real, contraste renderizado ou funcionamento de leitor de tela.
- Lint e build completos aprovados por integração entre componentes; ajustes finais
  receberam lint localizado. Sem repetir suítes de segurança/backend não afetadas.
- diff --check aprovado. HTTPS local / respondeu 200, sem reinício de API/sessões ou
  escrita de dados. Nenhum jogo fictício foi criado para validar esta interface.

### Conferência visual pendente pelo proprietário

Atualizar https://127.0.0.1:5174/. Conferir cabeçalho/textos, botão em tela pequena,
ordenações/paginação e tempo relativo. No formulário, pesquisar por Enter; quando
necessário incluir um jogo real de interesse, conferir mensagem verde, seleção,
campos preservados e recolhimento após cinco segundos. Com teclado dentro da seção,
foco deve voltar ao resumo; mensagem permanece visível. Abrir/editar novamente deve
cancelar fechamento anterior. Não criar jogos fictícios para esta conferência.

Implementação 7.6.1 concluída; aceitação visual/interativa ainda pendente. Próxima
7.6.2 — Administração, mediante autorização individual. Antes de implementar,
definir distinção de Excluir/Bloquear sem mudar reserva canônica, restauração e
histórico já aprovados. Prévia, diagnóstico de imagens, autoplay e navegação
sequencial continuam em 7.6.3, não foram implementados por esta autorização.

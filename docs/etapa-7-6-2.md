# Etapa 7.6.2 — administração durante a navegação

Implementação autorizada em 22/10/2026. Git limpo no início. Sem dependências,
serviços externos modificados, faturamento, deploy ou migração de dados.

## Sessão e login

AdminSessionProvider envolve o layout e Outlet: navegar por links internos entre
/admin, início e fichas não recria Firebase Auth nem a autorização. Inicialização
ocorre somente ao acessar /admin; visitantes não disparam consulta administrativa.
Mantida inMemoryPersistence do Firebase; não há tokens, UID autorizado ou permissão
salvos em localStorage/sessionStorage. Recarregar toda a página, fechar a aba ou
reabrir navegador perde credenciais locais e exige novo login. Isso é deliberadamente
mais restrito que persistência de sessão em armazenamento do navegador.

Conta conectada não basta: token válido, UID igual ao SDK e aprovação efetiva de
/api/admin/session são necessários. SDK continua exigindo Google/TOTP. Renovação de
token exige nova validação; expiração ou erro retira autorização. Timer e retorno
de visibilidade conferem relógio, inclusive com timer atrasado. Não há polling nem
nova consulta só por navegar/voltar à aba enquanto autorização permanece válida.
Ticket de geração impede aprovação tardia após logout/troca de conta. Sair limpa o
estado imediatamente, encerra Firebase Auth e ignora eventos antigos até novo login.

Não prometer revogação global instantânea ao fechar navegador ou clicar Sair: o
logout limpa credenciais locais; token já emitido/copiado pode continuar válido
até expiração ou revogação no Firebase. Cada requisição privilegiada continua
verificando assinatura, emissor, validade, UID permitido, Google, TOTP e estado atual
da conta/fator/validSince no servidor. React e ocultação de controles não autorizam
nenhuma escrita. Falhas da fonte de autenticação continuam fechadas no servidor.

Campo TOTP proporcional a seis dígitos, botão compacto, label/foco e layout móvel.
UID retirado da tela principal, sem mover token ou chave para estado persistente.
Mensagem técnica redundante após login removida. Navegação pública não contém mais
Modo administrador nem link /admin; URL direta continua funcionando.

## Seções administrativas

Botões de navegação nativos, identificados com aria-pressed/aria-controls, marca de
seleção também visual e operação por Tab/Enter/Espaço. Apenas seção selecionada
visível. Seção é montada na primeira seleção e mantida oculta nas trocas, preservando
filtros, página, detalhe e rascunhos durante a permanência no painel. Não monta áreas
nunca abertas nem adiciona consultas automáticas; filtros e refresh existentes
continuam acionando consultas. Ao sair da rota ou encerrar autorização, dados de
painel são desmontados; não há promessa de persistência de filtros entre rotas.

## Moderação direta e distinção aprovada

- Excluir: remoção restaurável, mantém identificação canônica e registro original.
- Bloquear vídeo: publicado passa a pendente e fica oculto na fila Vídeos pendentes /
  bloqueados. Confirmação e motivo obrigatórios em ambos os casos. Não cria outra
  coleção/fila/índice de consulta. Mostra indicação de bloqueio no detalhe.
- Marcador administrativeBlock no short, escrito exclusivamente pelo servidor,
  comprova que já era publicado. Liberação exige verificação técnica/jogo válido,
  mas não cobra novamente a cota. Pendentes comuns continuam sujeitos a cinco/dia.
- Excluir um bloqueado e restaurá-lo retorna a pendente, preservando marcador e
  isenção da liberação posterior. Arquivar denúncias também preserva essa informação.
  Liberar retira o marcador. Registro inválido falha fechado. Campo dispensado de
  indexação no manifesto local; nada publicado na nuvem.
- No visualizador, ações só aparecem com autorização confirmada. Reutilizam detalhe
  e revisão administrativos: revisão/reportCount atuais, controle de concorrência,
  UID do servidor, motivo, datas e estados no mesmo moderationLogs do painel.
  Sem endpoint paralelo, decisão via SDK ou UID enviado como autor pelo cliente.
- Comentários publicados oferecem Excluir ao administrador, com motivo/confirmar,
  serviço e histórico existentes. Restauração permanece no painel. A retirada da
  contribuição ao ranking usa o fluxo existente de moderação de comentários.
- Fechamento e interações conflitantes ficam bloqueados durante envio. Respostas
  tardias não alteram componente desmontado; renovação de token pode esconder
  ferramentas temporariamente sem perder a operação já autorizada no servidor.
  Confirmação focaliza motivo; cancelar devolve foco à ação de origem.
  Após moderar vídeo, fecha diálogo e atualiza mesma ordenação/filtro, com foco no
  conteúdo principal. Excluir comentário atualiza comentários, sem desmontar player,
  e focaliza o título da seção.

## Validações

56 testes distintos relacionados aprovados: 42 Node/SSR e 14 REST/regras em 8081.
Node: sete de sessão, seis de bloqueio, seis autenticador, dois API administrativa,
três revisão tradicional, treze comentários, quatro componentes e uma regressão
localizada do cabeçalho. Emulador: quatro novos cenários e dez regressões tradicionais.
Cobrem expiração/MFA/UID/revogação, logout/conta trocada e respostas atrasadas, ocultação
de ferramentas, cota, reserva, auditoria, transições/concorrência, restauração e SDK.
SSR verifica estrutura/visibilidade, não substitui teste interativo Google/TOTP.

Lint/build completos passaram. Ajustes posteriores receberam lint e TypeScript
localizados; sem repetir suites sem relação com a alteração. diff --check aprovado.
API local reiniciada para carregar novo block: /admin 200; session/review/comments
administrativos retornaram 401 sem credencial. Nenhum conteúdo 8080 foi moderado
pelo assistente. Testes negativos geraram somente controle normal de tentativas.

### Conferência pelo proprietário

Atualizar /admin e entrar pessoalmente com Google/TOTP. Conferir campo compacto,
quatro seções e filtros preservados ao alternar. Navegar por logo/ficha e voltar
pelo histórico sem recarregar: autorização permanece. Digitar URL com recarregamento
completo não equivale a navegação SPA e exige login, conforme política em memória.
Abrir short: administrador vê Excluir/Bloquear; visitante não vê ferramentas.
Ações reais alteram dados locais: conferir apenas em conteúdo que deseja moderar,
com confirmação/motivo, fila, histórico e restauração. Não enviar códigos/tokens.
Solicitada conferência interativa ao proprietário; resultado ainda pendente.

### Ocorrência fora do escopo

Log acumulado da API anterior apresentou avisos React de chaves duplicadas, inclusive
às 21:31 do dia anterior ao bloco, sem causa identificada. Não foram corrigidos
silenciosamente nem atribuídos à nova sessão. Registrar reprodução e componente
responsável na revisão integrada 7.6.4, antecipando correção se impedir um fluxo.

Implementação 7.6.2 concluída; aceitação interativa pendente. Próxima 7.6.3 — players,
autoplay permitido, navegação, miniaturas e diagnóstico de recursos externos,
mediante autorização individual e proposta separada para atravessar páginas do feed.

## Refinamentos após conferência do proprietário — 22/10/2026

- Navegação principal centralizada, com seleção persistente por borda/destaque e marca de seleção, sem depender apenas de cor.
- Quatro seções oferecem nome/texto/título ou data, em ordem crescente e decrescente. A ordem é aplicada pelo Firestore à fila completa; nunca apenas aos itens carregados.
- Jogos e solicitações usam cadastro; comentários usam publicação; denúncias usam primeira denúncia (firstReportedAt); vídeos pendentes/removidos usam cadastro original (createdAt), não a data de cada decisão administrativa.
- Cada consulta lê até 21 candidatos, apresenta 20 e usa o vigésimo como cursor. O ID desempata valores iguais no mesmo sentido. Trocar filtro/ordem reinicia a paginação; o servidor rejeita cursores de outro filtro, fila ou ordem. Atualizações concorrentes podem mover itens entre páginas; usar refresh para recomeçar.
- Comparação alfabética nativa do Firestore, sensível a maiúsculas/acentos; não equivale à colação linguística pt-BR. Não há varredura completa por visita.
- Excluir vídeo e Bloquear vídeo ficam ao final do visualizador, depois dos comentários/formulário, sem caixa inset/fieldset administrativo.
- Exclusão de comentários: entrar em seleção, checkboxes da página visível, contador, Cancelar e confirmação com motivo. Até 20 selecionados; decisões individuais reutilizam leitura atual/revisão, autorização UID/TOTP e auditoria/restauração/ranking existentes. Nenhum endpoint novo de exclusão.
- Lote não é atômico: interrompe na primeira falha, informa os confirmados e mantém restantes selecionados. Não repete automaticamente; limite de requisições preservado (leitura de detalhe + exclusão por comentário), portanto uma seleção grande pode exigir aguardar e tentar os restantes. Resposta perdida após commit pode exigir atualizar a lista; a revisão impede repetir decisão já aplicada.
- Navegação/ações concorrentes ficam bloqueadas durante decisão. Cancelar abandona apenas seleção não enviada; não desfaz exclusões confirmadas. Perda de autorização remove a interface administrativa. Foco no primeiro checkbox/motivo e retorno ao acionador ou título dos comentários.

### Preparação local e índices

Autorizado complemento somente no emulador. Novas denúncias copiam título do registro do vídeo no resumo; nunca aceitam esse campo do visitante. Preparação explícita em lotes de 30, transações por resumo, sem sobrescrever contadores/decisões concorrentes. Marcador privado adminQueueState/reportTitles versão 1 só fica pronto após sucesso; falha mantém ordenação alfabética de denúncias indisponível, sem ocultar silenciosamente registros legados. Migração idempotente; fonte ausente exige investigação, não título inventado.

Comando local: node scripts/prepare-admin-report-titles.mjs 8080 --apply
O script só aceita portas 8080/8081, projetos demo fixos e nenhuma credencial remota. Executado no demo-clipzone: examinados 0, atualizados 0, marcador preparado. Não alterou os shorts/comentários existentes. Não foi executado contra Firebase remoto.

17 índices compostos adicionais definidos em firestore/firestore.indexes.json; sem deploy. Usam campos existentes, salvo título no resumo. Cada consulta transfere somente projeção necessária. Até 21 documentos por página (+ leitura do marcador privado para denúncias por título); consulta vazia segue cobrança mínima da infraestrutura. Índices ampliam armazenamento/manutenção nas escritas; o emulador não demonstra custo nem exige criação dos índices como produção. Antes de qualquer deploy, validar criação/disponibilidade dos índices e preparação remota, mediante autorização própria. Nenhum serviço/dependência/banco adicional.

### Verificação desta rodada

47 testes relacionados distintos aprovados: seleção/exclusão interrompida (6), componentes SSR (7), catálogo/HTTP (10), moderação/autorização (3), comentários (13), ordenação/preparação/regras no emulador isolado (6), denúncias concorrentes/segurança (2). Ordenação foi reconferida após reduzir os campos projetados. Não executada suíte completa.
Lint/build completos aprovados na integração; ajustes finais receberam lint e TypeScript localizados. SSR não comprova cliques reais, foco no navegador, aparência ou login Google/TOTP: conferência interativa ainda necessária.

Durante revisão do mesmo visualizador, identificada causa concreta de aviso React: chaves iguais em elementos irmãos (player/formulário e curtida/denúncia). Distinguidas com prefixos, preservando reinicialização por short. Não presume resolver todos os avisos históricos sem reprodução posterior.

API HTTPS local reiniciada para carregar novos handlers; sessão em memória anterior encerrada. Próxima ação: proprietário atualizar /admin, entrar Google/TOTP e conferir alinhamento, seleção, quatro ordens/filtros, voltar/avançar páginas; no visualizador, conferir ações ao final e seleção/cancelamento dos comentários. Exclusão real apenas de comentários que deseja remover, pois é registrada mesmo no emulador.
7.6.3 continua dependendo de autorização individual, após esta conferência.

HTTP após reinício: /admin 200; sessão anônima local de teste 204; quatro filas administrativas 401 sem token, com cookie anônimo válido. Sem cookie, bloqueio de admissão respondeu 429 antes da autorização. Nenhum token administrativo obtido nem conteúdo moderado nessa verificação. Alterações de toda a 7.6.2 preservadas sem stage/commit automático.

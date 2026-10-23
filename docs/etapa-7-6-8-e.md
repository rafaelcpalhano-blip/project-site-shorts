# Etapa 7.6.8-E — combobox experimental de jogos

Implementação local em 23/10/2026, autorizada pelo proprietário com pesquisa integrada e aproximadamente seis jogos visíveis. Substitui a referência anterior de dez linhas. Aguardando avaliação visual do proprietário; F não iniciada.

## Escopo e recuperação

Git limpo ao iniciar. Seletor anterior recuperável no histórico Git, sem duplicação de código morto. Compartilhar short usa GameCombobox nos modos persistente e demonstrativo. Filtros do feed e seletores administrativos não foram alterados.

Arquivos funcionais:

- src/features/games/components/GameCombobox.tsx e GameCombobox.module.css: apresentação, posicionamento, foco, rolagem e seleção.
- src/features/games/services/game-options.ts: ordenação pt-BR e filtro local normalizado.
- src/features/games/components/GamePicker.tsx: reutilização no modo demonstrativo.
- src/features/submissions/components/PersistentSubmissionDialog.tsx: integração e leitura das páginas restantes do catálogo.

## Comportamento

Campo recolhido com Selecione um jogo; abre por clique, Enter, Espaço ou setas. Pesquisa no topo sem botão, sem consultas por caractere e sem acesso à IGDB. Nomes preservados; comparação pt-BR, ignorando capitalização/acentos na pesquisa. IDs deduplicados. Pesquisa vazia retorna à lista completa; ausência mostra Nenhum jogo encontrado.

Lista de altura máxima de 264px, equivalente a seis linhas de 44px para nomes curtos. Nomes longos quebram em vez de criar rolagem horizontal. Painel abre acima ou abaixo conforme espaço disponível; tamanho reduzido quando necessário. VisualViewport acompanha alterações da área útil, inclusive teclado virtual quando o navegador o disponibiliza. Sem biblioteca nova.

Foco no campo de pesquisa com role combobox, aria-controls, aria-expanded e aria-activedescendant; opções em listbox com aria-selected. Setas navegam e mantêm a opção visível. Enter confirma e avança para canal no formulário persistente. Escape fecha só a lista sem mudar a seleção; Tab fecha e continua o formulário; clique externo fecha. Mouse/toque selecionam por clique, sem simulação de eventos. Label, dica de obrigatoriedade e foco visível preservados.

Um select invisível com a opção escolhida participa exclusivamente da validação nativa required por ID, sem duplicar uma segunda lista visual. Em caso inválido, abre/focaliza o seletor visível. Não se trata de manter o seletor visual antigo como código morto.

Catálogo persistente: reutiliza listGames e seus cursores/páginas de 50, consultando sequencialmente até acabar, uma vez por montagem do formulário ou tentativa explícita após erro. As regras existentes de status ativo e visibilidade pública ficam intactas. A pesquisa local só começa com o catálogo completo, para não apresentar resultado parcial como definitivo. Enquanto carrega, controles existentes de publicação continuam desabilitados. Fechar o formulário impede novas páginas e aplicação tardia de respostas. Deduplicação por ID entre páginas. Não há limite de seis/dez registros na consulta.

Se uma página falha, o formulário informa o erro e permite recarregar o catálogo, preservando outros campos. As opções de cadastro manual/IGDB, callback onSelected, prevenção de duplicação, confirmação de publicação, payload e serviços de envio permanecem como antes. Novo cadastro continua inserido/selecionado pelo ID.

## Validação

Cinco testes focados aprovados:

```powershell
node --test tests/game-combobox.test.mjs tests/refinements-7-6-7-a.test.mjs
```

Cobrem pesquisa parcial/completa sem distinção de acentos/capitalização, nomes e IDs preservados, ordem pt-BR, deduplicação e acesso além de seis/dez registros, controle recolhido e validação required, além da integração estrutural com o formulário e acesso à inclusão de jogos.

ESLint localizado e build aprovados. Avisos conhecidos: HMR ocupado no teste SSR aprovado; bundle principal 514,72 kB acima do limite informativo de 500 kB. git diff --check aprovado.

Navegador com fixture temporária e serviços simulados:

- 61 jogos em duas páginas; resultado final com calls:2. Pesquisa e reabertura não criaram consultas adicionais.
- Seis linhas de 44px, altura 264px, scroll inicial zero; rolagem até Zelda, último registro.
- POKEMON encontra Pokémon; pesquisa ausente mostra mensagem; limpar reexibe 61.
- Enter/Espaço abrem; setas/Enter confirmam; clique seleciona; Escape mantém Pokémon e conserva modal aberto; Tab avança à seção seguinte.
- Obrigatoriedade por reportValidity mantém formulário e focaliza pesquisa sem abrir confirmação de envio.
- Envio simulado confirmou gameId:zelda, URL, título e canal manuais preservados. Sem chamada real de publicação.
- Retorno de novo cadastro simulado atualizou campo e valor para manual-simulado; callback real de inclusão foi preservado por revisão de código. Não houve novo cadastro de negócio para testar.

Site real, apenas leituras: 21 jogos elegíveis, lista de seis linhas e pesquisa conferidas. Desktop e 390px sem overflow horizontal; painel dentro da tela. Capturas salvas fora do repositório. Fixtures removidas após teste, abas de teste fechadas e viewport restaurado.

## Limitações e avaliação

É uma versão experimental. Não foi realizada auditoria com leitor de tela real nem teste de toque/teclado virtual em aparelho físico. Largura móvel foi conferida no navegador; esses cenários devem fazer parte da avaliação do proprietário.

O catálogo completo é mantido em memória por formulário, com consultas paginadas. Isso atende ao volume local atual e à busca completa sem leituras por letra. Crescimento significativo exigirá reavaliar tempo inicial, leituras e renderização (carregamento progressivo/virtualização ou busca própria), sem limitar a possibilidade de encontrar qualquer jogo. Sem implementar infraestrutura adicional agora.

Sem alterações em backend, autenticação/MFA, regras de publicação/moderação, Firebase real, infraestrutura ou dependências. Sem deploy, commit ou avanço automático. Aguardar avaliação do proprietário antes de considerar o experimento definitivamente aprovado e iniciar F.

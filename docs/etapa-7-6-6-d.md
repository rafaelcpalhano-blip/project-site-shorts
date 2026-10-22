# Etapa 7.6.6-D — visualizador, comentários e navegação

Concluída localmente em 22/10/2026. Bloco E, produção e auditoria final aguardam autorização individual. Nenhum serviço, dependência, faturamento ou deploy.

## Numeração permanente

publicationNumber é atribuído pelo servidor na primeira transição para aprovado, usando lastCommentNumber no short, na mesma transação que publica e atualiza a contagem. Pendentes/rejeitados não reservam números; aprovação posterior recebe o próximo número, mesmo que o envio seja antigo. Remoção não reduz o contador. Restauração conserva o número, não gera nova sequência nem outra comemoração. Reenvios idempotentes retornam antes da alocação. Valores inválidos/overflow interrompem a operação sem gravação parcial. Escrita direta de comentários/shorts pelo cliente continua proibida.

Listagem pública ordenada por publicationNumber decrescente, com ID para estabilidade; até 21 registros lidos para exibir 20. Cursor inclui número e continua vinculado ao short. Comentários removidos deixam lacunas, sem renumeração. Uma nova publicação acima do cursor entra após atualizar a lista, sem duplicar os comentários seguintes. createdAt original é preservado e não define mais o número público. Cursor antigo sem número exige Atualizar comentários. Compatibilidade visual para um registro sem campo: rótulo Comentário anterior à numeração, sem inventar número pela posição. A consulta indexada exige preparar o histórico antes de ativar este código em outro banco.

## Histórico e preparação local autorizada

O proprietário autorizou expressamente aproximar o histórico por data de envio e ID, incluindo removidos, exclusivamente no emulador. Não havia data confiável da aprovação original. A ferramenta scripts/prepare-comment-numbers.mjs fixa demo-clipzone e porta 8080, sem endpoint/projeto remoto configurável. Padrão é simulação; --apply grava. Até 30 shorts por execução, continuação --after=ID; até 200 comentários aprovados/removidos por short, com consulta limitada a 201 para detectar excesso e abortar. Estados, textos, datas e revisões são preservados. Sequência já preparada não é renumerada nem reconsultada. Query e gravações do short/histórico estão na mesma transação; uma corrida causa retry, sem publicar números duplicados. Dados inesperados ou campos parcialmente numerados interrompem a preparação para investigação.

Com a API local parada para evitar um escritor antigo, simulação encontrou 9 shorts e zero comentários aprovados/removidos. Aplicação inicializou 9 contadores em zero, sem alterar comentários. Segunda execução fez zero alterações. API foi reiniciada com os segredos persistentes; emulador 8080 preservado. Não houve alteração no Firebase real. Não executamos publicação, comentário, curtida ou denúncia de teste no ambiente 8080. Cenários com comentários foram exercitados no 8081 isolado.

## Visualizador e navegação

Cabeçalho constante Visualizador de short. Ordem: player oficial; links Assistir na plataforma à esquerda e Vídeo indisponível? à direita (botão interno com aparência de link); curtidas; título completo; comentários; formulário; informações/denúncia; moderação administrativa. Removidos Encerrar player e frase redundante sobre Play; aviso de autoplay bloqueado e tentativa explícita de carregar continuam disponíveis. Mesmo controlador de player único, cleanup ao fechar/trocar/ocultar e nenhuma reprodução adicional por card. Aviso do escopo da sequência centralizado; setas, teclado, wheel e proteção de rascunhos preservados.

Recolhimento após inclusão manual passa de 5 para 1,5 segundo, mantendo o aviso fora da seção, seleção do jogo e campos. Cancelamento em nova ação/desmontagem preservado; nenhum cadastro artificial foi feito para a conferência.

Logo usa Link interno existente. A chave da localização remonta somente HomeContent, limpando filtro, ordenação, paginação, seleção e mensagens transitórias. O provider administrativo está acima e não é remontado; cookies, preferências, likes e dados persistidos não são limpos. Foco retorna ao conteúdo a cada navegação interna. Login real com Google/TOTP após a reinicialização da API fica para a revisão integrada E; não afirmar homologação autenticada nesta execução.

## Verificação e custos

76 testes relacionados distintos aprovados: comentários unitários/HTTP (18), leitura pública (9), player (8), navegação de sequência (8), componentes da sequência (4), tempo/contato/recolhimento (6), renderização de comentários (3), validação de sequência/cursor/preparação (3), regressões visuais anteriores (4), estrutura nova do visualizador (1), sequência/migração/concorrência/paginação no Firestore isolado (4), integração de comentários existente no Firestore isolado (8). Expectativas antigas de posição/offset e ausência total de img foram atualizadas para número persistido e Clipper aprovado. Nenhuma suíte completa foi executada. Build, lint e diff aprovados.

No navegador: filtro Valheim e ordem Primeiro Postado voltaram aos padrões pela logo; título completo abaixo do player; um player YouTube abriu no fluxo existente; Vídeo indisponível? e fechamento desmontaram o iframe, sem criar denúncia. Captura etapa-7-6-6-d-visualizador.png fora do Git, no workspace da conversa. Temporizador de 1,5 segundo foi validado por relógio simulado, sem cadastrar jogos. Preservação real de autorização administrativa não foi testada com credenciais do proprietário.

Custos: contador no short e número no comentário reaproveitam documentos/escritas já existentes. Nenhuma coleção de sequência ou consulta por comentário/cartão; o novo índice composto está só em arquivo local. Na primeira publicação de um short ainda sem contador pode haver uma consulta limitada de histórico, além da checagem de primeiro comentário existente; após inicializar, usa o contador do short já lido. Preparação histórica tem leituras/escritas limitadas e explícitas, nunca por visita. Índice por publicação adiciona armazenamento/atualização de índice, sem documento extra. Emuladores não geram cobrança remota.

Próximo: 7.6.6-E — validação integrada localizada, documentação e conferência com proprietário, mediante autorização. Não avançar para produção.

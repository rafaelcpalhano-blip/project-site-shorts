# Etapa 7.6.7-D — ações administrativas em lote

Concluída localmente em 22/10/2026. Base Git limpa; funcionalidades das etapas anteriores preservadas. Sem deploy, serviços, dependências, índices, coleções ou alterações no Firebase remoto.

## Comportamento

- Checkboxes no início das linhas elegíveis das quatro seções administrativas. Até cinco registros da página atual por lote; filtros, ordenação, paginação, atualização ou troca de seção limpam a seleção.
- Apenas ações comuns aos estados selecionados. Detalhes de jogos, comentários e vídeos são conferidos antes de selecionar; solicitações usam a revisão e o nome já retornados pela fila.
- Catálogo: aprovação de provisórios, ocultação, banimento, desbanimento e ativação conforme as ações autorizadas existentes. Desbanimento conserva o estado anterior registrado.
- Solicitações pendentes: aceitar como cadastro manual com o nome de cada solicitação ou rejeitar. Vincular ao IGDB exige decisão individual. Vinculadas/rejeitadas não ganham transições novas.
- Comentários: publicar/rejeitar pendentes, remover publicados e revisar/restaurar quando o estado e o vídeo permitem, sempre com validação final do servidor.
- Vídeos/denúncias: arquivar, bloquear, publicar/desbloquear, remover ou restaurar conforme a fila, o estado e o histórico seguro disponíveis.
- Área única de confirmação antes de Sair, motivo obrigatório e confirmação explícita. Foco retorna ao checkbox ao cancelar e ao resultado após executar; layout conferido em 390px sem overflow horizontal.

## Segurança e falhas parciais

Cada item reutiliza o endpoint individual existente. Autorização Google/TOTP, revisão atual, auditoria individual, identidade, cotas e regras de restauração continuam sob autoridade do servidor. Não foram alteradas regras de negócio no backend.

Execução sequencial, sem repetição automática, interrompida na primeira falha. Resultado por registro: concluído, não confirmado ou não iniciado. Sucessos saem da seleção e ficam indisponíveis para novo lote até atualizar a fila. Os demais permanecem selecionados, exigindo nova escolha e confirmação; respostas incertas exigem conferir histórico e atualizar antes de tentar outra vez.

Ao desmontar o painel, novas chamadas param. Uma chamada já enviada pode concluir no servidor e permanecer auditada. Não há transação única entre registros nem garantia de preenchimento de todo o lote. Limites existentes podem interromper operações, inclusive entre lotes consecutivos.

## Custos

Até cinco chamadas de preparação por seleção de jogos/comentários/vídeos, usando as consultas individuais já existentes; solicitações não precisam dessa leitura adicional. Até cinco decisões sequenciais por lote, cada uma com suas leituras/escritas/auditoria e eventuais verificações técnicas já previstas. Não há varredura de coleção, consulta por checkbox não selecionado, índice ou coleção nova.

## Validação

- 9 testes do orquestrador: interseção, limite, serialização, interrupção, falhas incertas, preparação por estado e payload individual.
- 7 testes de componentes administrativos: seções, montagem e guardas preservadas, nova área de ações.
- 45 testes relacionados existentes: moderação, bloqueio, seleção de comentários, catálogo e comentários.
- 4 testes com Firestore isolado em demo-clipzone-tests/8081: auditoria individual e revisão; solicitações com nomes distintos; conflito parcial e numeração de comentários; cota e identidade de vídeos nas decisões/restaurações. Nenhuma limpeza do emulador de desenvolvimento 8080.
- Total: 61 testes locais + 4 testes Firestore aprovados. ESLint localizado, build e git diff --check aprovados.
- UI com componentes reais e transporte simulado: quatro filas, limite cinco, ações comuns/sem interseção, falha parcial, bloqueio durante execução, sucesso não repetido, limpeza de contexto, ausência de restauração insegura, foco e largura móvel. Nenhuma decisão de negócio gravada por essa conferência visual. Fixtures removidas.

Build concluiu com aviso de chunk principal de 504,37 kB minificado (155,60 kB gzip), acima do limiar de 500 kB. A divisão de carregamento não foi alterada nesta etapa. API local não exige reinício por estas mudanças de interface; sessão e dados locais preservados.

## Próxima etapa

7.6.7-E — rodapé e comunicação com Clipper. Aguardar autorização específica e apresentar proposta de composição/texto antes de implementar.

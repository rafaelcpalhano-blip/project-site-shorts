# Etapa 9-B — inspeção local de retenção sem exclusões

29/10/2026. Preparação autorizada para seguir a próxima etapa. Nenhum acesso ao Firestore remoto, credencial, HD, backup, deploy ou job foi realizado.

## Entrega

Biblioteca opt-in em server/maintenance/inspect-retention.ts. Exporta inspectAuxiliaryRetention; exige fonte de leitura e relógio injetados. Não tem CLI, rota HTTP, transporte padrão, leitura de ambiente/credenciais, timer ou agendamento. Não é importada pelo frontend ou pela entrada do Worker.

Seleções aceitas exclusivamente: networkAbuse, shortLikes e likeAttempts. Recusa apply, limites configuráveis, coleções primárias/ranking e cursores inválidos antes de consultar. Uma chamada de consulta à fonte por inspeção, no máximo trinta documentos retornados; não pagina automaticamente.

| Coleção | Elegibilidade observada | Limitação |
| --- | --- | --- |
| networkAbuse | expiresAt válido menor ou igual ao instante capturado | Apenas primeira janela de candidatos; se cheia, informa continuação possível, sem inventar cursor ou total do banco |
| shortLikes | Regra existente: descurtida válida há mais de90dias; ativa, recente, limite exato de90dias e registro inválido não elegíveis | Uma página, cursor opaco explícito para outra inspeção |
| likeAttempts | Contador/janela válidos com updatedAt de mais de90dias | Uma página, cursor opaco explícito para outra inspeção |

A biblioteca reaproveita cleanupLikes com apply:false e um adaptador que não fornece nenhuma transação de escrita utilizável. Não chama cleanupNetworkAbuse, que é uma função de exclusão; a análise de expiração de rede é somente de leitura. Sem chamadas de set/create/delete/commit ou alterações de contadores. Jogos, shorts, comentários, curtidas ativas e dados de ranking não são alvos.

Resumo contém coleção, instante, contagens, deleted:0 e indicação de continuação. Não devolve conteúdo dos documentos. Cursores opacos são operacionais e devem ficar privados se uma futura execução real os utilizar; o relatório público deve usar apenas contagens sanitizadas. Não são autorização de exclusão nem prova de que um registro ainda estará elegível depois.

sourceQueries:1 indica uma chamada à fonte injetada; returnedDocuments indica registros retornados, não leituras debitadas ou número completo de pedidos HTTP/OAuth. Uma consulta vazia não significa custo contábil zero. A fonte real deve possuir limites de transporte e ser aprovada antes de sua conexão.

## Segurança e concorrência

- Relógio e seleção capturados antes da espera: alterações posteriores não mudam coleção ou corte de expiração da mesma inspeção.
- Mais de30 resultados, IDs inválidos/duplicados, dados malformados e ordem/cursor inconsistentes recusados com erro fixo.
- Falhas da fonte não revelam exceções privadas nem tentam outra fonte.
- Cancelamento antes/depois da leitura recusa relatório de sucesso; não garante cancelar um transporte que não receba o signal. Um futuro runner real deve propagar cancelamento e timeout ao transporte.
- Não existe opção de escrita. Mudança de estado entre inspeção e futura limpeza exige revalidação transacional pelas funções existentes e autorização própria.

## Verificação

Onze testes novos cobrem expiração/limites, preservação de ativos/recentes/malformados, imutabilidade, ausência de acesso a escrita, seleção proibida, paginação limitada, erros sanitizados, cancelamento, relógio e alteração de entrada durante espera. Com testes de curtidas e rede:37/0. Suíte geral completa em série:900/0. Tipos de servidor, lint global, verificação local de segredos e diff aprovados. Não há frontend ou API alterado; não foram repetidos Lighthouse, build de assets, emulador ou medição de CPU, pois este módulo é uma biblioteca operacional ainda desconectada da aplicação.

Evidência sanitizada: [etapa-9-b-inspecao-retencao.json](evidencias/etapa-9-b-inspecao-retencao.json).

## Próximo procedimento, sem execução nesta entrega

1. Escolher a coleção e o escopo da inspeção real; conferir alvo, Spark/margem e teto de leitura/tempo.
2. Preparar e aprovar um runner privado, opt-in, que use a credencial existente sem expô-la, forneça transporte limitado e grave somente recibo privado/resumo sanitizado.
3. Inspecionar uma página, sem exclusão nem continuação automática. Não concluir quantidade total a partir dessa página.
4. Só se houver elegíveis: revisar proposta separada de limpeza pequena, com revalidação de expiração e preservação de ativos/contadores. Aprovar exclusão explicitamente antes de aplicá-la.

A revisão de retenção pode ser combinada com a rotina manual de backup, mas nenhuma frequência de limpeza ou exclusão automática foi aceita por esta entrega. O pedido de lembrete a cada15dias refere-se ao backup e continua aguardando data de lançamento/horário/canal.

A confirmação de recuperação do TOTP permanece independente. Esta preparação não encerra os gates operacionais, não reativa ranking, não altera regras e não autoriza lançamento ou GitHub público.
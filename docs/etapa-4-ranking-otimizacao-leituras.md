# Etapa 4 — Otimização local das leituras do ranking

## Resultado e limite da conclusão

Preparação local concluída em 28/10/2026. Não houve acesso a credenciais, consultas remotas, alterações no Firestore remoto, inferência, deploy ou criação de cron nesta etapa. A redução de chamadas foi comprovada localmente; CPU real abaixo de 10 ms continua não comprovada.

O piloto anterior mediu 38/37 ms, foi interrompido e teve cron removido e versão desligada restaurada. A autorização desse piloto está encerrada. O último estado remoto conhecido é a versão df8da48f-975f-47a5-9424-4d2476f4a0fc, sem ranking/jobs/cron ativos; esse estado não foi consultado novamente nesta preparação.

## Mudanças

- Leituras transacionais agrupadas em até quatro documentos, na mesma transação, mantendo a validação de revisão, lease, época e ponteiro público antes de escrever.
- Leituras históricas de jogos/métricas agrupadas em até quatro documentos, com o mesmo readTime e projeção fixa de campos. Jogos repetidos são deduplicados somente dentro do passo e do mesmo snapshot.
- Removida uma releitura redundante do checkpoint entre a manutenção e o gerador. Um checkpoint antigo nunca autoriza sobrescrever progresso concorrente.
- Limite de vídeos do operador também contabiliza o novo caminho em lote; falhas ou respostas incompletas não provocam recuperação por leituras atuais.
- Pontuação, ordem, intervalo de 30 minutos, limites de passos, orçamento diário, segurança e conteúdo primário preservados.

O contrato oficial de [Firestore batchGet](https://docs.cloud.google.com/firestore/docs/reference/rest/v1/projects.databases.documents/batchGet) admite mask/readTime e não garante a ordem das respostas. O adaptador associa cada resultado ao documento solicitado e rejeita respostas duplicadas, extras ou incompletas.

## Comparação local em workerd

Mesma fixture e simulação de uma resposta OAuth por invocação, sem assinatura RSA real ou rede externa. As contagens são chamadas e documentos solicitados, não leituras faturadas ou medição de CPU. Resultados e quantidade de passos foram iguais em cada comparação.

| Cenário | Chamadas antes → depois | Bytes de resposta antes → depois | Documentos solicitados antes → depois | Passos |
| --- | --- | --- | --- | --- |
| 10 vídeos/8 jogos, proteção do piloto | 69 → 39 | 47.716 → 27.275 | 65 → 59 | 4 |
| 100 vídeos/jogos distintos, modo automático | 314 → 123 | 827.230 → 493.375 | 381 → 367 | 14 |

No cenário pequeno, os passos de início e coleta passaram de 17/31 para 13/13 chamadas. Os cenários usam modos diferentes e não devem ser comparados entre si. As descrições dos jogos na fixture ajudam a medir o efeito da projeção; o volume real depende dos documentos.

## Recuperação preparada, não executada

Foi criada uma função interna de operador, sem rota HTTP ou ligação ao agendador. Ela exige ID, revisão e geração-base esperados e recusa mudança concorrente, geração publicada, lease ativo ou construção ainda dentro dos 30 minutos. Apenas marca como falhos o checkpoint e seu registro de execução e expira o lease: três gravações auxiliares. Não exclui itens/documentos, não altera o ranking público e não devolve orçamento.

O checkpoint privado incompleto do piloto anterior continua pendente de recuperação: nenhum procedimento remoto foi executado aqui. Executar a recuperação exige aprovação separada do escopo concreto e nova conferência prévia.

## Validação

- 862 testes gerais aprovados; quatro novos testes com o emulador Firestore aprovados, sem acesso remoto.
- Após ajustar o estreitamento TypeScript do gameId já validado, 30 testes direcionados de ranking foram novamente aprovados.
- TypeScript da aplicação e servidor, lint, verificação local de segredos e diff aprovados. A auditoria histórica anterior não foi repetida.
- Comparação local minificada com resultados idênticos nos dois cenários e zero fetch externo.
- Dry-run do pacote congelado aprovado, mantendo os mesmos 43 assets e referências aos nove segredos; arquivo privado de segredos não aberto.

## Próximo passo

Ainda não ativar manutenção permanente. Uma próxima aprovação específica deverá definir recuperação do checkpoint expirado e novo piloto temporário, com tetos, coleta de CPU, parada e remoção do cron/rollback. Nenhuma sobra de tentativas do piloto encerrado será reutilizada. O novo piloto deve distinguir inicialização a frio de reutilização, registrar exceededCpu/1102 quando observáveis e interromper conforme o critério de CPU acordado. TikTok permanece pendente e lançamento público não está aprovado.

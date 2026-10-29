# Etapa 4 — Piloto remoto após otimização das leituras

Em 28/10/2026 o proprietário autorizou especificamente a recuperação do checkpoint expirado e um novo piloto na homologação. O piloto foi executado e encerrado: a CPU melhorou nas duas amostras, mas continuou acima do limite do Workers Free. A ativação permanente permanece pendente.

## O que representam os 10 ms

É tempo de processamento de código por execução, não tempo de resposta ao usuário. A espera de rede não conta; processamento de JSON, cálculos e ordenação contam. A [documentação da Cloudflare](https://developers.cloudflare.com/workers/platform/limits/#cpu-time) informa 10 ms no Free tanto para HTTP como cron e alguma tolerância a ultrapassagens infrequentes. Ultrapassagens recorrentes podem encerrar a execução; o resultado pode aparecer como exceededCpu/erro 1102. Não se deve depender dessa tolerância para operar continuamente. Nosso critério de duas amostras consecutivas acima de 10 ms é uma condição de parada de homologação, não uma afirmação de erro efetivo em cada amostra acima de 10 ms.

## Conferências e recuperação

Spark e franquia gratuita do Workers conferidos em painéis autenticados: 250/100.000 requisições Workers, 492/50.000 leituras, 87/20.000 gravações e zero exclusões Firestore exibidos antes do piloto. Indicadores podem ter atraso. O orçamento interno tinha 19.064 leituras e 3.817 gravações disponíveis; reservas internas não equivalem a operações faturadas.

O checkpoint antigo coincidiu com ID/revisão/base esperados e estava expirado. A recuperação usou três requisições Firestore, uma troca OAuth e três gravações auxiliares. Marcou a construção anterior como falha e expirou seu lease. Não alterou conteúdo, orçamento ou ponteiro público, nem excluiu documentos. O preflight posterior confirmou dez vídeos elegíveis/oito jogos, quatro passos estimados e nenhuma escrita de conteúdo.

## Execução observada

Pacote 06e2edac28dc6d13a4a809efbda549f4e47aa7c7d3dfa44dd29b466b793fded4, versão temporária 15648ee2-7962-44b9-874d-103894d455c0. Janela autorizada: 14h57–15h17 de Brasília, máximo oito claims, cron por minuto. A entrega começou depois da propagação; nenhuma tarefa foi disparada manualmente.

| Passo | CPU anterior → otimizada | Chamadas anteriores → otimizadas | Duração total otimizada | Resultado |
| --- | --- | --- | --- | --- |
| Início | 38 → 21 ms | 17 → 13 | 9.808 ms | building, outcome ok |
| Coleta | 37 → 16 ms | 31 → 13 | 7.380 ms | building, outcome ok |

Comparação de duas amostras equivalentes entre pilotos, não benchmark repetido sob condições idênticas. Inicialização a frio/reutilização não foi certificada. Nenhuma exceção ou outcome exceededCpu foi observado. Corpos de erro HTTP 1102 não foram inspecionados; não confundir ausência na coleta com garantia global de inexistência.

Após a segunda amostra acima de 10 ms, a coleta parou e foi executada a reversão com remoção do cron. Não houve terceira tentativa observada. A autorização deste piloto está encerrada; tentativas não utilizadas não podem ser reaproveitadas ou estendidas automaticamente.

## Estado e segurança após parada

- Versão df8da48f-975f-47a5-9424-4d2476f4a0fc restaurada a 100%; comandos de rollback e remoção do cron terminaram com código zero. O painel confirmou “No cron triggers configured”; a releitura posterior confirmou somente dois claims.
- Ranking/jobs desligados; bindings temporários de piloto e retenção ausentes; nove nomes de segredos preservados.
- Os 42 arquivos servidos publicamente mantiveram seus hashes; o pacote preservou 43 arquivos incluindo _headers. As 13 verificações de assets/cabeçalhos/origem passaram antes e após a reversão.
- Ponteiro público preservado, com nove itens. Nenhum vídeo, jogo, comentário ou curtida foi alterado pelo operador/piloto.
- A nova construção privada ficou em stage, revisão 1, dez frames e zero itens gravados. Nenhuma geração nova foi promovida e nenhuma exclusão foi registrada no orçamento. Esse checkpoint recente foi preservado; a aprovação de recuperação do checkpoint antigo não foi reutilizada para ele.
- Orçamento interno: 1.872 leituras/366 gravações/zero exclusões reservadas. São reservas, não débito real certificado.
- Planos mantidos gratuitos. Sem inferência iniciada pelo operador, criação de credencial, alteração de permissão ou lançamento público.

## Próximo trabalho

Localizar o consumo restante com perfil local, distinguindo inicialização, autenticação, transporte e processamento. As amostras apoiam continuar a otimização, mas não identificam sozinhas uma causa única. Preservar validação, transações, snapshots e proteção do ranking incompleto. Não ativar manutenção permanente, reduzir segurança ou mudar plano. Nova recuperação/deploy/piloto precisa de escopo e autorização específicos. TikTok permanece pendente separadamente.

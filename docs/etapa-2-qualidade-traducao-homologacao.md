# Etapa 2 — publicação, amostra e proposta de compatibilidade

## Publicação autorizada

28/10/2026. Worker 533b554a-271a-4d93-ad32-87ed04c9caee publicado, anterior c796854d-aaad-4e84-901e-bd65cbdbb45d. Os 43 assets API são idênticos; nove segredos e ACL preservados, sem alteração de modelo, endpoint, autenticação, planos, limites ou espera. Ranking/jobs/cron continuam desligados. Conferidos 13 checks de cabeçalhos/guardas, 42 hashes públicos e versão ativa a 100%. A referência local do pacote publicado passou em 809 testes, tipos, lint e dry-run.

## Resultado da única amostra

Doom/igdb-7351 foi confirmado uma vez pelo resultado oficial cujo value do rádio era 7351. Antes: ativo, original de 617 caracteres, sem tradução/tarefa; orçamento de 3 tentativas do dia e painel AI com 23,58/10.000 neurônios observados. Nenhum vídeo ou jogo foi criado.

A tentativa terminou failed com invalid-translation-response-shape-mixed. Contador de Doom: 1; contador global do dia: 4. Original preservado e sem tradução salva. Tibia não foi reconfirmado ou atualizado. Recibo consumido; não repetir sem nova autorização. Próxima elegibilidade: 28/10 às 02h25min50s de Brasília (05:25:50 UTC).

O código confirma coexistência de choices e response, sendo o legado não vazio e diferente do conteúdo final por comparação exata. Não foi guardado o texto; portanto não sabemos se a diferença é apenas espaço, raciocínio auxiliar ou conteúdo distinto. Não atribuir a falha à qualidade do prompt ou afirmar regressão de segurança sem essa evidência.

Coleta completa de 180 segundos, 11 eventos, zero exceções/exceededCpu. Confirmação HTTP200, 17ms de CPU e 3284ms de duração; primeira chamada da rota no isolate, aplicação já criada. Não houve inspeção dos corpos para descartar 1102 independentemente. CPU continua acima do alvo de 10ms e não está aprovada para produção. A amostra não permite avaliar a nova redação.

## Proposta local, ainda não publicada

A documentação oficial do modelo descreve a saída em choices/chat.completion: https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/. Proposta de integração: usar somente o conteúdo final de uma escolha validada quando choices existir; aceitar response apenas no formato legado sem choices. Não concatenar os dois, não armazenar raciocínio/legado e nunca recuperar uma conclusão inválida pelo response.

Esta proposta RETIRA a comparação entre o conteúdo final e o campo legado. É diferente da regra expressamente aprovada antes, que recusava divergência; exige nova autorização antes de publicar. Mantém object chat.completion, escolha única/index 0, role assistant, finish_reason stop, recusa de ferramentas/refusal, tipo texto, limites de tamanho, HTML, controles e marcadores. Não garante fidelidade semântica ou redação perfeita do modelo.

Cinco regressões novas cobrem precedência documentada, legado isolado, ausência de fallback de conclusão inválida, ferramentas/refusal/role e texto inseguro/nomes perdidos. Regressões antigas foram alinhadas à política proposta, sem apagar testes de conclusão incompleta ou insegura. 814 testes totais, tipos e lint passaram; dry-run aprovado. Pacote local ad41aa5ed428f4094bb6ca9760ff3f6ef99bbcc06ae0720176f40fedcd8457ef, com os mesmos 43 assets e 101 fontes de servidor verificadas por hash. Não foi publicado ou usado para inferência.

A árvore local contém a proposta; não confundi-la com o código atualmente publicado. Sua aplicação remota e outra amostra de Doom exigem aprovação específica, reconferência de estado/franquia e respeito à espera. Não repetir Tibia ou invalidar traduções em massa. A Etapa 2 permanece pendente de amostra válida de qualidade. Sem commit/push pelo agente.

## Compatibilidade canônica autorizada e publicada

O proprietário autorizou a política que ignora response quando choices existe e uma amostra única de Doom após a espera. Publicado d6782c6c-7323-44a2-98fb-1aa39d85741a, anterior 533b554a-271a-4d93-ad32-87ed04c9caee, às01h34 de28/10Brasília. Bundle ad41aa5ed428f4094bb6ca9760ff3f6ef99bbcc06ae0720176f40fedcd8457ef; mesmos43assetsAPI/nove segredos/ACL,814testes/tipos/lint/dry-run aprovados,13checks e42hashes públicos conferidos, ativo100%. Ranking/jobs/cron e planos preservados.

Leitura às01h33 confirmou Doom sem tradução, tarefa failed/attempts1/retryAt28/10 05:25:50UTC (02h25min50Brasília), global4tentativas. Não houve inferência nesta publicação. A nova amostra está autorizada e NÃO consumida: reconferir estado, versão e franquia, abrir coletaCPU e confirmar uma vez após a espera. Não pedir autorização novamente para o mesmo teste; não repetir se já houver nova tentativa ou tradução. Não criar agendamento. Qualidade permanece pendente.

## Amostra canônica concluída em 28/10

Uma reconfirmação autorizada após a espera produziu Doom ready/pt-BR, 633 caracteres, original preservado e tradução persistida após reload; acesso ao original aprovado. HTTP200/16msCPU/3270ms; coleta180s/15eventos sem exceções/exceededCpu. Autorização consumida; não repetir. Redação legível, mas estilo e nuance de fun ainda exigem revisão; geografia não foi exercitada nesta amostra real. Ver etapa-2-doom-traducao-confirmada.md.

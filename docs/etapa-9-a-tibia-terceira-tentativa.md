# Tibia — terceira tentativa autorizada

Executada uma única reconfirmação oficial em27/10/2026 às21h10 de Brasília. Worker6910fddf-8d39-4129-a289-f60ce08be37c preservado. Consulta prévia confirmou ausência de tradução e espera vencida; consumo de AI exibido0/10k no novo dia UTC. O contador diário havia reiniciado: a tarefa registra1 tentativa hoje, embora esta seja a terceira autorizada no histórico. Nenhuma repetição automática, vídeo publicado, deploy ou alteração de plano.

## Resultado

Confirmação HTTP200, CPU19ms, duração2666ms; primeira chamada dessa rota no isolate observado, com aplicação já criada. A coleta completa durou180segundos, recebeu21eventos, sem exceções ou exceededCpu. Não houve inspeção de corpos para descartar1102 independentemente. CPU19ms supera o alvo10ms; não certifica produção nem inicialização totalmente fria.

A tarefa terminou failed com código fixo invalid-translation-response-shape. Não foi uma recusa HTTP429/403 nessa tentativa: pelo caminho do adaptador, a resposta HTTP foi bem-sucedida e o envelope success foi reconhecido antes da recusa de formato. A descrição original de340caracteres continua íntegra; a ficha segue em inglês, sem tradução salva.

O código publicado agrupa quatro condições nesse erro: presença simultânea do campo legado response; object diferente de chat.completion; choices sem tipo array; ou quantidade de escolhas diferente de1. O diagnóstico não permite identificar qual delas ocorreu, e a resposta bruta não foi guardada. Não atribuir causa específica sem evidência.

## Preparação local

Separadas as quatro condições em códigos fixos, mantendo exatamente os mesmos critérios de aceitação. Não persistir campos arbitrários, texto, raciocínio, prompt, cabeçalhos ou segredos. Novo teste confirma a recusa de cada variante e a ausência desses dados na tarefa.18testes focados e804testes totais aprovados, sem falhas/skips.

Essa preparação ainda não foi publicada e não é apresentada como correção da tradução. A documentação oficial continua descrevendo chat.completion; referência: https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/. Próxima publicação/teste exige autorização específica. A espera registrada termina27/10 às22h10min29s de Brasília (28/10 01:10:29UTC); isso não agenda nem autoriza nova tentativa.

Recibo exclusivo e captura da ficha fora do Git. Evidência sanitizada em docs/evidencias/etapa-9-a-tibia-terceira-tentativa.json. Ranking/jobs/cron e planos preservados. TikTok continua pendente.

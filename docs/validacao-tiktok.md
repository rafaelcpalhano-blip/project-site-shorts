# TikTok — avaliação de formato curto (21/10/2026)

Estado vigente: exceção de duração aprovada e implementada pelo proprietário em 21/10/2026.
A falta de duração TikTok é uma limitação conhecida e aceita conscientemente para a
primeira versão. Refinamento futuro não bloqueia a publicação automática agora.

## Decisão e implementação vigentes

- Aceitar vídeo TikTok cuja URL canônica e resposta oficial oEmbed sejam válidas,
  sem exigir duração ou autorização/OAuth do criador.
- Conferir embed_product_id quando retornado; não aceitar resposta com ID divergente.
- Gerar formatPolicy tiktok-platform-exception somente no adaptador de servidor.
  shortFormat permanece unknown: elegibilidade por política, não duração comprovada.
- Decisão e revisão recebem a plataforma extraída da URL, impedindo que a exceção
  se aplique a YouTube/Twitch ou venha do JSON de publicação.
- Manter jogo ativo obrigatório e declarado pelo visitante, moderação existente,
  cinco publicados por dia, antiabuso, identidade permanente, denúncias e revisão.
- Auditar publicação automática com reasonCode tiktok-platform-policy.
- Aplicar a mesma política à aprovação/restauração administrativa, mantendo reserva/cota.
- Preservar YouTube /shorts/ com máximo de 180 segundos e as regras Twitch.
- Nenhum filtro de áudio/imagem ainda inexistente é presumido como implementado.
- Nenhuma dependência, serviço adicional, banco, credencial TikTok ou deploy.

## Verificação da implementação

44 testes relacionados passaram: fonte/URLs hostis, resposta inválida, ID divergente,
exceção forjada, isolamento YouTube, cota diária, duplicatas, moderação e restauração.
Lint e build completos aprovados pela integração entre adaptador e publicação.
Uma consulta real ao TikTok fornecido retornou existência confirmada, duração unknown
e decisão published por tiktok-platform-policy, sem gravar publicação.
Títulos podem faltar na resposta oficial: preenchimento manual/padrão continua disponível.
Vídeos longos TikTok podem ser aceitos sob esta exceção; não há promessa de duração curta.

Arquivos funcionais: server/videos/tiktok.ts, server/submissions/decision.ts,
server/submissions/submit-short.ts e server/moderation/review-short.ts.
Testes: tests/tiktok-video.test.mjs, tests/configured-videos.test.mjs e
tests/tiktok-publication.test.mjs.
A documentação e as alterações anteriores não commitadas foram preservadas.

## Estado do ambiente e pendência separada

API HTTPS local reiniciada com a nova política; sessões administrativas em memória expiram.
Ao encerrar o processo anterior, os logs existentes mostraram avisos React de chave
repetida no feed. Não foi alterado componente do feed nem atribuído o aviso à política
TikTok. Investigar em tarefa separada; o bloqueio transacional de duplicatas continua
coberto pelos testes. Nenhuma publicação de teste persistente criada nesta implementação.

## Avaliação anterior — contexto histórico

A análise abaixo fundamentou a decisão; não representa bloqueio ou aprovação pendente.

## Código reaproveitável

server/videos/tiktok.ts já valida URL por parser compartilhado, consulta oEmbed no
destino oficial fixo, recusa redirects, aplica timeout e valida fornecedor/tipo.
Mantém somente título validado; não executa HTML/scripts nem consulta URLs auxiliares.
A existência de /video/ID e o tipo video não informam a duração.
O jogo permanece declaração do visitante, sem comprovação externa obrigatória.

## Fontes oficiais e limites

| Fonte | O que oferece | Limite para o Clipzone |
|---|---|---|
| oEmbed público | Identificação da fonte, markup e metadados de apresentação | Não documenta duração. Dimensões de embed/thumbnail não provam duração nem formato curto. |
| Player oficial | onCurrentTime informa currentTime e duration no navegador | Sinal útil à interface, mas não prova confiável recebida pelo backend. |
| Display API video/query | Campo duration | Exige video.list e token do usuário autorizado; verifica que os vídeos pertencem a esse usuário. Não cobre autores arbitrários sem participação deles. |
| Research API | video_duration em dados de pesquisa | Acesso sujeito a elegibilidade, finalidade de pesquisa e aprovação; não é solução geral autorizada para o Clipzone. |

Fontes consultadas:
- https://developers.tiktok.com/docs/en/embed-videos
- https://developers.tiktok.com/docs/en/embed-player
- https://developers.tiktok.com/docs/en/tiktok-api-v2-video-query
- https://developers.tiktok.com/products/research-api/

Verificar event.origin e event.source no player impede mensagens de outros frames
na página normal, mas não torna o navegador do visitante confiável para o servidor.
Um atacante pode modificar o cliente ou chamar o endpoint diretamente com uma duração
inventada. Assinar no servidor um valor fornecido pelo cliente não comprova esse valor.
Não aceitar duration, screenshot, campo oculto ou booleano do visitante como prova técnica.

## Consulta real

Vídeo já fornecido pelo proprietário:
https://www.tiktok.com/@jogatinadovini/video/7697764250873269525

Uma consulta ao oEmbed oficial retornou HTTP 200. Campos presentes:
version, type, width, height, html, provider_url, provider_name, embed_product_id, embed_type.
Nenhum duration/video_duration e nenhum título nessa resposta.
Adaptador conservou shortFormat unknown; decisão retry/verification-incomplete.
Nenhuma publicação, reserva ou consumo de cota foi criado. Resultado de uma consulta
não prova ausência de metadados em todos os vídeos nem confirma disponibilidade eterna.

## Alternativas avaliadas antes da decisão

1. Manter a integração parcial atual: títulos quando disponíveis e players existentes,
   sem aprovar novos TikToks cuja duração não possa ser verificada. Sem custo ou arquitetura
   adicional. Desvantagem: compartilhamento automático TikTok permanece incompleto.
   Se autorizado, tornar a mensagem do formulário explícita sobre essa limitação em vez
   de sugerir que uma nova tentativa sempre poderá resolver.
2. Avaliar um verificador em ambiente controlado pelo servidor, capaz de observar o
   player oficial. Somente estudo de viabilidade, permissões/termos, confiabilidade,
   custo, isolamento e compatibilidade de hospedagem; NÃO implementar, instalar ou ativar
   serviço sem nova autorização. Não há solução gratuita/sustentável comprovada nesta análise.
3. Dispensar comprovação de duração exclusivamente para TikTok, aceitando o risco de
   vídeos longos. Esta foi a alternativa posteriormente aprovada pelo proprietário e
   implementada, conforme a decisão vigente no início deste documento.

OAuth de criadores, listas de confiança e aprovação administrativa por publicação
continuam excluídos pela decisão do proprietário. Não propô-los como implementação.
Scraping de endpoints privados, execução de scripts não confiáveis, download de mídia
e serviços terceiros não foram adotados como atalho.

O limite de 180 segundos foi aprovado especificamente para YouTube; não foi estendido
ao TikTok nem inventado um novo limite sem autorização.

## Verificação e checkpoint

Adaptador e testes relacionados inspecionados; uma consulta real controlada.
Nenhuma suíte já aprovada repetida: não houve alteração funcional.
YouTube/Twitch e as alterações documentais anteriores foram preservados.
Posteriormente o proprietário aprovou e foi implementada a exceção de duração descrita acima.

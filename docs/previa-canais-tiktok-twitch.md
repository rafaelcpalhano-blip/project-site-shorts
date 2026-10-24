# Prévia do canal TikTok e investigação Twitch — 24/10/2026

## Solicitação e escopo

Preservar os fluxos existentes; investigar falta de título/canal Twitch no celular e implementar nome do canal TikTok apenas se houver fonte oficial comprovada. Nenhuma mudança em players, publicação, critérios técnicos, YouTube ou infraestrutura.

## TikTok: fonte oficial e implementação

A documentação atual de vídeos apresenta um oEmbed sem título/autor: https://developers.tiktok.com/docs/en/embed-videos . Já o oEmbed de perfis documenta author_name e author_url: https://developers.tiktok.com/docs/en/embed-creator-profiles .

Consulta pública real ao vídeo já utilizado no projeto, https://www.tiktok.com/@jogatinadovini/video/7697764250873269525, retornou HTTP200 sem autor. Consulta oficial ao perfil https://www.tiktok.com/@jogatinadovini retornou HTTP200, type rich, author_name “Jogatina do vini”, author_url correspondente.

Implementada recuperação exclusivamente na prévia: somente após vídeo TikTok confirmado e sem channelName, consultar uma vez o perfil indicado pelo link canônico. Validar tipo/versão/provedor, HTTPS, origem e caminho do autor correspondente; nome com as mesmas regras existentes. Endpoint fixo oficial, sem seguir redirects ou executar HTML e com timeout4s. Não inventar nome pelo @, não usar descrição como nome, não substituir canal já existente. Falha deixa evidência original e preenchimento manual disponível. Esta consulta identifica o perfil indicado no link; não constitui prova adicional de propriedade do vídeo.

Arquivos: server/videos/tiktok-profile.ts, server/videos/preview.ts, tests/tiktok-profile-preview.test.mjs. Formulário existente já preserva edição manual e aceita canal com título nulo, portanto não precisou ser alterado para isso. Publicação não usa este enriquecimento, não faz consulta extra de perfil e conserva suas verificações. Uma prévia TikTok sem canal pode levar até4s adicionais por essa consulta opcional.

27 testes relacionados aprovados: tiktok-profile-preview, youtube-preview-recovery, channel-metadata, video-preview, twitch-video e video-url. ESLint dos dois arquivos de implementação, build firestore-emulator e diff aprovados. Ensaio real percorreu verificador, enriquecimento, handler HTTP e cliente: resultado {title:null,channelName:"Jogatina do vini"}; duas consultas oficiais (vídeo/perfil), sem gravação no banco. Não equivale a teste físico no Motorola.

## Twitch: situação comprovada e pendência

Fluxo atual de prévia já consulta Helix no servidor e lê title/broadcaster_name, sem ramificação por dispositivo. Fonte: https://dev.twitch.tv/docs/api/clips/ . Na5174, formulário real com o clipe existente BlatantHelpfulKimchiRiPepperonis-Mq_X7otazmw_SXCZ preencheu “Acessando áreas impossiveis - Avowed” e “SedaKing”. Nada foi publicado.

Não foi reproduzida a falha específica do celular. Foi solicitado o link exato que falhou e sua comparação no computador. Não alterar parser/timeout/regras da Twitch com base apenas em hipóteses; aguardar exemplo e reproduzir antes de corrigir.

## Aplicação local pendente

API5174 permanecia no PID16644, emulador8080 no PID7860. Windows retornou “Acesso negado” ao tentar parar somente a API; nenhum novo processo foi iniciado e o emulador não foi interrompido. Portanto o novo backend ainda NÃO foi ativado no serviço5174. Solicitado ao proprietário reiniciar no terminal original:

```powershell
# Na pasta do repositório, após Ctrl+C somente no terminal da API:
node --env-file=.env.server.local scripts/dev-api.mjs
```

Manter npm run emulators aberto. Depois reabrir formulário e conferir canal TikTok com o link acima e canal manual preservado; comparar Twitch com o link exato reportado no celular. Sem trocar credenciais ou restaurar/resetar dados. Build atualizada, servidor5175 não iniciado. Etapa8 continua suspensa. Sem commit automático ou deploy.
## Atualização — confirmação do proprietário e ativação concluída

Proprietário identificou que o compartilhamento Twitch no celular copiava uma frase de apresentação junto com a URL; links isolados preenchem os dados. Considerou o caso resolvido e pediu explicitamente nenhuma alteração. Parser e fluxo Twitch preservados.

Após reinício pelo proprietário, API5174 passou ao PID11428; Firestore8080 continua no mesmo PID7860. Consulta HTTPS local com sessão real ao endpoint /api/shorts/preview retornou HTTP200 e {title:null,channelName:"Jogatina do vini"}. Isso confirma que a recuperação TikTok está ativa na5174, superando a pendência de reinício acima. Nenhum short publicado e nenhum reset/restauração do emulador. Conferência visual no celular permanece com o proprietário; testes automatizados anteriores reaproveitados, sem repetir suítes. Etapa8 continua suspensa.
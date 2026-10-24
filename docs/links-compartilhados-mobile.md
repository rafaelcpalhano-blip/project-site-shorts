# Links compartilhados no celular — 24/10/2026

## Comportamento implementado

- Colagem com apresentação Twitch: extrair uma única URL oficial reconhecida e descartar o texto de apresentação. Exemplo do proprietário: “Confira este clipe! grungetv_ está em live Enshrouded!” seguido de URL /clip/. Se houver várias URLs ou destino inválido, não escolher automaticamente; a validação continua exigindo um link válido.
- Links TikTok vt.tiktok.com, vm.tiktok.com e tiktok.com/t/: resolver no servidor, mostrar endereço completo /@perfil/video/ID no campo e seguir a prévia existente, incluindo nome do perfil quando disponível.
- Prévia e cliente de envio aceitam link curto via resolução; a publicação recebe somente URL completa e conserva identidade canônica, deduplicação, cotas e verificações existentes. A validação estrita de publicação não passou a confiar em links curtos nem em redirects como prova técnica do vídeo.
- Edição manual de título/canal preservada na troca do endereço curto para completo. Falha na resolução conserva campos e oferece nova tentativa/link completo. Falha posterior dos metadados não perde o endereço já resolvido.
- YouTube conserva formatos e verificações atuais; não passou a aceitar /watch ou youtu.be.

## Resolução e limites

Rota POST /api/shorts/resolve compartilha controles de origem, sessão assinada, JSON/corpo limitado e limite de tentativas da prévia. Não publica nem reserva vídeos. Redirecionamentos são manuais, apenas HTTPS e destinos TikTok reconhecidos, sem credenciais/portas personalizadas. Até quatro requisições sob orçamento total6s; para ao obter endereço canônico sem baixar HTML da página do vídeo. Não segue destinos externos, IPs, perfil/login ou outra plataforma. Sem scraping, biblioteca ou infraestrutura nova. Cada prévia iniciada com link curto usa uma tentativa de resolução adicional na proteção existente; não há retry automático nem cache novo.

## Evidências e verificações

Link fornecido na imagem: https://vt.tiktok.com/ZSg9fB79B/ retornou HTTP301 para https://www.tiktok.com/@seda_king/video/7476924359467207942 (tracking descartado na canonicalização).

33 testes relacionados aprovados: sete novos em shared-video-links e26 existentes em video-preview, submission-client, tiktok-profile-preview, video-url, channel-metadata e youtube-preview-recovery. Cobrem extração, múltiplos links, hosts falsos, redirects externos/privados, loop/limites, origem/sessão, cancelamento, prévia, envio com campos manuais e deduplicação em memória. Lint dos oito arquivos de implementação e build firestore-emulator aprovados; diff sem erros.

Conferência isolada do formulário real em5178: colagem removeu frase Twitch; TikTok real resolveu para endereço completo e preencheu “Seda King”, mantendo título vazio. Edição manual anterior de título/canal sobreviveu à resolução; seleção de jogo e confirmação entregaram URL completa no envio simulado. Nenhum short foi publicado no emulador ou produção. A resposta Twitch desse ensaio era simulada; chamada real Twitch já havia sido validada no trabalho anterior. Captura fora do Git: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/shared-links/tiktok-resolvido.png. Fixtures retiradas e5178encerrada.

## Arquivos

- src/lib/validation/shared-video-url.ts
- server/videos/resolve-shared-url.ts
- server/http/video-preview.ts
- server/http/public-api.ts
- src/features/submissions/services/video-link-api.ts
- src/features/submissions/services/video-preview-api.ts
- src/features/submissions/services/submission-api.ts
- src/features/submissions/components/PersistentSubmissionDialog.tsx
- tests/shared-video-links.test.mjs

## Ativação e continuidade

API5174/PID11428 e Firestore8080/PID7860 preservados. API é processo protegido pelo Windows; solicitado ao proprietário reiniciar apenas o terminal da API com node --env-file=.env.server.local scripts/dev-api.mjs, mantendo npm run emulators. A nova rota backend ainda não está confirmada na5174 enquanto esse reinício não ocorrer. Depois atualizar/reabrir formulário e testar colagem Twitch/TikTok no Motorola. Não restaurar/resetar dados nem alterar chaves. Links removidos, expirados ou serviços indisponíveis continuam sujeitos a falhas externas tratadas; nome do perfil depende do oEmbed oficial.

Git anterior já contém canal TikTok (dd68ecd) e documentação correspondente (b618d3b). Ainda pendiam GameCombobox, game-panel-position, teste e relatório do seletor, além do pequeno bloqueio de catálogo vazio no formulário. Esses itens são incluídos nos blocos de commit finais junto do pedido atual. Sem commit automático/deploy/produção/alteração de infraestrutura; Etapa8 suspensa.
## Ativação confirmada na5174

Após reinício pelo proprietário, API5174/PID19512 respondeu com sessão real: /api/shorts/resolve HTTP200 converteu https://vt.tiktok.com/ZSg9fB79B/ em https://www.tiktok.com/@seda_king/video/7476924359467207942; /api/shorts/preview HTTP200 retornou title:null e channelName:"Seda King". Pendência de ativação encerrada. Firestore8080 permanece no PID7860, sem reset/restauração/publicação. Próxima ação: conferência física de colagem no Motorola; Etapa8suspensa.
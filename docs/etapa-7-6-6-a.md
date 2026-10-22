# Etapa 7.6.6-A — Segurança anônima e autorização

Implementada e validada somente no ambiente local em 22/10/2026. B–E e produção não iniciadas. Nenhuma alteração no Firebase remoto, serviço novo, dependência, faturamento, Turnstile ou deploy.

## Causa confirmada e alcance

A cota e as curtidas já eram transacionais no servidor, mas a identidade dependia exclusivamente de cookie assinado. Apagar cookies criava outra identidade. O runner também gerava novo segredo a cada reinício. Não era apenas efeito do emulador. A solução reduz renovação artificial de identidades sem alegar identificação de pessoas: cinco publicações por identidade/dia continuam; redes recebem limites adicionais e distintos. Limpar cookies ainda perde vínculo com a curtida antiga, mas não apaga o orçamento da rede. Trocar IP/VPN, reunir identidades ao longo do tempo ou usar botnet continua sendo limitação sem autenticação/defesa de borda.

## Implementação

- Cookie __Host-, HttpOnly, Secure, SameSite e HMAC existentes preservados. Segredos independentes para assinatura/identidade e sinais de rede ficam em .env.security.local, gerados uma vez com criptografia nativa, fora do Git, sem prefixo VITE. Arquivo ausente é criado com exclusividade; corrupção falha fechada e não substitui o segredo. A primeira mudança invalida cookies do runner antigo; próximos reinícios normais preservam identidade/cotas. Excluir/rotacionar o arquivo invalida vínculos e exige planejamento.
- O contexto confiável entra como segundo argumento da composição da API. No runner Node, vem exclusivamente de incoming.socket.remoteAddress. Nenhum X-Forwarded-For/CF-Connecting-IP enviado pelo cliente se transforma em identidade de rede. Sem IP confiável, proteção habilitada falha fechada. Na futura implantação Cloudflare, será necessário adaptar e verificar a origem confiável antes de liberar endpoints. A opção injetável sem proteção permanece para testes isolados; não é configuração adequada para produção.
- IPv4 mapeado é normalizado; IPv6 usa prefixo /64 para reduzir troca de interfaces temporárias. NAT, empresas, escolas, VPN e prefixos IPv6 compartilhados podem produzir falsos positivos. Rede é sinal, não pessoa.
- HMAC específico por finalidade e dia São Paulo. A coleção privada networkAbuse recebe hashes, escopo, contadores e expiração; não recebe IP bruto, hash de visitante, cabeçalhos nem fingerprint. Limites de tentativa sobrevivem a cookies novos; limites de contribuições confirmadas são gravados na mesma transação da publicação/curtida. Recusas não geram publicação/reserva/cota parcial. Tentativas continuam contabilizadas separadamente.
- Curtidas duplicadas/retries não gastam nova contribuição. Desfazer e refazer uma contribuição existente preservam o registro e a revisão. O orçamento mede novas identidades que contribuem, não toda alternância de estado. Contagem pública e ranking continuam server-side; não há garantia de uma curtida por pessoa.
- UID previamente aprovado continua sendo a única entrada da allowlist local (conferido sem exibir valor). Autorizador existente, Google/TOTP e consulta de estado/revogação preservados; não foi necessário enfraquecer ou reimplementar autenticação. Login Google de outra conta não concede privilégio. Interface já exige confirmação de autorização, sem UID apresentado publicamente.

## Limites iniciais para calibração local

| Controle por rede | Limite |
|---|---|
| Tentativas de nova sessão | 8 por janela de 10 minutos; 40 por dia |
| Consultas/operações de curtida | 60 por minuto |
| Tentativas de envio de short | 20 por minuto |
| Publicações automáticas aceitas | 30 por dia; além das cinco por identidade |
| Novas contribuições de curtida | 200 por dia, até 20 por short |

A emissão global existente do runner (20/minuto) e os limites por identidade continuam. Janelas de rede são segregadas pelo dia, portanto também reiniciam na virada diária. Não impor cinco publicações à rede inteira nem uma curtida por IP. Estes valores não foram medidos em tráfego real e podem limitar redes legítimas grandes: calibrar e aprovar a política de produção na Etapa 8. Publicações pendentes não consomem orçamento de publicação automática; aprovação administrativa continua pelo fluxo autorizado de cota do proprietário. Restauração de registro não cobra outra publicação. Não habilitar desafio automaticamente; Turnstile continua opção futura sujeita a autorização.

## Retenção, armazenamento e custo

Até quatro documentos por rede/dia: sessões, tentativas de curtida, tentativas de envio e contribuições. Mapa de vídeos limitado a 200 entradas por orçamento, sem documento novo por tentativa ou contador por visitante adicional nesta proteção. HMACs mudam por dia e escopo. Expiração fixa antes de quatro dias completos desde o começo do dia São Paulo. Dados não expiram sozinhos: manutenção local relê e exclui até 30 expirados a cada dez minutos; atraso/falha mantém backlog para a rodada seguinte. Produção exige definir manutenção e monitoramento de backlog/custo antes do deploy; o temporizador Node local não substitui agendamento confiável em Workers.

Indexação de networkAbuse desativada, exceto expiresAt crescente para limpeza. Nenhum índice composto ou TTL pago ativado; configuração apenas em arquivo local. Cada tentativa protegida/sessão nova acrescenta normalmente uma leitura e uma escrita; nova contribuição acrescenta uma leitura/escrita no orçamento, dentro da transação existente. Retry/conflito pode repetir leituras. Limpeza faz consulta limitada e releitura/exclusão por item. Tráfego anônimo distribuído ainda pode consumir cota Firestore; não há promessa de custo zero ou proteção ilimitada sem controles de borda.

## Validação

60 testes relacionados distintos aprovados: rede (10), bridge (4), autorização criptográfica/rotas (7), sessão administrativa (7), moderação (3), curtidas (14), HTTP de publicação (5), Firestore/rede (3) e Firestore/publicações (7). Incluem 48 combinações negativas em 12 rotas privadas: sem token, token inválido, token assinado com outro UID e sem MFA; sem leitura/escrita de negócio. Contas revogadas/desabilitadas e fatores removidos cobertos pelo autorizador com respostas controladas; não houve login externo com novas contas nesta rodada. Não foi executada suíte completa nem testes de TikTok/cards não afetados.

Concorrência real confirmou o último espaço da rede para somente uma publicação, sem reserva/cota da recusada; limites de curtidas, desfazer/recurtir, sigilo no SDK (incluindo alegação admin), expiração e replay também conferidos. Meia-noite São Paulo e persistência de cookie após recarregar os segredos cobertas. Lint/build e diff aprovados.

Smoke HTTPS real após reinício: sessão 204, feed 200 com oito shorts existentes, rota administrativa sem token 401, arquivo de segredos e variante ?raw bloqueados com 403. Arquivo ignorado pelo Git. Nenhum short, comentário, curtida ou denúncia criado/excluído pelo agente durante A; apenas contadores de tentativa do smoke e segredos locais. Emulador de desenvolvimento preservado; testes destrutivos somente no projeto isolado da porta 8081.

## Continuidade e versionamento

A entrega de refinamento de cards anterior continua não commitada e foi preservada. Há alterações compartilhadas em submit-short.ts, rest-store.ts e continuidade.md; commits por arquivo inteiro não separam ambas as entregas de forma íntegra. Recomenda-se um commit conjunto das duas entregas aprovadas, ou separação por hunks revisados. Nenhum commit executado pelo agente.

Próximo bloco recomendado: 7.6.6-B — investigação TikTok, mediante autorização individual. Não iniciar B automaticamente. Conferência administrativa positiva com proprietário permanece uma verificação manual complementar; testes negativos não equivalem à auditoria final de produção.

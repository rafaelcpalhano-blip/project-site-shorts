# Etapa 7.6.6-E — validação integrada local

Validação local encerrada em 22/10/2026, com retorno do proprietário de funcionamento aparentemente correto e complemento de navegação solicitado no cabeçalho. Etapas 8 e 9 não iniciadas. Nenhuma alteração de regra de negócio, dependência, serviço remoto ou deploy.

## Estado inicial e estratégia

Git limpo ao iniciar. Integrações Clipper/C/D e welcome-preference.ts já versionadas; a pendência mencionada na entrega anterior foi resolvida pelo proprietário (commit 6e01672). Na rodada inicial não foi necessária correção funcional. Após o retorno, o proprietário solicitou um atalho administrativo condicional, implementado como complemento desta entrega. Reaproveitados os 76 testes distintos da etapa D e as evidências anteriores de A/B/C, sem executar novamente as suítes completas ou transações de migração.

14 testes focados desta rodada passaram: sessão administrativa (7), seleção/cache/segurança/projeção de imagens (4), preferência de boas-vindas (2), estrutura integrada do visualizador (1). Sessão cobre UID/MFA/negação/revogação/expiração, troca de usuário e resposta atrasada por fixtures; não equivale a login real novo com contas externas. Compilação e lint aprovados no código idêntico do commit D foram reaproveitados: a rodada inicial alterou apenas documentação. O complemento do cabeçalho recebeu build e lint localizado novos, ambos aprovados. Diff final conferido.

## Navegador real

- Nove shorts no feed, todos com altura de 411px na largura desktop conferida; miniaturas oficiais e capas IGDB preservadas; zero iframes no feed e ausência de overflow horizontal.
- Rascunho preenchido só no navegador, sem envio: Próximo vídeo pede confirmação; Continuar neste vídeo conserva o rascunho e volta a pedir confirmação; Descartar e trocar navega para o segundo short com campo vazio. Somente um iframe foi observado na troca e zero após fechar.
- Três comentários de teste já presentes no primeiro short aparecem como #3, #2, #1 após Atualizar comentários. O agente não os criou nem modificou; o card mostra o total público 3. Outros conteúdos podem ter mudado enquanto o proprietário testa em paralelo; não congelamos, apagamos ou restauramos dados.
- Filtro Tibia e ordem Primeiro Postado retornam a Todos os jogos/Últimos Postados pela logo, primeira página, sem recarregamento completo. Provider administrativo permanece fora da remontagem da página inicial; o proprietário posteriormente informou funcionamento aparentemente correto, mas apontou falta de um atalho para voltar ao painel.
- Largura 390px: uma coluna, cards de 343px, sem overflow horizontal e sem iframe residual. Override de viewport restaurado ao final.
- Caminho inexistente mostra Clipper, mensagem legível e link de retorno. Assets do Clipper foram carregados. Preferência de boas-vindas, armazenamento indisponível e movimento reduzido já cobertos pelos testes/validação de C; não apagamos o localStorage do proprietário para repetir o modal.
- Temporizador de inclusão manual (1,5s), cancelamento e desmontagem foram cobertos na etapa D; não cadastramos um jogo novo só para repetir essa verificação.

Capturas no workspace da conversa, fora do Git: etapa-7-6-6-e-comentarios.png, etapa-7-6-6-e-mobile.png e etapa-7-6-6-e-404.png. Nenhum código, token, segredo, e-mail ou UID foi incluído nas capturas. A aba temporária foi encerrada; abas e formulários do proprietário preservados.

## Smoke HTTPS

Verificação com a cadeia TLS do sistema, sem desativar validação de certificado: página inicial 200; imagem de boas-vindas 200; .env.server.local e .env.security.local?raw bloqueados com 403. Corpos de arquivos privados não foram lidos ou impressos. Sessão anônima temporária criada uma vez (204), cookie mantido só em memória; sem token administrativo, sessão administrativa e fila de comentários responderam 401. Sondagens preliminares sem cookie foram recusadas com 429 pelo requisito de admissão; não demonstravam autenticação e não foram usadas como prova de autorização. Nenhum limite foi elevado ou removido.

E adicionou apenas consultas normais e um teste de admissão anônima; não publicou short, comentário, like, denúncia nem decisão administrativa. Contadores de proteção das chamadas e manutenção local já existente podem escrever no emulador. Não houve migração nesta rodada, limpeza do banco, reinício dos serviços ou modificação no Firebase real.

## Retorno do proprietário e complemento de navegação

Foi solicitada na ferramenta de perguntas: abrir /admin, entrar com Google/TOTP se necessário, Verificar acesso administrativo; navegar pela logo, abrir ficha e voltar a /admin sem recarregar; conferir autorização preservada e as quatro seções sem erro. Não solicitar envio de códigos, tokens, chave ou senha. O proprietário respondeu que aparentemente funciona corretamente e pediu a melhoria de retorno descrita abaixo. Esse é um relato do proprietário, não uma observação direta do agente de todos os controles autenticados.

O cabeçalho agora mostra Administrar somente quando há usuário, authorized confirmado e nenhuma verificação em andamento. NavLink para /admin, sem reload, alinhado à direita e com estilo lilás igual ao botão Compartilhar short. Visitantes e contas somente conectadas não recebem o atalho; expiração/invalidação o remove. Todas as APIs continuam validando UID/MFA no servidor. Nenhum botão público de login foi adicionado. Provider administrativo e armazenamento de sessão permanecem inalterados.

Complemento: três testes novos do cabeçalho (visibilidade por estado, link interno sem dados pessoais e estado ativo/revogação), sete testes de sessão novamente verificados e quatro regressões existentes do layout/página passaram: 14 execuções neste complemento, 21 casos distintos ao todo em E contando os 14 iniciais sem duplicar os sete da sessão. Build e lint localizado aprovados. A aba acessível ao agente estava como visitante e não mostrou o botão, conforme esperado; o estado autorizado foi coberto por renderização controlada de teste, sem simular privilégio no site real nem acessar a conta do proprietário. A conferência visual real do novo atalho autenticado pode ser feita pelo proprietário no seu próximo acesso, sem solicitar envio de credenciais.

## Limitações e passagem para produção

- Homologação local não é auditoria de produção. Firebase real não foi modificado, e os adaptadores públicos continuam explicitamente ligados ao emulador local.
- Índice de publicationNumber e demais índices estão somente em arquivo; nenhuma publicação remota. Antes de usar outro banco será necessário autorizar/configurar acesso de servidor e preparar o histórico correspondente; não executar a ferramenta local contra a nuvem.
- Preparação histórica é aproximada e limitada a 200 comentários por short; não renumera sequência já inicializada. Cursores antigos sem número exigem atualizar comentários.
- Retenção de proteção de rede e ranking usam manutenção local; a operação de produção deve ser planejada no runtime de destino, junto às credenciais e restrições da YouTube API, observabilidade e limites de custo. Nada disso foi ativado nesta rodada.
- PNGs originais do Clipper ainda precisam de otimização antes da produção. Sem JavaScript/aplicação carregada, o navegador não pode mostrar o fallback hospedado no próprio site. Tutorial do Clipper não implementado.

Próxima etapa: propor escopo da Etapa 8 — integração Firebase/Cloudflare de produção, sem implementação automática e aguardando autorização individual.

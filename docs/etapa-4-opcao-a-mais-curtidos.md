# Etapa 4 — Opção A: finalizar com Mais Curtidos

Decisão do usuário: A, em 28/10/2026. Implementação e homologação local; nenhum deploy ou acesso remoto nesta rodada.

## Comportamento da versão

- Últimos Postados continua como padrão. Primeiro Postado e Mais Curtidos permanecem disponíveis.
- Mais Curtidos usa a contagem acumulada existente, com desempate por data e ID. Não usa decaimento temporal, janela de duas horas ou atualização agendada.
- Filtro por jogo e paginação de até quinze cards por página continuam disponíveis em todas as três ordenações. Não há limite total de quinze vídeos.
- Atualizar o feed refaz a consulta; páginas de uma mesma navegação preservam o snapshot e a expiração existentes. Curtir atualiza o contador visível sem prometer reorganizar automaticamente a página aberta.
- Mais Relevante e a promessa de atualização a cada 45 minutos saem da interface. O rótulo do seletor passa a Ordenar por.
- Contexto antigo de retorno com relevant inicia Mais Curtidos na primeira página, sem reaproveitar cursor ou rolagem incompatíveis.
- A rota pública recusa relevant com HTTP 400, antes de abrir o cursor ou consultar gerações. Sessão, origem, assinatura dos demais cursores e limites continuam exigidos.

## Economia e preservação

A composição pública do armazenamento desabilita apenas a alimentação auxiliar do ranking composto em publicações, curtidas e comentários, inclusive revisão administrativa. Contadores normais, transações, deduplicação, quotas e moderação permanecem. Testes usam métricas experimentais deliberadamente inválidas para confirmar que essas ações não dependem delas nem as alteram.

O servidor de desenvolvimento deixa de iniciar o temporizador experimental por padrão. O código experimental permanece para estudo, com opt-in local explícito. O pacote de homologação mantém ranking/jobs desligados, sem cron e sem bindings de piloto/retenção do ranking. Não será criado job externo ou workflow GitHub para substituí-lo.

Nenhum documento antigo será apagado por esta entrega. Métricas antigas deixam de acompanhar as interações; uma retomada futura exige revisar e reinicializar essas evidências antes de ativar o algoritmo. O checkpoint remoto incompleto já registrado permanece intocado, aguardando eventual autorização específica de recuperação.

A margem de CPU do ranking composto não foi comprovada e não é declarada resolvida. Esse processamento foi retirado do escopo desta versão por decisão do usuário. Isso não certifica automaticamente todos os endpoints restantes abaixo de 10 ms.

## Verificação e entrega

Resultados e identificação do pacote: [evidência local](evidencias/etapa-4-opcao-a-mais-curtidos.json). Cobertura inclui ordens/filtro/paginação, retorno legado, recusa da ordem aposentada, curtidas/revisões, publicação/deduplicação e preservação das métricas privadas. Tipos, lint, build, segurança local e dry-run devem estar aprovados antes do deploy.

A suíte completa do emulador encontrou três expectativas antigas do protótipo, anteriores à seleção de quinze por jogo. Elas foram atualizadas para verificar a seleção limitada, snapshot histórico e retenção reais, sem remover testes do algoritmo experimental. Os resultados da repetição direcionada são registrados separadamente; não representam uma nova execução integral.

## Próximos passos

1. Revisar e autorizar especificamente o pacote congelado para homologação; reconferir versão de rollback e configuração antes da publicação.
2. Após o deploy, testar as três ordenações, filtro, paginação, curtida/descurtida, retorno da ficha e /admin no PC e celular/PWA.
3. Retomar os testes finais e Lighthouse sobre a versão publicada. TikTok permanece pendente, sem afrouxar sua validação.
4. Concluir auditoria final, README/contatos em conjunto e revisão antes de tornar o GitHub público ou autorizar lançamento.

Planos gratuitos, credenciais, infraestrutura, dados remotos e visibilidade do repositório não foram alterados nesta preparação.

## Homologação publicada após autorização específica — 28/10/2026

Versão `ffec1d98-360b-43ea-bcb4-f3dbc29da2eb`, ativa em 100%. Rollback registrado: `df8da48f-975f-47a5-9424-4d2476f4a0fc`. Pacote com 43 arquivos; os 42 arquivos públicos conferiram por hash (a configuração `_headers` não é um arquivo público). As três ordenações retornaram HTTP 200 e dez itens cada; `relevant` retornou HTTP 400. Consulta sem sessão retornou 401. Cabeçalhos de proteção e cache conferidos; shell de /admin abre corretamente. Nove valores de segredos preservados, ranking/jobs/diagnósticos desligados, tradução preservada e nenhum cron. Nenhum conteúdo foi alterado; consultas normais criaram/atualizaram somente estado operacional de sessão/limite. CPU não foi medida nesta verificação.

Próximo passo: confirmação manual das ordenações, filtro, navegação e /admin no PC e celular/PWA. O pacote foi publicado somente em homologação, sem aprovação de lançamento público.


### Confirmação manual recebida

O usuário confirmou que as três ordenações, filtro, abertura/fechamento de vídeo e acesso administrativo funcionaram no PC e celular após o deploy. A resposta não individualizou um novo teste em modo PWA standalone. Paginação além da primeira página permanece coberta pelos testes automatizados, pois o feed atual contém dez vídeos. A opção A está validada na homologação; isso não encerra TikTok nem autoriza lançamento público.

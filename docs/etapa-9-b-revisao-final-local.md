# Etapa 9-B — revisão final local de segurança, dados e recuperação

28/10/2026, após Lighthouse de fechamento. Referência de homologação: `7ec6774e-b1f8-4da5-bf3b-ce1c41d16bf4`. Revisão do checkout atual; há arquivos não commitados. Não equivale à aprovação de um commit final no GitHub ou do lançamento. [Evidência](evidencias/etapa-9-b-revisao-final-local.json).

## Resultado técnico no escopo revisado

Não foi encontrado novo impedimento crítico no código examinado que exija alteração imediata de autenticação ou dos fluxos do produto. Isso não prova ausência de vulnerabilidades. Foram lidos os controles abaixo e repetidos 112 testes de segurança/recuperação, sem dados reais, todos aprovados.

| Controle | Evidência no código e limites |
| --- | --- |
| Administração | firebase-admin.ts verifica RS256/certificado, emissor, audiência, validade, UID permitido, Google, e-mail verificado e TOTP. Consulta estado atual da conta por requisição privilegiada, incluindo revogação, desativação e fator ainda inscrito; falhas recusam acesso. |
| Rotas administrativas | admin-moderation.ts exige método, origem, JSON, sessão/limite e authorize antes de ler registros privados; identidade do ator vem do backend. /admin/config fornece configuração pública do SDK, não credencial administrativa. |
| Sessão visitante | Cookie __Host-, Secure, HttpOnly, SameSite=Strict, Path=/, HMAC e validade. Cookie duplicado/malformado/futuro/expirado recusado. Não concede privilégio administrativo. |
| Origem/IP | Entrada exige origem canônica/HTTPS e transporte direto Cloudflare; usa cf e CF-Connecting-IP, recusa forwarding Worker/pseudo-IP sem confiar em X-Forwarded-For do visitante. A política pressupõe entrada direta; não portar para proxy/Node/service binding sem nova revisão. |
| Abuso e privacidade | Limites de identidade e rede persistentes; rede normalizada/HMAC com contexto de dia/escopo, não IP bruto nos documentos de limite. HMAC não torna um dado automaticamente anônimo. NAT e /64 podem reunir pessoas; manter desfazer e limites atuais. |
| Orçamento e falhas | Máximo local de 48 chamadas externas, com reserva para limpeza; redirecionamento automático proibido e falhas contam. Não é medidor de CPU nem reserva de quota do provedor. Falta de configuração ou fonte não libera uma operação. |
| Regras de banco | Arquivo local nega escritas do SDK e acesso a shorts/comments/coleções privadas; games ativos têm leitura limitada. A revisão de arquivo não é nova confirmação das regras remotas implantadas. |
| Dados/revisão | Contadores, revisões e auditoria mantidos por transações. Opção A deixa ranking composto inativo e métricas antigas preservadas; não reativar sem revisão/reinicialização. |
| Backup | Bibliotecas impõem alvo, caminho privado, ACL, orçamento, checksum e limites; restauração em fixtures trata destino ocupado, conflito e confirmação perdida sem repetição automática. Sem restauração real nesta revisão. |

Nenhuma alteração funcional foi necessária para esses controles nesta rodada. As 112 provas incluem autorização administrativa, sessões, rede, entrada Workers, orçamento externo, leitura/captura privada, transporte, token, arquivo e ensaio de recuperação. São parte da suíte existente, não 112 novos testes nem provas de CPU real.

## Verificações do repositório e dependências

- Verificador local/histórico: 816 arquivos e 1.802 blobs examinados, zero achados pelas regras existentes.
- npm audit: zero vulnerabilidades conhecidas na consulta, sem instalar/atualizar dependências.
- Workflow local usa token contents:read, checkout sem persistir credenciais, actions fixadas por SHA, Node24 e nenhum segredo/deploy. Configuração e última execução no GitHub não foram consultadas nesta rodada.
- README atual tem informações históricas de ranking/TikTok/tradução desatualizadas. Não foi editado: o proprietário pediu prepará-lo em conjunto, com contatos, como última atividade antes da divulgação. Deve ser corrigido antes da visibilidade pública.
- Logs originais, relatórios Lighthouse integrais, perfis temporários e arquivos privados permanecem fora do repositório. Documentação nova contém apenas evidência sanitizada.

## Pendências operacionais e gravidade

### Alta — prontidão de recuperação ainda não confirmada

O backup real verificado em 26/10 protege documentos até `2026-10-26T23:26:28.074Z`; não cobre os cadastros posteriores, incluindo o TikTok agora confirmado. A cópia no mesmo computador não protege contra sua perda física. Não inclui Firebase Auth, Google/TOTP, IAM, Cloudflare, segredos ou repositório.

Antes do lançamento, o proprietário deve confirmar acesso de recuperação das contas e custódia independente, sem enviar códigos/chaves pelo chat. Uma nova captura real, outro destino ou qualquer restauração exige aprovação de alvo, escopo e orçamento; a autorização da captura anterior já foi consumida. Nenhuma credencial/snapshot real foi aberto nesta revisão. Guia: [operação e recuperação](guia-operacao-recuperacao.md).

### Média — retenção de registros auxiliares sem rotina ativa

Jobs e cron continuam desligados por decisão de operação gratuita. Isso também significa que não há rotina automática de limpeza de networkAbuse, likeAttempts e recibos inativos de curtidas nessa configuração. expiresAt não apaga documentos sozinho no código; não presumir TTL remoto ativo. Os dias/limites novos continuam operando, mas documentos antigos podem se acumular e ocupar armazenamento.

As funções limitadas já existem. cleanupNetworkAbuse exclui somente após revalidar expiração; cleanupLikes tem inspeção sem apply e só remove tentativas antigas ou curtidas desfeitas há mais de 90 dias, preservando curtidas ativas. Não ativar CLIPZONE_JOBS_ENABLED para limpar: o modo legado também tenta ranking. Proposta mínima é revisão e manutenção manual, limitada e autorizada, usando ferramentas existentes, sem cron, TTL pago ou serviço externo. Não executar exclusões ou limpar checkpoints por esta auditoria. Volume real atual de registros expirados não foi medido.

### Média — consumo e CPU são evidências separadas

Retirar ranking composto resolve o escopo de entrega escolhido, não certifica todos os endpoints abaixo de 10 ms. Há registros históricos de picos em primeiro uso de consultas/confirmação. A versão atual tem API byte-idêntica à opção A; o Lighthouse mede o navegador e não substitui essa avaliação. Não afirmar margem universal, ausência garantida de 1102 ou quota atual livre com base em testes locais. Se ocorrerem falhas recorrentes reais, aplicar suspensão controlada aprovada em vez de reduzir proteções ou mudar planos. Não abrir novas janelas de coleta/inferências em massa para preencher uma tabela nesta revisão.

### Média — aprovação do snapshot final ainda depende do CI

HEAD local observado: `18b63b6`. Há mudanças de acessibilidade/robots e documentação ainda não commitadas. CI de commit anterior não aprova esse estado. Após os commits finais e push pelo proprietário, conferir a execução automática do SHA correspondente. Não disparar workflow manual, mudar proteções/visibilidade ou aumentar franquias por inferência.

### Baixa — organização final

README/contatos e resumo de estado devem ser atualizados em conjunto; documentação histórica não deve ser reescrita para esconder os incidentes. TikTok tem envio/reprodução comprovados para um exemplo, mantendo possível indisponibilidade externa. Robots continua bloqueando rastreamento na homologação; não tratar SEO66 como regressão a resolver liberando indexação sem decisão.

## Parecer

As correções 9-A de acessibilidade/robots estão confirmadas nos dois relatórios Lighthouse e no uso relatado. A parte local da revisão 9-B está documentada e não requer nova mudança no produto agora. A prontidão operacional global permanece condicionada à recuperação/custódia/backup, estratégia de retenção, avaliação honesta de limites, CI final e revisão conjunta do README. Não autorizar lançamento ou GitHub público automaticamente.

Nenhum deploy, configuração de conta, plano, permissão, chave, regra remota, cron, conteúdo ou contato externo foi alterado nesta rodada.
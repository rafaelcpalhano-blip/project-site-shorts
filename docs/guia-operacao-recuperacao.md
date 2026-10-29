# Clipzone — operação e recuperação sem serviços adicionais

Preparado localmente em 28/10/2026 para revisão com o proprietário. Este guia não executa ações, não substitui suporte dos provedores e não autoriza backup novo, exclusão, restauração, rotação de chaves, alteração de MFA, plano ou deploy.

## Informações públicas de referência

- Site publicado: https://www.clipzone.workers.dev/. Lançamento autorizado em29/10/2026; reteste humano e Lighthouse final concluídos.
- Worker: www. Versão verificada: `68add1ea-d8f8-468c-a8ba-9d752a41dac3`.
- Rollback registrado desse pacote: `7ec6774e-b1f8-4da5-bf3b-ce1c41d16bf4`. São referências históricas; confirmar a versão ativa antes de qualquer ação.
- Projeto/banco: clipzone-db02a/(default).
- Premissa: Workers Free e Firebase Spark, sem upgrade automático. Os estados de plano foram conferidos nas etapas anteriores, não nesta revisão local.
- Ranking composto/jobs desligados e cron ausente no último deploy verificado.

Nenhuma senha, chave, token, UID privado, QR, código TOTP, conteúdo de backup ou recibo privado deve ser colocado neste arquivo, Git, issue, screenshot público ou chat.

## 1. Contas e recuperação — confirmar quando estiver disponível

Marcar apenas quando verificado pessoalmente. Não remover fatores nem sair das sessões atuais para testar recuperação.

- [x] Proprietário relatou acesso à conta Google/e-mail com diversas alternativas de recuperação.
- [x] Proprietário identificou Google Authenticator e informou recuperação por sua conta Google; não foi feito teste independente de restauração nem coletado código/chave.
- [x] Proprietário confirmou recuperação de Cloudflare/GitHub pelo e-mail, autenticador e alternativas de confiança; confirmação humana, sem teste de restauração ou coleta de códigos.
- [x] Proprietário relatou disponibilidade dos acessos e recuperação por e-mail; não foram coletadas senhas nem códigos. Não presumir auditoria independente de cada conta.
- [x] O local privado da credencial runtime existente foi informado ao proprietário nesta conversa, junto da orientação de tratá-la como senha. Não publicar o arquivo, não incluí-lo no Git ou confundi-lo com o backup do Firestore.

Se perder TOTP/Google, a API deve continuar recusando acesso. Usar recuperação oficial da conta; qualquer intervenção privilegiada no Firebase requer identidade/escopo e aprovação próprios. Não contornar a proteção retirando checagens de UID/MFA do backend. Backup Firestore não recupera contas de autenticação.

## 2. Backup — estado atual e próxima revisão

Última captura verificada:29/10/2026, readTime `2026-10-29T05:56:09.174Z`,371documentos/412requisições Firestore, arquivo204.841bytes. SSD privado e segunda cópia no HD autorizado foram conferidos por checksum, igualdade de bytes e recibos, incluindo releitura independente. A cópia de26/10 foi preservada. [Relatório](etapa-9-b-backup-verificado-2026-10-29.md).

A primeira tentativa250 parou sem arquivo; a nova tentativa750 foi autorizada separadamente e concluída. A composição privada mantém500caminhos/5MiB de respostas/arquivo8MiB/sinal120s e uma troca OAuth de até16KiB. Não reutilizar autorizações ou marcadores; crescimento além do orçamento exige revisão.

Política escolhida: backup no lançamento e depois a cada15dias. Para avaliar o primeiro intervalo, o proprietário antecipou a revisão para **08/11/2026 às21h de Brasília**. Lembrete único privado criado no Google Agenda, com aviso no horário; não executa captura. Após essa revisão, combinar a sequência de15dias, sem converter para14. Entrega no celular depende de sincronização e notificações do Agenda.

- [x] HD separado do SSD e pasta privada usuário/SYSTEM verificados; ACL não comprova criptografia.
- [x] Dados e recibos reais permanecem fora do Git; backup não contém credenciais, vídeos ou recuperação de contas/TOTP.
- [x] Frequência e primeira revisão definidas pelo proprietário; o intervalo pode permitir perda de alterações posteriores à última captura em caso de incidente.
- [ ] Na próxima captura, reconferir alvo/plano/quota, apresentar limites e obter autorização específica; preparar outra segunda cópia verificada.

Credencial runtime é chave de serviço para acesso autorizado ao Firestore, não o login Google/TOTP do painel. Deve permanecer privada, com permissões restritas. Sua localização foi informada diretamente ao proprietário; não copiar seu conteúdo para README, issues, relatórios públicos, e-mail ou chat. Nenhuma cópia dessa chave para o HD foi autorizada ou realizada. Em exposição, preparar revogação/substituição com aprovação, sem expor o valor. Recuperação dessa identidade exige procedimentos próprios; snapshot do banco não substitui isso.

Falha não autoriza repetir ou apagar parciais automaticamente. Desconectar o HD pelos cuidados normais do sistema após a verificação. Sem restauração remota ou tempo de recuperação de produção medido.

## 3. Restauração — ensaio não é operação remota

O ensaio automatizado usa somente fixtures em emulador isolado. Antes de qualquer restauração real:

1. Identificar incidente, origem do backup, checksum, readTime e alvo exato.
2. Conferir integridade sem expor dados e definir o que pode ser perdido/conflitar.
3. Preparar plano de operação e autorização específica; não sobrescrever o banco em uso por suposição.
4. Se houver confirmação de commit perdida, registrar estado incerto e inspecionar antes de qualquer retry. Não apagar documentos para “voltar ao início”.

Não há tempo de recuperação de produção (RTO) medido ou restauração real aprovada neste guia. Firebase Auth, Google/TOTP, IAM, segredos, Worker e Git exigem recuperação própria.

## 4. Incidentes e cotas

| Sintoma | Conduta |
| --- | --- |
| TikTok429/aviso de fonte limitada | Respeitar espera indicada e parar tentativas em sequência. Registrar horário, plataforma, link público e mensagem; não coletar senha/token/IP pessoal. Não publicar com evidência não confirmada. |
| Quota/503/1102 ou falhas recorrentes | Preservar evidências sanitizadas, identificar endpoint/versão, conferir painéis quando disponível e combinar suspensão controlada. Não ativar pagamento nem diminuir proteções. |
| Perda de acesso administrativo | Recuperação oficial da conta/fator; manter API fechada para quem não atende às verificações. |
| Suspeita de credencial exposta | Não copiar o segredo para relato. Identificar tipo/local de exposição e preparar rotação/revogação para aprovação; retirar somente arquivo atual não remove histórico/copias. |
| Regressão após deploy | Comparar versão/artefatos e decidir rollback explícito da versão conhecida; rollback de código não restaura documentos do banco. |

Observar o uso legítimo. Não gerar spam, denúncias falsas, postagens fictícias ou carga em massa para provar resistência. Notas Lighthouse não medem CPU do Worker. Não usar dados de quota antigos como saldo atual.

## 5. Retenção e crescimento

Nenhum job/cron de limpeza está ativo no pacote atual. expiresAt informa elegibilidade; não comprova exclusão automática. Antes do lançamento, escolher uma rotina manual limitada e revisável usando as funções existentes; não reativar o modo legado de jobs, que também executa ranking.

- networkAbuse: somente expirados, com revalidação transacional antes de excluir.
- likeAttempts e shortLikes: a manutenção existente preserva curtidas ativas; só são elegíveis tentativas antigas ou curtidas desfeitas com mais de 90 dias, após validação.
- ranking: dados antigos/checkpoint incompleto ficam preservados; qualquer recuperação/limpeza é operação auxiliar separadamente aprovada.

Antes de aplicar: orçamento, alvo, inspeção de elegíveis, teto por lote e recibo sanitizado. Não excluir conteúdo primário ou diminuir contadores para liberar armazenamento. Sem autorização atual de exclusão ou ativação de rotina por este guia.

## 6. Fechamento do GitHub e lançamento

- [ ] Commitar os ajustes revisados e a documentação; não incluir arquivos privados.
- [ ] Push pelo proprietário e conferir CI verde do SHA correspondente, sem tratar uma execução antiga como evidência do estado novo.
- [ ] Preparar README e contatos em conjunto, corrigindo os trechos antigos sobre ranking/TikTok/tradução. Este guia não altera o README.
- [ ] Reconfirmar consentimento sobre dados pessoais históricos e visibilidade; não reescrever histórico/alterar licença automaticamente.
- [ ] Revisar política de indexação e configuração final; não remover Disallow: / só para elevar SEO durante homologação.
- [ ] Aprovações separadas para GitHub público e lançamento do site.

Nada aqui autoriza ativar automações, enviar mensagens externas, criar recursos, faturamento ou publicar. Este documento é um plano operacional revisável e pode permanecer público somente sem o preenchimento de informações privadas.

## Decisões de 29/10/2026

Proprietário informou conseguir recuperar o e-mail e aceitou a frequência proposta. Aplicativo TOTP e sua recuperação ainda não confirmados; não presumir uma marca de autenticador. Recuperação específica Cloudflare/GitHub não individualizada. GitHub foi sugerido pelo proprietário como possibilidade de destino, ainda sem escolha: repositório de código não captura automaticamente o banco. Nenhum repositório novo, upload de backup ou envio de segredo está autorizado. Se uma alternativa GitHub vier a ser escolhida, exigir avaliação separada de repositório privado, criptografia antes do envio e custódia da chave fora dele; não usar o portfólio público para dados operacionais.


## Atualização da política e lembrete — 29/10/2026

Frequência corrigida por preferência explícita: no lançamento e a cada15dias, em lugar de revisão semanal. Segunda cópia em HD apartado do SSD, mantido desconectado quando não utilizado. GitHub deixa de ser a opção proposta para dados operacionais. A escolha do dispositivo não autoriza copiar agora, abrir conteúdo do HD, alterar ACL, criptografar/formatar unidade ou criar arquivo.

O proprietário solicitou lembrete no celular a cada15dias quando houver data prevista. Pedido futuro condicionado registrado; nenhuma data/hora/canal foi presumido e nenhum lembrete/agendamento foi criado. Quando a data de lançamento e o canal móvel forem combinados, configurar um lembrete de backup manual, sem transformar isso em captura automática. Não usar recorrência de duas semanas (14dias) como substituta de15dias.

Escopo do backup: documentos do Firestore no instante da captura, incluindo cadastros, links de shorts, comentários e dados operacionais privados. Não baixa os vídeos YouTube/Twitch/TikTok nem substitui cópia do código/assets, configuração de infraestrutura, credenciais ou recuperação das contas/TOTP.


## Inspeção de retenção preparada localmente — 29/10/2026

Biblioteca de leitura opt-in disponível em server/maintenance/inspect-retention.ts, ainda sem runner real, credenciais, rota ou cron. Uma página de até30 documentos e nenhuma escrita; retorna contagens e eventual cursor operacional privado. Reutiliza regras existentes para tentativas/descurtidas de mais de90dias e observa expiração da rede. Ver etapa-9-b-inspecao-retencao.md para limites e proposta de conexão real futura. A existência da biblioteca não autoriza sua conexão ao banco ou exclusões.

## Executor de inspeção única preparado — 29/10/2026

Transporte específico e executor privado de leitura prontos para revisão: primeiro escopo é somente networkAbuse em clipzone-db02a/(default), uma consulta de até30 datas de expiração, até128KiB de resposta, mais uma troca OAuth limitada a16KiB, sem escrita/retry/paginação. Credencial runtime existente só será aberta após conferência ACL e autorização específica, com Spark/margem/alvo verificados. Simulação RSA/OAuth/Firestore aprovada sem abrir dados reais. Ver etapa-9-b-executor-inspecao.md. Não executar como parte automática do backup ou do site; nenhuma consulta real foi realizada na preparação.

## Primeiro uso real da inspeção — 29/10/2026

Inspeção única separadamente autorizada em networkAbuse, após conferir Spark/margem/alvo/ACL/hashes: zero documentos expirados retornados, uma query, uma troca OAuth,1.133bytes de respostas e nenhuma escrita/exclusão. Não há limpeza a executar com base nessa observação. Recibo não é backup, inventário total ou saldo de quota em tempo real. Não repetir usando a aprovação já consumida; rever em operação futura quando necessário. HD e conteúdo primário preservados. Ver etapa-9-b-executor-inspecao.md.


## Confirmação de autenticador e plano de lançamento — 29/10/2026

Proprietário confirmou Google Authenticator e recuperação pela conta Google com alternativas de recuperação do e-mail. Considerar confirmação humana, sem afirmar teste independente de sync/restauração ou cobrir automaticamente Cloudflare/GitHub. A pasta do HD será verificada depois pelo proprietário; não acessar unidade por suposição. Procedimento consolidado em etapa-9-b-backup-lancamento.md: autorização específica, captura limitada para pasta privada no SSD, verificação, segunda cópia somente para destino definido/protegido e checksum comparado. Nenhuma nova captura/cópia foi realizada.


## Atualização consolidada de29/10/2026

Os registros históricos abaixo das seções principais descrevem decisões anteriores e podem ter pendências superadas. Backup atualizado/HD concluídos e primeira revisão8/11/2026 às21h no Agenda substituem as pendências antigas de destino e lembrete. Proprietário confirmou recuperação dos acessos, recebeu localização e cuidados da chave runtime. README aprovado/CI23ffccc concluído; abertura do GitHub é decisão do proprietário. Pacote de indexação9-C está apenas preparado localmente, sem deploy ou autorização de lançamento.


## Publicação autorizada29/10/2026

Pacote9-C publicado e verificado, versão68add1ea-d8f8-468c-a8ba-9d752a41dac3,100%; Free/Spark reconfirmados, dados/9segredos/API preservados,0cron. Política pública de rastreamento/admin noindex aplicada. As pendências históricas de autorização/indexação deste pacote foram atendidas; reteste humano/Lighthouse/README de notas e acompanhamento9-D continuam. Ver etapa-9-c-lancamento.md.


## Fechamento da validação9-C

Em29/10, reteste humano e relatórios finais Lighthouse concluídos. Desktop100/100/100/100; mobile99/100/100/100. SEO66 anterior explicado pelo bloqueio intencional da homologação. README atualizado; oportunidades opcionais/IndexedDB/simulação registradas em etapa-9-c-lighthouse-final.md. Nenhum novo deploy necessário. Acompanhamento9-D continua sem nova automação criada.

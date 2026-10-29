# Clipzone — operação e recuperação sem serviços adicionais

Preparado localmente em 28/10/2026 para revisão com o proprietário. Este guia não executa ações, não substitui suporte dos provedores e não autoriza backup novo, exclusão, restauração, rotação de chaves, alteração de MFA, plano ou deploy.

## Informações públicas de referência

- Homologação: https://www.clipzone.workers.dev/.
- Worker: www. Versão verificada: `7ec6774e-b1f8-4da5-bf3b-ce1c41d16bf4`.
- Rollback registrado desse pacote: `ffec1d98-360b-43ea-bcb4-f3dbc29da2eb`. São referências históricas; confirmar a versão ativa antes de qualquer ação.
- Projeto/banco: clipzone-db02a/(default).
- Premissa: Workers Free e Firebase Spark, sem upgrade automático. Os estados de plano foram conferidos nas etapas anteriores, não nesta revisão local.
- Ranking composto/jobs desligados e cron ausente no último deploy verificado.

Nenhuma senha, chave, token, UID privado, QR, código TOTP, conteúdo de backup ou recibo privado deve ser colocado neste arquivo, Git, issue, screenshot público ou chat.

## 1. Contas e recuperação — confirmar quando estiver disponível

Marcar apenas quando verificado pessoalmente. Não remover fatores nem sair das sessões atuais para testar recuperação.

- [ ] Tenho acesso à conta Google administradora e a um método de recuperação que não dependa apenas do aparelho principal.
- [ ] Meu autenticador TOTP tem recuperação/cópia protegida conforme suas opções; não vou compartilhar nem registrar a chave neste projeto.
- [ ] Consigo recuperar o acesso à Cloudflare e ao GitHub; códigos de recuperação, quando fornecidos pelos serviços, estão guardados privadamente.
- [ ] O acesso ao e-mail de suporte está sob minha custódia; não depende de senha ou token no repositório.
- [ ] Identifiquei o local privado das credenciais runtime existentes, sem duplicá-las no projeto ou expô-las.

Se perder TOTP/Google, a API deve continuar recusando acesso. Usar recuperação oficial da conta; qualquer intervenção privilegiada no Firebase requer identidade/escopo e aprovação próprios. Não contornar a proteção retirando checagens de UID/MFA do backend. Backup Firestore não recupera contas de autenticação.

## 2. Backup — proposta para aprovação posterior

Última cópia de dados efetivamente verificada: 26/10/2026, readTime `2026-10-26T23:26:28.074Z`. Não contém cadastros posteriores. A biblioteca não faz novas capturas automaticamente.

Política atual definida pelo proprietário em 29/10/2026: backup manual no lançamento e, depois, a cada 15 dias. Substitui a proposta de revisão semanal. O proprietário escolheu um HD separado do SSD e normalmente desconectado; diretório, proteção/criptografia e verificação do destino ainda não foram conferidos. Nenhuma cópia real ou automação de backup foi executada. Antes de mudanças estruturais/destrutivas, uma cópia adicional continua sendo uma precaução recomendada, a combinar no caso concreto.

- [x] Frequência escolhida: no lançamento e a cada 15 dias.
- [ ] Confirmar a perda de dados aceitável: a frequência não garante zero perda, e uma captura perdida pode aumentar o intervalo.
- [x] Meio escolhido: HD separado do SSD, normalmente desconectado.
- [ ] Conferir diretório e proteção do destino antes da cópia; não presumir que o HD já esteja criptografado ou montar/alterar suas permissões por esta escolha.
- [ ] Guardar dados e recibo fora do Git; conservar também instruções de recuperação das contas separadamente.
- [ ] Autorizar nova captura somente após conferir alvo, quota e limites. A aprovação de uma captura não autoriza a seguinte.

O procedimento preparado verifica projeto, ACL do destino, chave existente, integridade e limites. Limites usados na primeira captura: 500 caminhos, 250 requisições, 5 MiB de respostas contabilizadas, arquivo de 8 MiB e cancelamento em 120 s. Não são promessa de custo contábil exato ou autorização para ampliá-los. Se o banco crescer além desses tetos, interromper e revisar; não aumentar limites automaticamente.

Falha ou confirmação perdida não autoriza repetir, apagar parciais ou alterar ACL de diretórios existentes. Credenciais não fazem parte da cópia de documentos. Cópia no mesmo computador não é custódia independente.

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

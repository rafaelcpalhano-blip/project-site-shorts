# Etapa 4 — preparação do piloto de CPU do ranking

28/10/2026. Etapa 4 do plano recente: ranking automático e retenção. Estamos fechando pendências técnicas de homologação; não se trata de lançamento público. Traduções do catálogo concluídas separadamente, CPU real e TikTok ainda pendentes.

## O que foi preparado localmente

Trava privada para o scheduled: configuração de janela absoluta de até 20 minutos e teto de até oito tentativas. O recibo maintenanceState/rankingPilot-<id> é transacional e durável; uma tentativa é consumida antes de executar o passo e não é devolvida em caso de falha. Eventos repetidos ou anteriores ao último registrado são recusados. Janela vencida é conferida antes do banco, durante a transação e depois do commit, antes de autorizar trabalho. A janela limita o INÍCIO de novos passos, não cancela trabalho que já começou.

A configuração só é aceita no modo isolado ranking-with-retention. A variável sozinha não ativa o scheduled; com manutenção geral de jobs, o piloto é recusado. Não há rota HTTP nova, novo segredo, relaxamento de autenticação ou configuração recebida do visitante. A configuração deve permanecer presente até desativar ranking/retention e remover o cron; apagar apenas a variável de piloto poderia deixar o modo contínuo habilitado e NÃO é o procedimento de parada.

849 testes Node, oito específicos no emulador Firestore, tipos e lint aprovados. Cinco provas locais em workerd minificado passaram, sem fetch externo: geração de nove itens em quatro passos; limpeza sob backlog mantendo ponteiro; virada UTC sem criação; piloto expirado sem chamada ao banco; e teto de oito claims. Isso exercita a lógica em uma sonda local, não o evento agendado implantado nem a CPU da borda.

Pacote local congelado: fff20003ef28e57448d20f5e17d5412aadd61b8c2d1a8b6c609dd6e8bc79398e; 105 fontes com hashes, mesmos 43 assets API e referências aos nove segredos existentes. Dry-run do bundle e da configuração temporária de exemplo aprovados. O exemplo contém datas/ID fictícios e NÃO deve ser usado para deploy. Configuração congelada padrão mantém ranking/jobs desligados, sem piloto e sem cron. Worker conhecido remoto preservado: df8da48f-975f-47a5-9424-4d2476f4a0fc.

## Proposta concreta para a futura aprovação

1. Conferir novamente Workers Free, Firebase Spark e margem global de franquias; identidade clipzone-db02a/(default), versão/bindings/rotas/schedules esperados, métricas prontas e nenhum build em progresso. Limitar o inventário do piloto a até 15 fontes na conferência. Qualquer divergência interrompe antes da ativação.
2. Conferir margem interna de pelo menos 2.000 leituras e 400 gravações reservadas do ranking. Isso não substitui a franquia global: comparar também uso do aplicativo, exclusões e demais tráfegos; requisições HTTP não equivalem a leituras debitadas.
3. Após aprovação específica, publicar o bundle congelado somente na homologação, com o mesmo conjunto de assets/segredos, jobs gerais desligados, ranking e retenção temporariamente habilitados e UM cron por minuto. Calcular nova janela absoluta de até 20 minutos e ID exclusivo no momento da operação. Nenhuma conta/recurso pago, migração, API de IA ou conteúdo fictício.
4. Coletar CPU/tempo total/outcome das invocações agendadas, distinguindo uso inicial de reutilização quando houver evidência. No máximo oito claims bem-sucedidos de admissão do piloto; cada passo mantém orçamento de até 48 chamadas externas, envelope de até 384 chamadas entre os claims. A troca OAuth e as operações de controle fazem parte desse orçamento por invocação. Não confundir esse teto com contagem faturada de documentos.
5. Podem ocorrer escritas auxiliares de estado, orçamento, gerações e itens de ranking; a limpeza pode excluir itens/registro de gerações antigas legitimamente elegíveis, até 15 itens por fatia, preservando atual/anterior/idade/lease. Não alterar vídeos, jogos, comentários ou curtidas. Se não houver geração antiga elegível, registrar limpeza não exercitada; não criar nem envelhecer dados para simular uma exclusão.
6. Interromper diante de exceededCpu, exceção, erro de limite efetivo, telemetria ausente ou duas invocações consecutivas acima de 10 ms. Pico isolado não certifica aprovação de produção. Não repetir nem estender automaticamente a janela se a propagação impedir amostras suficientes.
7. Ao terminar ou diante de falha, restaurar a versão conhecida com ranking/jobs desligados e remover o cron temporário; conferir a desativação e os schedules. Rollback de código não reverte dados do Firestore, nem deve ser considerado remoção do agendamento. A trava de prazo/contador protege contra novos trabalhos se o operador perder conexão; ela não dispensa remover o gatilho. Nenhum cron permanente aprovado por este piloto.

Antes da execução, o observador e os comandos de parada serão preparados para essa autorização e conferidos sem mutação. A configuração de cron pode levar até 15 minutos para propagar; por isso a autorização é para um piloto limitado, não uma promessa de oito amostras completas. Uma amostra inicial parcial não encerra todos os cenários de CPU, especialmente limpeza sem dados elegíveis e cold starts.

## Base técnica consultada

- [Limites da Cloudflare](https://developers.cloudflare.com/workers/platform/limits/): Workers Free também limita Cron Triggers a 10 ms de CPU; espera de rede não é CPU.
- [Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/): teste local não modifica o cron publicado; propagação de alterações pode levar até 15 minutos.
- [Scheduled Handler](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/): cron e scheduledTime são metadados do evento.
- [Rollback](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/): restaurar uma versão não reverte os dados dos recursos conectados.

## Estado desta rodada

Somente arquivos locais/testes/documentação alterados; não houve leitura de credenciais, acesso a dados remotos, deploy, alteração de planos, gatilho, inferência ou commit/push. O piloto remoto continua pendente de aprovação explícita. Evidência sanitizada: docs/evidencias/etapa-4-ranking-piloto-preparacao.json.

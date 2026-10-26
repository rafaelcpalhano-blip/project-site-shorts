# Etapa 8-F — TikTok: limite da fonte e tratamento de indisponibilidade

26/10/2026. Trabalho priorizado pelo proprietário após falhas em vários links, com autorização para continuar o planejamento seguro durante sua ausência. **O tratamento foi implementado e publicado em homologação; a disponibilidade da fonte continua intermitente e a publicação real de TikTok ainda não foi confirmada.** Não declarar resolvido apenas porque a prévia respondeu uma vez.

## Causa confirmada e limites da investigação

Um link informado nas capturas (`7639802790621007125`) foi usado em consultas delimitadas, sem submissão de conteúdo. A prévia publicada retornou 503, enquanto a mesma API oficial fora do Worker retornou 200 com provedor/identidade válidos. A observação sanitizada temporária no Worker confirmou **HTTP 429 no endpoint oficial oEmbed**. Não foram registrados corpos, headers privados, cookies, IP, UID ou credenciais.

Isso demonstra limitação no caminho hospedado até a fonte; não isola se a decisão do provedor depende de IP, ASN, região, tráfego compartilhado, volume ou outra política. Não atribuir a causa a uma chave Google, falta de chave TikTok ou ao usuário ter preenchido o título. A exceção de formato TikTok já existente aceita duração desconhecida, mas continua exigindo existência confirmada por fonte confiável.

Depois do primeiro ajuste, a prévia chegou a responder HTTP 200 com nome de canal e título ausente; em uma conferência posterior do formulário, reapareceu a mensagem de limitação. **200 temporário não comprova recuperação estável nem sucesso de envio.** Não houve tentativa de contornar o limite com proxy, rotação de IP, cabeçalhos de navegador falsificados, outra conta, endpoint não documentado, scraping como prova de existência ou serviço pago.

## Alteração implementada

- `429` produz evidência de disponibilidade negativa, com existência ainda desconhecida; nunca publica, reserva a identidade do vídeo ou cria pendência técnica como se o vídeo tivesse sido validado.
- Espera do `Retry-After` numérico ou data HTTP válida; sem valor utilizável, 60 segundos. Corpo de erro cancelado. Nenhuma repetição automática.
- Um temporizador de espera é compartilhado pela composição da aplicação Workers, entre fábricas por requisição, inclusive consulta opcional ao perfil. São somente números de tempo, sem transporte, resposta positiva de vídeo, decisão de autorização ou identidade em cache.
- O temporizador é local ao isolate/aplicação; não é limite global distribuído e pode não sobreviver a reinício, rotação ou roteamento para outro isolate. Quotas persistentes de abuso continuam sendo verificadas; a proteção nova é complementar.
- Prévia e envio distinguem `source-rate-limited` (503 e Retry-After quando válido) dos limites de abuso/publicação do visitante. A interface informa que preencher título manualmente não libera a publicação.
- YouTube/Twitch e as regras de elegibilidade existentes continuam preservados. Após a espera, a próxima tentativa consulta a fonte novamente; não reaproveita prova positiva antiga.

## Verificação e publicação

**660 testes Node sem falhas**, tipos frontend/servidor e lint aprovados. **31 provas workerd** (15 específicas + 16 integradas), sem acesso externo nos fixtures. As novas regressões cobrem espera/expiração, troca de transporte entre requisições, vídeo e perfil, ausência de transação/cota de publicação, origem/campos forjados, mensagens sem dados privados e ausência de retry automático.

Composição Workers real em fixture: prévia recebe 429, envio seguinte retorna indisponibilidade sem nova consulta ao provedor e sem escrever shorts, identidades, proprietários, cota de publicação ou logs de moderação. Isso prova o caminho de recusa; não substitui publicação real no remoto.

Diagnóstico temporário desligado depois da coleta. Versão final: `3f80231a-e6ef-45e2-8880-e85ba0d596be`. Jobs continuam desligados, routing static-first, cabeçalhos/cache e oito credenciais preservados. Build no modo API em diretório isolado; sem alterar a build local servida em 5175, reiniciar 5174/5175/8080 ou migrar dados. Checkpoint local do diff e fontes novas preservado; versão anterior conhecida para retorno sem migração: `04862db7-20a2-49db-ba0f-dfad52207133`.

Sete verificações de headers/cache/API passaram novamente no destino. A evidência visual do aviso foi obtida na primeira versão do ajuste; o frontend ficou idêntico na revisão final, que ampliou somente a cobertura da espera na consulta de perfil. Nenhum vídeo, comentário, curtida ou denúncia foi criado pelo agente.

## CPU e gates que continuam abertos

| Coleta delimitada | Sessão (ms) | Prévia TikTok (ms) | Resultado |
| --- | --- | --- | --- |
| Diagnóstico antes do ajuste | 11 | 17 | Sessão 204; prévia 503 e upstream 429 |
| Primeira versão do ajuste | 13 | 11 | Sessão 204; prévia 200 com canal |

Todos esses eventos tiveram outcome ok, sem exceções ou exceededCpu. Ainda assim, excedem o alvo de 10 ms. Os marcadores de criação/reuso não foram persistidos por esse coletor, portanto não classificar conclusivamente esses eventos como frio ou quente. Não são CPU de publicação válida e não certificam margem do Workers Free. Picos/recorrência seguem bloqueando declaração de prontidão para lançamento; não reduzir validações para melhorar a métrica.

Quando o proprietário retornar: atualizar a página e testar **um** envio legítimo após a espera. Se houver novo aviso de limitação, parar e registrar o resultado, sem várias tentativas. O endpoint oficial pode voltar a limitar mesmo após uma prévia bem-sucedida. Essa validação manual está pendente; não gastar cota/criar conteúdo automaticamente apenas para obter uma amostra.

Enquanto isso, a documentação de recuperação Spark foi avançada em [etapa-8-f-recuperacao-spark.md](etapa-8-f-recuperacao-spark.md). Relevância/jobs, CPU das ações válidas e recuperação real permanecem pendentes; 8-F não concluída. PWA 8.5 e auditoria GitHub 9-B.5 não foram iniciadas. Lançamento não autorizado.

Fontes: [TikTok oEmbed oficial](https://developers.tiktok.com/docs/en/embed-videos), [Embed Player e limites de uso](https://developers.tiktok.com/docs/en/embed-player). [Evidência sanitizada](evidencias/etapa-8-f-tiktok-disponibilidade.json).

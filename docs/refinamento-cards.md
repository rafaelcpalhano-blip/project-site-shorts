# Refinamento dos cards — 22/10/2026

Curtidas e comentários publicados na mesma linha; Ver jogo centralizado e maior. Capa usa toda a largura do card, sem recortar a imagem. Zoom com ponteiro fino passou de 0,96→1 para 1→1,12: intensidade de ampliação triplicada (4→12 pontos percentuais), com transbordamento permitido e prioridade visual sobre cards vizinhos. Movimento reduzido desativa ampliação/transição; toque não ativa hover.

## Total de comentários

Novo short recebe commentCount zero. Envio aprovado incrementa e aprovação/restauração/remoção administrativa ajustam o total na mesma transação do comentário. Pendentes/rejeitados e reenvios idempotentes não incrementam. Contador inválido/negativo falha sem gravação parcial. Marcos de primeiro comentário, ranking, autorização e moderação preservados.

Feed e detalhe retornam somente o contador público já armazenado, sem consulta adicional por card nem polling. A listagem de comentários devolve o total do short já lido para validar visibilidade, independentemente dos 20 itens da página. A interface atualiza o card após leitura/envio de comentários e exclusões confirmadas. Alterações feitas em outra sessão aparecem ao atualizar o feed/comentários; não há promessa de atualização em tempo real.

Legados sem campo mostram total indisponível, nunca zero inventado. Ferramenta de manutenção limitada a 300 shorts, destino fixo demo-clipzone:8080: node scripts/prepare-comment-counts.mjs inspect; com API parada, node scripts/prepare-comment-counts.mjs apply. Valida todos os totais antes de gravar campos ausentes; divergências em campos existentes exigem diagnóstico. Usa agregação apenas na manutenção. Preparação local desta rodada: 1 short, 1 contador preenchido; segunda inspeção sem pendências. Nenhum comentário/publicação foi criado pelo agente.

## Verificação e impacto

39 testes relacionados aprovados: comentários (18), componentes (4), leitura pública (9) e Firestore isolado (8). Incluem concorrência, replay, revisão/restauração, contagem de aprovados e total independente da paginação. Lint/build aprovados. Conferência local em tela estreita e desktop: controles na mesma linha, link centralizado, imagem com largura interna do card e sem overflow da página em repouso. Hover físico e aparência final ficam disponíveis para conferência do proprietário.

Sem serviço/dependência ou índice composto novo. Um campo numérico por short; indexação automática padrão se aplica. Publicação de comentário aprovado e transições para/de aprovado passam a gravar também o short quando o contador existe (até uma gravação adicional por transação; leituras do short já existiam). Manutenção faz uma agregação por short, somente local; adaptação remota requer planejamento/autorização na implantação. Preparação e sessão administrativa precisam ser consideradas ao reiniciar a API.

Exportação local atualizada em .emulator-data. O Windows bloqueou a renomeação final do diretório temporário do Firebase (EPERM); os quatro arquivos exportados foram copiados e verificados byte a byte antes de remover as cópias temporárias. Marcador e dados estão no destino esperado; importação não foi testada por reinício do emulador. Conferir a mensagem de sucesso ao exportar/encerrar: esse bloqueio operacional pode exigir atenção, sem relação com o contador.

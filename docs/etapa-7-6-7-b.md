# 7.6.7-B — Moderação e simplificação da confirmação

Concluída localmente em 22/10/2026. Git iniciou limpo, com A e áudio já commitados. Sem produção, serviços/dependências novos ou migração de dados.

## Diagnóstico e alteração limitada

O servidor já executava moderateText antes da transação. Os relatos bosta/boiola/caganera não estavam no vocabulário, e separadores internos não eram normalizados. Mantidos os padrões existentes de ameaça, discriminação e spam; ampliada apenas a triagem local: formas Unicode/acentos/caixa, substituições comuns, separadores internos e letras isoladas. Comparações de palavrões usam limites Unicode para evitar atingir substrings de palavras legítimas. O texto original permanece intacto. Novas suspeitas ficam pending, sem contador público, número ou celebração, com flags privadas e auditoria automática. Não se trata de classificador semântico nem garantia universal: ironia, citações, novos termos e evasões ainda exigem contexto administrativo. Não houve alteração retroativa dos comentários existentes, nem conclusão sobre eventual aprovação administrativa antiga sem examinar seu histórico.

A confirmação em lote agora mostra apenas os comentários selecionados, confirmação, aviso de exclusões individuais/falha parcial, motivo obrigatório e uma linha Cancelar / Excluir comentários selecionados. Removida a linha redundante superior enquanto se confirma. Serviços de exclusão, revisão por versão, autorização, auditoria e tratamento de falhas parciais foram reutilizados sem alterações.

## Ajuste adicional solicitado

Removidos os controles Preferir som / Reproduzir com som, ajuda Sem som? e suas explicações permanentes. Preservados parâmetros, API e eventos de YouTube/TikTok confirmados pelo proprietário como funcionais, a preferência observada em memória e os controles nativos. O aviso de bloqueio quando recebido orienta para Play nativo. Twitch já recebe muted=false, autoplay e allow autoplay; clipes não expõem a API interativa de lives/VODs. Nenhuma tentativa de contornar bloqueios, novos testes repetitivos de reprodução ou mudança nos outros players. O controle nativo é a alternativa para Twitch. Ver referências oficiais e limitações em audio-sessao.md; sua seção de botões registra a entrega anterior, substituída por este pedido.

## Validação

- 20 testes comments: normalização/evasões, palavras legítimas, suspeitas no servidor e fila privada, idempotência, cotas, autorização, revisão e auditoria.
- 6 testes admin-selected-comments: sequência, falha parcial, conteúdo alterado, limites, desmontagem e acesso revogado.
- 18 regressões official-player/player-audio/refinements-7-6-7-a: origem/mensagens, estado de áudio e ausência da interface removida, canal e formulário preservados.
- 8 testes Firestore comments, somente demo-clipzone-tests em 8081: leituras públicas, privacidade, transações, autorização por regras e auditoria. O emulador de desenvolvimento 8080 não foi limpo. Mensagens PERMISSION_DENIED são recusas esperadas dos testes.
- Build TypeScript/Vite, ESLint localizado e diff --check aprovados.
- UI real do componente com contexto simulado sem credenciais: dois selecionados, terceiro ausente na confirmação, um Cancelar e um Excluir, motivo obrigatório, cancelamento/foco inicial restaurados. Nenhuma exclusão real; fixture temporária removida. Captura fora do Git.

A API local foi reiniciada para aplicar o filtro. Isso reinicia a autorização em memória; emulador e dados preservados. Próxima 7.6.7-C aguarda autorização individual.

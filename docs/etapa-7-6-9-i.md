# CLIPZONE — 7.6.9-I: conferência final local

Data: 23/10/2026. Autorizada a próxima etapa pelo proprietário, que está longe do computador e fará os commits posteriormente.

**Situação: conferência local realizada; fechamento da etapa I pendente de Lighthouse comparável, Motorola físico e autenticação real do proprietário.** Nenhuma liberação para produção ou início da Etapa 8 decorre deste relatório.

## Escopo e versão

Revisão do conjunto B–H e conferência da build de produção local, sem nova otimização. HEAD af06c15; alterações de H em GameInfo.tsx e GameInfo.module.css ainda não commitadas, preservadas. Build final de H reutilizada, sem reconstruir uma versão diferente só para medir.

- https://127.0.0.1:5174/: desenvolvimento/API.
- https://127.0.0.1:5175/: build de produção local, com proxy para a mesma API.
- Firestore local 127.0.0.1:8080, projeto demo-clipzone. Dados existentes preservados; sem seed/reset.

A captura utilizou ?audit=i-return-390 somente para instrumentação do servidor local de auditoria. O futuro Lighthouse deve usar a URL simples, sem esse parâmetro. Evidências externas ao Git em C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-9-i/: build-manifest.json (arquivos, bytes e SHA256), comparison.json, mobile-return.json, flows.json e home-mobile.png. A captura inicial foi congelada antes dos testes interativos.

## Resultados e limites da medição

| Evidência | Referência | Versão final local | Interpretação |
| --- | ---: | ---: | --- |
| CLS exploratório da home, 390×844, 25 s | 0,355857 em A | 0 | Estabilidade observada nesta captura; não garante CLS zero em todos os cenários |
| FCP/LCP brutos na mesma classe de captura | 172/172 ms | 140/140 ms | Sem simulação de rede/CPU, cache não limpo e candidatos LCP diferentes; não estimar ganho de Lighthouse |
| JavaScript inicial observado, excluindo instrumento | 1.002.549 B em A | 879.606 B | Redução de 122.943 B, aproximadamente 12,26%; tamanho dos corpos dos scripts, não total transferido/gzip |
| Três imagens do Clipper, arquivos locais | 4.956.421 B | 609.904 B | Redução de 87,69%, comprovada em C |
| Home sem vídeo aberto | 15 cards | 15 cards, zero iframes | Sem player antecipado; nenhum asset/chamada administrativa observado na captura final |

Captura final: Chromium 155, pt-BR, viewport390×844, DPR1, boas-vindas já dispensadas, sem throttle e sem limpeza de cache. Sem alertas de falha na home e sem overflow horizontal. O LCP final foi o texto de apresentação; o de A era texto do rodapé. Tempos de cache, emulador e terceiros variam. A captura desktop contextual de H (1280×720, DPR1) já registrou CLS0/LCP textual136ms bruto; não foi repetida como suposto benchmark móvel.

O Lighthouse recebido da porta5175 continua sendo a referência disponível: Performance46, FCP5,21s, LCP6,67s, CLS0,3725, TBT4ms e total3.403.159B. Contém avisos de IndexedDB e timeout de carregamento, portanto pode estar incompleto mesmo tendo sido feito em janela anônima. Não existe nova nota Lighthouse nesta etapa. Não comparar diretamente seus tempos simulados com os tempos brutos acima.

## Conferências funcionais locais

- Formulário: pesquisa normalizada POKEMON, navegação por teclado e confirmação mantiveram o ID igdb-144051 selecionado, sem alerta/overflow. Nenhum short cadastrado.
- Comentários: formulário disponível; rascunho temporário preservado após Atualizar comentários. Texto de teste apagado antes da navegação, sem enviar comentário.
- Visualizador: troca para TikTok e depois YouTube deixou somente o iframe oficial correspondente montado; ao fechar, zero iframes e sem overflow da página. Comentário existente exibido no TikTok não foi criado nesta conferência.
- Twitch reaberto separadamente: iframe HTTPS400×300, parent=127.0.0.1, allow=autoplay; fullscreen; encrypted-media; picture-in-picture, link externo presente, controles oficiais visíveis e instrução de rolagem interna. Sem overflow da página em390px. Primeira amostra durante atualização dos comentários registrou zero iframes; essa amostra isolada não foi usada para afirmar reprodução. A reabertura confirmou o iframe e a reprodução oficial. Não substitui toque/autoplay e controles no Motorola.
- A aba temporária de conferência foi fechada. Nenhuma publicação, curtida, denúncia ou moderação executada.

## Revisão e verificações reaproveitadas

Revisados os pontos diretamente envolvidos: carregamento lazy da administração e runtime Auth; regras de montagem do provedor; cache/invalidação do catálogo e seleção por ID; leitor ordenado do feed com concorrência limitada; manutenção do formulário/rascunho durante falhas; reserva das capas restrita à ficha pública. Nenhuma regressão adicional comprovada nesta conferência. Isso não equivale a garantia de ausência de bugs ou auditoria integral de segurança.

Para evitar repetições sem mudança de código, foram reutilizados os registros das etapas: B8 testes, C8, D80, E46, F48, G50 (44 unitários+6 integrações isoladas) e H9, além das respectivas verificações de lint/build/diff. Há sobreposição entre suítes; não somar como quantidade de testes distintos executados em I. H já verificou320/375/390/400/430 e desktop, proporções/falhas de capas em11 casos finais. I acrescentou a captura e os fluxos acima e conferência de diff; não repetiu suítes completas nem instalou ferramenta.

Ganhos/limites preservados:

- G reduziu espera no ensaio controlado com mesma quantidade de leituras: medianas324/325/325/356→109/109/108/140ms nas quatro ordens. São ensaios locais, não previsão de latência em produção. Leituras entre documentos continuam não atômicas; em falha, I/O da janela já iniciada pode terminar, sem resposta parcial.
- F compartilha consultas em memória por instância e invalida após mutações bem-sucedidas. Os30s limitam reutilização na próxima leitura; não há atualização automática entre abas de listas já montadas. Backend continua validando publicação.
- E evita carregar administração/Auth na home. Autorização continua obrigatória, porém Google/TOTP reais não foram revalidados nesta etapa.
- D mantém rascunho em memória enquanto visualizador está aberto, não após recarga/fechamento; não reenvia POST automaticamente.
- H estabilizou a região da capa em casos controlados, não o carregamento de todos os dados da ficha. Imagens horizontais podem apresentar margem na caixa2:3.
- SDK público Firestore e imagens externas ainda têm custo; cache/disponibilidade de terceiros não estão sob controle do projeto. Canal Listen aberto não comprova bloqueio de CPU. Não remover listeners ou proteções só para melhorar nota.

## Pendências para fechar I

1. No computador, Chrome anônimo em https://127.0.0.1:5175/ sem ?audit. Lighthouse Navigation/Mobile/Performance com simulação equivalente à referência: RTT150ms, throughput1638,4Kbps e CPU4×. Evitar throttle adicional do painel Network/Performance. Registrar versões, viewport/DPR, estado de cache e das boas-vindas. A referência informa screenEmulation412×823/DPR1,75, mas disabled=true; conferir configuração efetiva antes de chamar a comparação de equivalente.
2. A referência mostra boas-vindas ausentes; dispensá-las antes da navegação e manter esse estado consistente. Não limpar armazenamento do perfil normal nem dados do emulador. Exportar JSON e HTML. Preservar eventuais avisos; se ocorrer timeout, não anunciar nota como definitiva nem repetir testes completos indiscriminadamente.
3. No Motorola g53 5G, validar home/carregamento/rolagem, pesquisa e seleção, comentários/atualização/rascunho, troca/fechamento de vídeos e recuperação de falhas com conexão estável. Conferir toque/autoplay e acesso a todos os controles Twitch por rolagem interna; iframe mínimo400×300 e sem overflow da página. Usar5174 para ajustes e5175 para build, explicitando a versão em cada teste.
4. Proprietário validar login Google/TOTP, acesso administrativo autorizado e logout/navegação, sem necessidade de alterar cadastros. Os testes simulados de E não substituem essa verificação.

Lighthouse não está instalado no projeto/CLI disponível; não foi instalado por regra do trabalho. A automação de navegador disponível não opera o painel DevTools. O proprietário está longe do computador/celular de teste. São limites de validação, não evidência de falha do produto. Etapa I permanece com essas pendências; Etapa8 não iniciada.

## Arquivos e commits sugeridos

Nenhum código funcional modificado em I. Pendências de H e documentação podem ser agrupadas, sem duplicar docs/continuidade.md em dois commits:

1. fix: estabiliza layout das capas nas fichas dos jogos — src/features/games/components/GameInfo.tsx e GameInfo.module.css.
2. docs: registra validacao de capas e conferencia final local — docs/etapa-7-6-9-h.md, docs/etapa-7-6-9-i.md e docs/continuidade.md.

Não executados: commits, push, deploy, alteração de infraestrutura ou dados de produção. Próximo passo: concluir as verificações manuais de7.6.9-I; só depois avaliar avanço para Etapa8 mediante autorização.
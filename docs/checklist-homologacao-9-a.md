---
projeto: Clipzone
etapa: 9-A
status: em-andamento
criado: 2026-10-26
tags: [clipzone, homologacao, desktop, mobile, lighthouse]
---

# Clipzone — homologação 9-A

Endereço desta rodada: **https://www.clipzone.workers.dev/**. Use a versão HTTPS publicada; esta rodada não usa os servidores locais 5174/5175. Não faça upgrade, deploy, limpeza de banco ou cadastro fictício para preencher o checklist.

Versão de referência atualizada em 28/10/2026: `7ec6774e-b1f8-4da5-bf3b-ce1c41d16bf4` (opção A com correções de acessibilidade e robots). Se houver novo deploy, identifique a versão e separe os resultados. TikTok teve publicação real relatada e registro público observado em 28/10; reprodução também confirmada pelo proprietário para esse vídeo e a causa do antigo 429 continua desconhecida. Não repetir envios em massa ou testes de IDs inexistentes.

## Como preencher

Marque somente quando confirmar o resultado. Para falha, mantenha desmarcado e registre o ID na tabela final. Para ausência de aparelho/conteúdo, escreva “não executado” e o motivo. Não marque como sucesso algo impossível de testar. Emulação de tela no PC não substitui celular físico.

| Identificação | Preenchimento |
| --- | --- |
| Data/horário | |
| Versão do Worker/último deploy | |
| PC: sistema, navegador e versão | |
| Celular: modelo, sistema, navegador e versão | |
| Rede usada em cada dispositivo | |
| Sessão normal/anônima | |
| PWA instalada? Qual sistema? | |
| Boas-vindas do Clipper abertas/fechadas | |

## 1. Uso no PC e no celular

**F01 — Carregamento:** abrir home uma vez, esperar os cards e reabrir uma vez na mesma sessão. Observar título, jogo, canal, capa ou fallback e ausência de carregamento infinito. Registrar lentidão percebida; isso não é medição de CPU.

- [ ] F01-PC
- [ ] F01-MOB

**F02 — Filtros e ordenações:** selecionar um jogo com cards, conferir os resultados e voltar a Todos os jogos. Conferir Últimos Postados, Primeiro Postado e Mais Curtidos; atualizar uma vez. Mais Relevante foi retirado do escopo desta versão por decisão do proprietário; não deve aparecer como opção. Ranking composto e jobs permanecem desligados. Não insistir se houver erro/limite.

- [ ] F02-PC
- [ ] F02-MOB

**F03 — Navegação:** entrar na ficha de um jogo, conferir capa/texto/metadados e voltar pelo histórico do navegador. Conferir filtro e posição do feed. Atualizar diretamente a URL da ficha uma vez. Registrar se o filtro aparece temporariamente diferente enquanto o catálogo carrega e qual foi o estado final.

- [ ] F03-PC
- [ ] F03-MOB

**F04 — Paginação (se houver mais de uma página):** trocar página e conferir alinhamento em “Últimos Postados”, ausência de cards antigos/duplicados e estados de Anterior/Próxima. Saltos de cinco páginas só são testáveis com páginas suficientes. Na verificação pós-deploy de 28/10, a home tem treze cards/uma página; não criar conteúdo só para aumentar a paginação. Registrar itens sem conteúdo suficiente como não executados.

- [ ] F04-PC
- [ ] F04-MOB

**F05 — Compartilhar sem publicar:** abrir o formulário, pesquisar/selecionar um jogo cadastrado, testar teclado/rolagem e fechar por Cancelar e pelo X. Conferir retorno ao feed sem perda inesperada de filtro/rolagem. Não colar link nesta etapa: isso pode disparar consulta ao provedor.

- [ ] F05-PC
- [ ] F05-MOB

**F06 — Comentários, somente leitura:** abrir comentários de um short e fechar. Conferir lista ou mensagem de lista vazia, navegação/teclado e retorno ao feed. Sem itens existentes, renderização de comentários e paginação permanecem não executadas; lista vazia não comprova esses casos.

- [ ] F06-PC
- [ ] F06-MOB

**F07 — Clipper e layout:** trocar uma mensagem, conferir personagem, botões visíveis e ausência de sobreposição/corte. No PC, percorrer os controles com Tab e conferir foco visível/fechamento por Escape quando aplicável. No celular, conferir retrato e paisagem, zoom habitual e teclado sem impedir Cancelar/Fechar.

- [ ] F07-PC
- [ ] F07-MOB

## 2. Players de conteúdo existente

Usar um short YouTube e um Twitch já publicados. Abrir um por vez, tentar reproduzir, pausar, fechar e voltar ao feed. Conferir som e tela cheia quando disponíveis. Autoplay bloqueado, login exigido ou incorporação recusada pela origem precisam ser registrados com mensagem/código; não classificar automaticamente como erro do Clipzone. Se falhar, registrar uma ocorrência e parar, sem recarregar repetidamente para atingir limites de moderação.

| Caso | Link/ID usado e resultado |
| --- | --- |
| YouTube | |
| Twitch | |
| TikTok | Publicação observada e reprodução confirmada pelo proprietário em 28/10; não inferir confirmação nos dois dispositivos |

- [ ] V01-PC — YouTube
- [ ] V01-MOB — YouTube
- [ ] V02-PC — Twitch
- [ ] V02-MOB — Twitch

## 3. Administração sem alterar registros

Entrar em `/admin` com a conta permitida. Google/TOTP somente no site; nunca enviar códigos, QR ou chave em screenshots/chat. Conferir abas Catálogo, Comentários, fila de revisão e configurações disponíveis por leitura. Não salvar, aprovar, ocultar, excluir ou redefinir nada. Não sair da conta repetidamente para forçar novos desafios; registre se usou sessão existente ou autenticação nova.

- [ ] A01-PC — painel e abas legíveis/operáveis
- [ ] A01-MOB — painel e abas legíveis/operáveis, inclusive teclado/rolagem
- [ ] A02 — registrar sessão existente ou Google/TOTP novo: __________________

Leitura funcional do painel não mede CPU. A coleta coordenada de comments/queue e ações legítimas de escrita continua separada. Não repetir quatro atualizações por iniciativa própria; combinar uma janela se houver necessidade de telemetria.

## 4. PWA em celular físico

Usar navegador normal, fora do anônimo. Se já instalada, não desinstalar só para repetir a confirmação básica. Abrir pelo ícone, conferir Clipper, ausência de barra de endereço e navegação. Abrir/fechar formulário, comentários e player existente; conferir Voltar, teclado e safe areas em retrato/paisagem. No desktop e admin, conferir ausência do convite mobile onde não aplicável.

- [ ] P01 — ícone, abertura standalone e navegação
- [ ] P02 — teclado, orientação, safe areas e retorno do player
- [ ] P03 — retorno ao app após alternar para outro aplicativo
- [ ] P04 — atualizar e conferir versão/conteúdo atual sem tela antiga presa
- [ ] P05 — segundo sistema Android/iPhone, se disponível; caso contrário, registrar ausência

Não há funcionamento offline prometido: a PWA não implementa service worker/cache offline. Sem rede, não tratar indisponibilidade como regressão de uma função inexistente.

## 5. Ações que ficam para uma janela coordenada

- [ ] W01 — publicação legítima YouTube/Twitch, somente se houver conteúdo definitivo escolhido e janela combinada; nada fictício
- [ ] W02 — curtida/retirada, comentário legítimo e moderação autorizada, com estados e telemetria coordenados quando necessários
- [ ] W03 — TikTok: publicação e reprodução do mesmo vídeo confirmadas em 28/10, mantendo validação backend; registrar dispositivos efetivamente usados

Se não combinamos essa janela, deixe W01/W02 como não executados. Este formulário não instrui a apagar conteúdo ou gerar denúncias para testar moderação.

## 6. Lighthouse — depois do uso funcional

No Chrome do PC, abrir uma janela anônima com apenas a aba da home HTTPS. Esperar os cards, fechar as boas-vindas do Clipper e deixar nenhum vídeo, formulário ou comentários abertos. Confirmar Todos os jogos/Últimos Postados. Não usar uma tela de erro como baseline.

DevTools (F12) → Lighthouse → modo Navigation. Selecionar Performance, Accessibility, Best Practices e SEO. Fazer **uma rodada Mobile e uma Desktop**, nas mesmas condições, e salvar HTML e JSON de ambas. O perfil Mobile do Lighthouse é emulado; ele não substitui os testes funcionais no celular físico. Registrar a opção de limpeza de armazenamento/throttling mostrada pelo DevTools e não variar entre as duas auditorias; a navegação da auditoria pode alterar o estado armazenado das boas-vindas, então registre também o que aparece no relatório/screenshot final, sem presumir que permaneceu fechado.

Não repetir para buscar nota maior. Se houver timeout/IndexedDB/falha, guardar o relatório e informar. Sem nova instalação de ferramenta. Orientação oficial: [Lighthouse no DevTools](https://developer.chrome.com/docs/devtools/lighthouse), [relatórios JSON](https://developer.chrome.com/docs/lighthouse/overview).

- [ ] L01 — rodada Mobile emulada, HTML + JSON salvos
- [ ] L02 — rodada Desktop, HTML + JSON salvos
- [ ] L03 — Chrome/Lighthouse, data, estado do Clipper e opções de execução registrados
- [ ] L04 — avisos e erros preservados, sem repetições para escolher melhor nota

| Resultado | Mobile | Desktop |
| --- | --- | --- |
| Performance | | |
| Accessibility | | |
| Best Practices | | |
| SEO | | |
| LCP / CLS / TBT | | |
| Clipper visível no screenshot final? | | |
| Avisos/erros | | |
| Arquivos HTML/JSON | | |

## 7. Problemas e fechamento

| ID do caso | Dispositivo | Passos resumidos | Esperado | O que ocorreu / mensagem | Evidência sem dados privados |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

- [ ] Devolver esta nota preenchida e os quatro arquivos Lighthouse
- [ ] Listar casos não executados e o motivo, sem marcá-los como aprovados
- [ ] Comparar resultados e corrigir regressões confirmadas antes da aprovação
- [ ] Coordenar as lacunas de CPU/ações legítimas, sem repetir testes cegamente
- [ ] Concluir auditorias 9-B e 9-B.5; não tornar GitHub público automaticamente
- [ ] Registrar sucesso funcional TikTok e tratamento de indisponibilidade externa na revisão de lançamento 9-C

Nenhuma marcação deste checklist autoriza lançamento, deploy, mudança de plano ou publicação do repositório. Backup privado real foi verificado em 26/10/2026; recuperação Auth/TOTP, custódia adicional e autorização de restauração continuam separadas.


## Fechamento das correções — 28/10, rodada 21h56

Os quatro arquivos Lighthouse foram recebidos. Nomes acessíveis e robots válidos aprovados em desktop/mobile; navegação/layout/painel já confirmados pelo proprietário após o deploy. SEO66 é consequência do bloqueio de rastreamento autorizado, não falha de sintaxe. Aviso IndexedDB impede classificar performance como baseline anônima limpa. Relatório atual: etapa-9-a-lighthouse-fechamento.md. Não ampliar a cobertura dos demais itens/aparelhos por inferência; casos não individualizados permanecem com os limites registrados. Revisão operacional 9-B preparada e decisões no guia-operacao-recuperacao.md; não implica autorização de lançamento.

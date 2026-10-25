# Etapa 7.6.10-E — Regressão integrada e diagnóstico YouTube

24/10/2026. Código-base:78bd9ab, após os três commits da etapa D; árvore inicialmente limpa. Verificações automatizadas e de navegador concluídas, com aceite físico explicitamente pendente. Nenhuma correção ou otimização nova foi necessária nesta etapa. Etapa F não executada; Etapa8 permanece suspensa.

## Resultado dos dois links YouTube informados

O proprietário informou falha intermitente/histórica em https://www.youtube.com/shorts/28nFy4tGcwI e https://www.youtube.com/shorts/vSWPz8owUTM, ambos já utilizados no catálogo. Foi executado um diagnóstico separado do aplicativo: página HTML temporária, HTTPS local127.0.0.1:5178, iframe/API oficiais do YouTube, IDs fornecidos, controles oficiais, autoplay0, playsinline1, enablejsapi1, origin correspondente e strict-origin-when-cross-origin. Dimensões400x500. Sem Firestore, React, visualizador, módulos ou manipulação de player do Clipzone.

Ambos retornaram ready seguido de onError com data150. O evento onError recebido por postMessage também confirmou150. A própria interface oficial mostrou Este vídeo não está disponível e Assistir no YouTube. Evidência em youtube-results.json e youtube-error-150.png. Portanto, o impedimento foi reproduzido no player oficial sem o código do Clipzone, e não depende do carregamento sob demanda da etapa D. A classificação documentada pelo YouTube é incorporação não permitida, equivalente a101.

Limite: observação nesta sessão/navegador/ambiente local e nessa origem de diagnóstico. Não prova quem alterou uma permissão, quando, nem disponibilidade em todas as regiões/contas/domínios. O diagnóstico não usou a origem5175 exatamente (porta diferente, mesmo hostHTTPS), nem uma hospedagem pública. Não declarar que o autor necessariamente mudou uma opção ou que o deploy desbloqueará esses vídeos. Não realizar tentativas de contornar a restrição.

Referências oficiais consultadas:
- https://developers.google.com/youtube/iframe_api_reference#Events —100:removido/privado;101/150:incorporação não permitida;153:falta de HTTP Referer/identificação. onAutoplayBlocked é evento distinto.
- https://developers.google.com/youtube/terms/required-minimum-functionality#embedded-player-api-client-identity — recomenda strict-origin-when-cross-origin para identificação via Referer.
- https://support.google.com/youtube/answer/171780?hl=pt-BR — restrição etária pode impedir reprodução em sites de terceiros.

No código existente, embed.ts valida identidade, HTTPS e dimensões; monta origin correto. OfficialPlayer fornece allow autoplay/fullscreen/encrypted-media/picture-in-picture e strict-origin-when-cross-origin. O onError atual recebe tratamento genérico e remove o iframe; não conserva o código. Por isso a mensagem genérica do aplicativo, sozinha, não identifica a causa. Não foi alterada nesta etapa. O verificador server/videos/youtube.ts já consulta embeddable ao enviar e registra que autorização de incorporação não garante reprodução em toda região ou após mudança de política. Falha de reprodução incorporada não deve ser confundida automaticamente com a chave usada para metadados/publicação.

Sugestão para refinamento posterior, não implementada: mensagens específicas para códigos oficiais, preservando link externo e retry quando pertinente, sem declarar genericamente que toda falha é permissão do autor e sem retirar vídeo do catálogo automaticamente.

## Automação e build

Uma execução de node scripts/test-performance.mjs E:149testes,0falhas,0skip.27arquivos existentes, sem suíte completa ou testes que limpem o emulador. Proteções: variantes/transparência/originais do Clipper, miniaturas/identidade/fallback/cache, importação sob demanda/retry/grafo real, catálogo/coalescência/invalidação, ordenação/concurrency/cursor, navegação entre páginas/rascunho, áudio/players, links Twitch com apresentação, TikTok curto/canal, preview/publicação estrita, comentários/recuperação móvel, seletor e autorização administrativa. Casos de envio/moderação/autorização usam fixtures e credenciais fictícias, não executam operações reais em produção.

O teste de grafo em build de memória confirmou851.236B iniciais em8chunks, mantendo a medição da D. Não serve como medição de FCP/LCP. npm run lint e npm run build (cliente/servidor TypeScript + Vite) aprovados; dist atualizado na5175. Aviso não fatal WebSocket24678 já em uso ocorreu numa fixtureSSR, sem falha. Reutilizadas evidências específicas D de fechar antes da importação resolver e recuperar rejeição; não repetir a mesma fixture sem alteração.

## Navegador — build5175

Viewport solicitado e efetivamente lido por document.defaultView.innerWidth. Override só foi considerado válido após navegação/aba adequada; tentativas que continuaram em1280 não foram contabilizadas como mobile. A barra vertical ocupa15px no feed desse navegador.

| Viewport | Largura útil da home | Cards/iframes na home | iframe Twitch | Região interna Twitch |
|---:|---:|---:|---:|---:|
|320|305|15/0|400x300|238px, conteúdo402px|
|375|360|15/0|400x300|293px, conteúdo402px|
|390|375|15/0|400x300|308px, conteúdo402px|
|400|385|15/0|400x300|318px, conteúdo402px|
|430|415|15/0|400x300|348px, conteúdo402px|
|1280|1265|15/0|709x397,94|711px, conteúdo711px|

Em todas: sem overflow horizontal global, máximo um iframe de player após abrir, zero iframe/janela após fechar. Twitch manteve parent=127.0.0.1, HTTPS, permissões e link oficial externo. Região recebeu tabIndex0 apenas quando havia overflow interno. O viewport430 ainda tem menos400px úteis no player por margens/padding, portanto o scroll interno ali é esperado. Sem scale, corte de controles ou mudança de dimensões para burlar requisitos. A geometria foi medida sem exigir reprodução externa como prova de layout.

Conferências funcionais:
- Último short da primeira página (fatal) → Próximo trouxe primeiro short da segunda página e seus comentários; fechamento manteve Página2/foco no card atual.
- Rascunho digitado → tentativa de próxima navegação exigiu confirmação; Continuar neste vídeo preservou exatamente o texto; Descartar e trocar abriu próximo com campo vazio. Sem envio.
- Filtro Tibia retornou7cards desse jogo; retorno ao catálogo completo e abertura independente do formulário funcionaram.
- Texto Twitch colado com apresentação foi limpo para somente o link. Título/canal editados manualmente continuaram intactos após a prévia. Sem publicação.
- Formulário390px: catálogo29jogos, busca Tib retornou Tibia, lista permaneceu no painel ancorado ao campo, seleção por teclado confirmou Tibia; sem overflow global. Não há teclado virtual nem toque físico neste teste.
- Clipper em390px: ciclo de10cliques terminou com original opacidade1, três poses de cócegas opacidade0 e risada opacidade0; quatro balões disponíveis depois. Não afirmar medição no instante exato do reset (a leitura ocorreu depois); temporização/estado intermediário cobertos pelos testes determinísticos.
- TikTok teve um iframe e comentários disponíveis durante navegação. URLs/parâmetros/controles YouTube/TikTok permaneceram sem mudanças; disponibilidade do vídeo é independente do aceite de geometria.

Evidências: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/audit-performance/7-6-10-e/ — tests.log, build.log, responsive.json, flows.json, catalog-390.png, twitch-320.png, youtube-results.json, youtube-error-150.png e fonte/servidor do diagnóstico inativo. Página temporária inicialmente copiada para dist foi removida; o servidor5175 não fornece MIMEHTML para arquivos.html avulsos, por isso o diagnóstico usou servidor isolado5178. API5174 e build5175 não foram reiniciadas. Servidor5178 encerrado e abas criadas para teste fechadas; viewport restaurado. Nenhuma publicação, curtida, comentário, moderação, reset, seed, restauração, instalação, deploy, infraestrutura ou dado de produção alterado.

## Limites e aceite físico pendente

Não surgiram regressões reproduzíveis nas verificações executadas. Isso não garante ausência absoluta de bugs nem disponibilidade permanente dos provedores. Emulação de largura não equivale a celular real, densidade2x ou teclado virtual. Administração foi validada por contratos automatizados, sem login/MFA real ou decisões de moderação.

Checklist curto a devolver pelo proprietário quando disponível:
- [ ] No celular: abrir/fechar shorts das três fontes, navegar e verificar campo de comentários; distinguir restrição do vídeo de falha geral.
- [ ] Twitch: arrastar rolagem interna até os controles direitos sem mover a página inteira; testar Play quando autoplay for bloqueado.
- [ ] Abrir formulário, pesquisar/selecionar jogo com teclado virtual aberto e conferir painel junto ao campo.
- [ ] Conferir nitidez/transparência das imagens em tela densa e interações do Clipper por toque.
- [ ] Conferência visual da5174 anteriormente adiada continua pendente, sem marcar como realizada por esta etapa.

Próxima7.6.10-F: uma medição Lighthouse mobile e outra desktop comparáveis, após estabilidade/aceite do conjunto e autorização, sem repetir auditorias para selecionar nota. Boas-vindas fechadas, home sem vídeo, janela anônima e HTML/JSON; conservar avisos e contexto. Não iniciar Etapa8 ou os refinamentos posteriores por inferência.

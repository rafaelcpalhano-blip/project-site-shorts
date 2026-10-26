# Etapa8.5 — preparação local paralela da PWA

26/10/2026. Preparação local originalmente autorizada; **deploy específico de homologação posteriormente autorizado e concluído**, conforme registro ao final. Aprovação funcional mobile e encerramento da8-F continuam pendentes. Servidores locais existentes não foram atualizados. TikTok continua bloqueio de lançamento. As seções anteriores preservam o histórico da preparação.

## Implementação

- `public/manifest.webmanifest`: Clipzone, id/start_url/scope `/`, standalone, pt-BR, paleta escura e ícones locais.
- `index.html`: manifesto, theme-color e Apple Touch Icon/metadados. Sem alterar viewport ou caminhos internos.
- `src/components/pwa/install-controller.ts`: captura antecipada do evento nativo, sem prompt automático; toque + plataforma/capacidades para decidir convite; cancelamento silencioso; evento consumido uma vez; appinstalled e standalone ocultam. Marca local contém somente timestamp por30 dias para evitar convites repetidos. Novo beforeinstallprompt prevalece sobre a marca, permitindo reinstalação quando o navegador oferece. Armazenamento bloqueado não impede uso. Não é detecção universal de instalação/desinstalação: iOS/browser contexts podem não informar esse estado.
- `InstallAction.tsx` e CSS: somente home pública/mobile, touch target48px, ícone40px decorativo e texto acessível. CSS oculta enquanto houver dialog aberto; não flutua nem abre instruções automaticamente. Ausente no admin/desktop/standalone. Desktop estreito sozinho não qualifica; alguns híbridos/tablets dependem das capacidades informadas pelo navegador.
- `InstallGuide.tsx`: chunk lazy após interação. iOS orienta Safari → Compartilhar → Adicionar à Tela de Início → Abrir como App da Web quando disponível. Android oferece menu manual na ausência do evento. Reutiliza Modal com Escape, foco e fechamento.
- `SiteFooter.tsx`, `SiteLayout.tsx`, `main.tsx`: integração mínima do convite e captura do evento no início. `global.css`: padding de safe areas somente standalone; viewport convencional preservado. Navegação, players e autenticação não alterados.
- `public/_headers`: MIME explícito do manifesto, revalidação dos arquivos de nome fixo. Static-first e cache de bundles com hash mantidos.

## Arte revisada e aprovada visualmente

Ferramenta integrada image_gen, usando `public/clipper/welcome.webp` como referência, sem substituir originais. Prompt: preservar a identidade exata do robô roxo Clipper, rosto feliz na tela escura, orelhas circulares e botão triangular no peito; duas mãos segurando controle de videogame preto/roxo; composição centralizada com fundo carvão, sem textos, margens para máscaras e legibilidade em tamanho pequeno. Arte-base e prompt detalhado preservados no workspace privado, `assets/clipper-gamer-v2.png` e `assets/clipper-gamer-v2-prompt.txt`. Derivações por redução de uma base maior; sem ampliar arte pequena. A segunda versão teve a perspectiva do controle e a pegada corrigidas usando referências somente de pose; o proprietário aprovou visualmente a arte em26/10/2026. Isso não certifica licenciamento de assets anteriores para GitHub.

| Arquivo em public/icons | Dimensão | Uso | Bytes |
| --- | --- | --- | --- |
| clipper-gamer-192.png |192×192|Manifesto any|42731|
| clipper-gamer-512.png |512×512|Manifesto any|267008|
| clipper-gamer-maskable-512.png |512×512|Maskable, margens adicionais|149820|
| clipper-gamer-180.png |180×180|Apple Touch Icon|37957|
| clipper-gamer-64.webp |64×64|Rodapé lazy|1324|

Inspeção visual local da arte e variante maskable realizada. Ícones opacos, proporção quadrada e margens preservadas; aparência final das máscaras depende da validação no dispositivo. A arte-base foi aprovada pelo proprietário; os cortes e a aparência instalada ainda precisam de testes no dispositivo.

## Cache, custo e desempenho

Sem service worker ou biblioteca PWA. A instalação com manifesto não exige SW nos critérios atuais; não criar cache offline apenas para mostrar um convite. Fontes: [MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [critérios Chrome](https://web.dev/articles/install-criteria), [guia Apple](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios).

Nenhuma chamada adicional ao Firestore, mudança de API, autenticação, secret ou plano. Rodapé baixa imagem de1324 bytes com lazy; PNGs maiores são para instalação/ícone e podem ser consultados pelo navegador independentemente do convite. Guia em chunk sob demanda; código do controlador entra na home. Não há medição nova de Lighthouse, CPU ou bytes iniciais em dispositivo real; não prometer impacto zero ou nova nota.

## Verificações realizadas

8 casos `tests/pwa-install.test.mjs`: capacidades mobile, evento capturado sem prompt automático, cancelamento, consumo único, aceitação/marca/reinstalação, appinstalled/standalone, desktop, falhas de armazenamento/prompt, toque repetido, manifesto/PNG. Suíte geral696 testes sem falhas; tipos frontend e lint global aprovados.

`node tests/runtime/run-pwa-assets.mjs <laboratório externo aprovado>`: build em pasta nova fora de dist e9 checks no Workers local. Manifesto application/manifest+json, quatro PNG e WebP com MIME correto, nomes fixos revalidando, acesso direto a jogo/admin retornando HTML com manifesto e API de fixture JSON/no-store. Não usa a API real nem prova autorização administrativa, players, instalação ou quotas. Laboratório existente Wrangler4.152.0, sem instalar dependências ou acessar credenciais. Evidência: `evidencias/etapa-8-5-pwa-local.json`.

## Checklist de homologação

- [x] Proprietário confirmou instalação, abertura e navegação básicas no celular testado. Plataforma/navegador ainda não identificados no relato; matriz ampliada abaixo permanece aberta.

- [x] Proprietário aprovou visualmente a arte revisada do Clipper Gamer.
- [ ] Conferir máscaras e ícone instalado no Android/iPhone reais.
- [x] Deploy específico de homologação autorizado e executado; manifesto/ícones/headers verificados por leitura.
- [ ] Android Chrome real: convite no rodapé, cancelar sem erro, instalar, ícone correto e abrir standalone; desinstalar/reinstalar quando possível. A oferta nativa depende das regras de engajamento e elegibilidade do navegador.
- [ ] iPhone Safari real: guia sob demanda, Compartilhar/Adicionar, Abrir como App quando disponível, ícone e standalone.
- [ ] Desktop: ausência do convite; admin sem convite em todos os dispositivos.
- [ ] Standalone: voltar à home/jogos, abrir/fechar compartilhamento, comentários e visualizador; teclado, rolagem, gestos e safe areas em retrato/paisagem.
- [ ] Players YouTube/Twitch/TikTok e links externos funcionam conforme regras do dispositivo. TikTok exige antes resolver sua validação backend.
- [ ] Atualização de versão aparece sem conteúdo antigo preso; confirmar ausência de caches privados/SW.
- [ ] Regressões Google/TOTP/UID, cookies e limites no pacote exato, sem enviar códigos ao chat.
- [ ] Lighthouse PC/mobile na9-A, comparando condições equivalentes; registrar versões e limitações.

Sem aparelhos disponíveis para esses testes nesta execução. Não considerar a PWA aprovada antes da validação visual e funcional do proprietário em celular real.


## Aplicação local da arte aprovada

Em26/10/2026 foram regeneradas as cinco derivações a partir de assets/clipper-gamer-v2.png. Versão anterior preservada no workspace privado. Mantidos nomes/caminhos, manifesto, semântica de instalação e revalidação. Nenhum deploy, atualização da5175, mudança de autenticação ou acesso a dados. Aprovação visual da arte não equivale à aprovação funcional mobile.


Após aplicar a arte aprovada, os oito testes PWA e nove checks Workers passaram novamente. Build/dry-run do Worker aprovados e pacote candidato isolado com43 assets/checkpoint preparado para autorização específica de homologação. Nenhum deploy realizado; suíte geral anterior696/0 não foi repetida sem mudança de código. Testes de instalação real continuam pendentes.


## 26/10/2026 — deploy PWA de homologação expressamente autorizado

O proprietário escolheu “Autorizar esse deploy na homologação”. Pacote testado com arte revisada aprovado foi publicado em https://www.clipzone.workers.dev, versão `5b2a243b-9c90-4fd0-94e0-592772f91b1d`. Foi enviado o bundle congelado do dry-run, com43 assets. A versão ativa anterior foi conferida antes da execução: `8ced364c-e1c5-4542-9618-5cba2b260f40`, preservada como referência de rollback. Mesmos oito valores de segredos fornecidos, arquivo privado intacto, roteamento preservado, jobs e diagnósticos desligados. Nenhuma migração, alteração de dados, Firebase, plano ou instalação de dependência. Sem service worker.

Doze verificações HTTP somente leitura aprovadas: home/admin/jogo direto com HTML/links, bundle com hash immutable, manifesto com conteúdo exato/MIME/cache correto, cinco ícones idênticos ao pacote aprovado e MIME/revalidação corretos, configuração pública da API no projeto correto e rota inexistente JSON404/no-store. Não houve cookie emitido nessas respostas, tentativa de validação TikTok ou escrita editorial. Não houve nova medição de CPU, Google/TOTP, instalação real, reprodução de players ou Lighthouse. A suíte geral anterior permanece696/0, sem nova execução após a troca somente de ícones/documentação e publicação do pacote testado.

Próximo: proprietário testa no celular normal (fora do anônimo), atualiza home, abre convite no rodapé, instala e abre pelo ícone; confere arte, ausência do convite em standalone, navegação, visualizador e Voltar. Confirmar Android/Chrome e iPhone/Safari separadamente quando disponíveis, sem declarar cobertura do aparelho ausente. Administrador deve confirmar painel/Google/TOTP somente no site, sem enviar códigos. Evidência: etapa-8-5-pwa-homologacao.json. A8-F continua aberta; TikTok e lançamento público não aprovados.

## 26/10/2026 — instalação mobile e navegação confirmadas pelo proprietário

Resposta recebida ao roteiro de teste em celular real: “Instalou e abriu corretamente; navegação funcionou”. A checagem básica de instalação, abertura pelo ícone e navegação foi aprovada no aparelho testado, conforme relato humano. Plataforma/navegador não foram explicitados nessa resposta; não atribuir aprovação separada a Android/Chrome ou iPhone/Safari nem afirmar observação independente pelo agente.

Isso encerra a checagem básica solicitada da PWA na homologação, não toda a matriz9-A. Permanecem verificações ampliadas de cancelamento/reinstalação, segundo sistema quando disponível, admin/Google/TOTP, todos os players, teclado/gestos/safe areas/atualização e Lighthouse. Não houve novo código, testes automáticos, deploy ou ação remota nesta rodada. TikTok e os demais gates8-F continuam pendentes; lançamento público não autorizado.

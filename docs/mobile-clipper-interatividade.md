# Correções mobile e interatividade do Clipper
Data de fechamento técnico local: 24/10/2026. Implementação autorizada em quatro partes; avaliação visual e física do proprietário pendente. Etapa 8 não iniciada.

## A — Seleção de jogos
GameCombobox trata toque/caneta no pointerup, antes de clique de compatibilidade/blur. Movimento, rolagem, cancelamento, segundo dedo e pressão longa não selecionam. Mouse, teclado e seleção por ID preservados; popup respeita borda direita.
Cenário controlado reproduziu falha na versão anterior: toque + foco externo fechava lista sem selecionar. Versão atual selecionou manual-119 (Pokémon Teste), preservou os demais campos e enviou esse mesmo gameId ao serviço fictício de publicação. Nenhum short foi publicado. Não equivale a confirmação em Android/iOS físico.

## B — Navegação
Deslize horizontal intencional somente na faixa externa de navegação; não captura gestos no iframe, comentários ou metadados. Intenção vertical, cancelamento e bordas do sistema não navegam. Mantém ordem, botões e confirmação de rascunho.
Movimento opcional/experimental: inclinação lateral por DeviceOrientationEvent; não detecta translação pura do aparelho. Ativação explícita em contexto seguro, requestPermission quando oferecido, calibração, filtro, permanência mínima, cooldown de 1,2 s e retorno neutro. Não envia nem persiste amostras. Suspende durante edição/transição/confirmação, preservando referência de calibração e exigindo posição neutra ao retomar. Desliga ao ocultar página; remove listeners e timers ao desativar/desmontar. Sem leitura utilizável em 3,5 s, retorna à navegação normal.
Ensaios sintéticos confirmaram swipe, preservação/cancelamento de rascunho, negativa de permissão, ativação e uma navegação por inclinação. Não comprovam disponibilidade, permissões ou precisão de hardware real; navegador e sistema podem não fornecer sensores.
Referências: [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), [pointercancel](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event), [permissão de orientação](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static), [orientação](https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Detecting_device_orientation).
Players oficiais, parent, dimensões, links e autenticação não foram alterados.

## C — Suporte
Configuração compartilhada oficial clipzone.suporte@gmail.com, operacional, com mailto no rodapé e orientações públicas de jogos. Sem mudanças de autenticação ou credenciais.

## D — Clipper
Quatro balões em botões acessíveis; banco separado com as 14 frases fornecidas. Sorteio em ciclos de mensagens elegíveis, sem duplicatas simultâneas e evitando as quatro recentes quando possível. Clique troca só o balão após puff e espera de 2,5 s. A cada 15 cliques no mascote, os quatro são renovados juntos e timers anteriores cancelados.
Três frames WebP transparentes de 320 × 480, total 70.398 bytes, carregados apenas após a primeira interação. Original preservado; falha das imagens mantém o original. Cliques sustentam ciclo de 160 ms; após cessarem por aproximadamente 400 ms, último frame permanece por 2 s antes do retorno. Sem áudio ou Firestore. CSS reduced-motion desativa movimento/transições e usa frame fixo; preferência real do sistema ainda não testada.
Visual controlado em 320/375/390/400/430/1280 px: quatro balões e mascote sem sobreposição/overflow horizontal. Inspeção final na build normal: 15 cards, zero iframes antes de abrir vídeo, sem alerta/erro de console e sem overflow.
A identidade visual dos frames gerados ainda depende de aprovação do proprietário.

## Verificações e limites
48 testes relacionados distintos aprovados: 17 de navegação/mobile/sequência, 30 de Clipper/suporte/combobox/formulário, mais 1 novo teste de suspensão do sensor. Os últimos seis testes mobile foram repetidos após o ajuste final de suspensão; todos passaram. Lint direcionado, TypeScript, build de produção local e git diff --check aprovados. Não executada suíte completa nem novo Lighthouse.
Evidências locais: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/mobile-clipper/ (combo-before.json, combo-after.json, submission-captured.json, swipe-draft.json, motion-synthetic.json, bubble-individual.json, bubble-fifteen.json, responsive.json, clipper-desktop.png, clipper-mobile.png e clipper-final.png).
Fixtures de comparação removidas; serviço temporário 5178 encerrado. Serviços normais 5174/5175 e emulador8080 preservados; build5175 atualizada. Sem instalação, reset/seed, dados de produção, infraestrutura, deploy ou commits.
Pendências já aceitas pelo proprietário continuam registradas em continuidade: Motorola físico, avaliação visual5174/admin, Lighthouse comparável e Google/TOTP real. Testar também sensores e gestos físicos fora dos iframes, rolagem/seleção mobile e preferência reduced-motion antes de aprovar definitivamente. A build automatizada não garante ausência absoluta de regressões.

## Assets: ferramenta e prompts
Ferramenta integrada image_gen, modo edição com referência local original public/clipper/welcome.webp, fundo transparente. Originais gerados preservados em C:/Users/rafae/.codex/generated_images/01a152e0-69ff-7a21-99fb-d3915afa4bcb/:
- exec-a39dc851-8403-46b8-a5f7-ca57cbc9873c.png
- exec-df872f2a-22c2-49d1-ae17-85e93d824ef5.png
- exec-7cfa11af-7f0c-4e97-a006-6bd083eab18a.png

Conversão com sharp já disponível no runtime (sem instalar bibliotecas), resize320×480, WebP quality85/alphaQuality100/effort5, para public/clipper/tickle-1.webp até tickle-3.webp.
Prompts completos:

### Frame 1
Use case: identity-preserve. Edit target: attached original official Clipzone Clipper mascot. Asset type: one animation frame, full-body 2:3 portrait transparent PNG. Make only a slight laughing/ticklish pose variation of THIS EXACT SAME glossy purple robot. Preserve its identity faithfully: exact purple/lavender and black materials, oversized rounded rectangular head, black screen face, white luminous eyes, round headphones, chest triangular play emblem, small limbs and chunky feet, 3D rendering style and lighting, full body proportions and details. Frame 1: a delighted laugh, white crescent eyes and a small wide open laughing mouth on the screen; hands closer to belly, upright. Keep the SAME camera, character size, center, transparent padding and feet baseline as the reference for a stable CSS animation. Feet and all hands fully visible. True transparent background, no floor or shadow backdrop, no text, no sound symbols, no additional characters or props. Do not redesign or substitute the character.

### Frame 2
Use case: identity-preserve. Edit target: attached original official Clipzone Clipper mascot. Asset type: one animation frame, full-body 2:3 portrait transparent PNG. Make only a slight laughing/ticklish pose variation of THIS EXACT SAME glossy purple robot. Preserve its identity faithfully: exact purple/lavender and black materials, oversized rounded rectangular head, black screen face, white luminous eyes, round headphones, chest triangular play emblem, small limbs and chunky feet, 3D rendering style and lighting, full body proportions and details. Frame 2: a stronger belly laugh with a wider open white laughing mouth and crescent eyes, head tilted a few degrees left, shoulders raised a little. Keep the SAME camera, character size, center, transparent padding and feet baseline as the reference for a stable CSS animation. Feet and all hands fully visible. True transparent background, no floor or shadow backdrop, no text, no sound symbols, no additional characters or props. Do not redesign or substitute the character.

### Frame 3
Use case: identity-preserve. Edit target: attached original official Clipzone Clipper mascot. Asset type: one animation frame, full-body 2:3 portrait transparent PNG. Make only a slight laughing/ticklish pose variation of THIS EXACT SAME glossy purple robot. Preserve its identity faithfully: exact purple/lavender and black materials, oversized rounded rectangular head, black screen face, white luminous eyes, round headphones, chest triangular play emblem, small limbs and chunky feet, 3D rendering style and lighting, full body proportions and details. Frame 3: another laugh with crescent eyes and open laughing mouth, head tilted a few degrees right and hands slightly apart near the belly. Keep the SAME camera, character size, center, transparent padding and feet baseline as the reference for a stable CSS animation. Feet and all hands fully visible. True transparent background, no floor or shadow backdrop, no text, no sound symbols, no additional characters or props. Do not redesign or substitute the character.


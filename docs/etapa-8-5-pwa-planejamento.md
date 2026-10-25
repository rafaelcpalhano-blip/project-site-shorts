# Etapa 8.5 — PWA: escopo registrado para execução futura

Registrado em 25/10/2026. Status: aguardando conclusão da Etapa 8; implementação não iniciada.

A Etapa 8 ainda não foi iniciada. Este registro preserva o pedido do proprietário e sua condição explícita de não antecipar a implementação. Não criar agora manifesto, service worker, convite de instalação ou ícones; não realizar deploy ou alterar infraestrutura.

Sequência: fechar as pendências pré-Etapa 8 → concluir integração da Etapa 8 → executar este escopo da Etapa 8.5 → validação visual/funcional em celular real → auditoria final da Etapa 9. Custos, bibliotecas e deploy seguem sujeitos às autorizações indicadas no pedido.

Na execução futura, verificar documentação oficial vigente dos navegadores e a arquitetura realmente resultante da Etapa 8 antes de decidir sobre service worker, cache, MIME e caminhos no Workers. O pedido abaixo é especificação, não evidência de recursos já implementados ou de testes aprovados.

## Pedido integral do proprietário

# CLIPZONE — ETAPA 8.5: INSTALAÇÃO MOBILE COMO PWA

## Contexto

Após concluir a Etapa 8, quero preparar o Clipzone para ser adicionado à tela inicial de celulares Android e iOS.

O objetivo é proporcionar uma experiência semelhante à de um aplicativo, utilizando as tecnologias web já existentes, sem criar um aplicativo nativo e sem publicar nas lojas.

Esta funcionalidade deverá ser concluída antes da auditoria final da Etapa 9.

**Não executar esta implementação antecipadamente caso a Etapa 8 ainda esteja em andamento.**

---

## 1. Objetivo principal

Implementar os recursos necessários para que os visitantes possam adicionar o Clipzone à tela inicial do celular e acessá-lo diretamente.

Características desejadas:

- Instalação gratuita.
- Nenhum cadastro obrigatório.
- Acesso ao mesmo site e aos mesmos dados.
- Experiência responsiva.
- Ícone exclusivo do Clipzone.
- Funcionamento em modo standalone, quando suportado.
- Compatibilidade com Android e iOS.

Não implementar funcionalidades offline complexas.

O Clipzone continuará dependendo da internet para carregar os shorts e acessar os serviços externos.

---

## 2. Ícone oficial — Clipper Gamer

O ícone utilizado para representar o aplicativo deverá mostrar o mascote original Clipper **segurando um controle de videogame**.

### Identidade visual

- Preservar o desenho e a identidade do Clipper existente no projeto.
- Utilizar as mesmas características faciais, cores e proporções.
- Mostrar um controle de videogame claramente reconhecível nas mãos.
- Utilizar fundo coerente com a paleta roxa e escura do Clipzone.
- Manter o mascote centralizado.
- Garantir boa legibilidade em tamanhos pequenos.
- Evitar textos, detalhes minúsculos e elementos desnecessários.
- Preservar margens seguras para cortes e máscaras dos sistemas operacionais.

### Recursos gráficos

Preparar os seguintes arquivos, utilizando uma arte-base de boa qualidade:

- Ícone PNG 192 × 192.
- Ícone PNG 512 × 512.
- Ícone apropriado para Android com máscara adaptativa, utilizando finalidade maskable quando houver arte compatível.
- Apple Touch Icon, preferencialmente 180 × 180.
- Versão otimizada para exibição no rodapé.

Utilizar arquivos leves e bem otimizados.

Não aumentar desnecessariamente o tamanho do carregamento inicial.

**Não substituir o mascote original por uma ilustração genérica.**

Se não houver recursos suficientes para produzir fielmente o Clipper segurando o controle, documentar quais imagens precisam ser fornecidas e preparar a estrutura para recebê-las.

Não deformar ou ampliar artificialmente imagens de baixa resolução.

---

## 3. Botão discreto no rodapé

Adicionar um pequeno controle para instalação na seção final da página inicial.

### Requisitos visuais

- Aparecer somente na interface mobile.
- Permanecer no rodapé, próximo aos conteúdos informativos.
- Não usar botão flutuante fixo na tela.
- Não atrapalhar o Clipper interativo e seus balões.
- Não competir visualmente com "Compartilhar short".
- Utilizar o Clipper Gamer como ícone.
- Ter contorno ou fundo suave, combinando com a identidade do site.
- Respeitar tamanhos mínimos adequados para interação por toque.

### Texto sugerido

**Adicionar Clipzone à tela inicial**

Exibir o ícone à esquerda do texto.

O controle deve parecer uma opção adicional útil, e não uma publicidade.

Não apresentar banners grandes, pop-ups automáticos ou animações insistentes.

---

## 4. Instalação no Android

Quando o navegador oferecer suporte:

- Detectar a disponibilidade do evento `beforeinstallprompt`.
- Preservar o evento para uso após interação explícita.
- Ao tocar no botão, abrir a interface de instalação fornecida pelo navegador.
- Respeitar a escolha do visitante.
- Tratar cancelamento sem apresentar mensagens de erro desnecessárias.
- Detectar quando o aplicativo já estiver instalado.
- Ocultar o convite quando ele não for mais necessário.

Não chamar automaticamente o prompt de instalação ao carregar o site.

Caso a instalação programática não esteja disponível, apresentar orientações simples sobre como adicionar o site à tela inicial, apenas quando houver um procedimento compatível com o navegador.

Não prometer instalação automática em todos os dispositivos.

---

## 5. Instalação no iPhone

No iOS, não presumir disponibilidade da instalação programática.

Ao tocar no controle:

- Exibir um pequeno guia de instalação.
- Orientar a abrir o site no Safari, quando necessário.
- Explicar como utilizar o menu Compartilhar.
- Indicar "Adicionar à Tela de Início".
- Orientar a ativar "Abrir como App da Web", quando essa opção estiver disponível.
- Permitir fechar facilmente as instruções.

Não criar um botão que pareça instalar automaticamente caso o navegador não ofereça essa capacidade.

---

## 6. Modo standalone

Configurar o manifesto da aplicação para utilizar:

`display: "standalone"`

### Resultado esperado

Ao abrir o Clipzone pelo ícone instalado:

- Exibir uma janela própria, sem a barra de endereço convencional, quando suportado.
- Carregar a página inicial.
- Preservar a identidade visual.
- Permitir navegação entre feed, jogos, shorts e demais páginas.
- Preservar o funcionamento dos players oficiais.
- Respeitar as áreas seguras dos dispositivos.
- Manter o botão Voltar ou alternativa de navegação adequada.
- Não quebrar a navegação ao abrir links externos.

Links que direcionem para Twitch, YouTube, TikTok ou outros domínios poderão abrir no navegador ou aplicativo externo conforme o sistema operacional.

Não tentar forçar essas plataformas a permanecerem dentro do Clipzone.

### Atenção aos modais

Verificar especialmente:

- Visualizador de shorts.
- Compartilhamento de vídeos.
- Página de jogos.
- Comentários.
- Rolagem vertical.
- Gestos horizontais.

O modo standalone não deverá comprometer a navegação.

---

## 7. Web App Manifest

Criar ou ajustar o manifesto utilizando as informações oficiais:

- Nome: Clipzone.
- Nome curto: Clipzone.
- Descrição coerente com a plataforma.
- URL inicial: `/`.
- Escopo: `/`.
- Modo de exibição: standalone.
- Cor de fundo compatível com a identidade visual.
- Cor do tema compatível com a identidade visual.
- Ícones oficiais do Clipper Gamer.

Verificar a configuração correta de manifesto, MIME type e caminhos no Cloudflare Workers.

Garantir que as rotas internas continuem funcionando quando acessadas diretamente.

---

## 8. Service Worker e cache

Avaliar os requisitos reais de instalação dos navegadores utilizados.

Se um Service Worker for necessário ou útil para a experiência escolhida, implementar somente a estrutura mínima apropriada.

Não criar cache offline completo nesta etapa.

Não armazenar indiscriminadamente:

- Respostas administrativas.
- Dados privados.
- Tokens de autenticação.
- Vídeos das plataformas externas.
- Respostas dinâmicas que possam ficar desatualizadas.
- Dados sensíveis do Firebase.

Evitar que versões antigas do site permaneçam carregadas após atualizações.

Priorizar simplicidade, segurança e desempenho.

Não instalar bibliotecas para PWA sem uma justificativa técnica relevante e minha aprovação.

---

## 9. Regras de visibilidade

O convite de instalação deve:

- Aparecer somente em dispositivos móveis.
- Ficar restrito ao rodapé público.
- Não aparecer na página administrativa.
- Não aparecer durante a visualização de shorts em tela modal.
- Não aparecer quando o Clipzone já estiver em modo standalone.
- Não reaparecer desnecessariamente após a instalação.

A identificação mobile deve considerar capacidades do navegador, não apenas a largura da tela.

Se o visitante estiver em um navegador incompatível, fornecer orientação útil ou ocultar a ação, conforme o caso.

---

## 10. Desempenho e acessibilidade

- Evitar bibliotecas grandes.
- Não adicionar requisições ao Firestore.
- Não introduzir serviços pagos.
- Carregar os recursos de instalação de forma econômica.
- Manter o botão acessível por teclado.
- Utilizar texto alternativo adequado para o ícone.
- Preservar foco e leitura por leitores de tela.
- Respeitar movimento reduzido.
- Evitar mudanças de layout durante o carregamento.
- Não acrescentar JavaScript pesado à página inicial.

A implementação não pode prejudicar as otimizações de desempenho realizadas antes da Etapa 8.

---

## 11. Testes

Executar testes direcionados, incluindo:

### Android

- Chrome mobile.
- Apresentação do botão.
- Fluxo de instalação, quando disponível.
- Cancelamento.
- Ícone instalado.
- Abertura em standalone.
- Navegação entre páginas.
- Reprodução de vídeos.
- Desinstalação e reinstalação, quando possível.

### iPhone

- Safari.
- Orientações de instalação.
- Adição à tela inicial.
- Ícone correto.
- Abertura como aplicativo web.
- Responsividade e navegação.

### Desktop

- Confirmar ausência do convite mobile.
- Garantir que a interface desktop não foi afetada.

### Segurança e desempenho

- Carregamento correto do manifesto.
- Integridade dos ícones.
- Ausência de cache indevido.
- Compatibilidade HTTPS.
- Funcionamento dos endpoints existentes.
- Ausência de problemas novos relevantes no Lighthouse.

Se não houver dispositivos ou ambientes disponíveis para algum teste, registrar como pendência manual em vez de declarar aprovação sem execução.

---

## 12. Restrições

- Não criar aplicativo nativo Android ou iOS.
- Não gerar APK ou IPA.
- Não publicar na Play Store ou App Store.
- Não introduzir login para visitantes.
- Não alterar a autenticação administrativa.
- Não alterar Firestore ou estruturas de dados.
- Não implementar notificações push nesta etapa.
- Não criar modo offline completo.
- Não modificar a infraestrutura além do necessário e autorizado.
- Não realizar deploy adicional sem minha aprovação.

---

## 13. Entrega

Ao concluir, apresentar:

1. Arquivos criados ou modificados.
2. Manifesto configurado.
3. Ícones utilizados e respectivas dimensões.
4. Comportamento do botão no Android.
5. Comportamento no iOS.
6. Comportamento standalone.
7. Testes executados.
8. Limitações encontradas.
9. Impacto no desempenho.
10. Pendências para a Etapa 9.

Manter as alterações organizadas em um commit próprio.

**Esta funcionalidade só será considerada aprovada depois de minha validação visual e funcional em um celular real.**
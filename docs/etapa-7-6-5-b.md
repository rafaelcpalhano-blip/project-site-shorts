# Etapa 7.6.5-B — Cards e visualizador

Concluída em 22/10/2026, somente apresentação e proteção dos controles reorganizados.

- Cards sem legenda visível Abrir vídeo; botão conserva nome acessível, teclado e miniatura/fallback. Canal e horário separados; curtidas antes de comentários e ficha do jogo.
- Fonte canônica à esquerda e curtida à direita abaixo do player, com quebra em telas pequenas. Sem fieldset/inset de curtidas e sem consulta ou contador adicional.
- Informações da plataforma em details após formulário de comentário; denúncia discreta no final. Ferramentas administrativas continuam depois desses elementos.
- Remover fieldset exigiu desabilitação explícita dos controles de curtida e denúncia durante seleção/operação administrativa, inclusive guarda no envio. Regras de servidor permanecem intactas.
- Fonte e informações reaproveitam buildEmbed, sem aceitar URLs externas arbitrárias. Modo demonstrativo também conserva fonte e avisos ao final.

Validação: 4 novos testes de apresentação/URL segura/controle desabilitado/ordem, mais 3 testes existentes de sequência e miniaturas aprovados. Lint e build aprovados. Novo teste teve escape de regex corrigido antes da execução final. Sem suíte completa ou repetição de testes de backend sem alteração correspondente.
Navegador: canal/horário/curtidas conferidos; fonte única, denúncia aberta/selecionada/cancelada sem envio; aviso expansível após formulário; tela 390x844 sem overflow, Twitch usa fallback oficial estreito; Tab fecha o ciclo do modal e fechar restaura foco e deixa zero iframes. Nenhum comentário, curtida ou denúncia enviado. Autorização administrativa positiva e ações de moderação não foram reexecutadas nesta alteração visual.

Capturas no workspace da conversa, fora do Git: cards-7-6-5-b.png e revisao-7-6-5-b.png.
Sem alterações em backend, banco/índices/regras, serviços, dependências ou deploy.
Próxima: 7.6.5-C — apresentação dos comentários e celebração do primeiro comentário, mediante autorização individual. D/E pendentes.

# Clipper — boas-vindas e erros

Identidade aprovada pelo proprietário em 22/10/2026: Clipper, o robô lilás com símbolo de play. Três PNGs transparentes em public/clipper, gerados pelo image_gen integrado. [Prompts e proveniência](clipper-prompts.md). Nenhuma nova biblioteca ou serviço.

Boas-vindas simples na primeira abertura da página inicial: apresentação, descoberta/compartilhamento, curtidas/comentários, seleção correta do jogo e denúncia. Modal existente preserva foco, Escape e teclado. Só ao fechar é gravado clipzone:clipper:welcome:v1=seen em localStorage. Não é identidade, cota, rastreamento nem cookie; não vai ao servidor. Válido por navegador/origem/perfil. Limpar o armazenamento ou usar outro perfil faz aparecer novamente. Armazenamento bloqueado mantém a dispensa em memória até recarregar. Não se trata de tutorial; microtutorial futuro não implementado.

Animação CSS apenas de flutuação da imagem inteira, uma vez por quatro segundos, desativada com movimento reduzido. Não é GIF nem animação independente de olhos/membros.

Falha de carregamento: Clipper no 404, falhas de feed/ficha e fallback de erros de renderização/rotas React. Mensagens genéricas, sem detalhes internos. Repetição só por ação explícita do visitante. Falha de imagem local mantém a mensagem textual. Um servidor indisponível, JavaScript que não chegou a executar ou intersticial do navegador não pode exibir uma interface que ainda não foi carregada; não é solução offline/service worker.

O Clipper da placa de alerta é o último fallback dos cards, depois da miniatura oficial e capa IGDB (7.6.6-C). Não substituir uma imagem válida. Nenhuma API externa executada pela ilustração.

Validação: dois testes de preferência (persistência após fechar, armazenamento bloqueado/ausente), compilação e lint localizado. Navegador real: modal inicial, fechar/recarregar sem repetir, rota inexistente e imagens locais. Capturas no workspace da conversa, fora do Git. Sem alteração de publicações, login, cota, moderação, dados de jogos ou serviços remotos.

Limitação de entrega: PNGs originais em alta resolução, aproximadamente 4,96 MB no total (carregados conforme uso e cache normal do navegador). Otimização de formato/dimensões é recomendada antes de produção; não foram instalados conversores nem alterado o desenho aprovado.

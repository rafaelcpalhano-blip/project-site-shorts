# Etapa 9-A — retorno de uso, Lighthouse e publicação TikTok

28/10/2026. Referência de homologação: `ffec1d98-360b-43ea-bcb4-f3dbc29da2eb`. Investigação sem deploy, alteração de código funcional, consulta ao TikTok ou nova publicação. [Evidência sanitizada](evidencias/etapa-9-a-retorno-2026-10-28.json).

## Retorno do proprietário

O proprietário informou que os testes aplicáveis e outras funcionalidades estavam funcionando, incluindo um envio TikTok bem-sucedido. Não enumerou todos os itens do checklist nem confirmou individualmente reprodução TikTok ou modo standalone nesta mensagem. Não transformar esse relato geral em aprovação automática de todos os casos, iPhone ou desafios novos Google/TOTP.

## Lighthouse recebido

| Métrica | Mobile 20h07 | Desktop 20h12 |
| --- | --- | --- |
| Performance | 94 | 99 |
| Acessibilidade | 100 | 100 |
| Boas práticas | 100 | 100 |
| SEO | 92 | 92 |
| FCP | 2,36 s | 0,79 s |
| LCP | 2,63 s | 0,79 s |
| TBT | 3,5 ms | 0 ms |
| CLS | 0,0322 | 0,0344 |

Horários de Brasília, 28/10. Lighthouse 13.5.0/Chrome 156. As notas das quatro categorias coincidem com as da rodada de 27/10; não há queda de categoria nestas duas amostras. TBT mobile passou de 10 ms para 3,5 ms e LCP de aproximadamente 2,7 para 2,63 s, mas versão do Lighthouse/Chrome, conteúdo e execução diferem: não atribuir causalmente esses deltas a uma otimização nem tratá-los como benchmark controlado.

Ambos os JSONs não têm runWarnings/runtimeError. Requisições registradas de catálogo/feed retornaram 200 e sessão 204. Capturas finais mostram cards carregados e nenhuma sobreposição das boas-vindas. Não são auditorias de tela vazia/erro. Os relatórios identificam formFactor mobile/desktop, com throttling simulate e CPU 4x/1x, mas screenEmulation.disabled=true nos dois; a apresentação das capturas difere. Preservar esses parâmetros e não classificar como dois perfis padrão de emulação ou como teste de celular físico. disableStorageReset=false; a condição de janela anônima não é comprovada pelo JSON.

### Achados que continuam abertos

1. Nome acessível versus texto visível: dez botões de preview em cada relatório falham em label-content-name-mismatch. A auditoria tem peso zero na categoria: Acessibilidade 100 não significa que esse caso passou. A correção anterior não encerrou a evidência atual; reabrir o achado e reproduzir antes de um ajuste pequeno com regressão.
2. robots.txt: resposta HTML do fallback SPA, com 21 erros de sintaxe. Preparar resposta válida mantendo a política de homologação; a futura liberação de indexação exige decisão própria. Não buscar SEO 100 liberando rastreamento público por inferência.
3. Imagens, cache de terceiros, cerca de 57 KiB de JavaScript não utilizado e CSS bloqueante continuam oportunidades. Imagens YouTube no mobile ainda podem usar a variante maior conforme densidade de tela. Avaliar custo/benefício e qualidade; não remover validações, adicionar proxy/armazenamento ou tratar TTL de terceiros como configuração nossa. Economias Lighthouse são estimativas e não devem ser somadas como ganho garantido.

Esses resultados não medem CPU do Worker. Não repetir Lighthouse apenas para aumentar a nota; nova execução se justifica após correção relevante.

## TikTok — publicação real agora observada

Além do relato humano, uma leitura normal do feed público encontrou treze vídeos, incluindo o TikTok https://www.tiktok.com/@revistaarkade/video/7701828211558108434, criado às 20h16min49s de Brasília. Essa publicação ocorreu depois dos dois relatórios Lighthouse; não atribuir a ela os resultados desses relatórios. A leitura não consultou o provedor nem escreveu conteúdo; sessão/limites operacionais normais foram utilizados.

Foi solicitado ao proprietário confirmar o link, uso da homologação e reprodução no player. Até essa confirmação, a correlação com a tentativa relatada e a reprodução permanecem separadas da constatação do registro público.

### Fluxo que permanece em uso

- URL completa validada e normalizada. A prévia extrai @canal da URL sem consulta TikTok; não é nome de exibição verificado nem prova da existência do vídeo. Links curtos exigem resolução oficial antes desse fluxo.
- Ao enviar, o servidor consulta o endpoint oficial oEmbed com a URL canônica, sem cache positivo e sem retry automático. Confere resposta de vídeo, provedor/versão e ID quando presente. A [documentação oficial](https://developers.tiktok.com/docs/en/embed-videos) continua descrevendo esse endpoint.
- Sem evidência confirmada, recusa sem criar conteúdo nem gastar a cota de publicações. Um 429 aciona Retry-After ou espera local padrão de 60 segundos; a expiração apenas permite consultar novamente, sem garantir resposta favorável.
- Com evidência aceita, aplica regras existentes de publicação, jogo ativo, sessão, origem, duplicidade e limites. A exceção de formato TikTok já existente não comprova duração, classificação do conteúdo ou correspondência com o jogo.
- Reprodução usa o player oficial /player/v1/; não executa HTML devolvido pelo oEmbed no servidor. O aviso oficial sobre descontinuação da antiga modalidade Embed Videos foi registrado como acompanhamento, sem concluir que o endpoint de validação foi removido ou alterar a arquitetura nesta rodada.

Hashes de tiktok.ts, tiktok-availability.ts, video-preview.ts e decision.ts são idênticos aos do pacote anterior de batching. A opção A não afrouxou a validação TikTok; não há evidência de que retirar o ranking tenha corrigido o 429.

### O que explica o sucesso — e o que continua desconhecido

O fluxo existente consegue publicar quando recebe evidência válida da fonte. Retomada de disponibilidade/expiração de restrição temporária é compatível com os dados. Não capturamos a resposta upstream dessa tentativa, o IP/centro de execução ou CPU; não atribuir causa específica a excesso de testes, IP residencial, conta, ASN, horário ou ação do suporte. O verificador roda no Workers, portanto reiniciar o computador não é necessário para reiniciar a hospedagem nem garante mudar a condição vista pelo TikTok.

A espera local fica na memória da aplicação; o provedor pode aplicar limites próprios de duração e escopo desconhecidos. Ausência de consulta durante a espera não prolonga essa espera local; uma nova resposta 429 pode iniciá-la novamente. Não existe evidência de prazo oficial fixo de 24/48 horas para este incidente.

Vinte e um testes existentes de disponibilidade, publicação e metadados passaram com rede simulada, incluindo recuperação após espera, recusa de falhas, validação e ausência de repetição. Não representam novas publicações reais ou garantia de disponibilidade futura.

## Estado e próximos passos

Publicação TikTok: sucesso funcional real relatado e registro público observado. Substitui o estado antigo de nenhuma publicação confirmada. Causa do incidente: não identificada. Reprodução: aguarda confirmação específica. Estabilidade: acompanhar uso legítimo, sem testes em massa ou novas postagens artificiais. Relato técnico ao suporte permanece sem resposta técnica confirmada; não enviar mensagem adicional sem autorização.

Próximo pacote local de correções deve tratar os achados concretos de nomes acessíveis e robots.txt, mantendo homologação e segurança. Não há necessidade de retomar o ranking composto. Auditoria final, recuperação/custódia e CI/README/visibilidade continuam separados; nenhum lançamento autorizado por esta análise.

## Confirmação posterior do proprietário — publicação e reprodução

O link informado pelo proprietário corresponde exatamente ao vídeo público identificado: https://www.tiktok.com/@revistaarkade/video/7701828211558108434. Os parâmetros de pesquisa/rastreamento enviados não fazem parte da identidade canônica. O proprietário confirmou que o vídeo abriu e pôde ser assistido normalmente no player do Clipzone. Correlação e reprodução deixam de estar pendentes; o caso funcional de envio e reprodução TikTok está aprovado para este vídeo. Não é prova de reprodução em ambos os dispositivos nem garantia de disponibilidade futura. A causa do 429 anterior continua não identificada. Nenhuma nova postagem, consulta TikTok ou deploy foi realizado para registrar esta confirmação.

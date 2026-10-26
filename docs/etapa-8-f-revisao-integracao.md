# Etapa 8-F — revisão da integração iniciada

26/10/2026. Segue o [cronograma atualizado](cronograma-finalizacao.md). Revisão em andamento, sem aprovação de conclusão da 8-E, da Etapa 8 ou de lançamento. Site continua na homologação controlada já autorizada; não houve novo deploy nesta rodada.

## Conferência web efetivamente realizada

Seis GETs sem autenticação, sem cookie e sem gravação de conteúdo: HTTP raiz, HTTPS raiz, acesso direto a `/admin`, configuração pública da API, rota API inexistente e bundle JavaScript. Uma conferência adicional HEAD por outro cliente corroborou HTTP 200 na raiz sem redirecionamento. Os registros persistem somente status, caminho e cabeçalhos selecionados, sem valores de configuração do SDK ou credenciais.

| Item | Evidência | Situação |
| --- | --- | --- |
| HTTPS e acesso direto a `/admin` | HTTP 200 e HTML | Disponíveis; HTML público do app não concede privilégios administrativos |
| API separada da SPA | Configuração JSON 200; rota inexistente JSON 404 | Aprovado nesta amostra |
| Cache da API | `Cache-Control: no-store` | Preservado |
| Sessão do visitante | Código emite `__Host-`, Secure, HttpOnly, SameSite=Strict, Path=/; amostras anteriores válidas | Nenhuma nova emissão nesta rodada; não alegar nova prova de cookie recebido |
| HTTP sem TLS | Raiz HTTP retorna HTML 200 sem Location, confirmado por GET e HEAD | Pendência da 8-E antes do lançamento |
| Cabeçalhos estáticos | Sem CSP, X-Frame-Options, nosniff, política de referrer ou HSTS nas respostas observadas | Preparação local abaixo; remoto ainda inalterado |
| Cache do bundle com hash | Revalidação a cada uso (`max-age=0`) | Oportunidade de desempenho, não vazamento confirmado |

HTTP 200 para a página estática não comprova acesso indevido ao banco ou à administração. Porém, conteúdo servido por HTTP pode ser alterado em trânsito; não declarar transporte obrigatório como concluído apenas porque HTTPS funciona. Usuário deve continuar usando a URL HTTPS de homologação. HSTS só é aceito em resposta HTTPS e não transforma por si só a primeira visita HTTP em um redirecionamento seguro.

## Ajuste preparado somente localmente

`public/_headers` adiciona nosniff, referrer `strict-origin-when-cross-origin`, proteção contra enquadramento da própria aplicação (`DENY` e `frame-ancestors 'none'`), `base-uri 'self'`, `object-src 'none'` e HSTS de 1 dia, sem includeSubDomains/preload. A política não define allowlists de scripts, conexões ou frames dos players nesta rodada. Não foram adicionados COOP/COEP ou bloqueios amplos que alterariam popups e embeds sem validação.

`/assets/*` passa a ter cache de 1 ano com immutable, sob o contrato de que Vite gera os arquivos dessa pasta com hash de conteúdo. HTML e `/clipper/`, cujos nomes podem permanecer fixos, continuam revalidando. Não publicar arquivos sem hash sob `/assets/` sem rever essa regra. Nenhuma resposta autenticada ou JSON da API entra nesse cache.

Prova repetível: `node tests/runtime/run-static-headers.mjs <laboratório-externo-aprovado>`. Usa Wrangler 4.152.0 já instalado no laboratório, sem instalação de dependências no repositório. Cinco verificações locais passaram com assets fictícios: `/`, `/admin`, bundle com hash, imagem com nome fixo e API. A prova demonstra política/roteamento do runtime; não substitui login Google/TOTP e reprodução dos três providers após uma futura aplicação remota. Nenhum ajuste foi anunciado como já disponível no site.

O arquivo `_headers` é aplicado a assets. Não endurece automaticamente as respostas dinâmicas do Worker; estas continuam com a política própria existente. A cobertura de HSTS/headers da API precisa de revisão separada, incluindo respostas de erro e redirecionamento, sem copiar CSP desnecessariamente para JSON.

## Encaminhamento do transporte HTTPS

A documentação de `_redirects` aceita caminhos como origem e não oferece redirecionamento por domínio/esquema; não criar regra global para a mesma URL HTTPS que possa produzir loop. Encaminhar todos os assets ao Worker permitiria inspecionar o protocolo, mas mudaria a separação de tráfego estático e as franquias acordadas. Isso não foi aplicado ou presumido como aprovado.

Próxima parte: avaliar uma política de HTTPS no destino com prova local da alternativa e impacto mensurado nas franquias, antes de qualquer alteração de roteamento/infraestrutura. Se exigir mudança relevante do compromisso static-first/Free ou ação remota não aprovada, apresentar a proposta concreta ao proprietário. Não comprar domínio, criar serviço, mudar plano ou instalar ferramenta para resolver isso sem autorização.

## Demais pendências e limites

Mantidas as evidências anteriores: 650 testes Node e 30 provas workerd aprovados, Google/TOTP funcional confirmado pelo proprietário, curtida/retirada 8/6 ms e autorização administrativa 9 ms. Esses testes não foram repetidos sem mudança relevante na lógica. A nova prova estática tem escopo próprio. Restam CPU de publicação/comentário/moderação legítimos, lacunas das consultas administrativas, picos iniciais 12/15 ms, limitação TikTok 429, relevância/jobs e recuperação. Não usar corpos ou tokens do navegador para suprir as lacunas.

O checklist final PC/mobile/players e Lighthouse foi alocado à 9-A pelo cronograma novo; pendências de segurança/configuração conhecidas não foram adiadas com isso. PWA 8.5 ainda não iniciada. Auditoria 9-B.5 registrada, não executada: sem mudança de visibilidade, inspeção integral do histórico, correção de credenciais ou parecer antecipado sobre segurança do GitHub.

Fontes: [cabeçalhos de assets Workers](https://developers.cloudflare.com/workers/static-assets/headers/) e [limitações dos redirecionamentos](https://developers.cloudflare.com/workers/static-assets/redirects/). Evidência: [etapa-8-f-revisao-integracao.json](evidencias/etapa-8-f-revisao-integracao.json).

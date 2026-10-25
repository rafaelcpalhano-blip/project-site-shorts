# Etapa 8-B — compatibilidade do suporte existente a capas

Data: 25/10/2026. Base limpa `8d6a84b`. Decisão atual do proprietário: preservar o fluxo existente e deixar a publicação desta parte pendente; sem upload administrativo, R2, Firebase Storage ou outro armazenamento. Somente arquivos estáticos e URLs HTTPS autorizadas estão no escopo da avaliação. Nenhum código funcional alterado nesta rodada.

## Resultado objetivo

| Caminho existente | Evidência | Situação Workers |
| --- | --- | --- |
| `/images/games/nome.png`, JPG/JPEG/WebP | Validador e edição real preservam o caminho; asset PNG fictício retorna bytes exatos e `image/png` no workerd | Compatível quando o arquivo é incluído na publicação. Não envolve busca externa ou armazenamento novo |
| `images.igdb.com/igdb/image/upload/...` | Host/caminho específicos normalizados; edição real não chama inspetor externo | Caminho de edição compatível no ensaio. Exibição continua diretamente no navegador; disponibilidade externa, CSP e hotlink precisam de homologação posterior |
| Outro domínio público HTTPS | Validação sintática permite diferentes hosts; servidor usa DNS/IP pinado e TLS na inspeção | O transporte atual tem incompatibilidade já comprovada com Workers; nenhuma substituição aplicada |

Importante: **não há uma allowlist configurável de domínios externos no código atual**. A autorização específica já implementada é o caminho IGDB; demais hosts públicos passam por inspeção de segurança, não por cadastro prévio de fontes. Não confundir validação de rede com aprovação editorial do domínio. Nenhum novo domínio foi considerado autorizado por esta análise.

O diretório `public/images/games/` não existe nesta base. O código aceita o caminho, mas não confirma que o arquivo foi incluído no artefato. O ensaio utilizou um PNG temporário fora do repositório, não uma capa cadastrada ou uma imagem migrada dos dados locais. Para usar essa opção, um arquivo real deve ser incluído em `public/images/games/` e publicado junto dos assets. Não foram criadas capas nem alterados registros.

## Arquivos e contrato real

- `src/features/admin/components/ManualGameEditor.tsx`: campo de URL/caminho, confirmação e motivo; não tem upload.
- `src/lib/validation/manual-game-details.ts`: caminhos locais restritos e URLs reconhecidas; sem travessia ou esquemas ativos.
- `src/lib/validation/game-cover.ts`: somente host/caminho IGDB específicos, com normalização de tamanho.
- `src/lib/validation/external-game-cover.ts`: sintaxe de HTTPS público; não contém allowlist de fontes.
- `server/games/edit-manual-game.ts`: preflight e revisão atômica; chama inspetor só para HTTPS fora do caminho IGDB reconhecido; mantém ID, vínculos, revisão e auditoria.
- `server/games/remote-cover.ts`: DNS público e conexão pinada, redirects revalidados, timeout/tamanho/tipo/dimensões. Incompatibilidade `maxHeaderSize` reaproveitada das provas anteriores, sem repetir acesso externo.
- `server/http/admin-moderation.ts`: endpoint existente `/api/admin/games/edit`.
- `src/features/games/components/GameCover.tsx`: navegador carrega o endereço diretamente e exibe fallback em erro; não existe proxy novo.

## Impedimento adicional reproduzido: imagem ausente vira SPA

Na configuração local de Static Assets com fallback SPA, `/images/games/missing.png` devolveu status200 e HTML, mesmo com `Accept: image/png`. A imagem existente retornou corretamente. A primeira expectativa de404 no ensaio falhou; o teste agora registra explicitamente essa limitação observada, sem tratá-la como comportamento desejado. O `GameCover` mantém fallback visual em falha de imagem, mas a resposta HTTP incorreta dificulta diagnóstico/cache.

Isso foi medido na configuração de laboratório, não em um site publicado. A adaptação mínima proposta é reservar `/images/games/*` na composição Workers, validar o caminho permitido e impedir retorno de HTML nessa rota; inexistente ou tipo incompatível deve retornar404, mantendo navegação SPA para páginas. Considerar HEAD, GET, respostas condicionais e cache de assets. **Proposta ainda não implementada**, conforme pedido de aprovação prévia diante de impedimento.

## Adaptação mínima proposta para URLs externas

1. Manter o código e dados locais atuais intactos; não trocar silenciosamente o inspetor por fetch.
2. Para a composição Workers futura, preservar arquivos estáticos e o caminho IGDB existente. Não declarar publicação completa enquanto a edição de outros hosts estiver incompatível.
3. Se forem necessárias outras fontes autorizadas, obter lista exata de hosts/caminhos e política de redirects. Um adaptador específico via fetch só poderá aceitar essas fontes, revalidar cada destino, limitar bytes, prazo, formatos e dimensões, sem cookies/credenciais e sem redirects automáticos.
4. Essa adaptação muda o modelo de confiança: fetch por hostname não equivale à conexão pinada atual, e o limite de cabeçalhos do transporte Node também não é reproduzido automaticamente. A aceitação desse risco/escopo precisa ser expressa. Não há aprovação para reduzir domínios ou defesas nesta rodada.

O menor primeiro ajuste revisável é o roteamento de imagens ausentes. Nenhum serviço de armazenamento é necessário para ele. Para fontes adicionais, a decisão depende de quais fontes o proprietário considera autorizadas. Se estáticos e IGDB forem suficientes inicialmente, isso também precisa ser aceito explicitamente como escopo da homologação, sem remover o suporte genérico existente no ambiente local.

## Entrada e IP: desenho de homologação

Conservar `createWorkerEntry` com contexto confiável injetado e origem canônica configurada no servidor. O IP é insumo de cotas, nunca credencial administrativa. Não aceitar origem de `Host` encaminhado nem IP de X-Forwarded-For.

Para uma futura entrada direta Cloudflare, conferir requisição original e política real de ingresso: tráfego direto, subrequests na mesma zona, entre zonas e service bindings têm contextos diferentes. `request.cf` ou um cabeçalho isolado não são atestação universal. A documentação descreve IP fixo em subrequests entre zonas e alteração de endereço por Workers da mesma zona. Usar um endereço compartilhado como visitante individual poderia agrupar cotas indevidamente; não inventar IP alternativo a partir do cliente.

Matriz de homologação proposta: enviar cabeçalhos CF/XFF forjados de cliente comum, comparar IPv4/IPv6, observar requisição por outro Worker autorizado para teste, testar ausência de metadados e garantir erro controlado sem escrita quando contexto for incompatível. Registrar somente resultados sanitizados, não IP bruto. Não criar segundo Worker, regra WAF, service binding ou recurso nesta fase. A regra WAF documentada depende de zona e não deve ser presumida disponível no endereço gratuito `workers.dev`.

`workers.dev` permanece candidato para homologação gratuita, conforme decisão anterior. A documentação recomenda rota/domínio próprio para produção crítica; não há compra ou mudança de domínio autorizada. Isso não bloqueia o planejamento local.

## Validação e próximos passos

- 16 testes existentes de edição manual e capas aprovados, sem skips.
- 7 verificações de validação/edição executadas no workerd, com documentos fictícios.
- 1 asset PNG servido com bytes/tipo corretos; 1 comportamento de imagem ausente reproduzido como limitação.
- TypeScript estrito e lint do novo probe aprovados. Runner executado com sucesso após registrar corretamente o comportamento SPA observado.
- Sem build/Lighthouse/suíte completa repetidos: aplicação e interface não mudaram. Evidência: [JSON sanitizado](evidencias/etapa-8-b-contrato-capas-workers.json).

8-B segue aberta. Próximo trabalho sujeito à aprovação: corrigir somente a resposta de imagem estática ausente na composição local e, se solicitado, desenhar suporte a fontes externas exatas. Publicação permanece pendente. Não iniciar upload/armazenamento nem alterar arquitetura, infraestrutura, dados, players ou servidores5174/5175/8080.

## Fontes oficiais consultadas

- [Static Assets: precedência e execução do Worker](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).
- [Cabeçalhos Cloudflare: contexto de IP e subrequests](https://developers.cloudflare.com/fundamentals/reference/http-headers/).
- [Request e metadados cf](https://developers.cloudflare.com/workers/runtime-apis/request/).
- [WAF: campo de identificação de subrequests](https://developers.cloudflare.com/waf/custom-rules/use-cases/block-worker-subrequests/).
- [Finalidade e configuração de workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

As informações sobre armazenamento foram consultadas antes da resposta do proprietário e descartadas como direção de trabalho; nenhum serviço foi preparado. Não fazem parte da solução proposta.

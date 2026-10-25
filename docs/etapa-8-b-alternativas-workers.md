# Etapa 8-B — revisão das alternativas somente Workers

25/10/2026. Decisão expressa do proprietário: **manter apenas Workers e revisar as alternativas primeiro**. Preparação de entrada Node não autorizada e não executada. Não escolher solução para capas, reduzir funcionalidades, criar infraestrutura ou publicar nesta revisão.

## Requisitos atuais

Capas manuais aceitam diferentes domínios públicos HTTPS. Antes de salvar, o servidor valida URL, DNS público, família IPv4/IPv6, IP aprovado fixado na conexão, SNI/certificado TLS, redirects revalidados, limite de cabeçalho8192 bytes, imagem até500KiB, dimensões até2048 e prazo15s. A inspeção atual de imagem confere assinatura/cabeçalho/dimensões; não equivale a decodificação completa ou antivírus.

O requisito de migração é preservar essas proteções e o conjunto de funcionalidades, ou apresentar qualquer mudança de contrato para decisão. Compilar/importar o módulo não prova equivalência do transporte.

## Comparação

| Alternativa | Benefício | Limitação e decisão |
| --- | --- | --- |
|fetch nativo para URL externa arbitrária|Cliente HTTP suportado pelo Workers; permite streaming limitado e redirects manuais|Não fornece o lookup pinado atual. Checar DNS e depois chamar fetch pelo hostname não demonstra ausência de nova resolução/rebinding. Não aprovado como substituição equivalente.|
|node:http/node:https com nodejs_compat|Maior reaproveitamento aparente do código|Documentação exclui lookup/createConnection/maxHeaderSize e controles de TLS; falha maxHeaderSize já observada. Retirar opções não preserva as garantias. Descartado como adaptação direta.|
|Socket TCP/TLS com IP aprovado|Permite investigar conexão direcionada a IP e protocolo limitado|Destinos em IPs Cloudflare são bloqueados; não atende todos os domínios públicos aceitos. Também exige implementação/auditoria de HTTP, TLS, framing e limites. Não aprovado como solução geral.|
|fetch com cf.resolveOverride|Permite escolher hostname de origem em condições específicas|Só tem efeito quando host da URL e override pertencem à zona; não é pinning arbitrário de IP para terceiros. Não resolve o contrato atual no endereço gratuito workers.dev. Não criar DNS/CNAME dinâmico para contornar.|
|Fontes de capa explicitamente confiáveis, com fetch restrito|Adaptação menor dentro do Workers; mantém edição por link para fontes aprovadas|Reduz os domínios aceitos e troca o modelo de segurança. Exige aprovação, lista exata de hosts/caminhos, redirects também restritos e revisão de risco DNS; não alegar equivalência ao pinning. Nenhuma lista ativada.|
|Upload validado para armazenamento controlado|Evita que o backend precise buscar uma URL arbitrária; mantém Workers como runtime da API|Muda o fluxo administrativo de colar URL para enviar arquivo. Armazenamento como R2 exige serviço/bucket, política de acesso, limites, retenção e avaliação de custos/billing. Está apenas em análise; R2 não é Workers puro sem recursos adicionais.|
|Capas empacotadas como Static Assets|Sem busca arbitrária de URL no backend e sem bucket dinâmico|Troca de capa exige processo de preparar/publicar assets; não substitui a edição administrativa dinâmica atual. Não adotado como fallback silencioso.|

## Conclusão da revisão

Não foi encontrada **uma solução comprovada**, apenas com as APIs examinadas de Workers, que aceite todos os domínios externos atuais e preserve a mesma conexão HTTP com IP pinado. Isso não é afirmação de impossibilidade universal; é o limite demonstrado/documentado desta revisão.

A alternativa mais promissora para manter o objetivo de segurança sem busca arbitrária no servidor é estudar **upload administrativo validado e armazenamento controlado**. É recomendação de desenho, não implementação nem autorização de R2/cobrança. Para manter somente Workers sem armazenamento adicional, uma lista de fontes confiáveis é mais simples, mas reduz funcionalidade e muda a garantia de segurança; precisa de aceitação explícita.

Não usar: proxy público de imagens, fetch irrestrito, aceitar imagem só porque abre no navegador, desativar validação, trocar automaticamente para outro serviço ou ocultar a falha. Capas existentes não foram removidas, regravadas ou migradas.

## O que pode continuar sem essa decisão

Provas locais do restante da API Workers: leituras em lote, credencial fictícia ausente/renovada, certificados X.509 e revogação/MFA, fronteira de IP confiável, assets versus /api e orçamento de retry/OAuth/CPU. Isso não autoriza habilitar a edição de capas no destino nem avançar publicação com uma funcionalidade sabidamente incompatível.

A API em uso, os dados do emulador, os players e as alterações de lote já validadas permanecem intactos. A 8-B continua aberta; 8-C e deploy aguardam os gates próprios.

## Evidência e validação desta revisão

Corrigida uma fixture do ensaio de DNS privado: `.test` era recusado pela validação de URL antes de chamar o resolvedor. Agora usa hostname sintaticamente permitido e verifica exatamente uma chamada ao resolvedor e zero ao transporte, comprovando que o IP privado foi de fato recusado. Somente teste alterado. As14 verificações workerd foram repetidas e concluídas; deployReady continua false. Evidência sanitizada atualizada. Lint do probe e diff-check aprovados. Sem build/Lighthouse/suíte completa porque código funcional não mudou nesta revisão.

## Fontes primárias

- [HTTP Workers: opções não suportadas](https://developers.cloudflare.com/workers/runtime-apis/nodejs/http/).
- [HTTPS Workers: diferenças de TLS/socket](https://developers.cloudflare.com/workers/runtime-apis/nodejs/https/).
- [TCP sockets: destinos bloqueados](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).
- [Request.cf.resolveOverride: restrição à zona](https://developers.cloudflare.com/workers/runtime-apis/request/).
- [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).
- [R2: configuração inicial](https://developers.cloudflare.com/r2/get-started/) e [preços/franquias](https://developers.cloudflare.com/r2/pricing/). Não presumir gratuidade permanente ou elegibilidade da conta sem revisão; nenhuma conta foi consultada.

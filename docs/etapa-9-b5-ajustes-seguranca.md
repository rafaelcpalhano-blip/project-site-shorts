# Etapa 9-B.5 — ajustes locais de segurança

Data: 27/10/2026. Base anterior aos ajustes: `ef997d319995405bbc33b0be96f5a10852114b77`.

## Escopo e resultado

Preparação local autorizada para futura divulgação do código. O repositório continua privado. Nenhum commit, push, deploy, alteração de configuração do GitHub/Firebase/Cloudflare, acesso novo a credenciais privadas, reescrita de histórico ou mudança de plano foi realizado nesta correção.

O parecer inicial da auditoria permanece como registro do estado anterior; este documento registra a remediação. A ausência de achados não garante ausência de vulnerabilidades ou segredos.

## Correções

- Firebase CLI atualizado de 15.34.0 para 15.34.1. O runtime do site não recebeu novas dependências.
- Lockfile atualiza body-parser 1.20.8 → 1.20.9, body-parser transitivo 2.3.0 → 2.4.0 e fast-uri 3.1.8 → 3.1.9.
- Overrides limitados à árvore do Firebase CLI: Pub/Sub usa @opentelemetry/core 2.8.0 em lugar de 1.30.1; gaxios usa uuid 11.1.1 em lugar de 9.0.1. Estas duas mudanças de versão principal exigem manter os testes específicos de compatibilidade. Override preexistente de @grpc/grpc-js preservado.
- Instalação isolada reproduzida com npm ci e scripts desabilitados. Instalação no checkout manteve conteúdo JSON idêntico ao lockfile testado; a diferença de hash bruto era somente formatação/final de linha.
- Gitignore reforçado para .dev.vars, chaves privadas, arquivos de identidade e diretórios de credenciais, backups, exportação e estado do Wrangler. Exemplos públicos continuam permitidos. Isso não remove arquivos já presentes no histórico.
- Verificador local sem dependências adicionais examina arquivos rastreados e não ignorados; opção --history examina blobs alcançáveis e mensagens de commit. Relata caminhos/códigos/linhas/hashes, sem imprimir valores encontrados nem validar credenciais em provedores.
- Testes verificam nomes sensíveis, redaction, gitignore e limites do workflow. A ferramenta não substitui revisão humana, scanner especializado ou varredura nativa do GitHub; não cobre conteúdo visual de binários, arquivos ignorados, objetos apagados/inacessíveis ou anexos fora do Git.
- Workflow preparado para testes, build, lint, auditoria de dependências e varredura de segredos. Actions oficiais fixadas por SHA, token somente de leitura, credenciais Git não persistidas, sem deploy, segredos de provedores ou pull_request_target. Só executará após push autorizado; ainda não foi validado em um runner GitHub. Conferir franquia gratuita de Actions antes de enviar. A suíte Firestore permanece uma verificação separada com Java 21 e emulador; não integra esse workflow inicial.
- README atualizado para arquitetura e pendências reais; SECURITY.md documenta o canal público de relatos e o processo seguro de revisão. Nenhuma licença de redistribuição foi concedida automaticamente.

## Regressões e integração

Os testes específicos exercitam o CLI em perfil temporário, o propagador W3C usado pelo Pub/Sub, o multipart/UUID usado pelo gaxios e a rejeição de gzip malformado nas duas linhas do body-parser. Não exigem credenciais ou consultas aos provedores.

A suíte Firestore encontrou cinco testes antigos usando acesso direto substituído pelo cliente HTTP público. Uma execução da versão anterior das dependências reproduziu ERR_INVALID_URL em /api/session. A correção altera somente o transporte dos testes: agora passam pelo cliente HTTP e pela API real com store REST do emulador. As asserções originais de campos, catálogo, deduplicação, cotas e negação de acesso privado foram preservadas. Nenhum endpoint, regra Firestore ou código da aplicação foi afrouxado. Uma referência restante foi corrigida após a rodada de 140/141; o resultado final está na evidência desta etapa.

Validações finais e contagens estão em `evidencias/etapa-9-b5-ajustes-seguranca.json`. Emulação usa exclusivamente o projeto demo-clipzone-tests e a porta 8081, sem ler o banco remoto e sem interromper o emulador de desenvolvimento.

## Pendências antes de tornar público

1. Decisão do proprietário sobre e-mail pessoal em documentação histórica e e-mail de autoria dos commits. Limpar o documento atual não apaga versões antigas. Não houve autorização para reescrever o histórico ou substituí-lo.
2. Conferência de proveniência dos assets concluída no escopo documentado em [inventário dos assets](etapa-9-b5-assets.md), sem impedimento de licença de asset copiado confirmado e sem certificação de exclusividade. Reavaliar qualquer asset novo antes da divulgação. O objetivo declarado é avaliação profissional do código; não foi escolhida uma licença ampla de reutilização. A ausência de uma licença de código aberto não impede, por si só, a visibilidade pública para avaliação. Não adicionar licença genérica sem decisão própria. Referência: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository.
3. Quando autorizado o push, confirmar execução do workflow no GitHub e verificar controles gratuitos disponíveis de secret scanning, push protection, dependências e branches. O workflow não habilita essas configurações automaticamente.
4. Repetir varredura no snapshot exato de publicação, incluindo novos arquivos e superfícies fora do Git indicadas pelo proprietário. Valores públicos de configuração Firebase não são substitutos para autorização no backend.
5. Receber autorização específica para mudar visibilidade. Esta preparação não autoriza tornar público nem lançar o site.

TikTok, tradução, CPU e renovação automática do ranking continuam em suas trilhas próprias. Estes ajustes não constituem solução ou aprovação dessas funcionalidades.


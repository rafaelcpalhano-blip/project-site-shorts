# Etapa 8-B — provas locais de runtime e API

Data: 25/10/2026. Status: primeira parte concluída; 8-B continua em andamento, com os bloqueios de transporte e orçamento demonstrados. Não iniciar 8-C nem apresentar a composição atual como pronta para publicação.


> Atualização posterior na mesma8-B: os valores20/34/65 abaixo são a baseline anterior ao lote. Implementação e novas medições9/12/21, além do cenário misto43/45, em [leituras em lote](etapa-8-b-leituras-em-lote.md). Restam transporte e orçamento com retry/OAuth/CPU; não declarar etapa concluída.

## Ponto de recuperação

Base limpa: commit `9782f90a2fb956091c36f032df68264fb684b4da` (8-A), já presente em main e origin/main na verificação. Nenhum commit novo executado automaticamente.

Cópia independente: `C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/backups/etapa-8-b-20261025/`.

- `repository.bundle`: histórico completo e referências, 7.052.073 bytes; `git bundle verify` aprovado.
- `source.zip`: código versionado do mesmo commit, 2.002.428 bytes.
- `verification.json`: SHA-256, tamanhos, commit e verificação da restauração.
- `restore-check/`: clone independente do bundle; HEAD idêntico e `git fsck --full` aprovado.
- `RECOVERY.md`: recuperação em pasta separada, sem reset destrutivo ou sobrescrita do projeto.

Esse ponto cobre código e histórico. Não equivale a uma exportação nova do emulador. Arquivos locais ignorados, dados, credenciais, sessões e backups anteriores permaneceram separados e intactos. Nenhum seed, reset, escrita de fixture ou limpeza no banco em uso.

## Ferramenta e isolamento

O proprietário autorizou expressamente instalar a ferramenta oficial em pasta isolada, por resposta no chat. Instalados Wrangler **4.152.0** e workerd **1.20261019.1** exclusivamente em `C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/runtime-lab-8b/`, com lockfile próprio. Nenhuma alteração em package.json/package-lock.json/node_modules do Clipzone.

Execução `local: true`/`forceLocal: true`, bind 127.0.0.1:8798, sem bindings remotos, conta, login, deploy ou criação de infraestrutura. Configuração/estado/evidência ficam no laboratório; não são configuração de produção. O runner não carrega arquivos .env do projeto e usa somente segredos/tokens/chaves RSA fictícios, gerados para o ensaio. A única consulta DNS usa domínio reservado `.test`; chamadas de autenticação e Firestore são simuladas. Servidor temporário encerrado pelo runner em finally. Nenhuma intervenção nos serviços 5174/5175/8080.

## Evidências

### Contratos existentes em Node

58 testes relacionados aprovados, sem falha/skip:

- admin-auth: assinatura, UID autorizado, TOTP, revogação/conta atual, proteção de endpoints;
- network-security: IPv4/IPv6, IP fornecido pelo transporte, limites persistidos e retenção;
- remote-game-cover: DNS misto/privado, pinning/TLS, redirects, tamanho/formato/dimensões, timeout e concorrência;
- submission-http, public-api, public-read e ordered-feed-concurrency: origem, sessão, DTOs, paginação, visibilidade atual, ordem e falhas sem resposta parcial.

São evidências do comportamento existente em Node; não foram rotuladas como aprovação do Workers.

### Runtime Workers real, executado localmente

14 verificações concluídas em `tests/runtime/worker-probe.ts`. Resultado sanitizado em [evidência JSON](evidencias/etapa-8-b-runtime.json).

Confirmados: node:net para IPv4/IPv6, verificação RSA-SHA256/SPKI e bloqueio de assinatura falsa/UID fora da lista/TOTP ausente, chamada simulada para estado atual da conta, cookie HMAC WebCrypto e validação posterior, origem estrangeira rejeitada, cabeçalhos de IP incapazes de substituir contexto confiável, API inexistente 404 e recusa de DNS privado antes da transferência.

**Divergência em relação ao inventário documental:** a [documentação DNS](https://developers.cloudflare.com/workers/runtime-apis/nodejs/dns/) informa lookup não implementado, mas esta combinação de Wrangler/workerd respondeu `queryA ENOTFOUND cdn.example.test`. Isso mostra que o caminho de consulta foi executado nesta versão local; não comprova equivalência do transporte ou comportamento no edge remoto. A conclusão anterior de indisponibilidade absoluta de lookup não deve ser tratada como observação deste runtime.

**Bloqueio concreto de capas:** a execução da função atual `readPinnedCover` no workerd falhou com `The options.maxHeaderSize option is not implemented`, antes de qualquer fetch de capa. Nenhuma opção foi removida para fazer o teste passar. As diferenças de socket/TLS/SNI documentadas também continuam sem prova de equivalência. Referência: [HTTPS no Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/https/).

A prova considera a detecção desse bloqueio um resultado esperado, mas devolve expressamente `deployReady: false`. Os 14 checks verdes não são 14 funcionalidades de produção homologadas.

### Orçamento do feed com o adaptador REST existente

Quatro testes novos em `tests/runtime-read-budget.test.mjs`. API real composta com sessão assinada, limiter persistido e `createRestStore`; todas as requisições de fetch são interceptadas e validadas para projeto/credencial fictícios. Sem Google real, emulador ou registros locais.

| Cenário de uma leitura latest | Chamadas REST observadas | Resultado |
| --- | ---: | --- |
| 15 vídeos visíveis, mesmo jogo | 20 | 15 cards e cursor preservados; jogo lido uma vez |
| 15 vídeos visíveis, jogos distintos | 34 | 15 cards na ordem correta e cursor preservado |
| 30 candidatos publicados, 30 jogos ocultos distintos | 65 | zero cards, limited=true e continuação; não alegar fim do feed |
| mesmo caso, transporte com teto simulado de 50 | mais de 50 tentativas | HTTP503/no-store genérico; sem sucesso parcial nem erro privado |

Os 65 incluem 2 consultas + 30 releituras de shorts + 30 releituras de jogos + 3 chamadas do limiter. Excluem renovação OAuth, retries e outros custos de runtime. O Workers Free documenta [50 subrequests por invocação](https://developers.cloudflare.com/workers/platform/limits/): portanto a composição atual não cabe no pior caso. O teste de teto é simulação de falha do transporte, não medição da fiscalização de quota no edge.

Não corrigir removendo revalidação de jogo/vídeo, ignorando candidatos ocultos, cortando o limite de forma a perder cursor ou burlando o limiter. Um adaptador de leitura em lote deve preservar visibilidade atual, ordem e continuação e demonstrar orçamento inclusive com falhas/renovação de token.

## Validações desta rodada

- 58 testes existentes relacionados + 4 novos testes de orçamento: aprovados.
- 14 verificações no workerd local: concluídas, incluindo detecção explícita dos bloqueios.
- TypeScript do probe e seus imports: aprovado com tsc --ignoreConfig --noEmit, strict e NodeNext.
- ESLint do novo probe, sintaxe do runner e git diff --check: aprovados.
- Não houve alteração de código executado pelo site; build, Lighthouse e testes manuais não repetidos.

## Continuação da 8-B

1. Resolver a decisão de transporte antes de implementar a composição remota. Alternativas para avaliar: adaptador Workers com equivalência demonstrada de DNS/IP/TLS/limites; ou runtime Node para a API, preservando o mecanismo existente. A primeira exige prova adicional de sockets/TLS e leitura HTTP limitada; a segunda exige revisar hospedagem/origem/rotinas/custos. Não escolher serviço pago, criar recurso, separar origens ou reduzir funcionalidade sem apresentar impacto ao proprietário.
2. Projetar leituras REST em lote para o caso medido e testar snapshot/cursor, moderação concorrente, deduplicação, orçamento e falha sem página parcial. Não substituir as transações de cota por cache em memória.
3. Acrescentar provas com certificados X.509 reais de fixture (esta rodada usa SPKI), conta revogada/MFA removido no runtime escolhido, inicialização sem credenciais e renovação OAuth fictícia. Sem login/credenciais reais.
4. Comprovar a entrada completa e o contexto confiável de IP do ambiente escolhido. Hoje o probe fornece esse contexto explicitamente; não é um adaptador de edge pronto.
5. Orçar CPU, subrequests com retry/renovação, e segmentação de ranking/retenção; local não certifica os limites reais da conta. Jobs continuam para 8-D, com requisito de compatibilidade transportado.

Nenhuma ação manual do proprietário é necessária neste ponto. Os commits podem aguardar seu retorno; não criar dependência entre a continuidade técnica e o commit manual. Publicação/banco remoto permanecem para os gates próprios. PWA segue somente após Etapa8.

## Reexecução direcionada

Na raiz do repositório, com o laboratório autorizado já instalado:

```powershell
node --test tests/runtime-read-budget.test.mjs
node tests/runtime/run-worker-probe.mjs "C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/runtime-lab-8b"
```

O runner não instala ferramenta automaticamente, exige a versão registrada e encerra a instância temporária. Não usar wrangler dev --remote/deploy nem fornecer arquivos de segredo para executar essa prova.

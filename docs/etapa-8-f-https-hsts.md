# Etapa 8-F — HTTPS no domínio .dev e pacote estático preparado

26/10/2026. **Retificação da interpretação anterior:** HTTP 200 no curl confirmou ausência de redirecionamento no servidor, mas não demonstra tráfego HTTP desprotegido em navegadores que aplicam o preload HSTS do TLD `.dev`. Não é necessário encaminhar todos os assets ao Worker para resolver essa hipótese no navegador compatível.

## Evidências e limites

- A Google Registry confirma que `.dev` integra a lista HSTS pré-carregada, cobrindo seus subdomínios. O endereço `www.clipzone.workers.dev` está sob esse TLD. Essa proteção não depende da primeira visita ao site ou de cadastro individual do Clipzone na lista.
- No navegador in-app disponível, abrir explicitamente `http://www.clipzone.workers.dev/` terminou em `https://www.clipzone.workers.dev/`, com o clipe do proprietário visível no feed. Não houve interação com login nem alteração de conteúdo.
- O perfil de navegador usado já existia. O teste confirma a navegação final HTTPS, mas não separa preload de eventual política dinâmica armazenada ou outra promoção de HTTPS. A cobertura da primeira visita é sustentada pela fonte oficial do registro, não por alegação de perfil recém-criado.
- Clientes sem implementação/lista HSTS compatível, ferramentas de linha de comando e clientes com políticas desativadas ainda podem obter a página por HTTP. Esses clientes devem usar a URL HTTPS explicitamente. Não alegar bloqueio HTTP universal do servidor.
- O teste anterior de HTTP 200 é mantido como evidência bruta. Sua classificação como impedimento obrigatório para os navegadores compatíveis foi corrigida, sem apagar o histórico da análise.

## Caminho recomendado

Preservar o endereço gratuito e a divisão atual: assets servidos diretamente e API executada pelo Worker. Não ativar `run_worker_first=true` globalmente, não criar serviço adicional e não comprar domínio para suprir uma proteção de navegador já coberta pelo TLD.

| Alternativa | Efeito | Decisão nesta rodada |
| --- | --- | --- |
| Static-first atual + preload `.dev` | Navegadores compatíveis usam HTTPS; assets mantêm a separação da franquia de execuções do Worker | Recomendada e preservada |
| Worker antes de todas as requisições | Permite tratar protocolo de todos os caminhos na aplicação; assets também passam a invocar o Worker | Não aplicada; desnecessária para corrigir a hipótese atual e altera a contabilidade acordada |
| Domínio próprio e políticas de zona | Exige outro domínio/configuração e nova análise de custo, Auth e URLs | Fora do escopo; nenhum domínio adquirido/configurado |

Não se trata de trocar segurança por gratuidade: a decisão usa a proteção existente no ambiente de navegação suportado. Se no futuro houver domínio fora de um TLD preloaded ou necessidade de clientes genéricos sem HSTS, rever a política antes de afirmar equivalência.

## Pacote de cabeçalhos/cache

Preparação concluída e revisável: somente `_headers` adicionado a uma cópia isolada dos assets existentes. Os 35 arquivos do `dist` permanecem byte a byte idênticos; nenhum código da API alterado, nenhuma rotação das oito credenciais, nenhum ajuste de origem/roteamento, jobs ou plano. Verificação de valores privados nos assets aprovada, sem imprimir segredos.

O pacote mantém as cinco provas locais da rodada anterior: HTML e `/admin` revalidam, `/assets/*` com hash recebe immutable, imagens estáveis do Clipper revalidam e API mantém no-store. Inclui proteção contra enquadramento da aplicação, nosniff, política explícita de referrer e HSTS de 1 dia como defesa adicional. HSTS próprio não substitui a explicação do preload nem é aplicado automaticamente às respostas dinâmicas da API pelo arquivo estático.

**Não aplicado remotamente.** A revisão automática de aprovação rejeitou o comando antes de sua execução: considerou que o deploy específico de cabeçalhos/cache ainda precisava de autorização explícita. Nenhum retry ou caminho alternativo foi usado para contornar a rejeição. O site permanece com a versão anterior.

Solicitação concreta para o proprietário: autorizar exclusivamente o deploy desse pacote estático já testado para a homologação controlada em `https://www.clipzone.workers.dev`, mantendo API, roteamento, credenciais, dados, jobs desligados e planos gratuitos. Isso não autoriza lançamento público, PWA, alteração do GitHub, permissões, regras ou índices. Após autorização: conferir cabeçalhos/validação de cache no destino e encaminhar prova funcional de login/players afetados, mantendo os critérios de suspensão existentes.

## Estado da etapa

A hipótese de que seria necessário mudar a arquitetura para proteger a primeira navegação dos browsers compatíveis foi encerrada com evidência. A publicação dos cabeçalhos está pendente de aprovação específica; as outras pendências de CPU, ações válidas, provider TikTok, ranking e recuperação continuam na 8-F. Etapa 8, PWA 8.5 e lançamento não foram marcados como concluídos. Auditoria GitHub 9-B.5 permanece futura.

Fontes: [Google Registry — segurança de .dev](https://www.registry.google/domains/dev/), [roteamento de assets Workers](https://developers.cloudflare.com/workers/static-assets/binding/) e [limitações de redirects](https://developers.cloudflare.com/workers/static-assets/redirects/). [Evidência sanitizada](evidencias/etapa-8-f-https-hsts.json).

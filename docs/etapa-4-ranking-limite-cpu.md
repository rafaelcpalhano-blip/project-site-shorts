# Etapa 4 — Rodada final local de CPU e decisão de entrega

## Decisão objetiva

A rodada local foi encerrada. A candidata reduziu chamadas e melhorou o início da execução, mas não demonstrou margem estável abaixo de dez milissegundos. Não há aprovação de ativação permanente nem justificativa para continuar uma sequência indefinida de ajustes/deploys. É necessário discutir o modo de entregar esta funcionalidade e finalizar o projeto.

Isso não prova impossibilidade matemática de atingir dez milissegundos com outra implementação. Significa que, no caminho atual e com as evidências disponíveis, não é responsável garantir a meta ou tratar o ranking automático como pronto. O limite diz respeito à manutenção automática do ranking; o site e suas demais funcionalidades não foram declarados inviáveis.

Nenhum dado remoto, credencial real, plano, IAM, cron, workflow GitHub ou deploy foi alterado nesta rodada. O último estado remoto conhecido continua sendo ranking/jobs desligados na versão df8da48f-975f-47a5-9424-4d2476f4a0fc. Esse estado não foi consultado novamente. O checkpoint privado incompleto do último piloto permanece pendente.

## Candidata implementada localmente

1. A verificação de capacidade e o início da geração passam a poder compartilhar uma única transação. A consulta retorna somente IDs de até seis gerações, no snapshot da mesma transação; a reserva de admissão e construção é confirmada junta.
2. Permanecem o teto de seis gerações, espera negativa de quinze minutos, reservas e limites diários, validação de lease/época/revisão e publicação apenas ao concluir. Falha de consulta ou orçamento combinado insuficiente não deixa reserva parcial.
3. A época do snapshot acompanha o primeiro lote de jogos. Somente snapshots do ranking aceitam até dezesseis documentos; leituras correntes e transacionais continuam limitadas a quatro. Sem fallback para leituras atuais quando um lote falha.
4. O caminho de espera negativa foi refinado para não reler metadados de construção: quatro chamadas/quatro documentos, com nenhuma escrita. A melhoria não depende de remover autenticação, guardar tokens no banco ou abrir rotas de manutenção.
5. Mantida a seleção de quinze por jogo compartilhada com o top geral e intervalo previsto de 45 minutos.

Comparação local minificada com o protótipo imediatamente anterior, usando uma resposta OAuth simulada por invocação. Os resultados e os passos coincidiram:

| Cenário | Chamadas antes → depois | Etapas críticas antes → depois |
| --- | --- | --- |
| Dez vídeos/oito jogos com proteção do piloto | 37 → 31 | Início 13 → 9; coleta 11 → 9 |
| Cem vídeos em cem jogos, modo automático | 97 → 78 | Início 11 → 7; primeira coleta 10 → 7 |

São contagens de protocolo, não milissegundos de CPU. A proteção do piloto permanece nas medições que a incluem. Não foi retirada da homologação para favorecer os resultados.

## Medição local de CPU

Foram comparados processos workerd isolados, bundles minificados e a mesma chave RSA descartável de 2048 bits por par antes/depois. O Firestore/OAuth simulados ficam no processo host, fora do processo cuja CPU foi contada. Cada lote medido tem cem invocações; duas medições por caso e duas ordens dos pacotes totalizam 3.200 invocações medidas.

A métrica é a diferença de TotalProcessorTime do processo Windows workerd, incluindo runtime/ponte locais e todos os seus threads. Não equivale à CPU faturada pela Cloudflare. Não reproduz TLS/Firestore reais, inicialização completa do isolate, hardware do provedor ou distribuição de CPU por invocação. Aplicação nova significa criar a aplicação/assinador novamente após aquecimento do runtime, não cold start completo.

| Cenário | Faixa das médias de lote antes | Faixa das médias de lote depois |
| --- | --- | --- |
| Aplicação nova: início | 10,00–12,34 ms | 7,66–9,69 ms |
| Aplicação nova: coleta | 9,69–12,03 ms | 9,38–10,78 ms |
| Token reutilizado: início | 9,22–10,31 ms | 5,94–6,72 ms |
| Token reutilizado: coleta | 7,19–9,53 ms | 6,88–8,44 ms |

O início melhorou nas duas ordens. A coleta com aplicação nova não demonstrou redução estável e teve médias acima de dez milissegundos na ordem inversa. Médias próximas do teto tampouco provam que cada invocação ou os percentis altos respeitem o limite. Os números não autorizam dizer que a candidata cabe com folga no Free.

Essas medições ocorreram antes do pequeno refinamento posterior do caminho de espera por backlog; não certificam CPU do arquivo final byte a byte. Esse refinamento foi coberto por nova validação funcional. Não se repetiu outra rodada de performance para prolongar a busca depois que o critério de margem já falhou.

## Verificação funcional

- Estado local final: 880 testes gerais, 36 direcionados e oito no emulador Firestore aprovados. Os direcionados estão incluídos na suíte; não somar como testes únicos extras.
- Concorrência com cinco gerações não passa de seis nem duplica reserva. Inserção concorrente na coleção depois da consulta força revalidação; a nova capacidade é conferida antes de confirmar.
- Resposta duplicada, fora do escopo ou acima do limite falha sem escrita. Capacidade anunciada sem porta transacional não vira consulta fora da transação.
- Orçamento combinado insuficiente, consulta malsucedida ou espera ainda vigente não deixam lease/construção/reserva parcial.
- Emulador real confirmou consulta transacional, concorrência e proibição de leituras depois de gravações.
- Tipos e lint aprovados. Nenhuma nova versão remota foi preparada como aprovada para ativação.

Uma simulação diária intermediária apontou releituras extras durante a espera por capacidade; o caminho foi corrigido e verificado em teste específico. Não usar os números intermediários como economia diária certificada da versão final. A limitação de capacidade de limpeza em cenários com muitos jogos, descrita no relatório de 45 minutos, também continua aberta.

## Alternativas para decidir a entrega

### A — Finalização mais rápida: usar a ordenação existente por curtidas

Manter o feed, filtros por jogo e ordenação Mais Curtidos já existentes. O ranking composto e seu cálculo periódico deixam de ser requisito desta entrega; o algoritmo/código podem continuar documentados para evolução posterior. Isso evita um novo agendador e suas credenciais, mas muda a funcionalidade prometida. Exige aceite explícito do proprietário e verificação da interface antes de publicar. Não foi implementado automaticamente.

### B — Preservar o algoritmo: estudar um job Node externo

Mover somente o cálculo/limpeza do ranking para um job Node, mantendo site/API na Cloudflare e banco no Firebase Spark. GitHub Actions é um candidato por já fazer parte do projeto e do plano de portfólio: runners padrão em repositórios públicos são gratuitos; no GitHub Free privado há franquia publicada de 2.000 minutos por mês. Isso não certifica a conta atual nem autoriza consumo pago. [Regras de uso e franquias](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

A execução Node não teria a cota de CPU do Worker que serve o site. Ainda precisaria de teste da duração real, limite compartilhado de minutos, ausência de artefatos/cache desnecessários e bloqueio antes de gastos adicionais. O custo Firestore, o controle de retenção, os snapshots e a recuperação continuam necessários; mudar o executor não resolve sozinho o orçamento diário ou a capacidade de limpeza.

O agendamento pode atrasar/perder execuções e, em repositório público, pode ser desativado após sessenta dias sem atividade. Portanto, são necessários estado de última atualização e comportamento definido quando o ranking estiver atrasado; não prometer cadência exata. [Limitações oficiais de schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

A autenticação com o Google precisa de desenho próprio e aprovação. É preferível avaliar federação/OIDC com tokens curtos e confiança restrita ao repositório/branch, em vez de copiar automaticamente a chave existente para outro provedor. A compatibilidade/configuração Google e seu impacto precisam ser verificados antes de adotar. [Visão oficial de OIDC](https://docs.github.com/en/actions/concepts/security/openid-connect).

Não tornar o repositório público antes da auditoria/README combinados para obter essa gratuidade. Não foram criados workflow, secret, identidade, federação, recurso externo ou alteração de plano. Um protótipo local seria o próximo passo somente se essa opção for escolhida.

### O que não resolve automaticamente

Apenas aumentar o intervalo entre atualizações reduz frequência, não a CPU por execução. Cloudflare Workflows Free também publica limite de dez milissegundos e não é uma substituição gratuita já comprovada para este problema. [Preços/limites de Workflows](https://developers.cloudflare.com/workflows/reference/pricing/).

## Recomendação

Para a prioridade de finalizar rapidamente com menor mudança operacional, a opção A é a mais direta. Se preservar o algoritmo de relevância for requisito, avaliar B com um protótipo curto e critérios de custo/segurança antes de qualquer configuração remota. Não continuar refatorando por tempo indefinido nem ativar cobrança. A escolha de funcionalidade/arquitetura cabe ao proprietário; nenhuma das opções foi aplicada.

TikTok permanece uma pendência independente e não é resolvido por essa decisão.

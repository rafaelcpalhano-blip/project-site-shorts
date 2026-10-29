# Etapa 4 — Perfil local do consumo restante do ranking

## Conclusão

O diagnóstico indica dois focos para o próximo protótipo: autenticação quando a aplicação precisa obter um token novo e custo de transporte/codificação das chamadas Firestore. O cálculo de pontuação não apareceu como foco dominante. Há oportunidades de otimização, mas ainda não existe evidência suficiente para garantir funcionamento abaixo de 10 ms no Workers Free.

Esta etapa não modificou código da aplicação: os hashes dos 107 arquivos TypeScript do servidor continuam iguais aos do pacote otimizado. Nenhum deploy, credencial real, consulta remota, cron, IA ou alteração de infraestrutura foi executado. O estado remoto conhecido continua sendo o encerramento do piloto anterior, com ranking/jobs desligados; não foi consultado novamente aqui.

## Método

Ferramentas já instaladas no laboratório isolado: Miniflare/workerd, esbuild, V8 Profiler via inspector de loopback e biblioteca de source maps. Nenhuma instalação. O Firestore simulado foi executado no processo host, fora do Worker amostrado, evitando atribuir a ele o custo do servidor de teste.

O teste usa dez vídeos/oito jogos sintéticos, a composição real createCloudflareApplication, assinador RSA e fornecedor de token reais do código, e respostas OAuth/Firestore simuladas. A chave RSA de 2048 bits foi gerada exclusivamente para o ensaio; nenhum arquivo de credencial real foi aberto. Toda chamada do Worker é interceptada pela fixture, sem fallback para rede externa.

Cenários:

1. Aplicação e assinador novos em cada invocação, incluindo importação da chave e assinatura da requisição OAuth.
2. Aplicação reutilizada, com token válido em memória.
3. Execução direta das mesmas operações de ranking/Firestore com token sintético, separando composição/autenticação.

Quarenta invocações perfiladas por fase (início, coleta, staging e publicação) e cenário. Duas rodadas em ordens inversas: 960 invocações perfiladas, além dos aquecimentos. Comparação adicional do modo automático existente: 320 invocações, total de 1.280 perfiladas. Os resultados e a pontuação coincidiram; os documentos primários da fixture permaneceram iguais. Não são 1.280 chamadas ao site remoto.

## Evidências

Classificação estatística das amostras não ociosas por pilha e arquivo de origem. Os percentuais não representam tempo de CPU faturado nem precisão suficiente para deduzir que o restante cabe em 10 ms.

| Categoria | Aplicação nova, rodadas 1/2 | Token em cache, rodadas 1/2 |
| --- | --- | --- |
| Autenticação | 42,2% / 40,6% | 1,4% / 0,9% |
| Transporte e orçamento | 28,3% / 30,8% | 45,2% / 44,0% |
| Codec e RPC Firestore | 19,1% / 18,3% | 38,1% / 38,4% |
| Estado e cálculo do ranking | 5,7% / 5,2% | 8,3% / 10,6% |
| Composição da aplicação | 1,3% / 1,2% | 1,6% / 1,1% |

Na aplicação nova, a assinatura e a importação da chave aparecem entre as funções custosas. O cache de token funciona no cenário reutilizado: zero trocas OAuth nas 160 invocações perfiladas de cada rodada; na aplicação nova houve uma por invocação. Isso não certifica reutilização de isolate/env nos eventos remotos anteriores nem prova que uma dessas funções explique sozinha seus 21/16 ms.

Com o token em cache, fetch, processamento JSON, codificação/decodificação e leitura transacional aparecem com frequência. A espera de rede é diferente do trabalho necessário para preparar/processar essas operações. O peso de fetch inclui mecanismos locais da ponte de teste e não pode ser convertido diretamente em custo de rede na Cloudflare.

## Custo do próprio piloto

O modo automático existente não usa o limitador temporário do piloto, que acrescenta uma leitura transacional e um commit por invocação. Essa diferença foi medida somente localmente; nenhuma proteção do código ou da homologação foi removida.

| Fase | Piloto: token novo / cache | Automático: token novo / cache |
| --- | --- | --- |
| Início | 13 / 12 chamadas | 11 / 10 chamadas |
| Coleta | 13 / 12 chamadas | 11 / 10 chamadas |
| Staging | 6 / 5 chamadas | 4 / 3 chamadas |
| Publicação | 7 / 6 chamadas | 5 / 4 chamadas |

Menos chamadas no modo automático não autoriza ativá-lo para descobrir se cabe no limite. O próximo piloto deve continuar limitado e considerar explicitamente seu próprio custo.

## Limitações

- Perfil local por amostragem, com aquecimento; aplicação nova não significa inicialização a frio completa do isolate. Carregamento/compilação inicial do bundle e composição de bindings na entrada de produção não foram certificados.
- As fases foram reconstruídas com checkpoints sintéticos e relógio fixo. O teste verifica caminhos funcionais e custos relativos, sem reproduzir distribuição geográfica, agendamento ou concorrência reais.
- Intervalo de amostragem solicitado de 100 microssegundos; intervalo real depende da plataforma e não equivale a essa resolução. Amostras ociosas/sem atribuição foram excluídas da tabela.
- Chave sintética de 2048 bits; tamanho e comportamento da chave real não foram inspecionados. TLS e Firestore reais não estão reproduzidos.
- Tempos totais locais incluem profiler, ponte e fixture; não devem ser comparados a 10 ms de CPU. Perfis e source maps completos ficam no laboratório privado, fora do Git.
- Não há garantia de que otimizar apenas transporte resolva autenticação nova. O cache já existe; depender de reutilização contínua ou persistir tokens em documentos não é uma solução aprovada.

## Próximo plano local

1. Prototipar a redução de RPCs do ranking em lotes estritamente limitados, especialmente leituras de snapshot. Comparar chamadas, tamanho das respostas, documentos lidos e amostras com a referência atual.
2. Preservar algoritmo, mesma data de snapshot, validação de todos os resultados, limites do operador, reservas, autorização e transações. Qualquer falha continua impedindo promoção de lista incompleta. Não remover autenticação ou validações para atender à cota.
3. Se necessário, estudar etapas menores para admissão/coleta; antes de implementar, conferir pior caso de 300 fontes/100 vídeos, duração máxima, lease, limite de passos, orçamento e recuperação. Diminuir simplesmente sourcePerStep pode ultrapassar 30 minutos e não deve ser aplicado sem essa análise.
4. Só preparar outro piloto após melhoria local verificável e relatório do pacote. Recuperação de checkpoint, deploy e cron futuros exigem autorização específica; a autorização do piloto encerrado não foi reutilizada.
5. Se o custo mínimo das operações seguras continuar incompatível, registrar esse limite e apresentar alternativas gratuitas para decisão. Sem mudança automática de arquitetura, serviço ou faturamento.

## Validação e estado

As 1.280 invocações perfiladas verificaram resultados esperados, pontuação e preservação dos documentos primários sintéticos. Os 107 hashes de servidor conferiram. A suíte geral de 862 testes e os testes de emulador da implementação anterior não foram repetidos: não houve mudança de aplicação nesta etapa. A documentação/evidência sanitizada passou pela verificação local de segredos e diff.

# Etapa 9-B.5 — conferência final e estabilidade da suíte

27/10/2026. Snapshot recebido do proprietário: `27a9dc098f29c2f0c4b70a361b07f6bc56da9e4f`, main e origin/main conciliados e checkout limpo no início. Conferência iniciada somente de leitura; a descoberta abaixo exigiu preparar uma correção local dos testes antes de emitir aprovação. Não houve publicação, push, rerun, deploy, mudança de plano, credencial ou controle remoto nesta rodada.

## Conferências do snapshot recebido

- 740 arquivos e 1.676 blobs históricos examinados pelo verificador local, sem achados pelas regras existentes. Varredura heurística não equivale a prova de ausência de segredos; limites da auditoria original continuam válidos.
- npm audit completo retornou zero vulnerabilidades conhecidas, sem instalar ou atualizar dependências.
- Os 15 assets coincidem com os hashes do inventário revisado; não há novos arquivos de mídia versionados.
- Allowlist externa de Actions, SHA obrigatório, token somente leitura e isolamento de forks/outros repositórios foram reconfirmados por leitura. Nenhuma proteção foi reduzida.
- Dependabot confirmou zero alertas abertos e zero fechados na consulta. Nenhum alerta foi dispensado.
- Dados pessoais de autoria permanecem no histórico; também há registros de e-mail e caminhos locais na documentação histórica. Não reproduzir seus valores neste relatório. Não remover ou reescrever histórico automaticamente. O aceite final de visibilidade deve considerar que cópias/forks poderão preservar tais dados.

## Falha encontrada na última execução

A [run #4](https://github.com/rafaelcpalhano-blip/project-site-shorts/actions/runs/40599198340), disparada pelo push do proprietário, falhou em npm test. O caso `rede compartilhada aceita pessoas distintas, limita novas curtidas e preserva desfazer/recurtir`, em tests/network-security.test.mjs, esperava 21 curtidas e recebeu 20.

O teste iniciava 21 tentativas concorrentes e supunha que a identidade na posição 21 seria a recusada. A função real calcula um digest SHA-256 assíncrono antes de entrar na fila de transações; a conclusão dos digests não é obrigada a seguir a ordem da lista. Se a última identidade já tinha curtido, repetir a mesma intenção em outro IP corretamente não acrescenta nova curtida.

Uma reprodução local controlada, preservando a implementação e admitindo essa identidade antes das demais, reproduziu exatamente 20 !== 21 no teste anterior. É uma suposição inválida do teste, não evidência de falha do limite do site.

## Correção local preparada

O teste passa a usar os resultados reais para escolher uma pessoa admitida e a pessoa bloqueada. Mantém o cenário com 21 chamadas paralelas e acrescenta um cenário controlado em que a última identidade da lista já foi admitida antes do lote. Em ambos verifica:

- exatamente 20 admissões e uma recusa, cuja causa deve ser abuse-limit;
- identidade recusada sem registro de curtida e sem consumir contribuição;
- repetir a curtida não aumenta o contador ou orçamento;
- desfazer e recurtir preservam o orçamento já consumido;
- pessoa bloqueada continua bloqueada na mesma rede;
- a mesma pessoa bloqueada pode contribuir por outra rede e só então elevar o contador para 21.

Nenhuma alteração em short-likes.ts, network-abuse.ts, regras, cotas, UID, Google/TOTP ou autenticação. Não excluir, pular ou afrouxar asserções para obter um resultado verde.

## Execução local e capacidade

Os dois cenários corrigidos passaram em 20 execuções locais. A primeira validação completa, em paralelo com essas repetições, e uma segunda rodada sem a carga extra revelaram um timeout local de 15 segundos no smoke test de inicialização do CLI. Isolado, o CLI e os outros quatro testes de compatibilidade passaram; a versão foi obtida em cerca de 1,3 segundo. O host informa 12 processadores disponíveis.

A mesma suíte foi então verificada com dois arquivos em paralelo. O comando padrão de testes passa a limitar a concorrência entre arquivos a dois, mantendo a concorrência explícita dentro dos testes e o timeout original. Não houve aumento de prazo ou relaxamento de proteção. Resultado final e contagens na evidência desta conferência.

Não foram repetidos build e emulador Firestore nesta correção de teste/orquestração; os resultados anteriores dizem respeito ao mesmo código da aplicação, que não foi alterado. A execução CI posterior deve novamente executar as verificações previstas no workflow.

## Parecer e próximo passo

**Ainda não concluir a aprovação de divulgação pública.** A correção deve ser revisada, commitada e enviada pelo proprietário; o workflow automático deve ficar verde no novo SHA antes do fechamento. A autorização anterior de uma execução manual já foi consumida e aprovada na run #3; esta rodada não executou outra tentativa nem apagou a run #4. Não declarar uma run antiga verde como aprovação de um snapshot mais novo com falha.

Após o CI do commit corrigido, repetir somente a conferência necessária do SHA/arquivos novos e verificar o resultado, sem criar um novo ciclo de alterações na aplicação. A decisão final de exposição de dados pessoais e visibilidade continua separada. O repositório permanece privado; TikTok, tradução, CPU e atualização automática do ranking continuam pendências independentes do lançamento do site.

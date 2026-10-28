# Tradução — diagnóstico do formato misto

## Publicação e incidente de empacotamento

Pacote de diagnóstico autorizado com43assets reconstruídos e intervalo local de ranking30min, mantendo rotina desligada. A revisão automática bloqueou o comando inicial antes de executar, por suspeita de manifesto antigo; a preparação foi separada e comprovou manifesto correto, hash congelado e flags. Nenhum bypass.

Versão preliminar efe65a54-a5eb-4286-8809-43aa1630e1f7 abriu com frontend de demonstração: a build genérica não recebeu VITE_DATA_MODE=api. A verificação de hashes/cabeçalhos não detectaria essa configuração funcional. Teste de Tibia foi interrompido antes de qualquer inferência. Rollback imediato para6910fddf-8d39-4129-a289-f60ce08be37c. Nenhuma migração ou gravação de conteúdo demonstrativo no banco.

Reempacotado em pasta isolada com modoapi explícito, rejeitando outras variáveis públicas; arquivo de segredos/ACL preservados, nove valores conferidos sem impressão. Publicado1b45ef41-8ae2-40c4-995d-96d6579c89ff às23h11 de27/10Brasília, ativo100%.13checks de cabeçalhos/guardas e42hashes públicos aprovados; catálogo real conferido visualmente.43arquivos incluem_headers, que não é servido como arquivo público. Ranking/jobs/cron desligados; não é lançamento.

## Tentativa única e evidência

Uma reconfirmação de Tibia às23h13 de27/10, com coleta180s: HTTP200, CPU22ms, duração2509ms.11eventos na janela, zero exceções/exceededCpu. Não inspecionados corpos para descartar1102 independentemente. Primeira chamada da rota no isolate, aplicação já existente; não certifica cold start ou CPU para produção. Original preservado, tradução ausente.

Código fixo invalid-translation-response-shape-mixed confirma que o payload contém choices e também o campo legado response. O valor desse campo não foi registrado, portanto não afirmar que está vazio, duplicado ou conflitante. Duas tentativas no diaUTC; quarta tentativa autorizada no histórico. Próxima espera termina28/10 03:13:18UTC, equivalente a28/10 00h13min18Brasília. Nenhuma repetição automática ou nova autorização implícita.

## Compatibilidade preparada somente localmente

O adaptador agora permite campo legado null, ausente, string vazia ou idêntico ao conteúdo final, desde que a conclusão seja validada integralmente. Campo legado divergente ou tipo inesperado continua recusado. Uma única escolha, objectchat.completion, roleassistant, finish_reasonstop, recusa de ferramentas, texto inseguro, nomes perdidos e truncamentos permanecem exigidos. Não salva raciocínio ou resposta bruta. Essa adaptação cobre combinações não ambíguas; não promete resolver o payload real se o legado trouxer conteúdo conflitante.

805testes totais e19focados passaram; tipos/lint/diff-check e dry-run aprovados. Pacote congelado4749e2fcb3922cad207406b1374ab8018c503939be6350d52f6c3900bfbd586f. AssetsAPI idênticos aos43atuais. A correção NÃO foi publicada; novo deploy/teste exigem aprovação específica. Sem alteração de modelo, endpoint, espera, quotas, autenticação ou plano. Recibos e screenshots fora doGit.

## Compatibilidade publicada; tentativa aguardando a espera

Proprietário autorizou especificamente o pacote e uma tentativa após a espera. Publicado Workerc796854d-aaad-4e84-901e-bd65cbdbb45d, anterior1b45ef41-8ae2-40c4-995d-96d6579c89ff, em27/10 às23h19Brasília.43assetsAPI idênticos, nove segredos/ACL preservados,13checks de cabeçalhos/guardas e42hashes públicos aprovados; ativo100%. Ranking/jobs/cron/planos intactos.805testes locais/19focados e tipos/lint/dry-run aprovados.

Ainda não foi executada inferência: leitura prévia às23h19 confirmou contador2 e retryAt28/10 03:13:18UTC (00h13min18Brasília). Autorização de uma tentativa continua válida e não consumida; conferir estado, orçamento, versão e franquia novamente antes de confirmar uma vez. Não criar agendamento nem repetir automaticamente. Não declarar tradução resolvida antes da validação real.

## Validação real concluída em28/10

A única tentativa autorizada foi executada após a espera: Tibia pronta/pt-BR, original preservado e tradução persistida após recarregar, acesso ao original aprovado. HTTP200/17msCPU, sem exceções/exceededCpu na coleta180s. Autorização consumida; não repetir. Ver etapa-9-a-tibia-traducao-confirmada.md. Qualidade editorial e CPU continuam pendentes; não é lançamento público.

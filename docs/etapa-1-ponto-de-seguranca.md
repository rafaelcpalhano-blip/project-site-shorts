# Etapa 1 — organização e ponto de segurança

28/10/2026. Base Git: 674e52e68f98b35f2bbe345161b115742839c7cb, conciliada com a referência local origin/main na inspeção. Worker de homologação: c796854d-aaad-4e84-901e-bd65cbdbb45d, confirmado por leitura ativo a100%. Esta etapa organiza o estado atual; não aprova lançamento público.

## Estado consolidado

- Tradução: compatibilidade publicada e Tibia validado em pt-BR, original preservado, acesso ao original e persistência após reload confirmados. Uma tentativa autorizada foi consumida; não há nova inferência autorizada.
- Ranking: intervalo de30min incluído no pacote, rotina desligada. Testes locais verificam ciclo diário, limites, retenção protegida e preservação de conteúdo.
- Validação de referência:805testes Node, tipos e lint aprovados antes da publicação. Código da aplicação não alterado nesta etapa; a suíte completa não foi repetida sem necessidade.
- Arquivos pendentes conferidos por verificador de segredos:751arquivos, nenhum achado pelos padrões. Essa varredura não garante ausência de todo segredo ou dado pessoal; a revisão final de publicação continua separada.

## Cópia de segurança local

Identificador: etapa-1-2026-10-28T03-53-22-801Z. A cópia fica fora do repositório, na pasta safety-points do workspace de trabalho. Não deve ser adicionada ao GitHub.

Inclui histórico/referências Git em bundle, cópia dos arquivos alterados/novos dos grupos abaixo, patch binário contra HEAD e bundle/assets públicos congelados da versão publicada. Um manifesto privado registra caminhos e hashes; a integridade é conferida no fechamento da etapa.

Não inclui arquivos ignorados, .env, credenciais, valores dos nove segredos, dados Firestore ou outros arquivos pessoais. Portanto, este ponto recupera código e artefatos; não substitui o backup privado de dados já tratado em outra etapa. Está no mesmo computador e não protege contra perda do disco. Não houve restauração remota.

## Recuperação

1. Antes de restaurar, preservar o estado mais recente em outra pasta. Não executar reset, clean ou checkout sobre mudanças sem conferência.
2. Conferir o manifesto e SHA-256 da cópia. O Git bundle pode ser verificado com git bundle verify; uma recuperação deve ocorrer primeiro em pasta separada.
3. Recuperar a base Git pelo bundle e sobrepor os arquivos listados em files/, conferindo seus hashes. O patch é uma alternativa para as mudanças já versionadas, não deve ser aplicado também sobre os mesmos arquivos já sobrepostos.
4. Credenciais continuam no armazenamento privado existente e não podem ser recuperadas desta cópia. Reinstalação de dependências e configuração local devem usar os procedimentos documentados do projeto.
5. Rollback do Worker é uma operação remota distinta: confirmar a versão e solicitar autorização específica antes de executar. Não restaura documentos Firestore, traduções ou interações.

A versão anterior 1b45ef41-8ae2-40c4-995d-96d6579c89ff está registrada, mas contém a recusa de tradução já corrigida. Não usá-la como destino automático de rollback por conveniência.

## Grupos para commit

1. Ranking: teste de ciclo diário e seu relatório/evidência (3arquivos).
2. Tradução: adaptador, regressões e registros do diagnóstico, deploy e sucesso real (10arquivos).
3. Continuidade: este registro, sua evidência e continuidade geral (3arquivos).

Os comandos completos estão no arquivo de apoio fora do Git. Commit e push ficam com o proprietário. Depois dos commits, conferir git status e, quando o proprietário enviar, o CI do novo SHA. Não considerar o CI antigo aprovação automática do snapshot novo.

## Próximo trabalho

Refinar a qualidade editorial da tradução, revisar CPU e preparar ranking contínuo com retenção e orçamento. TikTok permanece pendente. Homologação final, auditorias, README/contatos e publicação autorizada continuam na sequência combinada. A PWA já instalada entra na regressão, sem refazer sua implementação.

Fechamento da cópia: 16 arquivos pendentes e 62 hashes conferidos; Git bundle íntegro e patch reverso compatível com a árvore atual. Credenciais não foram lidas e dados remotos não foram copiados. Os três commits continuam aguardando execução pelo proprietário.

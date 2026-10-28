# Etapa 2 — qualidade da tradução: preparação local

28/10/2026. Os três commits da Etapa 1 foram confirmados e a árvore de trabalho estava limpa:5c90395,6bb39d9,a3bbd7f. Esta rodada prepara um refinamento de qualidade; não publica nem executa inferência.

## Alterações

A heurística anterior protegia sequências de palavras iniciadas por maiúsculas e, por isso, congelava North America e South America em inglês. A nova regra deixa nomes geográficos convencionais de uma lista finita disponíveis para localização. Nomes oficiais e aliases explícitos têm precedência: um jogo chamado North America continua preservado. Uma marca maior como North America Studios também permanece protegida.

O prompt solicita concordância de gênero/número, preservação dos fatos e associação dos números aos lugares, termos de RPG/MMORPG adequados e nomes geográficos em pt-BR quando não protegidos por marcador. Isso orienta o modelo; não é uma garantia de fidelidade semântica ou redação perfeita.

Modelo, endpoint, tamanho máximo, tempo de espera, limites, formato de resposta, tratamento de conflitos, rejeição de HTML/ferramentas/truncamentos e preservação dos marcadores permanecem iguais. Nenhum texto traduzido é substituído por regras rígidas após a resposta.

## Cache e escopo

O armazenamento de traduções não foi alterado. Traduções existentes continuam visíveis e não são invalidadas ou refeitas automaticamente. Reconfirmar Tibia, cujo original não mudou, reutiliza a tradução salva; não é uma amostra válida do prompt novo. Qualquer política de revisão das traduções já salvas será uma decisão separada, respeitando quotas e autorização.

Uma leitura de três documentos confirmou Doom/igdb-7351 ativo, original de617caracteres, sem tradução nem tarefa existente. Pode servir como amostra legítima posterior, mediante autorização específica; não houve cadastro novo ou inferência. Reconfirmar estado e franquia imediatamente antes de eventual teste.

## Validação e pacote

Quatro novas regressões cobrem geografia traduzível, precedência de títulos/aliases, marca maior protegida e recusa de marcadores perdidos/duplicados.23testes focados e809totais passaram, sem falhas ou skips; tipos, lint e dry-run do Worker aprovados. Respostas simuladas verificam o encadeamento e as proteções; qualidade linguística exige amostra real.

Pacote congelado: dbbbd8b1a600b625049b0f8684c3fc25ca2e3790f375d00db06d37acf5fd6bc1.101fontes de servidor têm hashes registrados fora doGit. Os43assets API são os mesmos da versão atualc796854d-aaad-4e84-901e-bd65cbdbb45d, sem reconstrução genérica. Ranking/jobs/cron desligados; nove segredos existentes não foram abertos ou alterados na preparação. Não houve deploy, inferência, alteração de planos, commit/push ou migração.

A próxima ação remota requer autorização específica do pacote e de uma amostra única. Antes do teste, verificar o plano gratuito e a margem compartilhada; mais instruções no prompt podem alterar o consumo de entrada. Avaliar texto e CPU antes de considerar a qualidade aprovada. O ajuste não resolve a pendência de CPU nem a postagem TikTok.

## Resultado posterior da homologação

Pacote autorizado publicado em 533b554a; a única amostra de Doom falhou na comparação entre campos response/choices, sem tradução salva. Não concluir qualidade aprovada. Nova política de precedência documentada preparada localmente com 814 testes, ainda não autorizada/publicada. Ver etapa-2-qualidade-traducao-homologacao.md.

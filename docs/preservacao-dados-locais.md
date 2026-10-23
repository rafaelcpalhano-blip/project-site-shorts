## Retomada validada — 23/10/2026

Após o desligamento, .emulator-data estava sem o arquivo de metadados exigido para importação. Restaurada a cópia independente clipzone-20261023T075951Z, com quatro arquivos/221.038 bytes e conferência SHA-256. Emulador iniciado explicitamente com --import; leitura posterior confirmou 22 jogos, 21 shorts e 19 comentários. Agora há validação efetiva de restauração, além da conferência dos arquivos registrada abaixo.

API HTTPS iniciada com configuração privada existente. Feed carregou 15 cards da primeira página, sem alertas e sem player ativo. Sem seed/reset/limpeza, Firebase remoto ou deploy. Um diretório temporário restante do encerramento anterior foi arquivado intacto em backups/clipzone-encerramento-1792742703785lCULsK, fora do Git. Cópia independente e backup anterior preservados. Falha de finalização da exportação continua pendente de investigação; não confiar no desligamento abrupto para salvar alterações novas.

# Preservação dos dados locais — 23/10/2026

Estado do emulador demo-clipzone salvo antes do desligamento: 22 documentos games, 21 shorts e 19 comments. Exportação completa inclui também coleções auxiliares, estados de moderação e históricos; não se limita aos registros públicos.

## Cópias verificadas

- Importação automática no repositório: .emulator-data/
- Cópia independente: C:/Users/rafae/Documents/ChatGPT/Project-Site-Shorts/backups/clipzone-20261023T075951Z/
- Exportação anterior preservada em backups/clipzone-anterior-20261023T075951Z/.
- Arquivos originais da exportação recuperada preservados em backups/clipzone-20261023T075951Z-export-original/, fora do Git.

O Firebase CLI encontrou o hub local e o Firestore gerou a exportação completa, mas a finalização/movimentação pelo hub falhou. A cópia completa temporária foi recuperada sem parar o banco e copiada aos dois destinos atuais. Os quatro arquivos (incluindo dados e metadados de importação) foram conferidos por SHA-256 nos dois destinos, totalizando 221.038 bytes. Não foi realizado teste de restauração em outro emulador nesta ocasião. Nenhum dado foi apagado ou enviado à nuvem.

## Próxima inicialização

Na raiz real do repositório:

```powershell
npm run emulators
```

O script existente detecta .emulator-data/firebase-export-metadata.json e aplica --import=.emulator-data. Em outro terminal:

```powershell
node --env-file=.env.server.local scripts/dev-api.mjs
```

Abrir https://127.0.0.1:5174/. Não executar seed:firestore para retomar este conjunto: o seed não é necessário e pode sobrescrever IDs demonstrativos conhecidos.

.env.server.local e .env.security.local foram apenas conferidos como existentes e preservados. Nenhum valor foi exibido, copiado para documentação ou incluído no backup de dados. Cookies/configurações locais permanecem separados do banco; o backup não equivale a manter uma sessão administrativa autenticada.

## Ao encerrar futuramente

O runner do emulador já usa --export-on-exit=.emulator-data. Encerrar normalmente com Ctrl+C e aguardar a conclusão é melhor que fechar o terminal ou desligar abruptamente. Como a finalização da exportação falhou nesta sessão, não presumir que export-on-exit sempre concluiu: conferir mensagem e horário dos arquivos. Pedir uma cópia verificada antes de novos desligamentos até investigar a falha do hub.

Dados locais não precisam de commits; .emulator-data e arquivos privados são ignorados. A cópia independente está fora do repositório. Não apagar essas pastas para corrigir inicialização. Se faltar algum dado na próxima sessão, primeiro conferir a importação e recuperar a cópia verificada, sem semear/resetar o banco.

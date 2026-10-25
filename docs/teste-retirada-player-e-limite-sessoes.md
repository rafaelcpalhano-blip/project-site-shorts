# Testar retirada do feed e mensagem de limite de sessões

## Mensagem ajustada — 25/10/2026

HTTP429 em /api/session passa a exibir: “Por segurança, o limite de novas sessões foi atingido. Aguarde e tente novamente mais tarde. Fechar e reabrir a janela anônima não libera esse limite.” A falha é classificada como rate-limit. Os demais erros de sessão conservam o tratamento anterior. Aplicado ao feed ordenado, feed comum, detalhes e comentários. Não foram mudados limites, cookies, cotas, contadores ou permissões. Sem nova chamada ou tentativa automática. Não foi prometido prazo fixo porque existem limites por janela e por dia.

A build5175 foi atualizada; Vite5174 lê o frontend alterado. Basta recarregar a página para usar o código novo; API não necessita de reinício. Não provocar novas sessões artificiais só para reproduzir a mensagem: respostas429 simuladas já foram testadas.

## Teste que o proprietário pode executar

No PowerShell, na raiz do repositório:

```powershell
node --test tests/playback-feed-removal.test.mjs
```

Não precisa iniciar nem parar servidores. O teste usa memória e respostas fictícias da fonte; não faz requisições externas e não lê/escreve em nenhum Firestore. Reutiliza o verificador YouTube real com fetch simulado, recordPlaybackFailure, readFeed/readPublicShort e reviewShort, preservando as validações de identidade/revisão. Não existe endpoint de teste que force a ocultação de vídeos reais.

Resultados esperados, cinco testes com sucesso:

- [ ] 01:14identidades elegíveis; vídeo permanece no feed, sem verificação externa antes do limiar.
- [ ] 02:15ªidentidade e fonte simulada com embeddable=false; vídeo fica pending, desaparece do feed e detalhe público retorna404; comentários, identidade, cota e registro continuam presentes; evento playback-block existe.
- [ ] 03:30tentativas da mesma identidade contam1; vídeo permanece no feed.
- [ ] 04:15identidades, mas fonte permite incorporação; encaminha para revisão e mantém o vídeo visível.
- [ ] 05:liberação pelo fluxo administrativo existente, com fonte confirmando elegibilidade; vídeo reaparece, reviewVersion avança e nova falha inicia contagem1 sem reutilizar ocorrências antigas.

“5pass /0fail” confirma esses cenários automatizados; não afirma que um vídeo real específico tenha mudado de disponibilidade. O teste não altera o feed que você vê na5174/5175. O fixture usa o hash canônico da identidade de vídeo, como exige a restauração real. Uma primeira execução do fixture com ID arbitrário foi corretamente recusada como invalid-video; corrigido somente o dado fictício, sem relaxar o backend.

## Conferência com vídeo real

O fluxo real depende de ocorrências independentes naturais e da evidência atual da fonte. Pode acompanhar eventos na administração → Atualizações → categoria Reprodução → Atualizar. Ao atingir o limiar, haverá encaminhamento para revisão; se houver confirmação confiável suficiente, o evento informa ocultação e o vídeo passa para pendentes/bloqueados. Atualize o feed para refletir a mudança.

Nem todo erro no player prova que o vídeo deve sair do feed. Problemas locais, rede, autoplay, restrições não confirmadas ou verificador desconhecido não autorizam ocultação. YouTube privado/removido pode continuar inconclusivo na API atual. Twitch/TikTok/relatos manuais seguem para revisão sem auto-ocultação nesta composição. Reabrir anônimo não representa teste de15pessoas e pode atingir o limite de sessões.

## Validação realizada

20/20 testes direcionados: mobile-recovery, playback-feed-removal e performance-7-6-5-a. Cobertos classificação da resposta429, ausência de leitura/retry após sessão recusada, preservação de cancelamentos/rascunhos e os cinco cenários acima. Lint, build de produção local e diff-check aprovados. Sem deploy, migração, infraestrutura, desativação de proteções ou escrita de ocorrências na base de uso.

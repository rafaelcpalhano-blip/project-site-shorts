# Simulação 7.5.6-A — modelo experimental

Reproduzir: node scripts/simulate-ranking.mjs

Parâmetros: {"publication":2,"like":1,"comment":0.25,"newGameBonus":0.3,"newGameHours":168,"halfLifeHours":24,"likesPerHour":20,"commentsPerHour":10,"commentsPerIdentityDay":1}

| Cenário | Pontuação | Admitidas | Ativas | Suprimidas |
|---|---:|---:|---:|---:|
| Novo sem interações | 2.0000 | 0 | 0 | 0 |
| Jogo novo, sem interações | 2.3000 | 0 | 0 | 0 |
| Pico antigo: 1.000 curtidas há 7 dias | 0.1742 | 20 | 20 | 980 |
| Pico recente: 20 curtidas há 10 minutos | 20.9040 | 20 | 20 | 0 |
| Interesse contínuo: 10/h nas últimas 6 horas | 55.4545 | 60 | 60 | 0 |
| Tentativa: 500 repetições de uma identidade | 2.9287 | 1 | 1 | 499 |
| Tentativa: 500 identidades novas em uma hora | 21.6563 | 20 | 20 | 480 |
| Comentários publicados: 10 identidades | 4.4072 | 10 | 10 | 0 |
| Comentários: 100 de uma identidade | 2.1895 | 1 | 1 | 99 |
| Pendentes/rejeitados: 100 comentários | 1.9431 | 0 | 0 | 100 |
| Ataque distribuído: 20 identidades/h por 24h | 343.2579 | 480 | 480 | 0 |

Os cenários usam dados sintéticos. Identidades novas coordenadas não são detectadas como pessoas falsas: o último cenário demonstra o limite real da proteção.

## Orçamento de leituras de documentos

| Candidatos | Jogos distintos | Leituras estimadas | Escritas do limitador |
|---:|---:|---:|---:|
| 0 | 0 | 2 | 1 |
| 15 | 1 | 32 | 1 |
| 15 | 15 | 46 | 1 |
| 30 | 1 | 62 | 1 |
| 30 | 30 | 91 | 1 |

Estimativas incluem candidato, releitura atual do short, jogo atual com cache por chamada e limitador. Não medem faturamento: índices, emissões de sessão, concorrência e retentativas podem adicionar consumo. Uma consulta vazia custa no mínimo uma leitura; filtro por jogo vazio pode exigir leitura adicional do jogo.

## Limitação comprovada e variante comparada

Pesos com meia-vida comum reduzem valores, mas mantêm a ordem e a vantagem percentual do bônus sem novas interações. Não recomendar esse modelo como solução definitiva do requisito temporal.

| Modelo | A/B inicialmente | A/B após 72h sem interações |
|---|---|---|
| Comum: 24h para tudo | 11.0000 / 2.0000 | 1.3750 / 0.2500 |
| Variante: publicação 24h, interação 12h, bônus 6h | 6.0000 / 2.0000 | 0.2031 / 0.2500 |

A = pico de 20 curtidas há 24h na publicação; B = vídeo recém-publicado sem interações. A variante deixa B ultrapassar A pelo tempo, mas exige atualização temporal da ordenação.

## Custo mínimo de gerações completas a cada hora

| Vídeos | Leituras/dia | Gravações/dia | Exclusões/dia em regime estável |
|---:|---:|---:|---:|
| 10 | 240 | 264 | 240 |
| 100 | 2400 | 2424 | 2400 |
| 500 | 12000 | 12024 | 12000 |
| 1000 | 24000 | 24024 | 24000 |

São limites inferiores: pressupõem métricas agregadas prontas, uma leitura por vídeo, uma gravação por item da geração e um apontador por geração; excluem guardas de concorrência, falhas, retenção, interações e visitas. Nenhuma rotina foi ativada.


import {evaluateRanking,evaluateMixedRanking,estimateSnapshotRefresh,estimatePage,fixtures,parameters} from './experiments/ranking-model.mjs'
// Deterministic, no network or database access. Redirect stdout to save a report.
console.log('# Simulação 7.5.6-A — modelo experimental\n')
console.log('Reproduzir: node scripts/simulate-ranking.mjs\n')
console.log('Parâmetros: '+JSON.stringify(parameters)+'\n')
console.log('| Cenário | Pontuação | Admitidas | Ativas | Suprimidas |')
console.log('|---|---:|---:|---:|---:|')
for(const fixture of fixtures()){
 const result=evaluateRanking(fixture),suppressed=Object.values(result.suppressed).reduce((sum,value)=>sum+value,0)
 console.log('| '+fixture.name+' | '+result.score.toFixed(4)+' | '+result.admitted+' | '+result.active+' | '+suppressed+' |')
}
console.log('\nOs cenários usam dados sintéticos. Identidades novas coordenadas não são detectadas como pessoas falsas: o último cenário demonstra o limite real da proteção.\n')
console.log('## Orçamento de leituras de documentos\n')
console.log('| Candidatos | Jogos distintos | Leituras estimadas | Escritas do limitador |')
console.log('|---:|---:|---:|---:|')
for(const input of [{candidates:0,distinctGames:0},{candidates:15,distinctGames:1},{candidates:15,distinctGames:15},{candidates:30,distinctGames:1},{candidates:30,distinctGames:30}]){
 const value=estimatePage(input);console.log('| '+input.candidates+' | '+input.distinctGames+' | '+value.documentReads+' | '+value.limiterWrites+' |')
}
console.log('\nEstimativas incluem candidato, releitura atual do short, jogo atual com cache por chamada e limitador. Não medem faturamento: índices, emissões de sessão, concorrência e retentativas podem adicionar consumo. Uma consulta vazia custa no mínimo uma leitura; filtro por jogo vazio pode exigir leitura adicional do jogo.\n')

console.log('## Limitação comprovada e variante comparada\n')
console.log('Pesos com meia-vida comum reduzem valores, mas mantêm a ordem e a vantagem percentual do bônus sem novas interações. Não recomendar esse modelo como solução definitiva do requisito temporal.\n')
const a={publishedAt:300,gameCreatedAt:0,now:324,signals:Array.from({length:20},(_,n)=>({kind:'like',id:'l'+n,identity:'v'+n,at:300,accepted:true,active:true}))},b={publishedAt:324,gameCreatedAt:0,now:324}
console.log('| Modelo | A/B inicialmente | A/B após 72h sem interações |')
console.log('|---|---|---|')
for(const [label,evaluate]of [['Comum: 24h para tudo',evaluateRanking],['Variante: publicação 24h, interação 12h, bônus 6h',evaluateMixedRanking]])console.log('| '+label+' | '+evaluate(a).score.toFixed(4)+' / '+evaluate(b).score.toFixed(4)+' | '+evaluate({...a,now:396}).score.toFixed(4)+' / '+evaluate({...b,now:396}).score.toFixed(4)+' |')
console.log('\nA = pico de 20 curtidas há 24h na publicação; B = vídeo recém-publicado sem interações. A variante deixa B ultrapassar A pelo tempo, mas exige atualização temporal da ordenação.\n')
console.log('## Custo mínimo de gerações completas a cada hora\n')
console.log('| Vídeos | Leituras/dia | Gravações/dia | Exclusões/dia em regime estável |')
console.log('|---:|---:|---:|---:|')
for(const videos of [10,100,500,1000]){const budget=estimateSnapshotRefresh({videos});console.log('| '+videos+' | '+budget.minimumReads+' | '+budget.minimumWrites+' | '+budget.steadyStateDeletes+' |')}
console.log('\nSão limites inferiores: pressupõem métricas agregadas prontas, uma leitura por vídeo, uma gravação por item da geração e um apontador por geração; excluem guardas de concorrência, falhas, retenção, interações e visitas. Nenhuma rotina foi ativada.\n')

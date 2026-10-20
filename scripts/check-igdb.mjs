// Run: node --env-file=.env.server.local scripts/check-igdb.mjs
// Credentials go only to official Twitch/IGDB endpoints through the existing adapter.
import { createIgdbCatalog } from '../server/games/igdb.ts'
const clientId = process.env.TWITCH_CLIENT_ID?.trim()
const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim()
if (!clientId || !clientSecret) {
  console.error('Preencha TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET em .env.server.local. Não envie os valores pelo chat.')
  process.exitCode = 1
} else {
  try {
    const catalog = createIgdbCatalog({ clientId, clientSecret })
    const results = await catalog.search('League of Legends')
    console.log('Conexão Twitch/IGDB confirmada. Registros retornados: ' + results.length)
    if (!results.length) console.log('Consulta sem resultados; nenhum jogo foi criado ou presumido.')
  } catch {
    // Do not print raw provider errors, request objects, tokens or credentials.
    console.error('Não foi possível validar Twitch/IGDB. Confira credenciais, acesso à API e conectividade. Nenhum dado foi gravado no Firestore.')
    process.exitCode = 1
  }
}

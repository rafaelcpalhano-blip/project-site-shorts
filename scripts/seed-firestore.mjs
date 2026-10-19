import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, Timestamp } from 'firebase/firestore'
// Fixed local target: this helper has no production project or credentials.
const environment = await initializeTestEnvironment({
  projectId: 'demo-clipzone', firestore: { host: '127.0.0.1', port: 8080 },
})
try {
  await environment.withSecurityRulesDisabled(async context => {
    const database = context.firestore()
    const games = [{ id: 'lol', name: 'League of Legends' }, { id: 'valorant', name: 'VALORANT' }]
    const date = Timestamp.fromDate(new Date('2026-10-19T12:00:00Z'))
    for (const game of games) await setDoc(doc(database, 'games', game.id), {
      officialName: game.name, normalizedName: game.name.toLowerCase(), aliases: [],
      status: 'active', createdAt: date, updatedAt: date,
    })
    for (let index = 0; index < 32; index++) await setDoc(doc(database, 'shorts', 'local-' + String(index).padStart(3, '0')), {
      originalUrl: 'https://clips.twitch.tv/LocalDemo' + index,
      normalizedUrl: 'https://clips.twitch.tv/LocalDemo' + index,
      platform: 'Twitch', platformVideoId: 'LocalDemo' + index,
      title: 'Jogada local ' + (index + 1), channelName: 'Dados de teste',
      gameId: games[index % 2].id, createdAt: date, moderationStatus: 'published',
    })
    await setDoc(doc(database, 'comments', 'local-approved'), {
      shortId: 'local-031', content: 'Comentário de teste aprovado.', createdAt: date, moderationStatus: 'approved',
    })
    await setDoc(doc(database, 'comments', 'local-pending'), {
      shortId: 'local-031', content: 'Este comentário de teste não deve aparecer.', createdAt: date, moderationStatus: 'pending',
    })
  })
  console.log('32 shorts fictícios, 2 jogos e 2 comentários gravados somente no emulador. URLs ilustrativas.')
} finally { await environment.cleanup() }


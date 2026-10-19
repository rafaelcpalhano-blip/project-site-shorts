import type { DemoState, Game } from '../types/models'
export const games: Game[] = [
  { id: 'lol', name: 'League of Legends' },
  { id: 'valorant', name: 'VALORANT' },
  { id: 'minecraft', name: 'Minecraft' },
  { id: 'fortnite', name: 'Fortnite' },
]
const titles = ['A virada começou aqui', 'Uma construção fora do comum', 'Meu melhor momento da semana', 'Essa jogada salvou a partida', 'Só mais uma partida']
export function createDemoState(): DemoState {
  const now = Date.now()
  return {
    shorts: Array.from({ length: 20 }, (_, index) => ({
      id: 'demo-' + index, identity: 'demo:' + index,
      platform: ['Twitch', 'YouTube', 'TikTok', 'Twitch'][index % 4],
      title: titles[Math.floor(index / 4)], channelName: index % 2 ? 'Replay club' : 'GG da vez',
      gameId: games[index % 4].id, createdAt: now - (index * 45 + 36) * 60_000,
    })),
    comments: [], requests: [],
  }
}


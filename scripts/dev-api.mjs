import { createDescriptionTranslator } from '../server/games/translate-description.ts'
import { createGameTranslation } from '../server/games/translation-store.ts'
import { createAdminAuthorizer } from '../server/auth/firebase-admin.ts'
// Development only. Never deploy this runner or expose it through a tunnel.
import { readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { createServer as createHttpsServer } from 'node:https'
import { createServer as createViteServer } from 'vite'
import { createPublicApi } from '../server/http/public-api.ts'
import { createRestStore } from '../server/firestore/rest-store.ts'
import { createIgdbCatalog } from '../server/games/igdb.ts'
import { createConfiguredVideoVerifier } from '../server/videos/configured.ts'
import { createTwitchClipVerifier } from '../server/videos/twitch.ts'
import { localApiBridge } from './local-api-bridge.mjs'

const origin = 'https://127.0.0.1:5174'
let vite
let server
try {
  if (!process.env.LOCAL_TLS_CERT || !process.env.LOCAL_TLS_KEY) {
    throw new Error('missing-local-certificate')
  }
  const [cert, key] = await Promise.all([
    readFile(process.env.LOCAL_TLS_CERT), readFile(process.env.LOCAL_TLS_KEY),
  ])
  const clientId = process.env.TWITCH_CLIENT_ID?.trim()
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim()
  const catalog = clientId && clientSecret ? createIgdbCatalog({ clientId, clientSecret }) : undefined
  const store = createRestStore({ projectId: 'demo-clipzone', emulatorPort: 8080 })
  const translationEnabled = process.env.CLIPZONE_TRANSLATION_ENABLED === 'true'
  const gameTranslation = translationEnabled && process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN ? createGameTranslation({
    store, now: () => new Date(), maximumPerDay: 20,
    translate: createDescriptionTranslator({ accountId: process.env.CLOUDFLARE_ACCOUNT_ID.trim(), token: process.env.CLOUDFLARE_AI_TOKEN.trim() }),
  }) : undefined
  const twitch = catalog ? createTwitchClipVerifier({ clientId, accessToken: catalog.accessToken,
  }) : undefined
  const adminKey = process.env.FIREBASE_AUTH_API_KEY?.trim()
  const adminAppId = process.env.FIREBASE_AUTH_APP_ID?.trim()
  const admin = adminKey && adminAppId ? {
    publicConfig: { apiKey: adminKey, appId: adminAppId, projectId: 'clipzone-db02a', authDomain: 'clipzone-db02a.firebaseapp.com' },
    authorize: createAdminAuthorizer({ projectId: 'clipzone-db02a', apiKey: adminKey,
      allowedUids: (process.env.CLIPZONE_ADMIN_UIDS || '').split(',').map(value => value.trim()).filter(Boolean) }),
  } : undefined
  let issued = 0
  let windowStarted = Date.now()
  const api = await createPublicApi({
    origin, visitorSecret: randomBytes(32).toString('hex'),
    store, admin, gameTranslation,
    now: () => new Date(), maximumAttempts: 20, attemptWindowMs: 60_000,
    // Technical confirmation permits publication; flags require review, uncertainty permits retry.
    verify: createConfiguredVideoVerifier({ twitch, youtubeApiKey: process.env.YOUTUBE_API_KEY }),
    gameSearch: catalog ? { ...catalog, maximumAttempts: 20, windowMs: 60_000 } : undefined,
    allowSessionIssuance: async () => {
      if (Date.now() - windowStarted >= 60_000) { windowStarted = Date.now(); issued = 0 }
      return ++issued <= 20
    },
  })
  process.env.VITE_DATA_MODE = 'firestore-emulator'
  server = createHttpsServer({ cert, key, requestTimeout: 30_000, headersTimeout: 10_000 })
  vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server }, host: '127.0.0.1' },
  })
  const bridge = localApiBridge(api, origin)
  server.on('request', (req, res) => { void bridge(req, res, () => vite.middlewares(req, res)) })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(5174, '127.0.0.1', resolve)
  })
  console.log('Ambiente local: ' + origin + ' | Firestore demo-clipzone:8080')
  console.log('Publicação após validação técnica; sessões expiram ao reiniciar. Nenhuma gravação na nuvem.')
  console.log(gameTranslation ? 'Tradução pt-BR habilitada: até 20 tentativas/dia UTC, somente no cadastro/confirmação.' : 'Tradução pt-BR desativada ou sem credenciais: descrições originais preservadas.')
  if (!catalog) console.log('Catálogo IGDB indisponível: configure as variáveis privadas do servidor.')
  const close = async () => { server.close(); server.closeAllConnections(); await vite.close() }
  process.once('SIGINT', close)
  process.once('SIGTERM', close)
} catch {
  server?.close()
  await vite?.close()
  console.error('Não foi possível iniciar. Confira certificado/chave locais confiáveis e porta 5174 livre. Consulte docs/api-local.md. Nenhuma credencial foi exibida.')
  process.exitCode = 1
}



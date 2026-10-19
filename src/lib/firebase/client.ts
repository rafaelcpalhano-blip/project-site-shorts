import { initializeApp } from 'firebase/app'
import { connectFirestoreEmulator, initializeFirestore, memoryLocalCache } from 'firebase/firestore'

// Deliberately no production configuration or environment-driven endpoint.
const app = initializeApp({ projectId: 'demo-clipzone', apiKey: 'local-demo-only', appId: 'local-demo-only' }, 'clipzone-local')
const database = initializeFirestore(app, { localCache: memoryLocalCache() })
connectFirestoreEmulator(database, '127.0.0.1', 8080)
export { database }


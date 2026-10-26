// Shared identity for the API catalog cache. All public reads use same-origin HTTP.
// No browser Firestore instance, credentials, emulator or remote endpoint is created.
export const database=Object.freeze({transport:'same-origin-api'})

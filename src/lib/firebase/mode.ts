// The legacy local mode keeps working; both persistent modes read through the API.
export const usesFirestore = ['api','firestore-emulator'].includes(import.meta.env.VITE_DATA_MODE)

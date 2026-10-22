export const welcomeKey = 'clipzone:clipper:welcome:v1'
export interface WelcomeStorage { getItem(key:string):string|null; setItem(key:string,value:string):void }
export function createWelcomePreference() {
  let dismissed = false
  return {
    shouldShow(storage?: WelcomeStorage) { try { return !dismissed && storage?.getItem(welcomeKey) !== 'seen' } catch { return !dismissed } },
    dismiss(storage?: WelcomeStorage) { dismissed = true; try { storage?.setItem(welcomeKey, 'seen') } catch { /* Storage can be unavailable; memory still prevents repetition. */ } },
  }
}
export const welcomePreference = createWelcomePreference()

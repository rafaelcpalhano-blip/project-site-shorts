export type InstallMode = 'hidden' | 'native' | 'ios' | 'android'
export interface InstallPrompt extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'}>
}
interface MobileNavigator extends Navigator { standalone?: boolean; userAgentData?: {mobile?: boolean} }
/** Capabilities + platform; narrow desktop windows alone never qualify. */
export function manualInstallMode(nav: Pick<MobileNavigator, 'userAgent' | 'maxTouchPoints' | 'userAgentData'>, coarse: boolean): InstallMode {
  if (!coarse || nav.maxTouchPoints < 1 || nav.userAgentData?.mobile === false) return 'hidden'
  const ua = nav.userAgent
  if (/FBAN|FBAV|Instagram|TikTok|; wv\)/i.test(ua)) return 'hidden'
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && nav.maxTouchPoints > 1)) return 'ios'
  return /Android/.test(ua) && /Chrome\/|EdgA\/|SamsungBrowser\//.test(ua) ? 'android' : 'hidden'
}
export function createInstallController(win: Window, nav: MobileNavigator) {
  const standalone = win.matchMedia('(display-mode: standalone)')
  const coarse = win.matchMedia('(any-pointer: coarse)')
  const listeners = new Set<() => void>()
  const storageKey = 'clipzone.install-confirmed-at.v1'
  let deferred: InstallPrompt | undefined, installed = false, busy = false, started = false
  try { const at = Number(win.localStorage.getItem(storageKey)); installed = at > 0 && Date.now() - at >= 0 && Date.now() - at < 30 * 86400000 } catch { /* Storage is optional. */ }
  const remember = () => { try { win.localStorage.setItem(storageKey, String(Date.now())) } catch { /* Installation still works. */ } }
  let mode: InstallMode = 'hidden'
  const update = () => {
    const next = installed || standalone.matches || nav.standalone ? 'hidden'
      : manualInstallMode(nav, coarse.matches) === 'hidden' ? 'hidden' : deferred ? 'native' : manualInstallMode(nav, coarse.matches)
    if (mode !== next) { mode = next; listeners.forEach(listener => listener()) }
  }
  const capture = (event: Event) => {
    const candidate = event as InstallPrompt
    if (typeof candidate.prompt !== 'function' || !candidate.userChoice) return
    if (manualInstallMode(nav, coarse.matches) === 'hidden') return
    event.preventDefault(); deferred = candidate; installed = false
    try { win.localStorage.removeItem(storageKey) } catch { /* Fresh browser capability takes priority. */ }
    update()
  }
  const onInstalled = () => { installed = true; remember(); deferred = undefined; update() }
  return {
    getSnapshot: () => mode,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    start: () => {
      if (started) return; started = true
      win.addEventListener('beforeinstallprompt', capture); win.addEventListener('appinstalled', onInstalled)
      win.addEventListener('pageshow', update); standalone.addEventListener('change', update); coarse.addEventListener('change', update); update()
    },
    stop: () => {
      if (!started) return; started = false; deferred = undefined
      win.removeEventListener('beforeinstallprompt', capture); win.removeEventListener('appinstalled', onInstalled)
      win.removeEventListener('pageshow', update); standalone.removeEventListener('change', update); coarse.removeEventListener('change', update)
    },
    async request(): Promise<'done' | 'guide'> {
      if (mode === 'hidden' || busy) return 'done'
      const event = deferred
      if (!event) return 'guide'
      deferred = undefined; busy = true
      try { await event.prompt(); const choice = await event.userChoice; if (choice.outcome === 'accepted') { installed = true; remember() } return 'done' }
      catch { return 'guide' }
      finally { busy = false; update() }
    },
  }
}
// Capture the event early, before the footer becomes visible. No prompt at startup.
export const installController = typeof window === 'undefined' ? undefined : createInstallController(window, navigator)
installController?.start()

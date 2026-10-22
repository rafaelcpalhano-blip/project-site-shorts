// Navigation-session memory only. No persistence, identifiers or listening metrics.
export function createAudioPreference() {
  let enabled = true
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => enabled,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    set: (next: boolean) => {
      if (enabled === next) return
      enabled = next
      for (const listener of listeners) listener()
    },
  }
}
// Initial provider mute is not a user preference. Only observe changes after sound
// has actually been reported active; explicit Clipzone choices are handled separately.
export function createAudioObserver(onChange: (enabled: boolean) => void, initialEnabled = true) {
  let previous: boolean | null = null
  let expected = initialEnabled
  const observe = (enabled: boolean) => {
    if (previous === null && enabled !== expected) return
    if (previous !== enabled) onChange(enabled)
    previous = enabled
  }
  return Object.assign(observe, { expect: (enabled: boolean) => { expected = enabled; previous = null } })
}
export const audioPreference = createAudioPreference()

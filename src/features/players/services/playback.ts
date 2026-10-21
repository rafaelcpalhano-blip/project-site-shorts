// Coordinates mounted players only; never stores URLs, tokens or viewing metrics.
export function createPlaybackCoordinator() {
  let current: string | null = null
  const listeners = new Set<() => void>()
  const update = (next: string | null) => {
    if (current === next) return
    current = next
    for (const listener of listeners) listener()
  }
  return {
    getSnapshot: () => current,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    activate: (id: string) => update(id),
    release: (id: string) => { if (current === id) update(null) },
  }
}
export const playback = createPlaybackCoordinator()

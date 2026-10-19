import { useState } from 'react'
import type { ReactNode } from 'react'
import { DemoContext } from './demo-context'
import { createDemoState } from '../../features/shorts/data/fixtures'
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(createDemoState)
  return <DemoContext.Provider value={{
    state,
    publish: short => setState(current => current.shorts.some(item => item.identity === short.identity)
      ? current : { ...current, shorts: [short, ...current.shorts] }),
    comment: (shortId, content) => setState(current => ({ ...current,
      comments: [...current.comments, { id: crypto.randomUUID(), shortId, content, status: 'pending' }] })),
    requestGame: name => setState(current => current.requests.some(item => item.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))
      ? current : { ...current, requests: [...current.requests, { id: crypto.randomUUID(), name }] }),
  }}>{children}</DemoContext.Provider>
}


import { createContext, useContext } from 'react'
import type { DemoState, Short } from '../../features/shorts/types/models'
export interface DemoContextValue {
  state: DemoState
  publish: (short: Short) => void
  comment: (shortId: string, content: string) => void
  requestGame: (name: string) => void
}
export const DemoContext = createContext<DemoContextValue | null>(null)
export function useDemo() {
  const value = useContext(DemoContext)
  if (!value) throw new Error('DemoProvider ausente')
  return value
}


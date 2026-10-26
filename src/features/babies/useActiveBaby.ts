import { useContext } from 'react'
import { ActiveBabyContext } from './ActiveBabyContext'

export function useActiveBaby() {
  const state = useContext(ActiveBabyContext)
  if (!state) throw new Error('useActiveBaby doit être utilisé dans ActiveBabyProvider')
  return state
}

import type { Goal } from './settings'

export type RestAdvice = 'counting' | 'ready' | 'hr-high' | 'hr-unreliable'

export interface SetRecord {
  n: number
  goal: Goal
  compound: boolean
  setStart: number
  setEnd: number
  restEnd: number | null
  preSetBpm: number | null
  peakBpm: number | null
  endRestBpm: number | null
  adviceAtEnd: RestAdvice | null
  suggested: boolean
}

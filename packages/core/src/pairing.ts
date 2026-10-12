export interface DeviceRef {
  id: string
  name: string
}

// Ids can change between sessions (browsers rotate them), so fall back to the name.
export function matches(paired: DeviceRef | null, seen: DeviceRef): boolean {
  if (!paired) return false
  if (paired.id !== '' && paired.id === seen.id) return true
  const a = paired.name.trim().toLowerCase()
  const b = seen.name.trim().toLowerCase()
  return a !== '' && b !== '' && a === b
}

export function signalLabel(dbm: number): 'Strong' | 'Good' | 'Weak' {
  if (dbm >= -60) return 'Strong'
  if (dbm >= -75) return 'Good'
  return 'Weak'
}

export function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00'
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// "a 5-minute", "an 8-minute", "an 11-minute": the article follows how the number is said.
export function minutesPhrase(n: number): string {
  const s = String(n)
  const an = s.startsWith('8') || s === '11' || s === '18'
  return `${an ? 'an' : 'a'} ${n}-minute`
}

export function duration(ms: number): string {
  if (!Number.isFinite(ms)) return '0 min'
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

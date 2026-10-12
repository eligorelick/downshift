let lock: WakeLockSentinel | null = null
// Focus, Workout and Breathe can overlap (a breathing break during a focus block), so the lock is held
// while any of them wants it and one finishing does not let the screen sleep under another.
export type WakeLockOwner = 'focus' | 'workout' | 'breathe'
const owners = new Set<WakeLockOwner>()
const wanted = (): boolean => owners.size > 0
let inFlight: Promise<void> | null = null

function request(): Promise<void> {
  if (!wanted() || lock || !('wakeLock' in navigator)) return Promise.resolve()
  // One request at a time, so two quick calls cannot each take a lock and leak one.
  inFlight ??= (async () => {
    try {
      const s = await navigator.wakeLock.request('screen')
      if (!wanted()) {
        await s.release().catch(() => {})
        return
      }
      lock = s
      s.addEventListener('release', () => {
        if (lock === s) lock = null
      })
    } catch {
      // Refused (low battery, or the tab is hidden); we try again when it is visible.
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

// The browser drops the lock whenever the tab is hidden, so ask again when it comes back.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void request()
})

export async function acquireWakeLock(owner: WakeLockOwner): Promise<void> {
  owners.add(owner)
  await request()
}

export async function releaseWakeLock(owner: WakeLockOwner): Promise<void> {
  owners.delete(owner)
  if (wanted()) return
  const l = lock
  lock = null
  try {
    await l?.release()
  } catch {
    // Already released.
  }
}

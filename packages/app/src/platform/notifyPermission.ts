// Kept free of app-state imports so it can be unit-tested without a browser.

export async function requestNotifyPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

// Asks for notification permission from the tap that starts a session, so the "block ended" notice can reach
// a hidden tab. Only while the answer is still undecided, and never on page load: browsers ignore or punish
// a prompt that appears without a tap.
export function askNotifyPermission(): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'default') return
  void requestNotifyPermission().catch(() => {
    // Some browsers throw instead of resolving 'denied'; the app works without notifications.
  })
}

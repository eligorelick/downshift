export type UnsupportedReason = 'ios' | 'firefox' | 'safari' | 'insecure' | 'no-api'

export interface SupportEnv {
  hasBluetooth: boolean
  isSecureContext: boolean
  userAgent: string
  maxTouchPoints: number
  platform: string
}

export function detectSupport(
  env: SupportEnv,
): { supported: true } | { supported: false; reason: UnsupportedReason } {
  if (env.hasBluetooth && env.isSecureContext) return { supported: true }
  if (!env.isSecureContext) return { supported: false, reason: 'insecure' }
  // iPadOS Safari reports a Mac desktop UA, so tell it apart by touch support.
  const ios =
    /iPhone|iPad|iPod/.test(env.userAgent) || (env.platform === 'MacIntel' && env.maxTouchPoints > 1)
  if (ios) return { supported: false, reason: 'ios' }
  if (/Firefox/.test(env.userAgent)) return { supported: false, reason: 'firefox' }
  if (/Safari\//.test(env.userAgent) && !/Chrome|Chromium|Edg/.test(env.userAgent)) {
    return { supported: false, reason: 'safari' }
  }
  return { supported: false, reason: 'no-api' }
}

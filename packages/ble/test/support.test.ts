import { describe, expect, test } from 'bun:test'
import { detectSupport } from '../src/support'

const CHROME_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0'

const base = { hasBluetooth: false, isSecureContext: true, maxTouchPoints: 0, platform: 'Win32' }

describe('detectSupport', () => {
  test('Chrome on Windows over https is supported', () => {
    expect(detectSupport({ ...base, hasBluetooth: true, userAgent: CHROME_WIN })).toEqual({ supported: true })
  })
  test('iPhone Safari is ios', () => {
    expect(detectSupport({ ...base, userAgent: IPHONE, platform: 'iPhone', maxTouchPoints: 5 })).toEqual({
      supported: false,
      reason: 'ios',
    })
  })
  test('iPhone Bluefy (has the API) is supported', () => {
    expect(
      detectSupport({
        ...base,
        hasBluetooth: true,
        userAgent: IPHONE,
        platform: 'iPhone',
        maxTouchPoints: 5,
      }),
    ).toEqual({ supported: true })
  })
  test('iPadOS with a desktop user agent is ios', () => {
    expect(
      detectSupport({ ...base, userAgent: MAC_SAFARI, platform: 'MacIntel', maxTouchPoints: 5 }),
    ).toEqual({
      supported: false,
      reason: 'ios',
    })
  })
  test('Firefox is firefox', () => {
    expect(detectSupport({ ...base, userAgent: FIREFOX })).toEqual({ supported: false, reason: 'firefox' })
  })
  test('macOS Safari is safari', () => {
    expect(detectSupport({ ...base, userAgent: MAC_SAFARI, platform: 'MacIntel' })).toEqual({
      supported: false,
      reason: 'safari',
    })
  })
  test('http on Chrome is insecure', () => {
    expect(
      detectSupport({ ...base, hasBluetooth: true, isSecureContext: false, userAgent: CHROME_WIN }),
    ).toEqual({ supported: false, reason: 'insecure' })
  })
  test('Chrome without the API is no-api', () => {
    expect(detectSupport({ ...base, userAgent: CHROME_WIN })).toEqual({ supported: false, reason: 'no-api' })
  })
})

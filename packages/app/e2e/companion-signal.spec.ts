import { type Page, expect, test } from '@playwright/test'
import { go } from './helpers'
import { nativeAdvance, nativeBluetoothPage, nativeSample, nativeStream } from './native-bluetooth'

const companion = (page: Page) => page.getByRole('region', { name: 'Heart rate companion', exact: true })
const prompt = (page: Page) => page.getByRole('heading', { name: /^(Feeling tense\?|Check in)$/ })

async function connectNative(page: Page): Promise<void> {
  await go(page, 'device')
  await page.getByRole('button', { name: 'Connect a heart rate device', exact: true }).click()
  await expect(page.locator('main').getByText('Connected', { exact: true })).toBeVisible()
  await nativeSample(page, 70, true, 0)
  await go(page, 'home')
}

async function startConnected(page: Page): Promise<void> {
  await nativeBluetoothPage(page)
  await connectNative(page)
  await companion(page).getByRole('button', { name: 'Start companion', exact: true }).click()
  await nativeSample(page, 70, true, 0)
  await expect(companion(page).getByText('Learning your baseline', { exact: true })).toBeVisible()
}

async function learnBaseline(page: Page): Promise<void> {
  await nativeStream(page, 15 * 60, 70)
  await expect(companion(page).getByText('Watching your heart rate', { exact: true })).toBeVisible()
}

test('a check-in on the retired route fallback does not ask the user to open Home again', async ({
  page,
}) => {
  await nativeBluetoothPage(page)
  await go(page, 'settings')
  await page.getByRole('slider', { name: 'Rise above baseline', exact: true }).press('Home')
  await page.getByRole('slider', { name: 'Held for', exact: true }).press('Home')
  await connectNative(page)
  await go(page, 'workout?start=1')
  await companion(page).getByRole('button', { name: 'Start companion', exact: true }).click()
  await nativeSample(page, 70, true, 0)
  await learnBaseline(page)
  await nativeStream(page, 3 * 60, 82)
  await nativeAdvance(page, 2)
  await expect(prompt(page)).toBeVisible()
  expect(await page.getByText('Open Downshift Home or Focus to check in.', { exact: true }).count()).toBe(0)
})

test('a queued high check-in respects a newer cooldown received from another tab', async ({ page }) => {
  await startConnected(page)
  await learnBaseline(page)
  await nativeStream(page, 9 * 60 + 59, 136)
  await page.mouse.move(7, 7)
  const newerCooldown = await page.evaluate(() => {
    window.__nativeHrFixture.advance(1000)
    window.__nativeHrFixture.emit(136, true)
    const settings = JSON.parse(localStorage.getItem('downshift.settings') ?? '{}')
    settings.lastHighNudgeAt = Date.now() + (window.__downshiftClock?.offset ?? 0)
    const raw = JSON.stringify(settings)
    localStorage.setItem('downshift.settings', raw)
    window.dispatchEvent(new StorageEvent('storage', { key: 'downshift.settings', newValue: raw }))
    return settings.lastHighNudgeAt as number
  })
  await nativeAdvance(page, 2)
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('downshift.settings') ?? '{}').lastHighNudgeAt),
  ).toBe(newerCooldown)
  await expect(prompt(page)).toHaveCount(0)
})

test('a queued routine check-in respects a daily cap received from another tab', async ({ page }) => {
  await nativeBluetoothPage(page)
  await go(page, 'settings')
  await page.getByRole('slider', { name: 'Rise above baseline', exact: true }).press('Home')
  await page.getByRole('slider', { name: 'Held for', exact: true }).press('Home')
  await connectNative(page)
  await companion(page).getByRole('button', { name: 'Start companion', exact: true }).click()
  await nativeSample(page, 70, true, 0)
  await learnBaseline(page)
  // A 12 bpm step avoids the abrupt-jump hold; the third full minute closes on the last packet.
  await nativeStream(page, 2 * 60 + 59, 82)
  await page.mouse.move(7, 7)
  await page.evaluate(() => {
    window.__nativeHrFixture.advance(1000)
    window.__nativeHrFixture.emit(82, true)
    const settings = JSON.parse(localStorage.getItem('downshift.settings') ?? '{}')
    settings.promptDay = 20261015
    settings.promptCount = settings.dailyCap
    const raw = JSON.stringify(settings)
    localStorage.setItem('downshift.settings', raw)
    window.dispatchEvent(new StorageEvent('storage', { key: 'downshift.settings', newValue: raw }))
  })
  await nativeAdvance(page, 2)
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('downshift.settings') ?? '{}').promptCount),
  ).toBe(3)
  await expect(prompt(page)).toHaveCount(0)
})

test('routine check-in budget and cooldown survive a page reload', async ({ page }) => {
  await startConnected(page)
  await learnBaseline(page)
  await nativeStream(page, 12 * 60, 90)
  await expect(page.getByRole('heading', { name: 'Feeling tense?' })).toBeVisible()
  await expect(companion(page).locator('[aria-live="polite"]')).toContainText('Feeling tense?')
  await page.getByRole('button', { name: "I'm fine", exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Heart rate companion', exact: true })).toBeFocused()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('downshift.settings') ?? '{}'))
  expect(saved.lastNudgeAt).toBeGreaterThan(0)
  expect(saved.promptCount).toBe(1)
  await page.reload()
  await expect(companion(page).getByRole('button', { name: 'Stop companion', exact: true })).toBeVisible()
  await connectNative(page)
  await learnBaseline(page)
  await nativeStream(page, 12 * 60, 90)
  await expect(prompt(page)).toHaveCount(0)
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('downshift.settings') ?? '{}'))
  expect(after.lastNudgeAt).toBe(saved.lastNudgeAt)
  expect(after.promptCount).toBe(1)
})

test('the separate high check-in cooldown survives a page reload', async ({ page }) => {
  await startConnected(page)
  await learnBaseline(page)
  await nativeStream(page, 10 * 60, 136)
  await expect(page.getByRole('heading', { name: 'Check in', exact: true })).toBeVisible()
  await page.getByRole('button', { name: "I'm fine", exact: true }).click()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('downshift.settings') ?? '{}'))
  expect(saved.lastHighNudgeAt).toBeGreaterThan(0)
  expect(saved.promptCount).toBe(0)
  await page.reload()
  await connectNative(page)
  await nativeStream(page, 16 * 60, 136)
  await expect(companion(page).getByText('Watching your heart rate', { exact: true })).toBeVisible()
  await expect(prompt(page)).toHaveCount(0)
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('downshift.settings') ?? '{}').lastHighNudgeAt),
  ).toBe(saved.lastHighNudgeAt)
})

test('starting before connection waits for a device and learns without a Focus session', async ({ page }) => {
  await nativeBluetoothPage(page)
  const panel = companion(page)
  await expect(panel.getByText('Companion stopped', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: 'Start companion', exact: true }).click()
  await expect(panel.getByText('Waiting for a heart rate device', { exact: true })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Start companion', exact: true })).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Stop companion', exact: true })).toHaveCount(1)

  await connectNative(page)
  await expect(panel.getByText('Learning your baseline', { exact: true })).toBeVisible()
  await learnBaseline(page)
  // Returning to Home must preserve the single running companion, rather than offering a duplicate Start.
  await go(page, 'device')
  await go(page, 'home')
  await expect(panel.getByRole('button', { name: 'Start companion', exact: true })).toHaveCount(0)
  await expect(panel.getByRole('button', { name: 'Stop companion', exact: true })).toHaveCount(1)
  await expect(page.getByText('Focus block in progress', { exact: true })).toHaveCount(0)
})

test('connecting a native device does not start the companion until Start is pressed', async ({ page }) => {
  await nativeBluetoothPage(page)
  await connectNative(page)
  await nativeStream(page, 16 * 60, 136)
  await expect(companion(page).getByText('Companion stopped', { exact: true })).toBeVisible()
  await expect(prompt(page)).toHaveCount(0)

  await companion(page).getByRole('button', { name: 'Start companion', exact: true }).click()
  await nativeSample(page, 70)
  await expect(companion(page).getByText('Learning your baseline', { exact: true })).toBeVisible()
})

test('lost sensor contact discards the learned baseline and must collect a new one', async ({ page }) => {
  await startConnected(page)
  await learnBaseline(page)
  await nativeSample(page, 136, false)
  await expect(companion(page).getByText('Check sensor contact', { exact: true })).toBeVisible()
  await expect(page.locator('.home-hr')).toContainText('-- bpm')

  await nativeSample(page, 70, true)
  await nativeStream(page, 12 * 60, 70)
  await expect(companion(page).getByText('Learning your baseline', { exact: true })).toBeVisible()
  await expect(prompt(page)).toHaveCount(0)
  await nativeStream(page, 5 * 60, 70)
  await expect(companion(page).getByText('Watching your heart rate', { exact: true })).toBeVisible()
})

test('a connected device that stops sending loses the signal and resets its baseline', async ({ page }) => {
  await startConnected(page)
  await learnBaseline(page)
  await nativeAdvance(page, 16)
  await expect(companion(page).getByText('Signal lost', { exact: true })).toBeVisible()

  await nativeSample(page, 70)
  await expect(companion(page).getByText('Learning your baseline', { exact: true })).toBeVisible()
  await expect(prompt(page)).toHaveCount(0)
})

test('a returning native packet resets an expired baseline before the monitor timer runs', async ({
  page,
}) => {
  await startConnected(page)
  await learnBaseline(page)

  await page.evaluate(() => {
    if (!window.__downshiftClock) throw new Error('The app clock fixture is missing')
    // No visibilitychange or timer may reconcile the old signal before this returning packet arrives.
    window.__downshiftClock.offset += 16000
    window.__nativeHrFixture.emit(70, true)
  })

  await expect(companion(page).getByText('Learning your baseline', { exact: true })).toBeVisible()
  await expect(prompt(page)).toHaveCount(0)
})

test('Device Disconnect shows signal loss after the companion has been watching', async ({ page }) => {
  await startConnected(page)
  await learnBaseline(page)
  await go(page, 'device')
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click()
  await expect(page.locator('main').getByText('Not connected', { exact: true })).toBeVisible()
  await go(page, 'home')

  await expect(companion(page).getByText('Signal lost', { exact: true })).toBeVisible()
  await expect(prompt(page)).toHaveCount(0)
})

test('invalid native packets do not keep an old high run fresh', async ({ page }) => {
  await startConnected(page)
  await learnBaseline(page)
  await nativeStream(page, 9 * 60 + 59, 136)
  // These packets reach the real WebBluetoothSource parser, which must drop their implausible BPM.
  await nativeStream(page, 20, 0)
  await expect(companion(page).getByText('Signal lost', { exact: true })).toBeVisible()

  await nativeStream(page, 3 * 60, 136)
  await expect(companion(page).getByText('Learning your baseline', { exact: true })).toBeVisible()
  await expect(prompt(page)).toHaveCount(0)
})

test('duplicate native packets cannot manufacture enough samples to learn a baseline', async ({ page }) => {
  await startConnected(page)
  // Twenty distinct timestamps per minute, each sent three times, must still count as twenty samples.
  await nativeStream(page, 16 * 60, 70, { intervalMs: 3000, copies: 3 })
  await expect(companion(page).getByText('Learning your baseline', { exact: true })).toBeVisible()
  await expect(prompt(page)).toHaveCount(0)

  await nativeStream(page, 15 * 60, 70)
  await expect(companion(page).getByText('Watching your heart rate', { exact: true })).toBeVisible()
})

test('switching from a native strap to demo data discards the native baseline', async ({ page }) => {
  await startConnected(page)
  await learnBaseline(page)
  await go(page, 'device')
  await page.getByLabel('Demo scenario').selectOption('resting')
  await page.getByRole('button', { name: 'Try demo data', exact: true }).click()
  await expect(page.locator('main').getByText('Demo (simulated)', { exact: true })).toBeVisible()
  await go(page, 'home')

  await expect(companion(page).getByRole('status')).toContainText('Learning your baseline')
  // Queued notifications from the detached native characteristic must have no effect on the new source.
  await nativeStream(page, 30, 136)
  await expect(prompt(page)).toHaveCount(0)
})

test('a native disconnect cancels a pending high check-in and ignores late packets', async ({ page }) => {
  await startConnected(page)
  await learnBaseline(page)
  await nativeStream(page, 9 * 60 + 59, 136)
  // The last sample closes the tenth high minute while activity is still inside the 1.5-second idle wait.
  await page.mouse.move(7, 7)
  await page.evaluate(() => {
    window.__nativeHrFixture.advance(1000)
    window.__nativeHrFixture.emit(136, true)
    window.__nativeHrFixture.drop()
  })
  await expect(companion(page).getByText('Signal lost', { exact: true })).toBeVisible()
  await nativeStream(page, 20 * 60, 136)
  await page.waitForTimeout(1200)
  await expect(prompt(page)).toHaveCount(0)
})

test('Stop cancels a pending check-in and prevents future native readings from prompting', async ({
  page,
}) => {
  await startConnected(page)
  await learnBaseline(page)
  await nativeStream(page, 9 * 60 + 59, 136)
  await page.mouse.move(7, 7)
  await nativeSample(page, 136)
  await companion(page).getByRole('button', { name: 'Stop companion', exact: true }).click()
  await expect(companion(page).getByText('Companion stopped', { exact: true })).toBeVisible()

  await nativeStream(page, 20 * 60, 136)
  await page.waitForTimeout(1200)
  await expect(companion(page).getByText('Companion stopped', { exact: true })).toBeVisible()
  await expect(prompt(page)).toHaveCount(0)
  await expect(companion(page).getByRole('button', { name: 'Start companion', exact: true })).toHaveCount(1)
})

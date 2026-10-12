import { type Page, expect } from '@playwright/test'

// The app reads window.__downshiftClock.offset on every clock read, so bumping it fast-forwards all timers.
export async function freshPage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__downshiftClock = { offset: 0 }
  })
  await page.goto('/')
}

// No pointer events, so the nudge prompt's idle wait is not disturbed.
export async function go(page: Page, hash: string): Promise<void> {
  await page.evaluate((h) => {
    location.hash = h
  }, hash)
}

export async function startDemo(
  page: Page,
  scenario: 'resting' | 'stress-rise' | 'workout-sets',
): Promise<void> {
  await go(page, 'device')
  await page.getByLabel('Demo scenario').selectOption(scenario)
  await page.getByRole('button', { name: 'Try demo data' }).click()
  await expect(page.locator('main').getByText('Demo (simulated)', { exact: true })).toBeVisible()
}

// Steps of `stepSec` with a pause after each, so the 1 s session ticks see every transition.
export async function advance(page: Page, totalSec: number, stepSec = 30, pauseMs = 1300): Promise<void> {
  for (let done = 0; done < totalSec; done += stepSec) {
    const s = Math.min(stepSec, totalSec - done)
    await page.evaluate((ms) => {
      if (window.__downshiftClock) window.__downshiftClock.offset += ms
    }, s * 1000)
    await page.waitForTimeout(pauseMs)
  }
}

// Writes focus events straight into the app's IndexedDB. Open the History page first so the app has created
// the database; hours are local to the browser, which is also how the page buckets them.
export async function seedFocusRatings(
  page: Page,
  rated: Array<{ hour: number; sharpness: number | null }>,
): Promise<void> {
  await page.evaluate(async (rows) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('downshift', 1)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite')
      rows.forEach((r, i) => {
        const start = new Date(2026, 8, 1 + i, r.hour, 5).getTime()
        tx.objectStore('events').add({
          type: 'focus',
          t: start,
          preset: 'work',
          blocks: 1,
          focusMs: 25 * 60000,
          endedAt: start + 25 * 60000,
          sharpness: r.sharpness,
        })
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, rated)
}

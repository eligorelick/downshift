import type { LogEvent } from '@downshift/core'
import { expect, test } from '@playwright/test'
import { freshPage, go, seedFocusRatings } from './helpers'

const CAPTION =
  "Your own ratings, grouped by when sessions started. Heart rate can't tell this; how sharp people feel at different times varies from person to person."

test('fresh history offers no workout filter', async ({ page }) => {
  await freshPage(page)
  await go(page, 'history')
  await expect(page.getByText('Nothing logged yet')).toBeVisible()
  await expect(page.getByRole('radio', { name: /workout/i })).toHaveCount(0)
})

test('existing workout history remains readable and exportable as legacy data after reload', async ({
  page,
}) => {
  await freshPage(page)
  await go(page, 'history')
  await expect(page.getByText('Nothing logged yet')).toBeVisible()
  await seedFocusRatings(page, [{ hour: 10, sharpness: 4 }])
  // A normal UI update gives us a complete settings record before adding old workout preferences.
  await go(page, 'settings')
  await page.getByRole('radio', { name: 'Light', exact: true }).check({ force: true })

  const legacyPreferences = {
    goal: 'endurance',
    restFloorSec: { strength: 240, hypertrophy: 150, hypertrophyIsolation: 60, endurance: 75 },
    restHrCues: false,
    setEndSuggest: false,
    breathingBetweenSets: true,
  }

  const start = Date.UTC(2026, 8, 1, 9, 5)
  const legacy: Extract<LogEvent, { type: 'set' }> & { id: number } = {
    id: 72,
    type: 'set',
    t: start,
    demo: true,
    record: {
      n: 3,
      goal: 'hypertrophy',
      compound: true,
      setStart: start,
      setEnd: start + 45_000,
      restEnd: start + 195_000,
      preSetBpm: 92,
      peakBpm: 148,
      endRestBpm: 102,
      adviceAtEnd: 'hr-high',
      suggested: true,
    },
  }

  // Seed the existing version-1 storage format, without importing a session controller or test hook.
  await page.evaluate(
    async ({ event, preferences }) => {
      const saved = JSON.parse(localStorage.getItem('downshift.settings') ?? '{}')
      localStorage.setItem('downshift.settings', JSON.stringify({ ...saved, ...preferences }))
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('downshift', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('events', 'readwrite')
        transaction.objectStore('events').add(event)
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
      db.close()
    },
    { event: legacy, preferences: legacyPreferences },
  )

  await page.reload()
  await page.getByRole('radio', { name: 'Dark', exact: true }).check({ force: true })
  await go(page, 'history')
  await page.reload()
  await expect(page.locator('.history-item')).toHaveCount(2)
  const row = page.locator('.history-item', { hasText: 'Legacy workout set' })
  await expect(row).toHaveCount(1)
  await expect(row).toContainText('Set 3, Muscle size, rest 150 s (demo heart rate)')
  await expect(row.getByRole('link')).toHaveCount(0)

  await page.getByRole('radio', { name: 'Legacy workout', exact: true }).check({ force: true })
  await expect(page.locator('.history-item')).toHaveCount(1)
  await expect(row).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^downshift-log-\d{4}-\d{2}-\d{2}\.csv$/)
  const stream = await file.createReadStream()
  let csv = ''
  for await (const chunk of stream) csv += chunk
  const lines = csv.trimEnd().split(/\r?\n/)
  // Export retains the complete log even when only legacy workouts are shown.
  expect(lines).toHaveLength(3)
  const columns = (lines[0] ?? '').split(',')
  const cells = lines.find((line) => line.split(',')[1] === 'set')?.split(',') ?? []
  expect(cells).toHaveLength(columns.length)
  expect(
    Object.fromEntries(columns.map((column, i) => [column, cells[i]]).filter(([, value]) => value)),
  ).toEqual({
    time_iso: '2026-09-01T09:05:00.000Z',
    type: 'set',
    duration_s: '45',
    goal: 'hypertrophy',
    set_n: '3',
    rest_s: '150',
    pre_bpm: '92',
    peak_bpm: '148',
    end_bpm: '102',
    advice: 'hr-high',
    compound: '1',
    suggested: '1',
    demo: '1',
  })

  const stored = await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('downshift', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const event = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction('events').objectStore('events').get(id)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    db.close()
    return event
  }, legacy.id)
  expect(stored).toEqual(legacy)
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('downshift.settings') ?? '{}')),
  ).toMatchObject({ ...legacyPreferences, theme: 'dark' })
})

test('the time-of-day section stays hidden until there are five rated sessions', async ({ page }) => {
  await freshPage(page)
  await go(page, 'history')
  await expect(page.getByText('Nothing logged yet')).toBeVisible()
  await seedFocusRatings(page, [
    { hour: 9, sharpness: 4 },
    { hour: 10, sharpness: 5 },
    { hour: 14, sharpness: 3 },
    { hour: 20, sharpness: 2 },
    { hour: 21, sharpness: null },
  ])
  await page.reload()
  await expect(page.locator('.history-item')).toHaveCount(5)
  await expect(page.getByRole('heading', { name: "How sharp you've felt, by time of day" })).toHaveCount(0)
})

test('shows one row per rated time of day, with the numbers as text and the caption', async ({ page }) => {
  await freshPage(page)
  await go(page, 'history')
  await expect(page.getByText('Nothing logged yet')).toBeVisible()
  await seedFocusRatings(page, [
    { hour: 9, sharpness: 4 },
    { hour: 10, sharpness: 5 },
    { hour: 11, sharpness: 4 },
    { hour: 14, sharpness: 3 },
    { hour: 20, sharpness: 2 },
    { hour: 21, sharpness: 3 },
    { hour: 22, sharpness: null },
  ])
  await page.reload()
  await expect(page.getByRole('heading', { name: "How sharp you've felt, by time of day" })).toBeVisible()
  await expect(page.getByText('4.3 average · 3 sessions', { exact: true })).toBeVisible()
  await expect(page.getByText('3.0 average · 1 session · few sessions', { exact: true })).toBeVisible()
  await expect(page.getByText('2.5 average · 2 sessions · few sessions', { exact: true })).toBeVisible()
  // No row for a time of day without ratings.
  await expect(page.getByText('night and early morning (before 9)')).toHaveCount(0)
  await expect(page.getByText(CAPTION)).toBeVisible()
  // Bars repeat the text for sighted readers only.
  await expect(page.locator('.sharp-bar[aria-hidden="true"]')).toHaveCount(3)
})

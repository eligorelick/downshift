import { expect, test } from '@playwright/test'
import { freshPage, go, seedFocusRatings } from './helpers'

const CAPTION =
  "Your own ratings, grouped by when sessions started. Heart rate can't tell this; how sharp people feel at different times varies from person to person."

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

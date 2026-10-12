import { type Page, expect, test } from '@playwright/test'
import { advance, freshPage, go, startDemo } from './helpers'

async function deleteAllData(page: Page): Promise<void> {
  await go(page, 'history')
  await page.getByRole('button', { name: 'Delete all data' }).click()
  await page.getByRole('button', { name: 'Delete everything' }).click()
}

test('"Always" mode can prompt when no focus session is running, and Delete all data takes the prompt away', async ({
  page,
}) => {
  await freshPage(page)
  // Choose "Always" first, so monitoring starts with the demo's first reading; the demo's rise begins twenty
  // simulated minutes in, and the detector needs settled baseline minutes before it.
  await go(page, 'settings')
  await page.getByRole('radio', { name: 'Always' }).check({ force: true })
  await startDemo(page, 'stress-rise')
  await go(page, 'focus')
  await expect(page.getByRole('button', { name: 'Start studying' })).toBeVisible()

  // No session is started; 45 simulated minutes of the rising demo, one minute at a time.
  for (let i = 0; i < 45; i++) await advance(page, 60, 60, 250)
  await page.waitForTimeout(2500)
  await expect(page.getByRole('heading', { name: 'Feeling tense?' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start studying' })).toBeVisible()

  // Answering a prompt left over from before the wipe would write into the emptied History.
  await deleteAllData(page)
  await go(page, 'focus')
  await expect(page.getByRole('button', { name: 'Start studying' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Feeling tense?' })).toHaveCount(0)
})

test('after "Delete all data" the Focus page no longer says the last session was saved', async ({ page }) => {
  await freshPage(page)
  await go(page, 'focus')
  await page.getByRole('button', { name: 'Start studying' }).click()
  await advance(page, 120, 60)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(page.getByText('Saved to History.')).toBeVisible()

  await deleteAllData(page)
  await go(page, 'focus')
  await expect(page.getByRole('button', { name: 'Start studying' })).toBeVisible()
  await expect(page.getByText('Saved to History.')).toHaveCount(0)
})

test('after "Delete all data" a finished workout summary is cleared', async ({ page }) => {
  await freshPage(page)
  await go(page, 'workout')
  await page.getByRole('button', { name: 'Start workout' }).click()
  await page.getByRole('button', { name: 'Set done' }).click()
  await advance(page, 30, 30)
  await page.getByRole('button', { name: 'Finish workout' }).click()
  await page.getByRole('button', { name: 'Yes, finish' }).click()
  await expect(page.getByText('Saved to History.')).toBeVisible()

  await deleteAllData(page)
  await go(page, 'workout')
  await expect(page.getByRole('button', { name: 'Start workout' })).toBeVisible()
  await expect(page.getByText('Saved to History.')).toHaveCount(0)
})

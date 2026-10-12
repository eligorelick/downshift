import { expect, test } from '@playwright/test'
import { advance, freshPage, go } from './helpers'

test('breathing session is logged and exports to CSV', async ({ page }) => {
  await freshPage(page)
  await go(page, 'breathe')
  await page.getByRole('radio', { name: /A quick reset between tasks/ }).check({ force: true })
  await page.getByRole('button', { name: 'Begin' }).click()
  await expect(page.locator('.pacer')).toBeVisible()
  // The Begin button is gone, so keyboard focus moves to the run's first control.
  await expect(page.getByRole('button', { name: 'Pause' })).toBeFocused()

  await advance(page, 120, 15, 400)
  await expect(page.getByText('How tense do you feel now?')).toBeVisible()
  await page.getByRole('radio', { name: /a little tense/ }).check({ force: true })
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('.breathe-result')).toBeVisible()
  await expect(page.locator('.breathe-result')).toBeFocused()

  await go(page, 'history')
  await expect(page.locator('.history-item', { hasText: 'Breathe' })).toHaveCount(1)

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/\.csv$/)
  const stream = await file.createReadStream()
  let text = ''
  for await (const chunk of stream) text += chunk
  const first = text.split(/\r?\n/)[0] ?? ''
  expect(first).toMatch(/^[a-z_,A-Z" ]+$/)
  expect(first).toContain(',')
  expect(text.split(/\r?\n/).filter(Boolean).length).toBeGreaterThan(1)
})

test('tapping the Breathe tab during a session started from Home keeps it running', async ({ page }) => {
  await freshPage(page)
  await page.getByRole('button', { name: 'Start breathing' }).click()
  await page.getByRole('button', { name: 'Begin' }).click()
  await expect(page.locator('.pacer')).toBeVisible()
  await page.locator('a[href="#breathe"]:visible').first().click()
  await expect(page.locator('.pacer')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

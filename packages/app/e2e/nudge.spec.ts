import { expect, test } from '@playwright/test'
import { advance, freshPage, go, startDemo } from './helpers'

test('stress-rise demo prompts "Feeling tense?" once during a work session', async ({ page }) => {
  await freshPage(page)
  await startDemo(page, 'stress-rise')
  await go(page, 'focus')
  await page.getByRole('radio', { name: 'Work' }).check({ force: true })
  await page.getByRole('button', { name: 'Start focusing' }).click()

  const prompt = page.getByRole('heading', { name: 'Feeling tense?' })
  // 45 simulated minutes, one minute at a time.
  for (let i = 0; i < 45; i++) await advance(page, 60, 60, 250)
  // The prompt waits for 1.5 s without input.
  await page.waitForTimeout(2500)
  await expect(prompt).toHaveCount(1)
  await expect(prompt).toBeVisible()
})

test('the nudge says a raised heart rate can be effort, and the break screen only gives context', async ({
  page,
}) => {
  await freshPage(page)
  await startDemo(page, 'stress-rise')
  await go(page, 'focus')
  await page.getByRole('radio', { name: 'Work' }).check({ force: true })
  await page.getByRole('button', { name: 'Start focusing' }).click()

  for (let i = 0; i < 45; i++) await advance(page, 60, 60, 250)
  await page.waitForTimeout(2500)
  await expect(page.getByRole('heading', { name: 'Feeling tense?' })).toBeVisible()
  await expect(page.getByText('That can be effort as well as tension.')).toBeVisible()
  await page.getByRole('button', { name: "I'm fine" }).click()

  await page.getByRole('button', { name: 'Start break' }).click()
  // The demo's heart rate runs on real time, so after a fast-forward the minute counts can be empty and the
  // note falls back to the wording without a number.
  await expect(page.getByText(/Your heart rate was up/)).toBeVisible()
  // All three answers start unselected and nothing is suggested yet.
  for (const name of ['Tense', 'Tired', 'Fine']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible()
  }
  await expect(page.getByText('Slow breathing', { exact: true })).toHaveCount(0)
})

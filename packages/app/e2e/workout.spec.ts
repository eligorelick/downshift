import { expect, test } from '@playwright/test'
import { advance, freshPage, go, startDemo } from './helpers'

test('strength workout: one set, rest, next set, finish', async ({ page }) => {
  await freshPage(page)
  await startDemo(page, 'workout-sets')
  await go(page, 'workout')
  await page.getByRole('radio', { name: 'Strength' }).check({ force: true })
  await page.getByRole('button', { name: 'Start workout' }).click()

  // A double tap on the big button ends the set but does not start the next one.
  await page.getByRole('button', { name: 'Set done' }).dblclick()
  await expect(page.locator('.wk-advice')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start set' })).toBeVisible()

  // Strength floor is 180 s.
  await advance(page, 200, 20)
  await expect(page.locator('.wk-advice')).toHaveText(
    /Ready when you are|Heart rate is still above your pre-set level/,
  )

  await page.getByRole('button', { name: 'Start set' }).click()
  await page.getByRole('button', { name: 'Finish workout' }).click()
  await page.getByRole('button', { name: 'Yes, finish' }).click()

  await expect(page.getByText('Workout complete')).toBeVisible()
  const sets = page.locator('.wk-stat').filter({ has: page.locator('.wk-lab', { hasText: /^sets?$/ }) })
  await expect(sets.locator('.wk-val')).toHaveText('1')
  await expect(sets.locator('.wk-lab')).toHaveText('set')
})

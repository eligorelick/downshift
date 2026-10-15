import { expect, test } from '@playwright/test'
import { freshPage, go } from './helpers'

test('retired workout deep links return to Home without opening a session', async ({ page }) => {
  await freshPage(page)
  for (const hash of ['workout', '/workout', 'workout?start=1']) {
    await go(page, hash)
    await expect(page.locator('main')).toHaveAttribute('data-page', 'home')
    await expect(page.getByRole('button', { name: 'Start companion', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Set done', exact: true })).toHaveCount(0)
  }
})

test('active entry points offer work and study tools without workout controls', async ({ page }) => {
  await freshPage(page)
  await expect(page.getByRole('link', { name: 'Workout', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Open workout', exact: true })).toHaveCount(0)
  await expect(page.locator('.welcome')).not.toContainText('Workout')
  await go(page, 'settings')
  await expect(page.getByRole('heading', { name: 'Workout', exact: true })).toHaveCount(0)
  await go(page, 'device')
  await expect(page.getByLabel('Demo scenario')).not.toContainText('Workout')
  await go(page, 'evidence')
  await expect(page.getByRole('heading', { name: 'Workout rest', exact: true })).toHaveCount(0)
})

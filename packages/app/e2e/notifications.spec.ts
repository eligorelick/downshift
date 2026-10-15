import { type Page, expect, test } from '@playwright/test'
import { freshPage, go } from './helpers'

declare global {
  interface Window {
    __notifyAsks?: number
  }
}

// Replaces the Notification API with a stub that counts permission requests, so no real prompt is needed.
async function stubNotification(page: Page, permission: NotificationPermission): Promise<void> {
  await page.addInitScript((initial) => {
    window.__notifyAsks = 0
    const stub = {
      permission: initial,
      requestPermission(): Promise<NotificationPermission> {
        window.__notifyAsks = (window.__notifyAsks ?? 0) + 1
        return Promise.resolve('granted')
      },
    }
    Object.defineProperty(window, 'Notification', { value: stub, configurable: true })
  }, permission)
}

const asks = (page: Page): Promise<number | undefined> => page.evaluate(() => window.__notifyAsks)

test('notification permission is asked on the tap that starts a focus session, not on load', async ({
  page,
}) => {
  await stubNotification(page, 'default')
  await freshPage(page)
  await go(page, 'focus')
  await expect(page.getByRole('button', { name: 'Start studying' })).toBeVisible()
  expect(await asks(page)).toBe(0)
  await page.getByRole('button', { name: 'Start studying' }).click()
  await expect(page.getByText('Focus block in progress')).toBeAttached()
  expect(await asks(page)).toBe(1)
})

test('notification permission is asked when focus is started from Home', async ({ page }) => {
  await stubNotification(page, 'default')
  await freshPage(page)
  expect(await asks(page)).toBe(0)
  await page.getByRole('button', { name: 'Start focusing' }).click()
  await expect(page.getByText('Focus block in progress')).toBeAttached()
  expect(await asks(page)).toBe(1)
})

test('a retired workout deep link never starts a session or requests notification permission', async ({
  page,
}) => {
  await stubNotification(page, 'default')
  await freshPage(page)
  await go(page, 'workout?start=1')
  await expect(page.locator('main')).toHaveAttribute('data-page', 'home')
  expect(await asks(page)).toBe(0)
})

test('a decided notification permission is never asked again', async ({ page }) => {
  await stubNotification(page, 'denied')
  await freshPage(page)
  await go(page, 'focus')
  await page.getByRole('button', { name: 'Start studying' }).click()
  await expect(page.getByText('Focus block in progress')).toBeAttached()
  expect(await asks(page)).toBe(0)
})

import { devices, expect, test } from '@playwright/test'

// Chromium with an iPhone user agent, so the suite needs no WebKit download.
const { defaultBrowserType: _, ...iphone } = devices['iPhone 13']
test.use(iphone)

test('iPhone without Web Bluetooth is pointed to Bluefy', async ({ page }) => {
  await page.addInitScript(() => {
    // Reflect.deleteProperty avoids a cast; the property lives on the prototype in Chromium.
    Reflect.deleteProperty(Navigator.prototype, 'bluetooth')
    Reflect.deleteProperty(navigator, 'bluetooth')
  })
  await page.goto('/#device')
  await expect(page.getByText("Bluetooth isn't available here")).toBeVisible()
  await expect(page.getByText('Bluefy', { exact: false }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Get Bluefy on the App Store' })).toBeVisible()
})

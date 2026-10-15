import { expect, test } from '@playwright/test'
import { advance, freshPage, go, startDemo } from './helpers'

test('returning desktop Home shows every primary action and the complete daily tally without scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await freshPage(page)
  await page.getByRole('button', { name: 'Got it', exact: true }).click()
  for (const name of ['Start focusing', 'Open workout', 'Start breathing']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeInViewport()
  }
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeInViewport()
  await expect(page.locator('.tally')).toBeInViewport({ ratio: 1 })
})

test('reduced motion keeps the breathing circle still while cues and controls remain usable', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await freshPage(page)
  await go(page, 'breathe')
  await page.getByRole('button', { name: 'Begin', exact: true }).click()
  const circle = page.locator('.pacer-orb')
  const radius = await circle.getAttribute('r')
  await advance(page, 5, 5, 600)
  await expect(circle).toHaveAttribute('r', radius ?? '')
  await expect(page.locator('.pacer-label')).toHaveText('Breathe out slowly')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Done', exact: true })).toBeVisible()
})

test('interrupted and repeated breathing sessions are each saved exactly once', async ({ page }) => {
  await freshPage(page)
  await go(page, 'breathe')
  await page.getByRole('button', { name: 'Begin', exact: true }).click()
  await advance(page, 10, 10, 600)
  await go(page, 'home')
  await go(page, 'history')
  await expect(page.locator('.history-item', { hasText: 'Breathe' })).toHaveCount(1)
  await go(page, 'breathe')
  await page.getByRole('button', { name: 'Begin', exact: true }).click()
  await advance(page, 10, 10, 600)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Breathe again', exact: true })).toBeVisible()
  await go(page, 'history')
  await expect(page.locator('.history-item', { hasText: 'Breathe' })).toHaveCount(2)
})

test('enlarged text preserves access to all pages and the three Home actions', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await freshPage(page)
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  for (const route of ['home', 'focus', 'workout', 'breathe', 'history', 'device', 'evidence', 'settings']) {
    await go(page, route)
    await expect(page.locator('main h1').first()).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      route,
    ).toBeLessThanOrEqual(1)
  }
  await go(page, 'home')
  for (const name of ['Start focusing', 'Open workout', 'Start breathing']) {
    const action = page.getByRole('button', { name, exact: true })
    await action.focus()
    await expect(action).toBeFocused()
    await expect(action).toBeInViewport()
  }
})

test('200 percent text on a narrow phone keeps navigation and pages within the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await freshPage(page)
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await startDemo(page, 'workout-sets')
  await advance(page, 36, 6, 400)
  for (const route of ['home', 'focus', 'workout', 'breathe', 'history', 'device', 'evidence', 'settings']) {
    await go(page, route)
    await expect(page.locator('main h1').first()).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      route,
    ).toBeLessThanOrEqual(1)
  }
})

test('Home caveats reflow at 320 pixels with 200 percent text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await freshPage(page)
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
  await go(page, 'home')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  for (const name of ['Start focusing', 'Open workout', 'Start breathing']) {
    const action = page.getByRole('button', { name, exact: true })
    await action.focus()
    await expect(action).toBeFocused()
    await expect(action).toBeInViewport()
  }
})

test('Device reading and demo selector fit at 320 pixels with 200 percent text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await page.addInitScript(() => {
    Reflect.deleteProperty(Navigator.prototype, 'bluetooth')
  })
  await freshPage(page)
  // Verdana exercises wider control labels on Windows; Linux retains its system font fallback.
  await page.addStyleTag({
    content: 'html { font-size: 200% !important; } body { font-family: Verdana, system-ui !important; }',
  })
  await startDemo(page, 'workout-sets')
  await advance(page, 36, 6, 400)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1)
  const scenario = page.getByLabel('Demo scenario')
  await scenario.selectOption('stress-rise')
  await expect(scenario).toHaveValue('stress-rise')
  expect(await scenario.evaluate((element) => element.getBoundingClientRect().right)).toBeLessThanOrEqual(320)
})

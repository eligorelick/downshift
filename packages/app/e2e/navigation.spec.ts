import { expect, test } from '@playwright/test'
import { advance, freshPage, go, startDemo } from './helpers'

test('following a nav link moves keyboard focus to the new page heading', async ({ page }) => {
  await freshPage(page)
  await page.locator('a.nav-link[href="#history"]:visible').first().click()
  await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeFocused()
  await page.locator('a.nav-link[href="#breathe"]:visible').first().click()
  await expect(page.getByRole('heading', { name: 'Breathe', level: 1 })).toBeFocused()
})

test('at 320 px wide no page scrolls sideways, even with the demo badge showing', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await freshPage(page)
  const sideways = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  // With no device the badge reads "No device"; that alone used to push the Settings icon off screen.
  expect(await sideways()).toBeLessThanOrEqual(0)
  await startDemo(page, 'resting')
  for (const p of ['home', 'focus', 'workout', 'breathe', 'history', 'device', 'evidence', 'settings']) {
    await go(page, p)
    await expect(page.locator('main h1, main h2').first()).toBeVisible()
    expect(await sideways(), `#${p}`).toBeLessThanOrEqual(0)
    // Every choice chip keeps a full tap height and one line of text (it wraps to a new row instead).
    const chips = await page
      .locator('main .segmented label')
      .evaluateAll((els) =>
        els.map((e) => ({ text: e.textContent ?? '', h: e.getBoundingClientRect().height })),
      )
    for (const c of chips) expect(c.h, `#${p} "${c.text}"`).toBeGreaterThanOrEqual(44)
    for (const c of chips) expect(c.h, `#${p} "${c.text}"`).toBeLessThan(60)
  }
})

test('at 320 px a three-digit demo heart rate still fits the top bar', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await freshPage(page)
  await startDemo(page, 'workout-sets')
  // The demo climbs from 90 to 150 bpm over its first 40 s.
  await advance(page, 36, 6, 400)
  await expect(page.locator('.hr-bpm').first()).toHaveText(/^1\d\d$/)
  await go(page, 'home')
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0)
})

test('a long unbroken note does not push the break screen sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await freshPage(page)
  await go(page, 'focus')
  await page.getByRole('button', { name: 'Start studying' }).click()
  await advance(page, 25 * 60, 60)
  await page.getByRole('textbox', { name: "Where you're up to", exact: true }).fill('x'.repeat(140))
  await page.getByRole('button', { name: 'Start break' }).click()
  await expect(page.getByText(/Pick up at:/)).toBeVisible()
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(0)
})

test('on a phone, a control reached with Tab is not hidden under the tab bar', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await freshPage(page)
  await go(page, 'history')
  const button = page.getByRole('button', { name: 'Delete all data' })
  await button.focus()
  const box = await button.boundingBox()
  const bar = await page.locator('.tabbar').boundingBox()
  expect(box && bar && box.y + box.height).toBeLessThanOrEqual(bar?.y ?? 0)
})

// Landscape phone, a 360x640 phone as a home-screen app, and two common portrait phones.
for (const [w, h] of [
  [844, 390],
  [640, 360],
  [360, 616],
  [412, 640],
  [360, 640],
] as const) {
  test(`at ${w}x${h} the breathing orb and its controls are on screen together`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    await freshPage(page)
    await go(page, 'breathe')
    await page.getByRole('button', { name: 'Begin' }).click()
    await expect(page.getByRole('button', { name: 'Pause' })).toBeFocused()
    const orb = await page.locator('.pacer-svg').boundingBox()
    const stop = await page.getByRole('button', { name: 'Stop' }).boundingBox()
    const top = (await page.locator('.topbar').boundingBox())?.height ?? 0
    const bar = (await page.locator('.tabbar').boundingBox())?.y ?? h
    expect(orb?.y ?? -1).toBeGreaterThanOrEqual(top - 1)
    expect((stop?.y ?? 0) + (stop?.height ?? 999)).toBeLessThanOrEqual(bar + 1)
  })
}

test('an Evidence contents link moves keyboard focus to its section', async ({ page }) => {
  await freshPage(page)
  await go(page, 'evidence')
  const link = page.getByRole('navigation', { name: 'Sections' }).getByRole('link').nth(1)
  const id = ((await link.getAttribute('href')) ?? '').slice(1)
  await link.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator(`section#${id}`)).toBeFocused()
  // Unlike a page heading, the section shows a ring, so a sighted keyboard user sees where focus went.
  expect(await page.locator(`section#${id}`).evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    'solid',
  )
})

test('in forced colors, the current tab keeps its highlight border while it has keyboard focus', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' })
  await freshPage(page)
  await go(page, 'history')
  const tab = page.locator('a.nav-link[href="#history"]:visible').first()
  await tab.focus()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(tab).toBeFocused()
  const style = await tab.evaluate((el) => {
    const c = getComputedStyle(el)
    return { border: c.borderTopWidth, outline: c.outlineStyle }
  })
  expect(style.border).toBe('2px')
  expect(style.outline).not.toBe('none')
})

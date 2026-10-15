import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { type Page, chromium, expect } from '@playwright/test'

// Run against a local production preview: bun run scripts/capture-ui.ts
// The screenshots contain real app states, with its existing test clock used to skip waiting.
const baseURL = process.env.DOWNSHIFT_PREVIEW_URL ?? 'http://127.0.0.1:4174'
const images = join(import.meta.dir, '../../..', 'docs/images')
const review = process.env.DOWNSHIFT_REVIEW_IMAGES
await mkdir(images, { recursive: true })
if (review) await mkdir(review, { recursive: true })
const browser = await chromium.launch({ args: ['--mute-audio'] })

async function fresh(width: number, height: number, theme: 'Light' | 'Dark') {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme === 'Dark' ? 'dark' : 'light',
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    window.__downshiftClock = { offset: 0 }
  })
  await page.goto(baseURL)
  await page.getByRole('button', { name: 'Got it', exact: true }).click()
  await go(page, 'settings')
  await page.getByRole('radio', { name: theme, exact: true }).check()
  await go(page, 'home')
  return { context, page }
}

async function go(page: Page, route: string) {
  await page.evaluate((hash) => {
    location.hash = hash
  }, route)
  await expect(page.locator('main h1').first()).toBeVisible()
}

async function advance(page: Page, seconds: number) {
  await page.evaluate((ms) => {
    if (window.__downshiftClock) window.__downshiftClock.offset += ms
  }, seconds * 1000)
  await page.waitForTimeout(1100)
}

try {
  const desktop = await fresh(1440, 1000, 'Light')
  await desktop.page.screenshot({ path: join(images, 'home-light.png') })
  if (review) {
    for (const route of [
      'home',
      'focus',
      'workout',
      'breathe',
      'history',
      'device',
      'evidence',
      'settings',
    ]) {
      await go(desktop.page, route)
      await desktop.page.screenshot({ path: join(review, `desktop-${route}.png`) })
    }
  }
  await desktop.context.close()

  if (review) {
    const phone = await fresh(390, 844, 'Light')
    for (const route of [
      'home',
      'focus',
      'workout',
      'breathe',
      'history',
      'device',
      'evidence',
      'settings',
    ]) {
      await go(phone.page, route)
      await phone.page.screenshot({ path: join(review, `mobile-${route}.png`), fullPage: route === 'home' })
    }
    await phone.page.addStyleTag({ content: 'html { font-size: 200% !important; }' })
    await go(phone.page, 'home')
    await phone.page.screenshot({ path: join(review, 'mobile-home-text-200.png') })
    await phone.context.close()
  }

  const focus = await fresh(390, 844, 'Dark')
  await go(focus.page, 'focus')
  await focus.page.getByRole('button', { name: 'Start studying', exact: true }).click()
  await advance(focus.page, 25 * 60)
  await focus.page.getByRole('button', { name: 'Start break', exact: true }).click()
  await expect(focus.page.getByRole('button', { name: 'Tense', exact: true })).toBeVisible()
  const dismiss = focus.page.getByRole('button', { name: 'Dismiss', exact: true })
  if (await dismiss.isVisible()) await dismiss.click()
  await focus.page.screenshot({ path: join(images, 'focus-break-dark.png') })
  await focus.context.close()

  const workout = await fresh(390, 844, 'Light')
  await go(workout.page, 'workout')
  await workout.page.getByRole('button', { name: 'Start workout', exact: true }).click()
  await advance(workout.page, 15)
  await workout.page.getByRole('button', { name: 'Set done', exact: true }).click()
  await advance(workout.page, 30)
  await expect(workout.page.getByRole('button', { name: 'Start set', exact: true })).toBeVisible()
  await workout.page.screenshot({ path: join(images, 'workout-rest-light.png') })
  await workout.context.close()

  const breathe = await fresh(390, 844, 'Dark')
  await go(breathe.page, 'breathe')
  await breathe.page.getByRole('button', { name: 'Begin', exact: true }).click()
  await expect(breathe.page.getByRole('button', { name: 'Pause', exact: true })).toBeFocused()
  await breathe.page.screenshot({ path: join(images, 'breathe-dark.png') })
  await breathe.context.close()
  console.log(`Saved real UI screenshots to ${images}`)
  if (review) console.log(`Saved all eight desktop screens to ${review}`)
} finally {
  await browser.close()
}

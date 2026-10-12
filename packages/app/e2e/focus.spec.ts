import { type Page, expect, test } from '@playwright/test'
import { advance, freshPage, go } from './helpers'

test('school session: heads-up, break due, break, feeling, breathing suggestion', async ({ page }) => {
  await freshPage(page)
  await go(page, 'focus')
  await page.getByRole('button', { name: 'Start studying' }).click()
  await expect(page.getByText('Focus block in progress')).toBeAttached()

  await advance(page, 23 * 60, 60)
  await expect(page.getByRole('heading', { name: /Break in 2 minutes/ })).toBeVisible()
  // Someone typing a note when the break falls due keeps their place in the field.
  const note = page.getByRole('textbox', { name: "Where you're up to", exact: true })
  await note.fill('Question 4')
  await expect(note).toBeFocused()

  await advance(page, 2 * 60, 30)
  await expect(page.getByRole('heading', { name: /Time for an? .*break/ })).toBeVisible()
  await expect(note).toBeFocused()
  await expect(note).toHaveValue('Question 4')

  await page.getByRole('button', { name: 'Start break' }).click()
  await expect(page.getByText('How are you feeling?')).toBeVisible()
  await page.getByRole('button', { name: 'Tense', exact: true }).click()
  await expect(page.getByText('Slow breathing', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Suggestion' })).toBeFocused()
  await expect(page.getByRole('button', { name: 'Start breathing' })).toBeVisible()
})

test('break screen asks Tense, Tired or Fine, suggests nothing yet, and has no heart-rate note without a strap', async ({
  page,
}) => {
  await freshPage(page)
  await go(page, 'focus')
  await page.getByRole('button', { name: 'Start studying' }).click()
  await advance(page, 25 * 60, 60)
  await page.getByRole('button', { name: 'Start break' }).click()
  for (const name of ['Tense', 'Tired', 'Fine']) {
    const b = page.getByRole('button', { name, exact: true })
    await expect(b).toBeVisible()
  }
  await expect(page.getByText(/Your heart rate was up/)).toHaveCount(0)
  // Nothing suggested until the person answers.
  await expect(page.getByText('Step away', { exact: true })).toHaveCount(0)
})

async function workForTwoMinutesThenStop(page: Page): Promise<void> {
  await freshPage(page)
  await go(page, 'focus')
  await page.getByRole('button', { name: 'Start studying' }).click()
  await advance(page, 2 * 60, 60)
  await page.getByRole('button', { name: 'Stop' }).click()
}

test('after a session it asks how sharp you felt once, and saves the rating on the session', async ({
  page,
}) => {
  await workForTwoMinutesThenStop(page)
  await expect(page.getByText('How sharp did you feel this session?')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save rating' })).toBeDisabled()
  await page.getByRole('radio', { name: /4.*fairly sharp/ }).check({ force: true })
  await page.getByRole('button', { name: 'Save rating' }).click()
  await expect(page.getByText('How sharp did you feel this session?')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Focus', level: 1 })).toBeFocused()
  await go(page, 'history')
  await expect(page.getByText(/sharpness 4 of 5/)).toBeVisible()
  // Fewer than five ratings: the section stays hidden.
  await expect(page.getByRole('heading', { name: "How sharp you've felt, by time of day" })).toHaveCount(0)
})

test('skipping the sharpness question keeps the session without a rating', async ({ page }) => {
  await workForTwoMinutesThenStop(page)
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.getByText('How sharp did you feel this session?')).toHaveCount(0)
  await go(page, 'history')
  await expect(page.getByText(/School, 1 block/)).toBeVisible()
  await expect(page.getByText(/sharpness \d of 5/)).toHaveCount(0)
})

test('turning the setting off means the question is never asked', async ({ page }) => {
  await freshPage(page)
  await go(page, 'settings')
  await page.getByLabel(/Ask how sharp I felt after each session/).uncheck()
  await go(page, 'focus')
  await page.getByRole('button', { name: 'Start studying' }).click()
  await advance(page, 2 * 60, 60)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByText(/Last session/)).toBeVisible()
  await expect(page.getByText('How sharp did you feel this session?')).toHaveCount(0)
})

test('Delete all data takes an open sharpness question away', async ({ page }) => {
  await workForTwoMinutesThenStop(page)
  await expect(page.getByRole('group', { name: 'How sharp did you feel this session?' })).toBeVisible()
  await go(page, 'history')
  await page.getByRole('button', { name: 'Delete all data' }).click()
  await page.getByRole('button', { name: 'Delete everything' }).click()
  await expect(page.getByText('Nothing logged yet')).toBeVisible()
  await go(page, 'focus')
  await expect(page.getByRole('heading', { name: 'Focus', level: 1 })).toBeVisible()
  await expect(page.getByText('How sharp did you feel this session?')).toHaveCount(0)
})

test('skipping the sharpness question moves focus to the page heading', async ({ page }) => {
  await workForTwoMinutesThenStop(page)
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Focus', level: 1 })).toBeFocused()
})

test('after "5 more minutes" the heads-up says how many minutes are really left', async ({ page }) => {
  await freshPage(page)
  await go(page, 'focus')
  await page.getByRole('button', { name: 'Start studying' }).click()
  await advance(page, 25 * 60, 60)
  await page.getByRole('button', { name: '5 more minutes' }).click()
  await expect(page.getByRole('heading', { name: /Break in 5 minutes/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Break in 2 minutes/ })).toHaveCount(0)
})

test('an answered break is logged with how long it really lasted', async ({ page }) => {
  await freshPage(page)
  await go(page, 'focus')
  await page.getByRole('button', { name: 'Start studying' }).click()
  await advance(page, 25 * 60, 60)
  await page.getByRole('button', { name: 'Start break' }).click()
  await page.getByRole('button', { name: 'Tired', exact: true }).click()
  await advance(page, 3 * 60, 30)
  await page.getByRole('button', { name: 'Back to work' }).click()
  await go(page, 'history')
  await expect(page.getByText(/3 min of 5 min planned/)).toBeVisible()
})

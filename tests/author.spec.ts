import { expect, test } from '@playwright/test'

test('Fill in the user', async ({ page }) => {
  await page.goto('/')

  await page.locator('#author').fill('John Doe')

  await page.locator('button:text("Save")').click()

  await expect(page.getByRole('button', { name: 'User button'}).locator('p')).toHaveText('John Doe')
})

test('Cancel the user', async ({ page }) => {
  await page.goto('/')

  await page.locator('#author').fill('John Doe')

  await page.locator('button:text("Cancel")').click()

  expect(await page.locator('button:text("Save")'))
})

test('Cancel change of user after it was filled in for the first time', async ({ page }) => {
  await page.goto('/')

  await page.locator('#author').fill('John Doe')

  await page.locator('button:text("Save")').click()

  await page.getByRole('button', { name: 'User button' }).click()

  await page.waitForTimeout(1000)

  await page.locator('#author').fill('Polleke Pollen')

  await page.locator('button:text("Cancel")').click()

  await expect(page.getByRole('button', { name: 'User button'}).locator('p')).toHaveText('John Doe')
})

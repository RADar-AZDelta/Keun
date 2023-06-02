import { expect, test } from '@playwright/test'

test('Fill in the user', async ({ page }) => {
  await page.goto('/')
  // Find the input field and fill in the author "John Doe"
  await page.locator('#author').fill('John Doe')
  // Click the save button
  await page.locator('button:text("Save")').click()
  // Check the author name in the author button
  await expect(page.getByRole('button', { name: 'User button'}).locator('p')).toHaveText('John Doe')
})

test('Cancel the user', async ({ page }) => {
  await page.goto('/')
  // Find the input field and fill in the author "John Doe"
  await page.locator('#author').fill('John Doe')
  // Click the cancel button
  await page.locator('button:text("Cancel")').click()
  // Check if you have left the dialog because normally it is not possible, so you should still see the save button
  expect(await page.locator('button:text("Save")'))
})

test('Cancel change of user after it was filled in for the first time', async ({ page }) => {
  await page.goto('/')
  // Find the input field and fill in the author "John Doe"
  await page.locator('#author').fill('John Doe')
  // Click the save button
  await page.locator('button:text("Save")').click()
  // Click the author button again
  await page.getByRole('button', { name: 'User button' }).click()
  // Fill in the author "Polleke Pollen"
  await page.locator('#author').fill('Polleke Pollen')
  // Click the cancel button
  await page.locator('button:text("Cancel")').click()
  // Check if the author name is still "John Doe"
  await expect(page.getByRole('button', { name: 'User button'}).locator('p')).toHaveText('John Doe')
})

import { expect, test } from '@playwright/test'

test('Import a file and check if the title "sourceCode" is visible', async ({ page }) => {
  await page.goto('/')
  // Find the input field and fill in the author "John Doe"
  await page.locator('#author').fill('John Doe')
  // Click the save button
  await page.locator('button:text("Save")').click()
  // Import a file from the static folder
  await page.setInputFiles("input[type='file']", 'static/file.csv')
  // Check if the table is visible
  await expect(page.getByRole('table')).toBeVisible()
  // Check if the title "sourceCode" is visible in the columns
  await expect(page.locator('p:text("sourceCode")')).toBeVisible()
})

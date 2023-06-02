import { expect, test } from '@playwright/test'

test('Import a file and check if the title "sourceCode" is visible', async ({ page }) => {
  await page.goto('/')

  await page.locator('#author').fill('John Doe')

  await page.locator('button:text("Save")').click()

  await page.setInputFiles("input[type='file']", 'static/file.csv')

  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.locator('p:text("sourceCode")')).toBeVisible()
})

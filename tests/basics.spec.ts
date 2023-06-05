import { expect, test, type Page } from '@playwright/test'

const init = async (page: Page) => {
  await page.goto('/')
}

const login = async (page: Page, name: string = 'John Doe', onboarding: boolean = true) => {
  // If the onboarding has already been done, push the button to open the author dialog
  if (onboarding == false) await page.getByRole('button', { name: 'User button' }).click()
  // Find the input field and fill in the author
  await page.locator('#author').fill(name)
  // Click the save button
  await page.locator('button:text("Save")').click()
}

const importFile = async (page: Page, filePath: string) => {
  // Import a file from the specified path
  await page.setInputFiles("input[type='file']", filePath)
}

const enableSettings = async (
  page: Page,
  setting: 'autoMapping' | 'mapToMultiple' | 'lang' | 'defaultVocab' | 'fontSize',
  settingValue?: string
) => {
  // Click the settings button
  await page.getByTitle('Settings-Keun').click()
  switch (setting) {
    case 'autoMapping':
      // Click the automapping slider
      await page.locator('#settings label').nth(1).click()
      break
    case 'mapToMultiple':
      // Click the mapToMultiple slider
      await page.locator('#settings label').nth(2).click()
      break
    case 'lang':
      // Click the language dropdown
      await page.locator('#settings select').click()
      // Click the language option
      if (settingValue !== undefined) await page.locator('#language').selectOption(settingValue)
      break
    case 'defaultVocab':
      // Fill the defaultVocab input
      if (settingValue !== undefined) await page.locator('#settings input').nth(1).fill(settingValue.toString())
      break
    case 'fontSize':
      // Fill the font input
      if (settingValue !== undefined) await page.locator('#settings input').nth(2).fill(settingValue.toString())
      break
  }
  // Close the dialog
  await page.getByRole('dialog').getByRole('button').click()
}

const showColumns = async (page: Page, columns: string[]) => {
  // Click the showColumns button
  await page.getByRole('cell', { name: 'Settings button' }).getByRole('button', { name: 'Settings button' }).click()
  columns.forEach(async column => {
    await page.getByLabel(column).click()
  })
  // Close the dialog
  await page.getByRole('dialog').getByRole('button').click()
}

const clickAction = async (
  page: Page,
  rowIndex: number,
  action: 'Approve' | 'Flag' | 'Unapprove' | 'Delete' | 'AUTO' | 'Delete' | 'Map'
) => {
  await page
    .getByRole('table')
    .getByRole('row')
    .nth(3)
    .getByRole('cell')
    .nth(0)
    .getByRole('button', { name: action, exact: true })
    .click()
}

test.describe('Testing the author functionalities of the mappingtool', () => {
  test('Log in with an author', async ({ page }) => {
    await init(page)
    await login(page, "John Doe")
    // Check the author name in the author button
    await expect(page.getByRole('button', { name: 'User button' }).locator('p')).toHaveText('John Doe')
  })

  test('Cancel the user in the onboarding', async ({ page }) => {
    await init(page)
    await login(page)
    // Check if you have left the dialog because normally it is not possible, so you should still see the save button
    expect(await page.locator('button:text("Save")'))
  })

  test('Cancel change of user after it was filled in, in the onboarding', async ({ page }) => {
    await init(page)
    await login(page, "John Doe")
    // Click the author button again
    await page.getByRole('button', { name: 'User button' }).click()
    // Fill in the author "Polleke Pollen"
    await page.locator('#author').fill('Polleke Pollen')
    // Click the cancel button
    await page.click('button:text("Cancel")')
    // Check if the author name is still "John Doe"
    await expect(page.getByRole('button', { name: 'User button' }).locator('p')).toHaveText('John Doe')
  })
})

test.describe('Testing the import of files', () => {
  test('Import a file and check if the title "sourceCode" is visible', async ({ page }) => {
    await init(page)
    await login(page)
    await importFile(page, 'static/file.csv')
    // Check if the table is visible
    await expect(page.getByRole('table')).toBeVisible()
    // Check if the title "sourceCode" is visible in the columns
    await expect(page.locator('p:text("sourceCode")')).toBeVisible()
  })

  test('Import a file and then upload another file and check if the import is correct', async ({ page }) => {
    await init(page)
    await login(page)
    await importFile(page, 'static/file.csv')
    const cellValue1 = await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(2).innerText()
    await importFile(page, 'static/file2.csv')
    await expect(page.getByRole('table')).toBeVisible()
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(2).innerText()).not.toBe(
      cellValue1
    )
  })
})

test.describe('Testing the automapping functionalities', () => {
  test('Import the file and then enable automapping', async ({ page }) => {
    await init(page)
    await login(page)
    await importFile(page, 'static/file.csv')
    await enableSettings(page, 'autoMapping')
    // Wait a bit because the fetch request needs time
    await page.waitForTimeout(3000)
    // Check for the first row if the conceptName is not Unmapped
    await expect(page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4)).not.toBe('')
  })

  test('Enable automapping and then import the file', async ({ page }) => {
    await init(page)
    await login(page)
    await enableSettings(page, 'autoMapping')
    await importFile(page, 'static/file.csv')
    // Wait a bit because the fetch request needs time
    await page.waitForTimeout(3000)
    // Check for the first row if the conceptName is not Unmapped
    await expect(page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4)).not.toBe('')
  })
})

test.describe('Testing the actions functionalities', () => {
  test('Does the approve button work for the first author', async ({ page }) => {
    await init(page)
    await login(page)
    await importFile(page, 'static/file.csv')
    await clickAction(page, 3, 'Approve')
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(5).innerText()).toBe(
      'SEMI-APPROVED'
    )
  })

  test('Does the flag buton work', async ({ page }) => {
    await init(page)
    await login(page)
    await importFile(page, 'static/file.csv')
    await clickAction(page, 3, 'Flag')
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(5).innerText()).toBe(
      'FLAGGED'
    )
  })

  test('Does the unapprove button work', async ({ page }) => {
    await init(page)
    await login(page)
    await importFile(page, 'static/file.csv')
    await clickAction(page, 3, 'Unapprove')
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(5).innerText()).toBe(
      'UNAPPROVED'
    )
  })

  test('Does the approve button work for the second author', async ({ page }) => {
    await init(page)
    await login(page)
    await importFile(page, 'static/file.csv')
    await clickAction(page, 3, 'Approve')
    await login(page, 'Polleke Pollen', false)
    await clickAction(page, 3, 'Approve')
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(5).innerText()).toBe(
      'APPROVED'
    )
  })

  // test('Does the approve button work for the second author when the second author edits mapping', ({ page }) => {})

  test('Does the automap button work', async ({ page }) => {
    await init(page)
    await login(page)
    await importFile(page, 'static/file.csv')
    await clickAction(page, 3, 'AUTO')
    await page.waitForTimeout(3000)
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).not.toBe(
      'Unmapped'
    )
  })

  test('Does the erase button work', async ({ page }) => {
    await init(page)
    await login(page)
    await importFile(page, 'static/file.csv')
    await clickAction(page, 3, 'AUTO')
    await page.waitForTimeout(3000)
    const value = await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).not.toBe(
      'Unmapped'
    )
    await clickAction(page, 3, 'Delete')
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).not.toBe(
      value
    )
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).toBe('Unmapped')
  })

  test('Does the automap button give the same result as the automap settings (English)', async ({ page }) => {
    await init(page)
    await login(page)
    await importFile(page, 'static/file.csv')
    await enableSettings(page, 'autoMapping')
    await page.waitForTimeout(3000)
    const settingAutomappedValue = await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()
    expect(settingAutomappedValue).not.toBe('Unmapped')
    await clickAction(page, 3, 'Delete')
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).toBe('Unmapped')
    await page.waitForTimeout(1000)
    await clickAction(page, 3, 'AUTO')
    await page.waitForTimeout(3000)
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).toBe(settingAutomappedValue)
  })

  test('Does the automap button give the same result as the automap settings (Dutch)', async ({ page }) => {
    await init(page)
    await login(page)
    await importFile(page, 'static/file.csv')
    await enableSettings(page, 'autoMapping')
    await enableSettings(page, 'lang', 'nl')
    await page.waitForTimeout(7000)
    const settingAutomappedValue = await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()
    expect(settingAutomappedValue).not.toBe('Unmapped')
    await clickAction(page, 3, 'Delete')
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).toBe('Unmapped')
    await clickAction(page, 3, 'AUTO')
    await page.waitForTimeout(3000)
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).toBe(settingAutomappedValue)
  })
})

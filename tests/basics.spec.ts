import { expect, test, type Page } from '@playwright/test'
import { base } from '$app/paths'

const init = async (page: Page) => {
  await page.goto(`${base}/`)
  await login(page)
  await importFile(page, 'static/file.csv')
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
  await page.setInputFiles('input[type=\'file\']', filePath)
}

const enableSettings = async (
  page: Page,
  setting: 'autoMapping' | 'mapToMultiple' | 'lang' | 'defaultVocab' | 'fontSize',
  settingValue?: string,
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
    await page.locator('#settings label').nth(0).click()
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
  await page.getByRole('table').getByRole('button', { name: 'Settings button' }).click()
  for (const col of columns) {
    await page.locator(`input[name="${col}"]`).check()
  }
  // Close the dialog
  await page.getByRole('dialog').getByRole('button').click()
}

const clickAction = async (
  page: Page,
  rowIndex: number,
  action: 'Approve' | 'Flag' | 'Unapprove' | 'Delete' | 'AUTO' | 'Delete' | 'Map',
) => {
  await page
    .getByRole('table')
    .getByRole('row')
    .nth(rowIndex)
    .getByRole('cell')
    .nth(0)
    .getByRole('button', { name: action, exact: true })
    .click()
}

const openAndMapRow = async (
  page: Page,
  mainTableIndex: number,
  athenaIndex: number,
  extra?: {
    equivalence?: 'EQUAL' | 'EQUIVALENT' | 'WIDER' | 'NARROWER' | 'INEXACT' | 'UNMATCHED' | 'UNREVIEWED'
    reviewer?: string
    comment?: string
  },
) => {
  await clickAction(page, mainTableIndex, 'Map')

  if (extra) {
    for (const detail of Object.keys(extra)) {
      if (extra[detail as keyof object]) {
        if (detail == 'equivalence') await page.getByTitle('Equivalence').selectOption(extra[detail as keyof object])
        else if (detail == 'reviewer')
          await page.getByRole('textbox', { name: 'Assigned Reviewer' }).fill(extra[detail as keyof object])
        else if (detail == 'comment')
          await page.getByRole('textbox', { name: 'Comments' }).fill(extra[detail as keyof object])
      }
    }
  }

  await page
    .getByRole('dialog')
    .locator('[data-component="datatable-content"]')
    .getByRole('table')
    .getByRole('row')
    .nth(athenaIndex)
    .getByRole('cell')
    .nth(0)
    .getByRole('button')
    .nth(0)
    .click()
  await page.locator('[data-name="athena-dialog"]').locator('[data-name="close-dialog"]').click()
}

const openAndAddDetails = async (
  page: Page,
  mainTableIndex: number,
  extra: {
    reviewer?: string
    comment?: string
  },
) => {
  await clickAction(page, mainTableIndex, 'Map')

  for (const detail of Object.keys(extra)) {
    if (extra[detail as keyof object]) {
      if (detail == 'reviewer')
        await page.getByRole('textbox', { name: 'Assigned Reviewer' }).fill(extra[detail as keyof object])
      else if (detail == 'comment')
        await page.getByRole('textbox', { name: 'Comments' }).fill(extra[detail as keyof object])
    }
  }

  await page.locator('[data-name="athena-dialog"]').locator('[data-name="close-dialog"]').click()
}

const applyAthenaFilter = async (
  page: Page,
  mainTableIndex: number,
  filters: Record<string, string>,
  check: boolean = true,
  openPopup: boolean = true,
) => {
  if (openPopup) await clickAction(page, mainTableIndex, 'Map')
  await page.getByRole('button', { name: 'F I L T E R S' }).click()
  for (const filter of Object.keys(filters)) {
    await page.getByRole('button', { name: filter }).click()
    await page.getByRole('textbox', { name: 'Search for filter' }).fill(filters[filter])
    await page.getByRole('textbox', { name: 'Search for filter' }).press('Enter')
    if (check) await page.getByLabel(filters[filter]).check()
    else await page.getByLabel(filters[filter]).uncheck()
    await page.getByRole('button', { name: 'Remove input filter' }).click()
  }
}

const removeAthenaFilter = async (page: Page, mainTableIndex: number, filters: string[], openPopup: boolean = true) => {
  if (openPopup) await clickAction(page, mainTableIndex, 'Map')
  for (const filter of filters) {
    await page.locator(`#${filter}`).getByRole('button').click()
  }
}

const openAndCustomMapFirstRow = async (
  page: Page,
  options: { domainId: string; vocabId: string | undefined; conceptClassId: string; conceptName: string },
  mainTableIndex: number,
) => {
  await clickAction(page, mainTableIndex, 'Map')
  await page.getByRole('button', { name: 'Custom concept' }).click()
  await page.getByTitle('domainId').fill(options.domainId)
  if (options.vocabId !== undefined) await page.getByTitle('vocabularyId').fill(options.vocabId)
  await page.getByTitle('conceptClassId').fill(options.conceptClassId)
  await page.getByTitle('conceptName').fill(options.conceptName)
  await page.waitForTimeout(1000)
  await page.locator('[data-name="custom-concept-actions"]').getByRole('button').click()
  await page.locator('[data-name="athena-dialog"]').locator('[data-name="close-dialog"]').click()
}

const openMappedConceptsForFirstRow = async (page: Page, mainTableIndex: number) => {
  await clickAction(page, mainTableIndex, 'Map')
  await page.getByRole('button', { name: 'Mapped concepts' }).click()
}

const removeConceptInMappedConceptsTable = async (page: Page, mainTableIndex: number, mappedConceptIndex: number) => {
  await clickAction(page, mainTableIndex, 'Map')
  await page.getByRole('button', { name: 'Mapped concepts' }).click()
  const pre = await page
    .locator('[data-name="alreadymapped-table"]')
    .getByRole('row')
    .nth(mappedConceptIndex)
    .getByRole('cell')
    .nth(4)
    .textContent()
  await page
    .locator('[data-name="alreadymapped-table"]')
    .getByRole('row')
    .nth(mappedConceptIndex)
    .getByRole('cell')
    .nth(0)
    .getByRole('button')
    .click()
  const after = await page
    .locator('[data-name="alreadymapped-table"]')
    .getByRole('row')
    .nth(mappedConceptIndex)
    .getByRole('cell')
    .nth(4)
    .textContent()
  return {
    pre,
    after,
  }
}

test.describe('Testing the author functionalities of the mappingtool', () => {
  test('Log in with an author', async ({ page }) => {
    await page.goto(`${base}/`)
    await login(page, 'John Doe')
    // Check the author name in the author button
    await expect(page.getByRole('button', { name: 'User button' }).locator('p')).toHaveText('John Doe')
  })

  test('Cancel the user in the onboarding', async ({ page }) => {
    await page.goto(`${base}/`)
    await login(page)
    // Check if you have left the dialog because normally it is not possible, so you should still see the save button
    expect(await page.locator('button:text("Save")'))
  })

  test('Cancel change of user after it was filled in, in the onboarding', async ({ page }) => {
    await page.goto(`${base}/`)
    await login(page, 'John Doe')
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
    // Check if the table is visible
    await expect(page.getByRole('table')).toBeVisible()
    // Check if the title "sourceCode" is visible in the columns
    await expect(page.locator('p:text("sourceCode")')).toBeVisible()
  })

  test('Import a file and then upload another file and check if the import is correct', async ({ page }) => {
    await init(page)
    const cellValue1 = await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(2).innerText()
    await importFile(page, 'static/file2.csv')
    await expect(page.getByRole('table')).toBeVisible()
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(2).innerText()).not.toBe(
      cellValue1,
    )
  })
})

test.describe('Testing the automapping functionalities', () => {
  test('Import the file and then enable automapping', async ({ page }) => {
    await init(page)
    await enableSettings(page, 'autoMapping')
    // Wait a bit because the fetch request needs time
    await page.waitForTimeout(3000)
    // Check for the first row if the conceptName is not Unmapped
    await expect(page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4)).not.toBe('Unmapped')
  })
  test('Enable automapping and then import the file', async ({ page }) => {
    await page.goto(`${base}/`)
    await login(page)
    await enableSettings(page, 'autoMapping')
    await importFile(page, 'static/file.csv')
    // Wait a bit because the fetch request needs time
    await page.waitForTimeout(3000)
    // Check for the first row if the conceptName is not Unmapped
    await expect(page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4)).not.toBe('Unmapped')
  })
})

test.describe('Testing the actions functionalities', () => {
  test('Does the approve button work for the first author', async ({ page }) => {
    await init(page)
    await clickAction(page, 3, 'Approve')
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(5).innerText()).toBe(
      'SEMI-APPROVED',
    )
  })
  test('Does the flag buton work', async ({ page }) => {
    await init(page)
    await clickAction(page, 3, 'Flag')
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(5).innerText()).toBe(
      'FLAGGED',
    )
  })
  test('Does the unapprove button work', async ({ page }) => {
    await init(page)
    await clickAction(page, 3, 'Unapprove')
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(5).innerText()).toBe(
      'UNAPPROVED',
    )
  })
  test('Does the approve button work for the second author', async ({ page }) => {
    await init(page)
    await clickAction(page, 3, 'Approve')
    await login(page, 'Polleke Pollen', false)
    await clickAction(page, 3, 'Approve')
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(5).innerText()).toBe(
      'APPROVED',
    )
  })
  test('Does the approve button work for the second author when the second author edits mapping', async ({ page }) => {
    await init(page)
    await clickAction(page, 3, 'Approve')
    await login(page, 'Polleke Pollen', false)
    await openAndMapRow(page, 3, 3)
    await clickAction(page, 3, 'Approve')
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(5).innerText()).toBe(
      'SEMI-APPROVED',
    )
  })
  test('Does the automap button work', async ({ page }) => {
    await init(page)
    await clickAction(page, 3, 'AUTO')
    await page.waitForTimeout(3000)
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).not.toBe(
      'Unmapped',
    )
  })
  test('Does the erase button work', async ({ page }) => {
    await init(page)
    await clickAction(page, 3, 'AUTO')
    await page.waitForTimeout(3000)
    const value = await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).not.toBe(
      'Unmapped',
    )
    await clickAction(page, 3, 'Delete')
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).not.toBe(
      value,
    )
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).toBe('Unmapped')
  })
  test('Does the automap button give the same result as the automap settings (English)', async ({ page }) => {
    await init(page)
    await enableSettings(page, 'autoMapping')
    await page.waitForTimeout(7000)
    const settingAutomappedValue = await page
      .getByRole('table')
      .getByRole('row')
      .nth(3)
      .getByRole('cell')
      .nth(4)
      .innerText()
    expect(settingAutomappedValue).not.toBe('Unmapped')
    await clickAction(page, 3, 'Delete')
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).toBe('Unmapped')
    await page.waitForTimeout(1000)
    await clickAction(page, 3, 'AUTO')
    await page.waitForTimeout(3000)
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).toBe(
      settingAutomappedValue,
    )
  })
  test('Does the automap button give the same result as the automap settings (Dutch)', async ({ page }) => {
    await init(page)
    await enableSettings(page, 'lang', 'nl')
    await enableSettings(page, 'autoMapping')
    await page.waitForTimeout(7000)
    const settingAutomappedValue = await page
      .getByRole('table')
      .getByRole('row')
      .nth(3)
      .getByRole('cell')
      .nth(4)
      .innerText()
    expect(settingAutomappedValue).not.toBe('Unmapped')
    await clickAction(page, 3, 'Delete')
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).toBe('Unmapped')
    await clickAction(page, 3, 'AUTO')
    await page.waitForTimeout(3000)
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).toBe(
      settingAutomappedValue,
    )
  })
  test('Is the conceptId filled in when approving the automapping (manual automap)', async ({ page }) => {
    await init(page)
    await clickAction(page, 3, 'AUTO')
    await page.waitForTimeout(1000)
    await clickAction(page, 3, 'Approve')
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).not.toBe(
      'Unmapped',
    )
  })
  test('Is the conceptId filled in when approving the automapping (automatic automap)', async ({ page }) => {
    await init(page)
    await enableSettings(page, 'autoMapping')
    await page.waitForTimeout(3000)
    await clickAction(page, 3, 'Approve')
    await page.waitForTimeout(1000)
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).not.toBe(
      'Unmapped',
    )
  })
  test('Does the approve page work', async ({ page }) => {
    await init(page)
    await page.getByRole('button', { name: 'Approve page' }).click()
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(5).innerText()).toBe(
      'SEMI-APPROVED',
    )
    await login(page, 'Polleke Pollen', false)
    await page.getByRole('button', { name: 'Approve page' }).click()
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(5).innerText()).toBe('APPROVED')
  })
})

test.describe('Testing the manual mapping', () => {
  test('Manual map a concept', async ({ page }) => {
    await init(page)
    await openAndMapRow(page, 3, 3)
    await expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).not.toBe(
      'Unmapped',
    )
  })

  test('Custom concept mapping', async ({ page }) => {
    await init(page)
    await openAndCustomMapFirstRow(
      page,
      { domainId: 'Note', vocabId: 'test', conceptClassId: 'CDT', conceptName: 'test' },
      3,
    )
    expect(await page.getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(4).innerText()).not.toBe(
      'Unmapped',
    )
  })

  test('Multiple mapping with Athena concepts', async ({ page }) => {
    await init(page)
    await enableSettings(page, 'mapToMultiple')
    await openAndMapRow(page, 3, 3)
    await openAndMapRow(page, 3, 4)
    await openMappedConceptsForFirstRow(page, 3)
    expect(await page.getByRole('dialog').getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(1)).not.toBe(
      null,
    )
    expect(await page.getByRole('dialog').getByRole('table').getByRole('row').nth(4).getByRole('cell').nth(1)).not.toBe(
      null,
    )
  })

  test('Multiple mapping with custom concepts', async ({ page }) => {
    await init(page)
    await enableSettings(page, 'mapToMultiple')
    await openAndCustomMapFirstRow(
      page,
      { domainId: 'Note', vocabId: 'test', conceptClassId: 'CDT', conceptName: 'test' },
      3,
    )
    await openAndCustomMapFirstRow(
      page,
      { domainId: 'Condition', vocabId: 'test', conceptClassId: 'CDT', conceptName: 'test' },
      3,
    )
    await openMappedConceptsForFirstRow(page, 3)
    expect(await page.getByRole('dialog').getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(1)).not.toBe(
      null,
    )
    expect(await page.getByRole('dialog').getByRole('table').getByRole('row').nth(4).getByRole('cell').nth(1)).not.toBe(
      null,
    )
  })

  test('Multiple mapping with Athena and custom concepts', async ({ page }) => {
    await init(page)
    await enableSettings(page, 'mapToMultiple')
    await openAndMapRow(page, 3, 3)
    await openAndCustomMapFirstRow(
      page,
      { domainId: 'Note', vocabId: 'test', conceptClassId: 'CDT', conceptName: 'test' },
      3,
    )
    await openMappedConceptsForFirstRow(page, 3)
    expect(await page.getByRole('dialog').getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(1)).not.toBe(
      null,
    )
    expect(await page.getByRole('dialog').getByRole('table').getByRole('row').nth(4).getByRole('cell').nth(1)).not.toBe(
      null,
    )
  })

  test('A custom concept can not be added twice with the same values', async ({ page }) => {
    await init(page)
    await enableSettings(page, 'mapToMultiple')
    await openAndCustomMapFirstRow(
      page,
      { domainId: 'Note', vocabId: 'test', conceptClassId: 'CDT', conceptName: 'test' },
      3,
    )
    await openAndCustomMapFirstRow(
      page,
      { domainId: 'Note', vocabId: 'test', conceptClassId: 'CDT', conceptName: 'test' },
      3,
    )
    await openMappedConceptsForFirstRow(page, 3)
    expect(await page.getByRole('dialog').getByRole('table').getByRole('row').nth(3).getByRole('cell').nth(1)).not.toBe(
      null,
    )
  })

  test('A concept can be removed in the mapped concepts table', async ({ page }) => {
    await init(page)
    await enableSettings(page, 'mapToMultiple')
    await openAndMapRow(page, 3, 3)
    await openAndMapRow(page, 3, 4)
    const { pre, after } = await removeConceptInMappedConceptsTable(page, 3, 3)
    if (after !== undefined) expect(pre).not.toBe(after)
    else expect(pre).not.toBe(null)
  })

  test('Does the filter on Athena work', async ({ page }) => {
    await init(page)
    await applyAthenaFilter(page, 8, { Domain: 'Observation' }, true, true)
    expect(
      await page
        .locator('dialog')
        .locator('[data-name="table-container"]')
        .getByRole('row')
        .nth(3)
        .getByRole('cell')
        .nth(5),
    ).not.toBe('Observation')
  })

  test('Can a filter be removed from the filter list', async ({ page }) => {
    await init(page)
    await applyAthenaFilter(page, 8, { Domain: 'Procedure' }, true, true)
    expect(
      await page
        .locator('dialog')
        .locator('[data-name="table-container"]')
        .getByRole('row')
        .nth(3)
        .getByRole('cell')
        .nth(5),
    ).not.toBe('Procedure')
    await removeAthenaFilter(page, 8, ['Procedure'], false)
    expect(
      await page
        .locator('dialog')
        .locator('[data-name="table-container"]')
        .getByRole('row')
        .nth(3)
        .getByRole('cell')
        .nth(5),
    ).not.toBe('Observation')
  })

  test('Can the equality be changed', async ({ page }) => {
    await init(page)
    await openAndMapRow(page, 8, 3, { equivalence: 'NARROWER' })
    await showColumns(page, ['equivalence'])
    await page.waitForTimeout(5000)
    expect(await page.getByRole('table').getByRole('row').nth(8).getByRole('cell').nth(6).innerText()).toBe('NARROWER')
  })

  test('Can a reviewer be added with mapping', async ({ page }) => {
    await init(page)
    await openAndMapRow(page, 8, 3, { reviewer: 'Jean-Paul' })
    await showColumns(page, ['assignedReviewer'])
    await page.waitForTimeout(1000)
    expect(await page.getByRole('table').getByRole('row').nth(8).getByRole('cell').nth(6).innerText()).toBe('Jean-Paul')
  })

  test('Can a reviewer be added without mapping', async ({ page }) => {
    await init(page)
    await openAndAddDetails(page, 8, { reviewer: 'Jean-Paul' })
    await showColumns(page, ['assignedReviewer'])
    await page.waitForTimeout(1000)
    expect(await page.getByRole('table').getByRole('row').nth(8).getByRole('cell').nth(6).innerText()).toBe('Jean-Paul')
  })

  test('Can a comment be added with mapping', async ({ page }) => {
    await init(page)
    await openAndMapRow(page, 8, 3, { comment: 'Jean-Paul is testing' })
    await showColumns(page, ['comment'])
    await page.waitForTimeout(1000)
    expect(await page.getByRole('table').getByRole('row').nth(8).getByRole('cell').nth(6).innerText()).toBe(
      'Jean-Paul is testing',
    )
  })

  test('Can a comment be added without mapping', async ({ page }) => {
    await init(page)
    await openAndAddDetails(page, 8, { comment: 'Jean-Paul is testing' })
    await showColumns(page, ['comment'])
    await page.waitForTimeout(1000)
    expect(await page.getByRole('table').getByRole('row').nth(8).getByRole('cell').nth(6).innerText()).toBe(
      'Jean-Paul is testing',
    )
  })
})

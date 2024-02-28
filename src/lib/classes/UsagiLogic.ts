import type { IExtraUsagiCols, IUsagiAllExtra, IUsagiRow, IUser } from '$lib/components/Types'
import type TableLogic from '$lib/classes/TableLogic'
import { table, user } from '$lib/store'
import additionalColumns from '$lib/data/additionalColumns.json'

const additionalFields: IExtraUsagiCols = additionalColumns

export default class UsagiLogic {
  row: IUsagiRow
  index: number

  constructor(row: IUsagiRow, index: number) {
    this.row = row
    this.index = index
  }

  async resetRow() {
    const table = await this.getTable()
    if (!table) return
    const resetProperties = this.resetPropertiesOfRow()
    await table.updateRows(new Map([[this.index, resetProperties]]))
  }

  private resetPropertiesOfRow() {
    const reset: IUsagiAllExtra = additionalFields
    reset.conceptId = null
    reset.domainId = null
    reset.vocabularyId = null
    reset.conceptName = null
    delete reset.sourceAutoAssignedConceptIds
    return reset
  }

  async deleteRow() {
    // TODO: delete row
    // TODO: check for custom concepts
  }

  private async getTable(): Promise<TableLogic | undefined> {
    return new Promise(resolve => table.subscribe(table => resolve(table)))
  }
}

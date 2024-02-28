import { query } from 'arquero'
import additionalColumns from '$lib/data/additionalColumns.json'
import { customTable, table } from '$lib/store'
import type TableLogic from '$lib/classes/TableLogic'
import type Query from 'arquero/dist/types/query/query'
import type { IExtraUsagiCols, IUsagiAllExtra, IUsagiRow } from '$lib/components/Types'

const additionalFields: IExtraUsagiCols = additionalColumns

export default class UsagiLogic {
  row: IUsagiRow
  index: number

  constructor(row: IUsagiRow, index: number) {
    this.row = row
    this.index = index
  }

  async deleteRow(): Promise<void> {
    if (this.row['ADD_INFO:customConcept']) await this.deleteCustomConcept()
    await this.determineToResetOrDeleteRow()
  }

  private async deleteCustomConcept() {
    const index = await this.getCustomConceptIndex()
    if (!index) return
    const customTable = await this.getCustomTable()
    if (!customTable) return
    await customTable.deleteRows([index])
  }

  private async getCustomConceptIndex(): Promise<number | undefined> {
    const params = { conceptName: this.row.concepName, sourceCode: this.row.sourceCode }
    const indexQuery = (<Query>query().params(params)).filter(this.customConceptFilter).toObject()
    const customTable = await this.getCustomTable()
    if (!customTable) return
    const queryResult = await customTable.executeQueryAndReturnResults(indexQuery)
    if (!queryResult.indices.length) return
    return queryResult.indices[0]
  }

  private customConceptFilter(row: IUsagiRow, params: Record<string, string>) {
    const equalSourceCode = row.sourceCode === params.sourceCode
    const equalConceptName = row.conceptName === params.conceptName
    return equalSourceCode && equalConceptName
  }

  private async determineToResetOrDeleteRow() {
    const conceptsNumber = this.row['ADD_INFO:numberOfConcepts']
    if (!conceptsNumber || conceptsNumber < 2) await this.resetRow()
    else {
      await this.deleteRowOnIndex()
      await this.updateRowsWithSameSourceCode()
    }
  }

  private async resetRow() {
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

  private async deleteRowOnIndex() {
    const table = await this.getTable()
    if (!table) return
    await table.deleteRows([this.index])
  }

  private async updateRowsWithSameSourceCode() {
    const indices = await this.getConceptsIndices()
    const rowsToUpdate = new Map()
    for (let i of indices) rowsToUpdate.set(i, { 'ADD_INFO:numberOfConcepts': indices.length })
    const table = await this.getTable()
    if (!table) return
    await table.updateRows(rowsToUpdate)
  }

  private async getConceptsIndices(): Promise<number[]> {
    const params = { sourceCode: this.row.sourceCode }
    const indexQuery = (<Query>query().params(params)).filter(this.conceptFilter).toObject()
    const table = await this.getTable()
    if (!table) return []
    const queryResult = await table.executeQueryAndReturnResults(indexQuery)
    if (!queryResult.indices.length) return []
    return queryResult.indices
  }

  private conceptFilter(row: IUsagiRow, params: Record<string, string>) {
    const equalSourceCode = row.sourceCode === params.sourceCode
    return equalSourceCode
  }

  private async getTable(): Promise<TableLogic | undefined> {
    return new Promise(resolve => table.subscribe(table => resolve(table)))
  }

  private async getCustomTable(): Promise<TableLogic | undefined> {
    return new Promise(resolve => customTable.subscribe(table => resolve(table)))
  }
}

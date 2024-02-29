import { query } from 'arquero'
import additionalColumns from '$lib/data/additionalColumns.json'
import { customTable, table } from '$lib/store'
import type Query from 'arquero/dist/types/query/query'
import type DataTable from '@radar-azdelta/svelte-datatable'
import type { IExtraUsagiCols, IUsagiAllExtra, IUsagiLogic, IUsagiRow } from '$lib/components/Types'

const additionalFields: IExtraUsagiCols = additionalColumns

export default class UsagiLogic implements IUsagiLogic {
  row: IUsagiRow
  index: number

  constructor(row: IUsagiRow, index: number) {
    this.row = row
    this.index = index
  }

  async updatePropertyValue(e: CustomEvent, column: string) {
    const updatedProperty = { [column]: e.detail }
    const table = await this.getTable()
    if (!table) return
    await table.updateRows(new Map([[this.index, updatedProperty]]))
  }

  async deleteRow() {
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

  private async getNumberOfConcepts() {
    const params = { sourceCode: this.row.sourceCode }
    const numberQuery = (<Query>query().params(params))
      .filter((r: any, p: any) => r.sourceCode === p.sourceCode)
      .toObject()
    const table = await this.getTable()
    if (!table) return 0
    const queryResult = await table.executeQueryAndReturnResults(numberQuery)
    if (!queryResult.indices.length) return 0
    return queryResult.indices.length
  }

  private async determineToResetOrDeleteRow() {
    const conceptsNumber = await this.getNumberOfConcepts()
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

  private async getTable(): Promise<DataTable | undefined> {
    return new Promise(resolve => table.subscribe(table => resolve(table)))
  }

  private async getCustomTable(): Promise<DataTable | undefined> {
    return new Promise(resolve => customTable.subscribe(table => resolve(table)))
  }
}

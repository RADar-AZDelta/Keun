import { query } from 'arquero'
import StoreMethods from '$lib/classes/StoreMethods'
import { Config } from '$lib/helperClasses/Config'
import type Query from 'arquero/dist/types/query/query'
import type { IExtraUsagiCols, IQueryResult, IUsagiAllExtra, IUsagiInfo, IUsagiRow } from '$lib/components/Types'

const additionalFields: IExtraUsagiCols = Config.additionalColumns

export default class UsagiRowDelete {
  private static usagiRow: IUsagiRow
  private static usagiRowIndex: number

  static async deleteRow(usagiInfo: IUsagiInfo) {
    await this.updateVars(usagiInfo)
    if (this.usagiRow['ADD_INFO:customConcept']) await this.deleteCustomConcept()
    await this.determineToResetOrDeleteRow()
    await this.deleteFromMappedConceptIds()
  }

  private static async updateVars({ usagiRow, usagiRowIndex }: IUsagiInfo) {
    this.usagiRow = usagiRow
    this.usagiRowIndex = usagiRowIndex
  }

  private static async deleteCustomConcept() {
    const index = await this.getCustomConceptIndex()
    if (!index) return
    await StoreMethods.deleteCustomTableRows([index])
  }

  private static async getCustomConceptIndex() {
    const params = {
      concept_name: this.usagiRow.conceptName,
      domain_id: this.usagiRow.domainId,
      vocabulary_id: this.usagiRow.vocabularyId,
    }
    const indexQuery = (<Query>query().params(params))
      .filter(
        (r: any, p: any) =>
          r.concept_name === p.concept_name && r.domain_id === p.domain_id && r.vocabulary_id === p.vocabulary_id,
      )
      .toObject()
    const queryResult = await StoreMethods.executeQueryOnCustomTable(indexQuery)
    if (!queryResult.indices.length) return
    return queryResult.indices[0]
  }

  private static async getNumberOfConcepts() {
    const params = { sourceCode: this.usagiRow.sourceCode }
    console.log('IN GETNUMBEROFCONCEPTS')
    const numberQuery = (<Query>query().params(params))
      .filter((r: any, p: any) => r.sourceCode === p.sourceCode)
      .toObject()
    const queryResult = await StoreMethods.executeQueryOnTable(numberQuery)
    if (!queryResult.indices.length) return 0
    return queryResult.indices.length
  }

  private static async determineToResetOrDeleteRow() {
    const conceptsNumber = await this.getNumberOfConcepts()
    if (!conceptsNumber || conceptsNumber < 2) await this.resetRow()
    else {
      await this.deleteRowOnIndex()
      await this.updateRowsWithSameSourceCode()
    }
  }

  private static async resetRow() {
    const resetProperties = this.resetPropertiesOfRow()
    await StoreMethods.updateTableRows(new Map([[this.usagiRowIndex, resetProperties]]))
  }

  private static resetPropertiesOfRow() {
    const reset: IUsagiAllExtra = additionalFields
    reset.conceptId = null
    reset.domainId = null
    reset.vocabularyId = null
    reset.conceptName = null
    delete reset.sourceAutoAssignedConceptIds
    return reset
  }

  private static async deleteRowOnIndex() {
    await StoreMethods.deleteTableRow(this.usagiRowIndex)
  }

  private static async updateRowsWithSameSourceCode() {
    const indices = await this.getConceptsIndices()
    const rowsToUpdate = new Map()
    for (let i of indices) rowsToUpdate.set(i, { 'ADD_INFO:numberOfConcepts': indices.length })
    await StoreMethods.updateTableRows(rowsToUpdate)
  }

  private static async getConceptsIndices() {
    const params = { sourceCode: this.usagiRow.sourceCode }
    const indexQuery = (<Query>query().params(params))
      .filter((r: any, p: any) => r.sourceCode === p.sourceCode)
      .toObject()
    const queryResult = await StoreMethods.executeQueryOnTable(indexQuery)
    if (!queryResult.indices.length) return []
    return queryResult.indices
  }

  private static async deleteFromMappedConceptIds() {
    if (!this.usagiRow.conceptId) return
    await StoreMethods.deleteConceptInMappedConceptsBib(this.usagiRow.sourceCode, this.usagiRow.conceptId)
  }
}

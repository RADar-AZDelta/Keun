import { query } from 'arquero'
import SingleMapping from '$lib/classes/mapping/SingleMapping'
import CommonMapping from '$lib/classes/mapping/CommonMapping'
import Table from '../tables/Table'
import MappedConcepts from '../general/MappedConcepts'
import type Query from 'arquero/dist/types/query/query'
import type { IAthenaInfo, IMappedRows, IQueryResult, IUsagiRow } from '$lib/Types'

export default class MultipleMapping extends CommonMapping {
  static async multipleMapping(athenaInfo: IAthenaInfo, action: string, equivalence: string, custom: boolean = false) {
    await this.setVars(athenaInfo, action, equivalence, custom)
    const alreadyMapped = await this.checkIfRowIsNotAlreadyMapped()
    if (alreadyMapped) return
    const alreadyMappedRows = await this.getAlreadyMappedRows()
    const isTheFirstRowMapped = await this.checkIfRowIsMapped(alreadyMappedRows.queriedData[0])
    const updatedActionIndex = await this.checkIfTheConceptActionIsUpdated(alreadyMappedRows)
    const currentRowIsUnmapped = await this.checkIfTheCurrentRowIsUnmapped()
    if (!isTheFirstRowMapped || updatedActionIndex !== -1 || currentRowIsUnmapped)
      return await this.singleMapping(updatedActionIndex, alreadyMappedRows.indices.length)
    const mappedRowIndex = await this.getRowIndexFromQueryData(alreadyMappedRows)
    await this.mapConceptOfMultiple(alreadyMappedRows, mappedRowIndex)
    await this.updateNumberOfConcepts(alreadyMappedRows)
  }

  private static async checkIfTheCurrentRowIsUnmapped() {
    if (this.usagiRow.mappingStatus === 'UNMAPPED') return true
    return false
  }

  private static async checkIfTheConceptActionIsUpdated(alreadyMappedRows: IQueryResult) {
    const { id, name, domain, vocabulary, className } = this.athenaRow
    let sameRowIndex = -1
    for (let i = 0; i < alreadyMappedRows.indices.length; i++) {
      const { conceptId, conceptName, domainId, vocabularyId, className: classN } = alreadyMappedRows.queriedData[i]
      if (
        conceptId === id &&
        conceptName === name &&
        domainId === domain &&
        vocabularyId === vocabulary &&
        className === classN
      )
        sameRowIndex = alreadyMappedRows.indices[i]
    }
    return sameRowIndex
  }

  private static async singleMapping(updatedRowIndex: number, conceptsNumbers: number) {
    this.usagiRow['ADD_INFO:numberOfConcepts'] = conceptsNumbers
    const usagiRowIndex = updatedRowIndex !== -1 ? updatedRowIndex : this.usagiRowIndex
    const athenaInfo = { athenaRow: this.athenaRow, usagiRow: this.usagiRow, usagiRowIndex }
    await SingleMapping.singleMapping(athenaInfo, this.action, this.equivalence, this.custom)
  }

  private static async checkIfRowIsNotAlreadyMapped() {
    const mappedToConceptIds = await MappedConcepts.getMappedConceptsBib()
    if (!this.usagiRow?.sourceCode || this.athenaRow?.id === undefined || this.athenaRow?.id === null) return false
    const conceptKey = await this.getConceptKey()
    const mappedConcept = mappedToConceptIds[this.usagiRow.sourceCode]?.[conceptKey]
    return mappedConcept === this.action
  }

  private static async getAlreadyMappedRows() {
    const params = { sourceCode: this.usagiRow!.sourceCode }
    const rowsQuery = (<Query>query().params(params))
      .filter((r: any, p: any) => r.sourceCode === p.sourceCode)
      .toObject()
    const alreadyMappedRows = await Table.executeQueryOnTable(rowsQuery)
    return alreadyMappedRows
  }

  private static async checkIfRowIsMapped(row: IUsagiRow) {
    const customMapped = row['ADD_INFO:customConcept']
    if (customMapped && row.conceptName) return true
    else if (row.conceptId) return true
    else return false
  }

  private static async getRowIndexFromQueryData(data: IQueryResult) {
    const rowIndex = data.queriedData.findIndex(
      r => r.conceptId === this.athenaRow!.id && r.conceptName === this.athenaRow!.name,
    )
    return data.indices[rowIndex]
  }

  private static async mapConceptOfMultiple(mapped: IQueryResult, index: number) {
    if (!this.usagiRow?.sourceCode || this.athenaRow?.id === undefined || this.athenaRow?.id === null) return
    const conceptKey = await this.getConceptKey()
    const updatedConcepts: IMappedRows = { [this.usagiRow.sourceCode]: { [conceptKey]: this.action ?? '' } }
    await MappedConcepts.updateMappedConceptsBib(updatedConcepts)
    const { mappedRow } = await this.rowMapping(index === -1 ? this.usagiRowIndex : index)
    mappedRow['ADD_INFO:numberOfConcepts'] = mapped.indices.length + 1
    await Table.insertTableRow(mappedRow)
  }

  private static async updateNumberOfConcepts(mapped: IQueryResult) {
    const numberOfConcepts = mapped.indices.length + 1
    const rowsToUpdate = new Map()
    for (let rowIndex of mapped.indices) rowsToUpdate.set(rowIndex, { 'ADD_INFO:numberOfConcepts': numberOfConcepts })
    await Table.updateTableRows(rowsToUpdate)
  }

  private static async getConceptKey() {
    if (this.custom) return `custom-${this.athenaRow.name}`
    else return this.athenaRow.id
  }
}

import { query } from 'arquero'
import StoreMethods from '$lib/classes/StoreMethods'
import SingleMapping from '$lib/classes/mapping/SingleMapping'
import CommonMapping from '$lib/classes/mapping/CommonMapping'
import type Query from 'arquero/dist/types/query/query'
import type { IAthenaInfo, IMappedRows, IQueryResult, IUsagiRow } from '$lib/components/Types'

export default class MultipleMapping extends CommonMapping {
  static async multipleMapping(athenaInfo: IAthenaInfo, action: string, equivalence: string, custom: boolean = false) {
    await this.setVars(athenaInfo, action, equivalence, custom)
    const alreadyMapped = await this.checkIfRowIsNotAlreadyMapped()
    if (alreadyMapped) return
    const alreadyMappedRows = await this.getAlreadyMappedRows()
    const isTheFirstRowMapped = await this.checkIfRowIsMapped(alreadyMappedRows.queriedData[0])
    if (!isTheFirstRowMapped) return await this.singleMapping()
    const mappedRowIndex = await this.getRowIndexFromQueryData(alreadyMappedRows)
    await this.mapConceptOfMultiple(alreadyMappedRows, mappedRowIndex)
    await this.updateNumberOfConcepts(alreadyMappedRows)
  }

  private static async singleMapping() {
    const athenaInfo = { athenaRow: this.athenaRow, usagiRow: this.usagiRow, usagiRowIndex: this.usagiRowIndex }
    await SingleMapping.singleMapping(athenaInfo, this.action, this.equivalence, this.custom)
  }

  private static async checkIfRowIsNotAlreadyMapped() {
    const mappedToConceptIds = await StoreMethods.getMappedConceptsBib()
    if (!this.usagiRow?.sourceCode || this.athenaRow?.id === undefined || this.athenaRow?.id === null) return false
    if (this.custom) {
      // TODO: change "this.athenaRow.id" to something unique for custom concepts
      const mappedConcept = mappedToConceptIds[this.usagiRow.sourceCode]?.[`custom-${this.athenaRow.name}`]
      return mappedConcept === this.action
    } else {
      const mappedConcept = mappedToConceptIds[this.usagiRow.sourceCode]?.[this.athenaRow.id]
      return mappedConcept === this.action
    }
  }

  private static async getAlreadyMappedRows() {
    const params = { sourceCode: this.usagiRow!.sourceCode }
    const rowsQuery = (<Query>query().params(params))
      .filter((r: any, p: any) => r.sourceCode === p.sourceCode)
      .toObject()
    const alreadyMappedRows = await StoreMethods.executeQueryOnTable(rowsQuery)
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
    const updatedConcepts: IMappedRows = {
      [this.usagiRow.sourceCode]: {
        [this.custom ? `custom-${this.athenaRow.name}` : this.athenaRow.id]: this.action ?? '',
      },
    }
    console.log('UPDATING ', updatedConcepts)
    await StoreMethods.updateMappedConceptsBib(updatedConcepts)
    const { mappedRow } = await this.rowMapping(index)
    mappedRow['ADD_INFO:numberOfConcepts'] = mapped.indices.length + 1
    await StoreMethods.insertTableRow(mappedRow)
  }

  private static async updateNumberOfConcepts(mapped: IQueryResult) {
    const conceptWasMapped = await this.checkIfConceptWasMapped()
    const numberOfConcepts = conceptWasMapped ? mapped.indices.length + 1 : mapped.indices.length
    const rowsToUpdate = new Map()
    for (let rowIndex of mapped.indices) rowsToUpdate.set(rowIndex, { 'ADD_INFO:numberOfConcepts': numberOfConcepts })
    await StoreMethods.updateTableRows(rowsToUpdate)
  }

  private static async checkIfConceptWasMapped() {
    const mappedConcepts = await StoreMethods.getMappedConceptsBib()
    if (!this.usagiRow?.sourceCode || this.athenaRow?.id === undefined || this.athenaRow?.id === null) return
    const action = mappedConcepts[this.usagiRow?.sourceCode]?.[this.athenaRow?.id]
    return !action
  }
}

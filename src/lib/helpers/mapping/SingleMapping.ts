import Table from '$lib/helpers/tables/Table'
import CommonMapping from '$lib/helpers/mapping/CommonMapping'
import MappedConcepts from '$lib/helpers/general/MappedConcepts'
import type { IAthenaInfo, IMappedRows } from '$lib/interfaces/Types'

export default class SingleMapping extends CommonMapping {
  static async singleMapping(athenaInfo: IAthenaInfo, action: string, equivalence: string, custom: boolean = false) {
    await this.setVars(athenaInfo, action, equivalence, custom)
    if (!this.usagiRow?.sourceCode || this.athenaRow?.id === undefined || this.athenaRow?.id === null) return
    await this.updateMappedConceptsBib()
    await this.updateTableWithMapping()
  }

  private static async updateMappedConceptsBib() {
    const updatedConcepts: IMappedRows = {
      [this.usagiRow.sourceCode]: { [this.custom ? `custom-${this.athenaRow.name}` : this.athenaRow.id]: this.action },
    }
    await MappedConcepts.updateMappedConceptsBib(updatedConcepts)
  }

  private static async updateTableWithMapping() {
    const { mappedIndex, mappedRow } = await this.rowMapping(this.usagiRowIndex, this.usagiRow['ADD_INFO:numberOfConcepts'] ?? 1)
    if (mappedRow === undefined || mappedRow === null) return
    await Table.updateTableRow(mappedIndex, mappedRow)
  }
}

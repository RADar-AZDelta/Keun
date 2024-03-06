import StoreMethods from '$lib/classes/StoreMethods'
import CommonMapping from '$lib/classes/mapping/CommonMapping'
import type { IAthenaInfo, IMappedRows } from '$lib/components/Types'

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
    await StoreMethods.updateMappedConceptsBib(updatedConcepts)
  }

  private static async updateTableWithMapping() {
    const { mappedIndex, mappedRow } = await this.rowMapping()
    if (mappedRow === undefined || mappedRow === null) return
    await StoreMethods.updateTableRow(mappedIndex, mappedRow)
  }
}

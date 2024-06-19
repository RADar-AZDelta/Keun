import Table from '$lib/helpers/tables/Table'
import type DataTable from '@radar-azdelta/svelte-datatable'
import type { ICustomConceptInput, IUsagiRow } from '$lib/interfaces/Types'

export default class CustomTable {
  static table: DataTable

  static async syncFile() {
    const concepts = await Table.extractCustomConceptIds()
    if (!concepts.length) return
    const customConcepts = await this.transformConceptsToCustomConcepts(concepts)
    await this.removeAllTableRows()
    await this.table.insertRows(customConcepts)
    const blob = await this.table.getBlob()
    if (!blob) return
    return blob
  }

  private static async removeAllTableRows() {
    const pagination = this.table.getTablePagination()
    if (!pagination || !pagination.totalRows) return
    await this.table.deleteRows(Array.from(Array(pagination.totalRows).keys()))
  }

  private static async transformConceptsToCustomConcepts(concepts: IUsagiRow[]) {
    const customConcepts: ICustomConceptInput[] = concepts.map(c => {
      return {
        concept_id: c.conceptId ?? 0,
        concept_code: c.sourceCode,
        concept_name: c.conceptName?.replaceAll(',', '') ?? '',
        concept_class_id: c.className ?? 'Observable Entity',
        domain_id: c.domainId ?? 'Observation',
        vocabulary_id: c.vocabularyId ?? 'AZDELTA',
        standard_concept: '',
        valid_start_date: Number(new Date()),
        valid_end_date: Number(new Date('2099-12-31')),
        invalid_reason: '',
      }
    })
    return customConcepts
  }
}

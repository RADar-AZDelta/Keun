import Table from '$lib/helpers/tables/Table'
import type { IUsagiRow } from '$lib/interfaces/Types'
import type DataTable from '@radar-azdelta/svelte-datatable'

export default class FlaggedTable {
  static table: DataTable

  static async syncFile() {
    const concepts = await Table.extractFlaggedConcepts()
    if (!concepts.length) return
    await this.removeAllTableRows()
    const transformConcepts = await this.transformConcepts(concepts)
    await this.table.insertRows(transformConcepts)
    const blob = await this.table.getBlob()
    if (!blob) return
    return blob
  }

  private static async removeAllTableRows() {
    const pagination = this.table.getTablePagination()
    if (!pagination || !pagination.totalRows) return
    await this.table.deleteRows(Array.from(Array(pagination.totalRows).keys()))
  }

  private static async transformConcepts(concepts: IUsagiRow[]) {
    const transformConcepts = concepts.map(c => {
      if (c.conceptName) c.conceptName.replaceAll(',', '')
      return c
    })
    return transformConcepts
  }
}

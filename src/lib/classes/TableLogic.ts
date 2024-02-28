import type DataTable from '@radar-azdelta/svelte-datatable'

export default class Table {
  table: DataTable

  constructor(table: DataTable) {
    this.table = table
  }

  async updateRows(rowsToUpdateByOriginalIndex: Map<number, Record<string, any>>) {
    this.table.updateRows(rowsToUpdateByOriginalIndex)
  }

  async deleteRows(indices: number[]) {
    this.table.deleteRows(indices)
  }

  async executeQueryAndReturnResults(query: object) {
    return this.table.executeQueryAndReturnResults(query)
  }
}

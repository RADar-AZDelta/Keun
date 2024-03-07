import { Config } from '$lib/helperClasses/Config'
import { flaggedTable } from '$lib/store'
import type { IUsagiRow } from '$lib/Types'
import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
import type DataTable from '@radar-azdelta/svelte-datatable'

export default class FlaggedTable {
  static modifyColumnMetadata(columns: IColumnMetaData[]): IColumnMetaData[] {
    const usagiColumnsMap = Config.columnsUsagi.reduce((acc, cur) => {
      acc.set(cur.id, cur)
      return acc
    }, new Map<string, IColumnMetaData>())
    const columnIds = columns.map(col => col.id)
    const modifiedColumns = columns.map(col => {
      const usagiColumn = usagiColumnsMap.get(col.id)
      if (usagiColumn) Object.assign(col, usagiColumn)
      else col.visible = false
      return col
    })
    const addedColumns = Config.columnsUsagi.reduce<IColumnMetaData[]>((acc, cur) => {
      if (!columnIds.includes(cur.id)) acc.push(cur)
      return acc
    }, [])
    return modifiedColumns.concat(addedColumns)
  }

  static async addFlaggedConcepts(concepts: IUsagiRow[]) {
    await this.insertTableRows(concepts)
  }

  static async insertTableRows(rows: IUsagiRow[]) {
    const flaggedTable = await this.getFlaggedTable()
    await flaggedTable.insertRows(rows)
  }

  static async removeAllTableRows() {
    const flaggedTable = await this.getFlaggedTable()
    const pagination = flaggedTable.getTablePagination()
    if (!pagination || !pagination.totalRows) return
    await flaggedTable.deleteRows(Array.from(Array(pagination.totalRows).keys()))
  }

  static async getBlob() {
    const flaggedTable = await this.getFlaggedTable()
    return await flaggedTable.getBlob()
  }

  private static async getFlaggedTable(): Promise<DataTable> {
    return new Promise(resolve =>
      flaggedTable.subscribe(table => {
        if (table) resolve(table)
      }),
    )
  }
}

import { Config } from '$lib/helperClasses/Config'
import DatabaseImpl from '../implementation/DatabaseImpl'
import Table from './Table'
import type { IUsagiRow } from '$lib/Types'
import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
import type DataTable from '@radar-azdelta/svelte-datatable'

export default class FlaggedTable {
  static table: DataTable

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
    await this.table.insertRows(rows)
  }

  static async removeAllTableRows() {
    const pagination = this.table.getTablePagination()
    if (!pagination || !pagination.totalRows) return
    await this.table.deleteRows(Array.from(Array(pagination.totalRows).keys()))
  }

  static async getBlob() {
    return await this.table.getBlob()
  }

  static async syncFile(id: string) {
    const concepts = await Table.extractFlaggedConcepts()
    if (!concepts.length) return
    await this.removeAllTableRows()
    await this.insertTableRows(concepts)
    const blob = await this.getBlob()
    if (!blob) return
    await DatabaseImpl.editFlaggedFile(id, blob)
  }
}

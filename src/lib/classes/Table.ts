import { Config } from '$lib/helperClasses/Config'
import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'

export default class Table {
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
}

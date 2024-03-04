import { Config } from '$lib/helperClasses/Config'
import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'

export default class CustomTable {
  static modifyColumnMetadata(columns: IColumnMetaData[]) {
    const customConceptsColumnMap = Config.columnsCustomConcept.reduce((acc, cur) => {
      acc.set(cur.id, cur)
      return acc
    }, new Map<string, IColumnMetaData>())
    const columnIds = columns.map(col => col.id)
    const modifiedColumns = columns.map(col => {
      const customConceptColumn = customConceptsColumnMap.get(col.id)
      if (customConceptColumn) Object.assign(col, customConceptColumn)
      else col.visible = false
      return col
    })
    const addedColumns = Config.columnsCustomConcept.reduce<IColumnMetaData[]>((acc, cur) => {
      if (!columnIds.includes(cur.id)) acc.push(cur)
      return acc
    }, [])
    return modifiedColumns.concat(addedColumns)
  }
}

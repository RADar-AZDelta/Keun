import { DataTypeCommonBase } from '@radar-azdelta/svelte-datatable/components/datatable/data/DataTypeCommonBase'
import { dev } from '$app/environment'
import type { TFilter } from '@radar-azdelta/svelte-datatable'
import type {
  FetchDataFunc,
  IColumnMetaData,
  IDataTypeFunctionalities,
  IDataTypeInfo,
  IRender,
  SortDirection,
} from '@radar-azdelta/svelte-datatable/components/DataTable'

export class AthenaDataTypeImpl extends DataTypeCommonBase implements IDataTypeFunctionalities {
  async setData(data: IDataTypeInfo): Promise<void> {
    if (data.data) this.data = data.data as FetchDataFunc
    if (data.internalOptions) this.internalOptions = data.internalOptions
    if (data.internalColumns) this.internalColumns = data.internalColumns
    if (data.renderedData) this.renderedData = data.renderedData
  }

  async setInternalColumns(columns: IColumnMetaData[] | undefined): Promise<IColumnMetaData[]> {
    if (columns) this.internalColumns = columns
    if (this.internalColumns) {
      this.internalColumns!.forEach(col => {
        if (!col.width) col.width = this.internalOptions!.defaultColumnWidth
      })
    }
    return this.internalColumns as IColumnMetaData[]
  }

  async render(): Promise<IRender> {
    let start: number
    const filteredColumns = this.internalColumns!.reduce<Map<string, TFilter>>((acc, cur) => {
      if (cur && cur.filter) acc.set(cur.id, cur.filter)
      return acc
    }, new Map<string, TFilter>())
    const sortedColumns = this.internalColumns!.reduce<Map<string, SortDirection>>((acc, cur) => {
      if (cur && cur.sortDirection) acc.set(cur.id, cur.sortDirection)
      return acc
    }, new Map<string, SortDirection>())
    if (dev) start = performance.now()
    const results = await (this.data as FetchDataFunc)(filteredColumns, sortedColumns, this.internalOptions!)
    if (dev) {
      const end = performance.now()
      console.log(`DataTable: fetchData function took: ${Math.round(end - start!)} ms`)
    }
    const originalIndices = Array.from({ length: results.data.length }, (_, i) => i)
    const totalRows = results.totalRows
    this.renderedData = results.data

    return {
      originalIndices,
      totalRows,
      renderedData: this.renderedData,
      internalColumns: this.internalColumns,
    }
  }

  async saveToFile(): Promise<void> {
    const fileHandle: FileSystemFileHandle = await (<any>window).showSaveFilePicker(this.saveOptions)
    let csvArrayObjObjects = ''
    let keyCounterArrayOfObjects: number = 0
    for (let row = 0; row <= this.renderedData!.length; row++) {
      for (const col of this.internalColumns!) {
        if (row == 0) {
          csvArrayObjObjects += col.id + (keyCounterArrayOfObjects + 1 < this.internalColumns!.length ? ',' : '\r\n')
          keyCounterArrayOfObjects++
        } else {
          const value = (<any[]>this.renderedData)[row - 1][col.id as keyof object].toString().replaceAll(',', ';')
          csvArrayObjObjects += value + (keyCounterArrayOfObjects + 1 < this.internalColumns!.length ? ',' : '\r\n')
          keyCounterArrayOfObjects++
        }
      }
      keyCounterArrayOfObjects = 0
    }
    const writableArrayOfObjects = await fileHandle.createWritable()
    await writableArrayOfObjects.write(csvArrayObjObjects)
    await writableArrayOfObjects.close()
  }

  async getBlob(): Promise<Blob> {
    let csvArrayObjObjects = ''
    let keyCounterArrayOfObjects: number = 0
    for (let row = 0; row <= this.renderedData!.length; row++) {
      for (const col of this.internalColumns!) {
        if (row == 0) {
          csvArrayObjObjects += col.id + (keyCounterArrayOfObjects + 1 < this.internalColumns!.length ? ',' : '\r\n')
          keyCounterArrayOfObjects++
        } else {
          const value = (<any[]>this.renderedData)[row - 1][col.id as keyof object].toString().replaceAll(',', ';')
          csvArrayObjObjects += value + (keyCounterArrayOfObjects + 1 < this.internalColumns!.length ? ',' : '\r\n')
          keyCounterArrayOfObjects++
        }
      }
      keyCounterArrayOfObjects = 0
    }
    const blob = new Blob([csvArrayObjObjects], { type: 'text/csv' })
    return blob
  }

  async replaceValuesOfColumn(): Promise<void> {}

  async executeExpressionsAndReturnResults(): Promise<void> {}

  async executeQueryAndReturnResults(): Promise<void> {}

  async insertColumns(): Promise<void> {}

  async getFullRow(): Promise<void> {}

  async deleteRows(): Promise<void> {}

  async insertRows(): Promise<void> {}

  async updateRows(): Promise<void> {}

  async renameColumns(): Promise<void> {}

  async applyFilter(): Promise<void> {}

  async applySort(): Promise<void> {}

  async getNextRow(): Promise<any> {}

  async getPreviousRow(): Promise<any> {}
}

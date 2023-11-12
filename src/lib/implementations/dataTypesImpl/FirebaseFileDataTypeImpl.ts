import type {
  IColumnMetaData,
  IDataTypeInfo,
  IRender,
  ModifyColumnMetadataFunc,
  SortDirection,
  TFilter,
} from '@radar-azdelta/svelte-datatable/components/DataTable'
import type Query from 'arquero/dist/types/query/query'
import { dev } from '$app/environment'
import type {
  MessageRequestLoadFile,
  MessageRequestInsertColumns,
  MessageRequestFetchData,
  MessageResponseFetchData,
  MessageRequestSaveToFile,
  MessageRequestGetBlob,
  MessageResponseGetBlob,
  MessageRequestReplaceValuesOfColumn,
  MessageRequestExecuteExpressionsAndReturnResults,
  MessageResponseExecuteExpressionsAndReturnResults,
  MessageRequestExecuteQueryAndReturnResults,
  MessageResponseExecuteQueryAndReturnResults,
  MessageRequestGetRow,
  MessageResponseGetRow,
  MessageRequestDeleteRows,
  MessageRequestInsertRows,
  MessageRespnseInsertColumns,
  MessageRequestUpdateRows,
  MessageRequestRenameColumns,
  PostMessage,
} from '@radar-azdelta/svelte-datatable/workers/messages'
import DataTableWorker from '@radar-azdelta/svelte-datatable/workers/DataTable.worker?worker'
import { DataTypeCommonBase } from '@radar-azdelta/svelte-datatable/components/datatable/data/DataTypeCommonBase'
import { readDatabase, readFileStorage, uploadFileToStorage, userSessionStore, writeToDatabase } from '$lib/firebase'
import { IndexedDB } from '../../helperClasses/IndexedDB'
import { convertBlobToHexString, convertHexStringToBlob } from '$lib/utils'
import type { IDataTypeFile } from '$lib/components/Types'

// TODO: implement datatype for a Firebase file

export default class FileDataTypeImpl extends DataTypeCommonBase implements IDataTypeFile {
  worker: Worker | undefined
  modifyColumnMetaData: ModifyColumnMetadataFunc | undefined
  fileName: string | undefined
  timeout: NodeJS.Timeout | undefined

  constructor(id?: string | null) {
    super()
    this.worker = new DataTableWorker()
    if (id) this.fileName = id
  }

  async setData(data: IDataTypeInfo): Promise<void> {
    // Settings the data in global vars of the class
    if (data.data) this.data = data.data as File
    if (data.internalOptions) this.internalOptions = data.internalOptions
    if (data.internalColumns) this.internalColumns = data.internalColumns
    if (data.renderedData) this.renderedData = data.renderedData
    this.modifyColumnMetaData = data.modifyColumnMetadata
    if (!this.worker || !(this.data instanceof File)) return
    // Create an URL to load the file
    const url = URL.createObjectURL(this.data as File)
    const extension = (this.data as File)!.name.split('.').pop()!
    if (dev) console.log(`setData: Loading file (${this.fileName}) in webworker`)
    await this.executeWorkerMethod<MessageRequestLoadFile, undefined>('loadFile', { url, extension })
    URL.revokeObjectURL(url)
  }


  private async resetColumnsWidth() {
    this.internalColumns!.forEach(col => {
      if (!col.width) col.width = this.internalOptions?.defaultColumnWidth
    })
    return this.internalColumns as IColumnMetaData[]
  }

  async setInternalColumns(columns: IColumnMetaData[] | undefined): Promise<IColumnMetaData[]> {
    if (!this.data) return await this.resetColumnsWidth()
    const workerColumnsArr = await this.executeWorkerMethod<unknown, string[]>('getColumnNames')
    const workerColumns = workerColumnsArr.map((key, index) => ({ id: key, position: index + 1 }))
    const columnsToWorkWith = columns && columns?.length >= workerColumns.length ? columns : undefined
    if (!this.modifyColumnMetaData)
      return (this.internalColumns = columnsToWorkWith ? columnsToWorkWith : this.internalColumns!)
    const workerColumnIds = workerColumns.map(col => col.id)
    this.internalColumns = this.modifyColumnMetaData(workerColumns)
    const addedColumns = this.internalColumns.map(col => col.id).filter(x => !workerColumnIds.includes(x))
    if (!addedColumns) return await this.resetColumnsWidth()
    const addedCols = this.internalColumns.reduce<IColumnMetaData[]>((acc, cur) => {
      if (addedColumns.includes(cur.id)) acc.push(cur)
      return acc
    }, [])
    await this.executeWorkerMethod<MessageRequestInsertColumns, void>('insertColumns', { columns: addedCols })
    await this.syncFile(true)
    return await this.resetColumnsWidth()
  }

  private async rerender(onlyPaginationChanged: boolean) {
    let totalRows: number = 0,
      originalIndices: number[] = []
    const filteredColumns = this.internalOptions?.globalFilter?.filter
      ? new Map<string, TFilter>([
        [this.internalOptions!.globalFilter!.column, this.internalOptions!.globalFilter!.filter],
      ])
      : this.internalColumns!.reduce<Map<string, TFilter>>((acc, cur, i) => {
        if (cur && cur.filter) acc.set(cur.id, cur.filter)
        return acc
      }, new Map<string, TFilter>())
    const sortedColumns = this.internalColumns!.reduce<Map<string, SortDirection>>((acc, cur, i) => {
      if (cur && cur.sortDirection) acc.set(cur.id, cur.sortDirection)
      return acc
    }, new Map<string, SortDirection>())
    const results = await this.executeWorkerMethod<MessageRequestFetchData, MessageResponseFetchData>('fetchData', {
      filteredColumns,
      sortedColumns,
      pagination: { rowsPerPage: this.internalOptions?.rowsPerPage, currentPage: this.internalOptions?.currentPage },
      onlyPaginationChanged,
    })
    totalRows = results!.totalRows
    this.renderedData = results!.data.map(row =>
      this.internalColumns?.reduce((acc, cur, index) => {
        acc[cur.id!] = row[index]
        return acc
      }, {} as Record<string, any>)
    )
    originalIndices = results!.indices.reduce<number[]>((acc, cur) => {
      acc.push(cur)
      return acc
    }, [])
    return { totalRows, originalIndices }
  }

  async render(onlyPaginationChanged: boolean): Promise<IRender> {
    if (!this.internalColumns) {
      console.error('render: The internalcolumns are undefined, so it could not render')
      return {
        originalIndices: [],
        totalRows: 0,
        renderedData: this.renderedData,
        internalColumns: this.internalColumns,
      }
    }
    const { totalRows, originalIndices } = await this.rerender(onlyPaginationChanged)
    return {
      originalIndices,
      totalRows,
      renderedData: this.renderedData,
      internalColumns: this.internalColumns,
    }
  }

  async saveToFile(): Promise<void> {
    const fileHandle: FileSystemFileHandle = await (<any>window).showSaveFilePicker(this.saveOptions)
    await this.executeWorkerMethod<MessageRequestSaveToFile, void>('saveToFile', { fileHandle })
  }

  async getBlob(): Promise<Blob> {
    const { buffer } = await this.executeWorkerMethod<MessageRequestGetBlob, MessageResponseGetBlob>('getBlob', {
      extension: 'csv',
    })
    const blob = new Blob(buffer, { type: 'text/csv' })
    return blob
  }

  async replaceValuesOfColumn(currentValue: any, updatedValue: any, column: string): Promise<void> {
    await this.executeWorkerMethod<MessageRequestReplaceValuesOfColumn, void>('replaceValuesOfColumn', {
      currentValue,
      updatedValue,
      column,
    })
  }

  async executeExpressionsAndReturnResults(expressions: Record<string, any>): Promise<any> {
    return await this.executeWorkerMethod<
      MessageRequestExecuteExpressionsAndReturnResults,
      MessageResponseExecuteExpressionsAndReturnResults
    >('executeExpressionsAndReturnResults', { expressions })
  }

  async executeQueryAndReturnResults(query: Query | object): Promise<any> {
    const sortedColumns = this.internalColumns!.reduce<Map<string, SortDirection>>((acc, cur, i) => {
      if (cur && cur.sortDirection) acc.set(cur.id, cur.sortDirection)
      return acc
    }, new Map<string, SortDirection>())
    const filteredColumns = this.internalColumns!.reduce<Map<string, TFilter>>((acc, cur, i) => {
      if (cur && cur.filter) acc.set(cur.id, cur.filter)
      return acc
    }, new Map<string, TFilter>())
    const res = await this.executeWorkerMethod<
      MessageRequestExecuteQueryAndReturnResults,
      MessageResponseExecuteQueryAndReturnResults
    >('executeQueryAndReturnResults', {
      usedQuery: query,
      filteredColumns,
      sortedColumns,
    })

    return res
  }

  async insertColumns(cols: IColumnMetaData[]): Promise<IColumnMetaData[]> {
    let uniqueColumns: IColumnMetaData[] = []
    cols.forEach((col) => {
      const foundCol = this.internalColumns?.find(c => c.id === col.id)
      if (foundCol) return console.error(`Column with id ${col.id} already exists`)
      uniqueColumns.push(col)
      if (col.position) return
      const newPosition: number = this.internalColumns!.reduce<number>((acc, cur) => {
        if (cur.position! > acc) return cur.position!
        else return acc
      }, 0) + 1 //add new column at end (with last position)
      col.position = newPosition
    })
    await this.executeWorkerMethod<MessageRequestInsertColumns, void>('insertColumns', { columns: uniqueColumns })
    this.internalColumns = this.internalColumns!.concat(uniqueColumns)
    await this.syncFile(true)
    return this.internalColumns
  }

  async getFullRow(originalIndex: number): Promise<Record<string, any>> {
    const row = (
      await this.executeWorkerMethod<MessageRequestGetRow, MessageResponseGetRow>('getRow', { index: originalIndex })
    ).row
    return this.internalColumns!.reduce((acc, column, idx) => {
      acc[column.id!] = row[idx]
      return acc
    }, {} as Record<string, any>)
  }

  async deleteRows(originalIndices: number[]): Promise<void> {
    await this.executeWorkerMethod<MessageRequestDeleteRows, void>('deleteRows', { indices: originalIndices })
    await this.syncFile(true)
  }

  async insertRows(rows: Record<string, any>[]): Promise<number[]> {
    const originalIndices = (
      await this.executeWorkerMethod<MessageRequestInsertRows, MessageRespnseInsertColumns>('insertRows', { rows })
    ).indices
    await this.syncFile(true)
    return originalIndices
  }

  async updateRows(rowsToUpdateByOriginalIndex: Map<number, Record<string, any>>): Promise<void> {
    const rowsToUpdateByWorkerIndex = [...rowsToUpdateByOriginalIndex].reduce<Map<number, Record<string, any>>>(
      (acc, [originalIndex, row]) => {
        acc.set(originalIndex, row) //swap the local index with the worker index
        return acc
      },
      new Map<number, Record<string, any>>()
    )
    await this.executeWorkerMethod<MessageRequestUpdateRows, void>('updateRows', {
      rowsByIndex: rowsToUpdateByWorkerIndex,
    }).then(() => {
      this.syncFile(true)
    })
  }

  async renameColumns(columns: Record<string, string>): Promise<void> {
    await this.executeWorkerMethod<MessageRequestRenameColumns, void>('renameColumns', { columns })
    for (let [oldCol, newCol] of Object.entries(columns)) {
      if (this.internalColumns!.find(col => col.id === newCol)) {
        const oldIndex = this.internalColumns!.findIndex(col => col.id === oldCol)
        const newIndex = this.internalColumns!.findIndex(col => col.id === newCol)
        this.internalColumns!.splice(newIndex, 1)
        let { id, ...col } = this.internalColumns![newIndex]
        this.internalColumns![oldIndex] = Object.assign(col, { id: newCol })
      } else {
        this.internalColumns!.find(col => col.id === oldCol)!.id = newCol
      }
    }
    await this.syncFile(true)
  }

  private async executeWorkerMethod<TData, TResult>(requestMsg: string, data?: TData): Promise<TResult> {
    let start: number
    if (dev) start = performance.now()
    const result = await new Promise<TResult>((resolve, reject) => {
      this.worker!.onmessage = ({ data: { msg: responseMsg, data } }: MessageEvent<PostMessage<TResult>>) => {
        if (responseMsg === requestMsg) resolve(data as TResult)
      }
      this.worker!.postMessage({ msg: requestMsg, data })
    })
    if (dev) {
      const end = performance.now()
    }
    return result
  }

  async destroy(): Promise<void> {
    this.worker?.terminate()
  }

  async applyFilter(data: any[] | any[][]): Promise<void> { }

  async applySort(data: any[] | any[][]): Promise<void> { }

  async syncFile(update?: boolean, get?: boolean): Promise<File | void> {
    return new Promise(async (resolve, reject) => {
      if (this.fileName) {
        if (update) {
          if (this.timeout) clearTimeout(this.timeout)
          this.timeout = setTimeout(async () => {
            if (dev) console.log(`syncFile: Syncing (${this.fileName}) with updating`)
            const { version }: { version: number; lastAuthor: string } = await readDatabase(
              `files/${this.fileName!.substring(0, this.fileName!.indexOf('.'))}`
            )
            const db = new IndexedDB(this.fileName!, this.fileName!)

            if (dev)
              console.log(
                `syncFile: Get the blob (${this.fileName}) from the datatable and write to storage & IndexedDB`
              )
            const blob = await this.getBlob()
            if (blob) {
              if (dev) console.log(`syncFile: Blob (${this.fileName}) found and syncing ...`)
              const file = new File([blob], this.fileName!, { type: 'text/csv' })
              await uploadFileToStorage(`/mapping-files/${this.fileName}`, file)
              let name: string = ''
              userSessionStore.subscribe(user => {
                if (user && user?.name) name = user.name
              })
              await writeToDatabase(`/files/${this.fileName!.substring(0, this.fileName!.indexOf('.'))}`, {
                version: version + 1,
                lastAuthor: name,
              })
              const hex = await convertBlobToHexString(blob)
              await db.set({ fileName: this.fileName, file: hex }, 'fileData')
              await db.set(version + 1, 'version', true)
              if (dev)
                console.log(
                  `syncFile: The syncing of the file (version ${version + 1}) (${this.fileName
                  }) to the storage & IndexedDB is done!`
                )
              resolve()
            } else {
              await db.close()
              resolve()
            }
          }, 3000)
        } else {
          if (this.timeout) clearTimeout(this.timeout)
          this.timeout = setTimeout(async () => {
            const { version }: { version: number; lastAuthor: string } = await readDatabase(
              `files/${this.fileName!.substring(0, this.fileName!.indexOf('.'))}`
            )
            const db = new IndexedDB(this.fileName!, this.fileName!)
            const dbVersion: number = await db.get('version', true)

            if (dev)
              console.log(
                `syncFile: Syncing the file (${this.fileName}, storage version: ${version} & db version: ${dbVersion}) without updating`
              )
            if (version > dbVersion) {
              if (dev)
                console.log(
                  `syncFile: The version in the storage (${this.fileName}) is newer than the version in IndexedDB`
                )
              const blob = await readFileStorage(`/mapping-files/${this.fileName}`)
              if (blob) {
                const file = new File([blob], this.fileName!, { type: 'text/csv' })
                const hex = await convertBlobToHexString(blob)
                await db.set({ fileName: this.fileName, file: hex }, 'fileData')
                await db.set(version, 'version', true)
                resolve(file)
              } else console.error(`syncFile: There was no file (${this.fileName}) found in storage`)
            } else if (version < dbVersion) {
              if (dev)
                console.log(
                  `syncFile: The version (${this.fileName}) in IndexedDB is newer than the version in storage`
                )
              const fileData = await db.get('fileData', true)
              const blob = convertHexStringToBlob(fileData.file, 'text/csv')
              const file = new File([blob], this.fileName!)
              await uploadFileToStorage(`/mapping-files/${this.fileName}`, file)
              let name: string = ''
              userSessionStore.subscribe(user => {
                if (user && user?.name) name = user.name
              })
              await writeToDatabase(`/files/${this.fileName!.substring(0, this.fileName!.indexOf('.'))}`, {
                version: dbVersion,
                lastAuthor: name,
              })
              await db.set(version, 'version', true)
              resolve(file)
            } else {
              if (get) {
                if (dev) console.log(`syncFile: Get the file (${this.fileName}) from IndexedDB`)
                const fileData = await db.get('fileData', true)
                if (fileData) {
                  const blob = convertHexStringToBlob(fileData.file, 'text/csv')
                  const file = new File([blob], this.fileName!)
                  resolve(file)
                } else {
                  const blob = await readFileStorage(`/mapping-files/${this.fileName}`)
                  if (blob) {
                    const file = new File([blob], this.fileName!, { type: 'text/csv' })
                    const hex = await convertBlobToHexString(blob)
                    await db.set({ fileName: this.fileName, file: hex }, 'fileData')
                    await db.set(version, 'version', true)
                    resolve(file)
                  } else {
                    console.error('syncFile: There was no file found in IndexedDB or the storage')
                    resolve()
                  }
                }
              } else resolve()
            }
          }, 3000)
        }
      } else {
        resolve()
      }
    })
  }
}
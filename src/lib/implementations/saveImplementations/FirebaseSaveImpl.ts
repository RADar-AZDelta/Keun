import { dev } from '$app/environment'
import { readFirestore, userSessionStore, writeToFirestore } from '$lib/obsolete/firebase'
import type {
  IColumnMetaData,
  ICustomStoreOptions,
  IStoredOptions,
  ITableOptions,
} from '@radar-azdelta/svelte-datatable/components/DataTable'

export default class FirebaseSaveImpl implements ICustomStoreOptions {
  storedOptions: ITableOptions
  storedColumns: IColumnMetaData[] | undefined
  collection: string = 'users'

  constructor(options?: ITableOptions | undefined) {
    if (dev) console.log('FirebaseSaveImpl: Creating the save implementation for Firebase')
    // Set standard options
    const defaultOptions: ITableOptions = {
      id: undefined,
      currentPage: 1,
      rowsPerPage: 20,
      rowsPerPageOptions: [10, 20, 50, 100],
      actionColumn: false,
      singleSort: false,
      defaultColumnWidth: 200,
    }
    if (options) Object.assign(defaultOptions, options)
    this.storedOptions = defaultOptions
  }

  async load(id: string, internalColumns?: IColumnMetaData[]): Promise<IStoredOptions> {
    if (dev) console.log('load: loading the options & columns from Firestore')
    if (!id || !this.storedOptions.id) return { tableOptions: this.storedOptions, columnMetaData: this.storedColumns }
    const result = await this.getCurrentFile(id)
    if (!result) return { tableOptions: this.storedOptions, columnMetaData: this.storedColumns }
    const { file } = result
    if (file.options) Object.assign(this.storedOptions, file.options)
    const columns = file.columns
    if (columns && internalColumns) {
      const storedInternalColumns: Map<string, IColumnMetaData> = JSON.parse(columns).reduce(
        (acc: Map<string, IColumnMetaData>, cur: IColumnMetaData) => {
          acc.set(cur.id, cur)
          return acc
        },
        new Map<string, IColumnMetaData>(),
      )
      this.storedColumns = internalColumns.map((col: IColumnMetaData) => {
        if (storedInternalColumns.has(col.id)) Object.assign(col, storedInternalColumns.get(col.id))
        return col
      })
    }
    return { tableOptions: this.storedOptions, columnMetaData: this.storedColumns }
  }

  async store(options: ITableOptions): Promise<void> {
    if (dev) console.log('store: Storing the settings & columns to Firestore')
    if (options.saveOptions === false) return await this.deleteFromFirestore(options.id)
    const result = await this.getCurrentFile(options.id)
    if (!result) return
    let { file } = result
    const { userOpts, uid } = result
    delete file.options.saveImpl
    delete file.options.dataTypeImpl
    file = { options: file.options, columns: file.columns, id: file.options.id }
    await writeToFirestore(this.collection, uid, userOpts)
  }

  private async deleteFromFirestore(fileId?: string) {
    const result = await this.getCurrentFile(fileId)
    if (!result) return
    const { userOpts, file, uid } = result
    delete file.options
    delete file.columns
    await writeToFirestore(this.collection, uid, userOpts)
  }

  private async getCurrentFile(fileId?: string) {
    if (!fileId) return undefined
    const uid = await this.getUserId()
    if (!uid) return undefined
    const userOpts = await readFirestore(this.collection, uid)
    if (!userOpts) return undefined
    const file = userOpts.files.find((f: any) => f.id === fileId)
    return { userOpts, file, uid }
  }

  private async getUserId(): Promise<string | undefined> {
    return new Promise(resolve => userSessionStore.subscribe(user => resolve(user.uid))())
  }
}

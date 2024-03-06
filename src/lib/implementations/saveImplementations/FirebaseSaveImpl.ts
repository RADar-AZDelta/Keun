import { FirebaseFirestore, type FirebaseOptions } from '@radar-azdelta-int/radar-firebase-utils'
import { dev } from '$app/environment'
import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
} from '$env/static/public'
import { user } from '$lib/store'
import type {
  IColumnMetaData,
  ICustomStoreOptions,
  IStoredOptions,
  ITableOptions,
} from '@radar-azdelta/svelte-datatable'

const firebaseConfig: FirebaseOptions = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID,
}

// TODO: check if this is something that is needed to be in Firebase?

export default class FirebaseSaveImpl implements ICustomStoreOptions {
  firestore: FirebaseFirestore = new FirebaseFirestore(firebaseConfig)
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
    await this.firestore.writeToFirestore(this.collection, uid, userOpts)
  }

  private async deleteFromFirestore(fileId?: string) {
    // TODO: fix this issue
    const result = await this.getCurrentFile(fileId)
    if (!result) return
    const { userOpts, file, uid } = result
    delete file.options
    delete file.columns
    await this.firestore.writeToFirestore(this.collection, uid, userOpts)
  }

  private async getCurrentFile(fileId?: string) {
    if (!fileId) return
    const uid = await this.getUserId()
    if (!uid) return
    const userOptsDocument = await this.firestore.readFirestore(this.collection, uid)
    if (!userOptsDocument) return
    const userOpts = userOptsDocument.data()
    if (!userOpts) return undefined
    const file = userOpts.files.find((f: any) => f.id === fileId)
    return { userOpts, file, uid }
  }

  private async getUserId(): Promise<string | undefined | null> {
    return new Promise(resolve => user.subscribe(user => resolve(user.uid))())
  }
}

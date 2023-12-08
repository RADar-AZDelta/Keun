import type { IColumnMetaData, ICustomStoreOptions, IStoredOptions, ITableOptions } from '@radar-azdelta/svelte-datatable/components/DataTable'
import { readDatabase, userSessionStore, writeToDatabase } from '$lib/firebase';
import { removeUndefinedsAndNulls } from 'utils';
import { dev } from '$app/environment';

// TODO: implement the save implementation for Firebase

export default class FirebaseSaveImpl implements ICustomStoreOptions {
  storedOptions: ITableOptions
  storedColumns: IColumnMetaData[] | undefined
  initialized: boolean = false
  dbVersion: number = 0
  customDBVersion: number = 0

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
    if(options) Object.assign(defaultOptions, options)
    this.storedOptions = defaultOptions
  }

  private async loadWithoutLogin(): Promise<string> {
    if (dev) console.log('load: The user was not logged in, create a deviceId and use it to save the settings & columns online')
    let deviceId = localStorage.getItem('deviceId')!
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('deviceId', deviceId)
    }
    return deviceId
  }

  private async readDB(uid: string, id: string): Promise<void> {
    try {
      if (dev) console.log(`load: Load the settings & columns from Firebase for user with uid: ${uid} & DataTable id: ${this.storedOptions.id}`)
      const data = await readDatabase(`/authors/${uid}/${id}`)
      if(!data) {
        if (dev) console.log('load: There were no settings & columns found in the database, write them to the database')
        this.store(this.storedOptions, this.storedColumns)
      }
      if (dev) console.log('load: The settings & columns were loaded from the Firebase database')
      if(data.options.saveImpl) delete data.options.saveImpl
      Object.assign(this.storedOptions, data.options)
      if(this.storedColumns) Object.assign(this.storedColumns, data.columns)
      else this.storedColumns = data.columns
    } catch (e) {
      if (dev) console.log('load: Something went wrong with reading the database, write to the database')
      this.initialized = true
      this.store(this.storedOptions, this.storedColumns)
    }
  }

  async load (id: string): Promise<IStoredOptions> {
    this.storedOptions.id = id
    let uid: string | undefined
    userSessionStore.subscribe(async (userSession) => {
      uid = userSession.uid
    })
    if(!uid) uid = await this.loadWithoutLogin()
    if (!this.storedOptions.id){
      if (dev) console.log('load: There was no id set, so the settings & columns could not be loaded.')
      return { tableOptions: this.storedOptions, columnMetaData: this.storedColumns }
    }
    await this.readDB(uid, this.storedOptions.id)
    if(this.storedOptions.saveImpl) delete this.storedOptions.saveImpl
    this.initialized = true
    return { tableOptions: this.storedOptions, columnMetaData: this.storedColumns }
  }

  private async writeToDB(uid: string) {
    if (dev) console.log('store: Writing to database ...')
    // Write the options and columns to the database under the given DataTable id
    writeToDatabase(`/authors/${uid}/${this.storedOptions.id}`, { options: this.storedOptions ?? null, columns: this.storedColumns || null})
  }

  async store (options: ITableOptions, columns: IColumnMetaData[] | undefined): Promise<void> {
    if (dev) console.log('store: Storing the settings & columns to the storage ', options)
    // If there is no userId given for authentication, create a deviceId and save it in the localStorage to identify the device
    if(!this.initialized) return
    if(options.saveImpl) delete options.saveImpl
    if(options.dataTypeImpl) delete options.dataTypeImpl
    this.storedOptions = removeUndefinedsAndNulls(options, ['actionColumn', 'singleSort', 'saveOptions'])
    this.storedColumns = removeUndefinedsAndNulls(columns, ["visible", "sortable", "filterable", "resizable", "repositionalbe", "editable"])
    let uid: string | undefined
    userSessionStore.subscribe((userSession) => {
        uid = userSession.uid
    })
    if(!uid) uid = await this.loadWithoutLogin()
    if(uid && this.storedOptions.id) await this.writeToDB(uid)
  }
}

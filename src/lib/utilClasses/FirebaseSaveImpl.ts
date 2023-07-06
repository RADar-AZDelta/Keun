import { readDatabase, writeToDatabase } from '$lib/firebase'
import type { IColumnMetaData, ICustomStoreOptions, IStoredOptions, ITableOptions } from '@radar-azdelta/svelte-datatable/components/DataTable'
import { userSessionStore } from '$lib/firebase';
import { removeUndefineds, replaceNullsWithFalse } from '$lib/utils';
import { dev } from '$app/environment';

export class FirebaseSaveImpl implements ICustomStoreOptions {
  storedOptions: ITableOptions
  storedColumns: IColumnMetaData[] | undefined
  initialized: boolean = false

  constructor(options?: ITableOptions | undefined) {
    if (dev) console.log('FirebaseSaveImpl: Creating the save implementation for Firebase')
    // Set standard options
    if (options) {
      let defaultOptions = {
        id: undefined,
        currentPage: 1,
        rowsPerPage: 20,
        rowsPerPageOptions: [10, 20, 50, 100],
        actionColumn: false,
        singleSort: false,
        defaultColumnWidth: 200,
      }
      Object.assign(defaultOptions, options)
      this.storedOptions = defaultOptions
    } else
      this.storedOptions = {
        id: 'default',
        currentPage: 1,
        rowsPerPage: 20,
        rowsPerPageOptions: [10, 20, 50, 100],
        actionColumn: false,
        singleSort: false,
        defaultColumnWidth: 200,
      }
  }

  async load (id: string): Promise<IStoredOptions> {
    return new Promise(async (resolve, reject) => {
      // If there is no userId given for authentication, create a deviceId and save it in the localStorage to identify the device
      this.storedOptions.id = id
      let uid: string | undefined
      userSessionStore.subscribe((userSession) => {
          uid = userSession.uid
      })
      if (!uid) {
        if (dev) console.log('load: The user was not logged in, create a deviceId and use it to save the settings & columns online')
        let deviceId = localStorage.getItem('deviceId')!
        if (!deviceId) {
          deviceId = crypto.randomUUID()
          localStorage.setItem('deviceId', deviceId)
        }
        uid = deviceId
      }
      if (!uid || !this.storedOptions.id){
        if (dev) console.log('load: There was no uid made, the settings & columns are not loaded')
        resolve({ tableOptions: this.storedOptions, columnMetaData: this.storedColumns })
      }

      if (dev) console.log(`load: Load the settings & columns from Firebase for user with uid: ${uid} & DataTable id: ${this.storedOptions.id}`)
      if (uid && id) {
        // Read the data for the DataTable with the given id
        try {
          const data = await readDatabase(`/authors/${uid}/${id}`)
          if (data) {
            if (dev) console.log('load: The settings & columns were loaded from the Firebase database')
            if(data.options.saveImpl) delete data.options.saveImpl
            Object.assign(this.storedOptions, data.options)
            if(this.storedColumns) Object.assign(this.storedColumns, data.columns)
            else this.storedColumns = data.columns
          } else {
            if (dev) console.log('load: There were no settings & columns found in the database, write them to the database')
            this.store(this.storedOptions, this.storedColumns)
          }
        } catch (e) {
          if (dev) console.log('load: Something went wrong with reading the database, write to the database')
          this.initialized = true
          this.store(this.storedOptions, this.storedColumns)
        }
      }
      
      if(this.storedOptions.saveImpl) delete this.storedOptions.saveImpl
      this.initialized = true
      console.log('load: resolving ', this.storedOptions)
      resolve({ tableOptions: this.storedOptions, columnMetaData: this.storedColumns })
    })
  }

  store (options: ITableOptions, columns: IColumnMetaData[] | undefined): void {
    if (dev) console.log('store: Storing the settings & columns to the storage ', options)
    // If there is no userId given for authentication, create a deviceId and save it in the localStorage to identify the device
    if(this.initialized){
      if(options.saveImpl) delete options.saveImpl
      if(options.dataTypeImpl) delete options.dataTypeImpl
      this.storedOptions = removeUndefineds(options)
      this.storedOptions = replaceNullsWithFalse(this.storedOptions, ['actionColumn', 'singleSort', 'saveOptions'])
      this.storedColumns = removeUndefineds(columns)
      this.storedColumns = replaceNullsWithFalse(this.storedColumns, ["visible", "sortable", "filterable", "resizable", "repositionalbe", "editable"])
      let uid: string | undefined
      userSessionStore.subscribe((userSession) => {
          uid = userSession.uid
      })
      if (!uid) {
        let deviceId = localStorage.getItem('deviceId')!
        if (!deviceId) {
          deviceId = crypto.randomUUID()
          localStorage.setItem('deviceId', deviceId)
        }
        uid = deviceId
      }
      // Remove all the undefined values and replace them with "null" because the database can't work with undefined
      if (uid && this.storedOptions.id) {
        if (dev) console.log('store: Writing to database ...')
        // Write the options and columns to the database under the given DataTable id
        writeToDatabase(`/authors/${uid}/${this.storedOptions.id}`, { options: options ?? null, columns: columns || null})
      }
    }
  }
}

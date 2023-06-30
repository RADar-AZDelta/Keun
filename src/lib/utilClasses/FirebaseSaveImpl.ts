import { readDatabase, writeToDatabase } from '$lib/firebase'
import type { IColumnMetaData, ICustomStoreOptions, IStoredOptions, ITableOptions } from '@radar-azdelta/svelte-datatable/components/DataTable'
import { userSessionStore } from '$lib/firebase';
import { removeUndefineds } from '$lib/utils';

export class FirebaseSaveImpl implements ICustomStoreOptions {
  storedOptions: ITableOptions
  storedColumns: IColumnMetaData[] | undefined
  initialized: boolean = false

  constructor(options?: ITableOptions | undefined) {
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
        let deviceId = localStorage.getItem('deviceId')!
        if (!deviceId) {
          deviceId = crypto.randomUUID()
          localStorage.setItem('deviceId', deviceId)
        }
        uid = deviceId
      }
      if (!uid || !this.storedOptions.id)
        resolve({ tableOptions: this.storedOptions, columnMetaData: this.storedColumns })
      if (uid && this.storedOptions.id) {
        // Read the data for the DataTable with the given id
        try {
          const data = await readDatabase(`/authors/${uid}/${this.storedOptions.id}`)
          if (data) {
            if(data.options.saveImpl) delete data.options.saveImpl
            Object.assign(this.storedOptions, data.options)
            this.storedColumns = data.columns
          } else this.store(this.storedOptions, this.storedColumns)
        } catch (e) {
          this.store(this.storedOptions, this.storedColumns)
        }
      }
      
      if(this.storedOptions.saveImpl) delete this.storedOptions.saveImpl
      this.initialized = true
      resolve({ tableOptions: this.storedOptions, columnMetaData: this.storedColumns })
    })
  }

  store (options: ITableOptions, columns: IColumnMetaData[] | undefined): void {
    // If there is no userId given for authentication, create a deviceId and save it in the localStorage to identify the device
    if(this.initialized){
      if(options.saveImpl) delete options.saveImpl
      this.storedOptions = removeUndefineds(options)
      this.storedColumns = removeUndefineds(columns)
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
        // Write the options and columns to the database under the given DataTable id
        writeToDatabase(`/authors/${uid}/${this.storedOptions.id}`, { options: options ?? null, columns: columns || null})
      }
    }
  }
}

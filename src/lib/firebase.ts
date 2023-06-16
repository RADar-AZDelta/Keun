import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_DATABASE_URL,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
} from '$env/static/public'
import { initializeApp, type FirebaseOptions, type FirebaseApp, getApps } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  type AuthProvider,
  signInWithPopup,
  signOut,
  type UserCredential,
  type Auth,
} from 'firebase/auth'
import { user } from '$lib/store'
import type { ITableOptions } from '@radar-azdelta/svelte-datatable'
import type { ISettings } from './components/Types'
import { DataSnapshot, Database, child, get, getDatabase, ref, set } from '@firebase/database'
import { base64ToFile, fileToBase64 } from './utils'

export class firebase {
  firebaseApp: FirebaseApp | undefined
  firebaseAuth: Auth
  firebaseDatabase: Database | undefined
  options: ITableOptions
  settings: ISettings | undefined
  data: string | ArrayBuffer | null | File
  fileName: string | undefined
  dataTableOptions: ITableOptions | undefined

  constructor(options: ITableOptions) {
    const firebaseConfig: FirebaseOptions = {
      apiKey: PUBLIC_FIREBASE_API_KEY,
      authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
      databaseURL: PUBLIC_FIREBASE_DATABASE_URL,
      projectId: PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: PUBLIC_FIREBASE_APP_ID,
    }

    if (!getApps().length) {
      this.firebaseApp = initializeApp(firebaseConfig)
    }
    this.firebaseAuth = getAuth(this.firebaseApp)
    this.firebaseDatabase = getDatabase(this.firebaseApp)
    this.options = options
    this.settings = undefined
    this.data = null
    this.fileName = undefined
    this.dataTableOptions = undefined
  }

  login = async (provider: string): Promise<UserCredential> => {
    let authProvider: AuthProvider
    switch (provider) {
      case 'google':
        authProvider = new GoogleAuthProvider()
        break
      default:
        throw new Error('There are no other providers configured at the moment')
    }

    let userCreds = await signInWithPopup(this.firebaseAuth, authProvider)

    return userCreds
  }

  logout = async () => {
    await signOut(this.firebaseAuth)
    user.update(user => {
      user = undefined
      return user
    })
  }

  load = async () => {
    if (this.options.userId && this.options.id) {
      try {
        const keunData = await this.readOnce(`${this.options.userId}/${this.options.id}/Keun`)
        if (keunData) {
          if (keunData.data) this.data = base64ToFile(keunData.data, keunData.fileName)
          if (keunData.settings) this.settings = keunData.settings
          if (keunData.fileName) this.fileName = keunData.fileName
        }
        const dataTableData = await this.readOnce(`${this.options.userId}/${this.options.id}/Datatable`)
        if (dataTableData) {
          // TODO: options got from DB but in Datatable also, check to optimize!
          if (dataTableData.options) this.dataTableOptions = dataTableData.options
        }
      } catch (e) {
        this.store(this.settings!, this.data!)
      }
    }
    return {
      savedSettings: this.settings,
      savedData: this.data,
      savedOptions: this.dataTableOptions,
    }
  }

  store = async (settings: ISettings, data: File | string | ArrayBuffer | null) => {
    this.settings = settings
    if (data instanceof File) {
      this.fileName = data.name
      data = await fileToBase64(data)
    }
    this.data = data
    if (this.options.userId && this.options.id) {
      this.write(`${this.options.userId}/${this.options.id}/Keun`, {
        settings: settings,
        data: this.data,
        fileName: this.fileName,
      })
    }
  }

  write = (reference: string, data: Object) => {
    const requestedReference = ref(this.firebaseDatabase!, reference)
    set(requestedReference, data)
  }

  readOnce = async (reference: string) => {
    const requestedReference = ref(this.firebaseDatabase!)
    let receivedData: any
    await get(child(requestedReference, reference))
      .then((snapshot: DataSnapshot) => {
        receivedData = snapshot.val()
        return receivedData
      })
      .catch((error: any) => {
        console.error(error)
      })

    return receivedData
  }
}

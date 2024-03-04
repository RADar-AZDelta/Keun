import { writable } from 'svelte/store'
import {
  PUBLIC_CLOUD_AUTH_IMPLEMENTATION,
  PUBLIC_CLOUD_DATABASE_IMPLEMENTATION,
  PUBLIC_CLOUD_SAVE_IMPLEMENTATION,
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
} from '$env/static/public'
import {
  loadImplementationAuth,
  loadImplementationDB,
  loadImplementationDataType,
  loadImplementationSave,
  loadImplementationSettings,
} from '$lib/implementations/implementation'
import type { IAuthImpl, IDatabaseImpl, IMappedRows, ISettings, ISettingsImpl, IUser } from '$lib/components/Types'
import type { ICustomStoreOptions, IDataTypeFunctionalities } from '@radar-azdelta/svelte-datatable'
import type { FirebaseOptions } from 'firebase/app'
import type DataTable from '@radar-azdelta/svelte-datatable'

export const firebaseConfig: FirebaseOptions = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID,
}

export const settings = writable<ISettings>({
  mapToMultipleConcepts: false,
  autoMap: false,
  language: 'en',
  savedAuthors: [],
  vocabularyIdCustomConcept: '',
  popupSidesShowed: { filters: true, details: true },
})

export const table = writable<DataTable>()
export const customTable = writable<DataTable>()
export const mappedToConceptIds = writable<IMappedRows>({})

export const user = writable<IUser>()

export const triggerAutoMapping = writable<boolean>(false)

export const databaseImplementation = PUBLIC_CLOUD_DATABASE_IMPLEMENTATION || 'none'
export const authImplementation = PUBLIC_CLOUD_AUTH_IMPLEMENTATION || 'none'
export const saveImplementation = PUBLIC_CLOUD_SAVE_IMPLEMENTATION || 'none'

export const databaseImpl = writable<IDatabaseImpl | undefined>(undefined)
export const authImpl = writable<IAuthImpl | undefined>(undefined)
export const saveImpl = writable<ICustomStoreOptions | undefined>(undefined)
export const settingsImpl = writable<ISettingsImpl | undefined>(undefined)
export const fileTypeImpl = writable<IDataTypeFunctionalities | undefined>(undefined)
export const customFileTypeImpl = writable<IDataTypeFunctionalities | undefined>(undefined)

export const selectedFileId = writable<string>()
export const selectedCustomFileId = writable<string>()

export const abortAutoMapping = writable<boolean>(false)

loadImplementationDB()
loadImplementationAuth()
loadImplementationSave()
loadImplementationDataType()
loadImplementationSettings()

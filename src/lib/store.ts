import { writable } from 'svelte/store'
import {
  PUBLIC_CLOUD_AUTH_IMPLEMENTATION,
  PUBLIC_CLOUD_DATABASE_IMPLEMENTATION,
  PUBLIC_CLOUD_SAVE_IMPLEMENTATION,
} from '$env/static/public'
import {
  loadImplAuth,
  loadImplDB,
  loadImplDataType,
  loadImplSave,
  loadImpSettings,
} from '$lib/implementations/implementation'
import type { IAuthImpl, IDatabaseImpl, IMappedRows, ISettings, ISettingsImpl, IUser } from '$lib/components/Types'
import type { ICustomStoreOptions, IDataTypeFunctionalities } from '@radar-azdelta/svelte-datatable'
import type DataTable from '@radar-azdelta/svelte-datatable'

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
export const disableActions = writable<boolean>(false)

export const user = writable<IUser>()

export const triggerAutoMapping = writable<boolean>(false)

export const databaseImplementation = PUBLIC_CLOUD_DATABASE_IMPLEMENTATION || 'none'
export const authImplementation = PUBLIC_CLOUD_AUTH_IMPLEMENTATION || 'none'
export const saveImplementation = PUBLIC_CLOUD_SAVE_IMPLEMENTATION || 'none'

export const databaseImpl = writable<IDatabaseImpl | undefined>(undefined)
export const authImpl = writable<IAuthImpl | undefined>(undefined)
export const saveImpl = writable<ICustomStoreOptions | undefined>(undefined)
export const settingsImpl = writable<ISettingsImpl | undefined>(undefined)
// TODO: check if these two can be deleted
export const fileTypeImpl = writable<IDataTypeFunctionalities | undefined>(undefined)
export const customFileTypeImpl = writable<IDataTypeFunctionalities | undefined>(undefined)

export const selectedFileId = writable<string>()
export const selectedCustomFileId = writable<string>()

export const abortAutoMapping = writable<boolean>(false)

loadImplDB()
loadImplAuth()
loadImplSave()
loadImplDataType()
loadImpSettings()

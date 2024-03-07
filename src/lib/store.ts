import { writable } from 'svelte/store'
import DataTable from '@radar-azdelta/svelte-datatable'
import { loadImplAuth, loadImplDB, loadImpSettings } from '$lib/implementations/implementation'
import type { IAuthImpl, IDatabaseImpl, IMappedRows, ISettings, ISettingsImpl, IUser } from '$lib/Types'
import type { ICustomStoreOptions } from '@radar-azdelta/svelte-datatable'

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
export const flaggedTable = writable<DataTable>()
export const mappedToConceptIds = writable<IMappedRows>({})
export const disableActions = writable<boolean>(false)

export const user = writable<IUser>()

export const databaseImpl = writable<IDatabaseImpl | undefined>(undefined)
export const authImpl = writable<IAuthImpl | undefined>(undefined)
export const saveImpl = writable<ICustomStoreOptions | undefined>(undefined)
export const settingsImpl = writable<ISettingsImpl | undefined>(undefined)

export const triggerAutoMapping = writable<boolean>(false)
export const abortAutoMapping = writable<boolean>(false)

loadImplDB()
loadImplAuth()
loadImpSettings()

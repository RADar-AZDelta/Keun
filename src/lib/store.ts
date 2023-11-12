import { PUBLIC_CLOUD_DATABASE_IMPLEMENTATION, PUBLIC_CLOUD_AUTH_IMPLEMENTATION, PUBLIC_CLOUD_SAVE_IMPLEMENTATION } from '$env/static/public'
import { writable } from 'svelte/store'
// @ts-ignore
import { LatencyOptimisedTranslator } from '@browsermt/bergamot-translator/translator.js'
import { loadImplementationAuth, loadImplementationDB, loadImplementationDataType, loadImplementationSave, loadImplementationSettings } from '$lib/implementations/implementation'
import type { ICustomStoreOptions, IDataTypeFunctionalities } from '@radar-azdelta/svelte-datatable/components/DataTable'
import type { ISettingsImpl, IAuthImpl, ISettings, IUpdatedFunctionalityImpl, IUser } from '$lib/components/Types'
import type { User } from 'firebase/auth'

export const settings = writable<ISettings>({ mapToMultipleConcepts: false, autoMap: false, language: 'en', savedAuthors: [], vocabularyIdCustomConcept: '', popupSidesShowed: { filters: true, details: true }, })

export const firebaseUser = writable<User>()
export const user = writable<IUser>()

export const triggerAutoMapping = writable<boolean>(false)

export const databaseImplementation = PUBLIC_CLOUD_DATABASE_IMPLEMENTATION || 'none'
export const authImplementation = PUBLIC_CLOUD_AUTH_IMPLEMENTATION || 'none'
export const saveImplementation = PUBLIC_CLOUD_SAVE_IMPLEMENTATION || 'none'

export const databaseImpl = writable<IUpdatedFunctionalityImpl | undefined>(undefined)
export const authImpl = writable<IAuthImpl | undefined>(undefined)
export const saveImpl = writable<ICustomStoreOptions | undefined>(undefined)
export const settingsImpl = writable<ISettingsImpl | undefined>(undefined)
export const fileTypeImpl = writable<IDataTypeFunctionalities | undefined>(undefined)
export const customFileTypeImpl = writable<IDataTypeFunctionalities | undefined>(undefined)

export const selectedFileId = writable<string>()

export const abortAutoMapping = writable<boolean>(false)

export const translator = writable<LatencyOptimisedTranslator>()

loadImplementationDB()
loadImplementationAuth()
loadImplementationSave()
loadImplementationDataType()
loadImplementationSettings()
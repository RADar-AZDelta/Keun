import { writable } from 'svelte/store'
import type { IMappedRows, ISettings, IUser } from '$lib/Types'

export const settings = writable<ISettings>({
  mapToMultipleConcepts: false,
  autoMap: false,
  language: 'en',
  savedAuthors: [],
  vocabularyIdCustomConcept: '',
  popupSidesShowed: { filters: true, details: true },
})

export const mappedToConceptIds = writable<IMappedRows>({})
export const disableActions = writable<boolean>(false)

export const user = writable<IUser>()

export const triggerAutoMapping = writable<boolean>(false)
export const abortAutoMapping = writable<boolean>(false)

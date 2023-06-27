import { writable } from 'svelte/store'
import type { IFirebaseUser, ISettings } from './components/Types'

const customConcept = writable<Record<string, string>>({
  domain_id: '',
  vocabulary_id: '',
  concept_class_id: '',
  concept_name: '',
})

const settings = writable<ISettings>({
  mapToMultipleConcepts: false,
  autoMap: false,
  language: 'en',
  author: undefined,
  savedAuthors: [],
  vocabularyIdCustomConcept: '',
  fontsize: 10,
  popupSidesShowed: { filters: true, details: true },
})

const user = writable<IFirebaseUser | undefined>()

export { customConcept, user, settings }

import { writable } from 'svelte/store'
import type { ISettings, IFirebaseUser } from './components/Types'

const customConcept = writable<Record<string, string>>({
  domain_id: '',
  vocabulary_id: '',
  concept_class_id: '',
  concept_name: '',
})

const user = writable<IFirebaseUser | undefined>()

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

export { customConcept, user, settings }

import { writable } from 'svelte/store'
import type { ISettings } from './components/Types'

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
  savedAuthors: [],
  vocabularyIdCustomConcept: '',
  fontsize: 10,
  popupSidesShowed: { filters: true, details: true },
})

const triggerAutoMapping = writable<boolean>(false)

const implementation = writable<string>('none')

export { customConcept, settings, triggerAutoMapping, implementation }

import { writable } from 'svelte/store'
import type { IFirebaseUser } from './components/Types'

const customConcept = writable<Record<string, string>>({
  domain_id: '',
  vocabulary_id: '',
  concept_class_id: '',
  concept_name: '',
})

const user = writable<IFirebaseUser | undefined>()

export { customConcept, user }

import { writable } from 'svelte/store'

const customConcept = writable<Record<string, string>>({
  domain_id: '',
  vocabulary_id: '',
  concept_class_id: '',
  concept_name: '',
})

export { customConcept }

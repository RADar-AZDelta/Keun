import { writable } from 'svelte/store'
import type { IFunctionalityImpl, ISettings } from './components/Types'
import { PUBLIC_CLOUD_IMPLEMENTATION } from '$env/static/public'

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
  author: {},
  savedAuthors: [],
  vocabularyIdCustomConcept: '',
  fontsize: 10,
  popupSidesShowed: { filters: true, details: true },
})

const triggerAutoMapping = writable<boolean>(false)

const implementation = writable<string>(PUBLIC_CLOUD_IMPLEMENTATION)

const implementationClass = writable<IFunctionalityImpl>()

async function loadImplementation() {
  return new Promise(async (resolve, reject) => {
    let implementationMethod: string = ""
    implementation.subscribe((implementation) => implementationMethod = implementation)
    implementationClass.subscribe(async (impl) => {
      if(!impl) {
        if(implementationMethod == "firebase") {
          await import('$lib/utilClasses/FirebaseImpl').then(({ default: FirebaseImpl }) => {
            implementationClass.set(new FirebaseImpl())
            resolve(implementationClass)
          })
        } else {
          import('$lib/utilClasses/LocalImpl').then(({ default: LocalImpl }) => {
            implementationClass.set(new LocalImpl())
            resolve(implementationClass)
          })
        }
      } else resolve(undefined)
    })
  })
}

const fileName = writable<string>()

loadImplementation()

export { customConcept, settings, triggerAutoMapping, implementation, implementationClass, fileName}

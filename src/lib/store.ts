import { writable } from 'svelte/store'
import { PUBLIC_CLOUD_DATABASE_IMPLEMENTATION, PUBLIC_CLOUD_AUTH_IMPLEMENTATION } from '$env/static/public'
// @ts-ignore
import { LatencyOptimisedTranslator } from '@browsermt/bergamot-translator/translator.js'
import type { IAuthImpl, ISettings, IUpdatedFunctionalityImpl, IUser } from '$lib/components/Types'

export const customConcept = writable<Record<string, string>>({
  domain_id: '',
  vocabulary_id: '',
  concept_class_id: '',
  concept_name: '',
})

export const settings = writable<ISettings>({
  mapToMultipleConcepts: false,
  autoMap: false,
  language: 'en',
  savedAuthors: [],
  vocabularyIdCustomConcept: '',
  fontsize: 10,
  popupSidesShowed: { filters: true, details: true },
})

export const user = writable<IUser>()

export const triggerAutoMapping = writable<boolean>(false)

export const abortAutoMapping = writable<boolean>(false)

export const databaseImplementation = PUBLIC_CLOUD_DATABASE_IMPLEMENTATION || 'none'
export const authImplementation = PUBLIC_CLOUD_AUTH_IMPLEMENTATION || 'none'

export const databaseImpl = writable<IUpdatedFunctionalityImpl | undefined>(undefined)

export const authImpl = writable<IAuthImpl | undefined>(undefined)

async function loadDatabaseImpl(): Promise<unknown> {
  return new Promise(async (resolve, reject) => {
    databaseImpl.subscribe(async impl => {
      if (impl) return resolve(impl)
      if (databaseImplementation === 'firebase')
        await import('$lib/databaseImpl/FirebaseImpl').then(({ default: FirebaseImpl }) => {
          // databaseImpl.set(new FirebaseImpl())
          resolve(databaseImpl)
        })
      else
        import('$lib/databaseImpl/LocalImpl').then(({ default: LocalImpl }) => {
          databaseImpl.set(new LocalImpl())
          resolve(databaseImpl)
        })
    })
  })
}

async function loadAuthImpl(): Promise<unknown> {
  return new Promise(async (resolve, reject) => {
    authImpl.subscribe(async impl => {
      if(impl) return resolve(impl)
      if(authImplementation === 'firebase') {}
      else await import('$lib/authImpl/LocalImpl').then(({ default: LocalImpl }) => {
        authImpl.set(new LocalImpl())
        resolve(authImpl)
      })
    })
  })
}

export const selectedFileId = writable<string>()

export const translator = writable<LatencyOptimisedTranslator>()

loadDatabaseImpl()
loadAuthImpl()
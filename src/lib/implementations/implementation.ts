import {
  authImpl,
  authImplementation,
  databaseImpl as dbImpl,
  databaseImplementation,
  fileTypeImpl,
  saveImpl,
  saveImplementation,
  settingsImpl,
} from '$lib/store'
import type { IAuthImpl, IDatabaseImpl, ISettingsImpl } from '$lib/components/Types'
import type { ICustomStoreOptions } from '@radar-azdelta/svelte-datatable'

export async function loadImplementationDB() {
  return new Promise(async resolve => {
    dbImpl.subscribe(async impl => {
      if (impl) return resolve(impl)
    })
    if (databaseImplementation === 'firebase')
      await import('$lib/implementations/databaseImpl/FirebaseImpl').then(({ default: Impl }) => dbImpl.set(new Impl()))
    else await import('$lib/implementations/databaseImpl/LocalImpl').then(({ default: Impl }) => dbImpl.set(new Impl()))
  })
}

export async function loadImplementationAuth() {
  return new Promise(resolve => {
    authImpl.subscribe(async impl => {
      if (impl) return resolve(impl)
    })
    if (authImplementation === 'firebase') {
      import('$lib/implementations/authImpl/FirebaseImpl').then(({ default: Impl }) => authImpl.set(new Impl()))
    } else import('$lib/implementations/authImpl/LocalImpl').then(({ default: Impl }) => authImpl.set(new Impl()))
  })
}

export async function loadImplementationSave() {
  return new Promise(async resolve => {
    saveImpl.subscribe(async impl => {
      if (impl) return resolve(impl)
    })
    if (saveImplementation === 'firebase')
      await import('$lib/implementations/saveImplementations/FirebaseSaveImpl').then(({ default: Impl }) =>
        saveImpl.set(new Impl()),
      )
  })
}

export async function loadImplementationSettings() {
  return new Promise(async resolve => {
    settingsImpl.subscribe(async impl => {
      if (impl) return resolve(impl)
    })
    if (databaseImplementation === 'firebase') {
      await import('$lib/implementations/settingsImpl/FirebaseImpl').then(({ default: Impl }) =>
        settingsImpl.set(new Impl()),
      )
    } else
      await import('$lib/implementations/settingsImpl/localImpl').then(({ default: Impl }) =>
        settingsImpl.set(new Impl()),
      )
  })
}

export async function loadImplementationDataType() {
  return new Promise(async resolve => {
    fileTypeImpl.subscribe(async impl => {
      return resolve(impl)
    })
  })
}

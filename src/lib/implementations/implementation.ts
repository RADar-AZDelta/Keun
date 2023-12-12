import { authImpl, databaseImpl, fileTypeImpl, saveImpl, settingsImpl } from '$lib/store'
import { authImplementation, databaseImplementation, saveImplementation } from '$lib/store'
import type { ICustomStoreOptions } from '@radar-azdelta/svelte-datatable/components/DataTable'
import type { IAuthImpl, ISettingsImpl, IUpdatedFunctionalityImpl } from '$lib/components/Types'

export async function loadImplementationDB(): Promise<IUpdatedFunctionalityImpl> {
  return new Promise(async resolve => {
    databaseImpl.subscribe(async impl => {
      if (impl) return resolve(impl)
      if (databaseImplementation === 'firebase') {
        await import('$lib/implementations/databaseImpl/FirebaseImpl').then(({ default: FirebaseImpl }) => {
          databaseImpl.set(new FirebaseImpl())
          return databaseImpl
        })
      } else {
        await import('$lib/implementations/databaseImpl/LocalImpl').then(({ default: LocalImpl }) => {
          databaseImpl.set(new LocalImpl())
          return databaseImpl
        })
      }
    })()
  })
}

export async function loadImplementationAuth(): Promise<IAuthImpl> {
  return new Promise(async resolve => {
    authImpl.subscribe(async impl => {
      if (impl) return resolve(impl)
      if (authImplementation === 'firebase') {
        import('$lib/implementations/authImpl/FirebaseImpl').then(({ default: FirebaseImpl }) => {
          authImpl.set(new FirebaseImpl())
          return authImpl
        })
      } else
        import('$lib/implementations/authImpl/LocalImpl').then(({ default: LocalImpl }) => {
          authImpl.set(new LocalImpl())
          return authImpl
        })
    })
  })
}

export async function loadImplementationSave(): Promise<ICustomStoreOptions> {
  return new Promise(async resolve => {
    saveImpl.subscribe(async impl => {
      if (impl) return resolve(impl)
      if (saveImplementation === 'firebase') {
        await import('$lib/implementations/saveImplementations/FirebaseSaveImpl').then(
          ({ default: FirebaseSaveImpl }) => {
            saveImpl.set(new FirebaseSaveImpl())
            return saveImpl
          },
        )
      } else return impl
    })
  })
}

export async function loadImplementationSettings(): Promise<ISettingsImpl> {
  return new Promise(async resolve => {
    settingsImpl.subscribe(async impl => {
      if (impl) return resolve(impl)
      if (databaseImplementation === 'firebase') {
        await import('$lib/implementations/settingsImpl/FirebaseImpl').then(({ default: FirebaseSettingsImpl }) => {
          settingsImpl.set(new FirebaseSettingsImpl())
          return settingsImpl
        })
      } else
        await import('$lib/implementations/settingsImpl/localImpl').then(({ default: LocalSettingsImpl }) => {
          settingsImpl.set(new LocalSettingsImpl())
          return settingsImpl
        })
    })
  })
}

export async function loadImplementationDataType() {
  return new Promise(async resolve => {
    fileTypeImpl.subscribe(async impl => {
      return resolve(impl)
    })
  })
}

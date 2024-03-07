import { PUBLIC_CLOUD_AUTH_IMPLEMENTATION, PUBLIC_CLOUD_DATABASE_IMPLEMENTATION } from '$env/static/public'
import { Providers } from '$lib/enums'
import { authImpl, databaseImpl as dbImpl, settingsImpl } from '$lib/store'

export const databaseImplementation = PUBLIC_CLOUD_DATABASE_IMPLEMENTATION || Providers.Local
export const authImplementation = PUBLIC_CLOUD_AUTH_IMPLEMENTATION || Providers.Local

export async function loadImplDB() {
  return new Promise(async resolve => {
    dbImpl.subscribe(async impl => {
      if (impl) return resolve(impl)
    })
    if (databaseImplementation === Providers.Firebase)
      await import('$lib/implementations/databaseImpl/FirebaseImpl').then(({ default: Impl }) => dbImpl.set(new Impl()))
    else await import('$lib/implementations/databaseImpl/LocalImpl').then(({ default: Impl }) => dbImpl.set(new Impl()))
  })
}

export async function loadImplAuth() {
  return new Promise(resolve => {
    authImpl.subscribe(async impl => {
      if (impl) return resolve(impl)
    })
    if (authImplementation === Providers.Firebase) {
      import('$lib/implementations/authImpl/FirebaseImpl').then(({ default: Impl }) => authImpl.set(new Impl()))
    } else import('$lib/implementations/authImpl/LocalImpl').then(({ default: Impl }) => authImpl.set(new Impl()))
  })
}

export async function loadImpSettings() {
  return new Promise(async resolve => {
    settingsImpl.subscribe(async impl => {
      if (impl) return resolve(impl)
    })
    if (databaseImplementation === Providers.Firebase) {
      await import('$lib/implementations/settingsImpl/FirebaseImpl').then(({ default: Impl }) =>
        settingsImpl.set(new Impl()),
      )
    } else
      await import('$lib/implementations/settingsImpl/localImpl').then(({ default: Impl }) =>
        settingsImpl.set(new Impl()),
      )
  })
}

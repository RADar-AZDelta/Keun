import { authImpl, authImplementation, customFileTypeImpl, databaseImpl, databaseImplementation, fileTypeImpl, saveImpl, saveImplementation, settings, settingsImpl } from "../store";
import type { ICustomStoreOptions } from "@radar-azdelta/svelte-datatable/components/DataTable";
import type { IAuthImpl, ISettingsImpl, IUpdatedFunctionalityImpl } from "../components/Types";

export async function loadImplementationDB(): Promise<IUpdatedFunctionalityImpl> {
    return new Promise(async (resolve, reject) => {
        databaseImpl.subscribe(async (impl) => {
            if (impl) return resolve(impl)
            if (databaseImplementation === 'firebase') { }
            else if (databaseImplementation === 'sqlite') { }
            else {
                await import('$lib/implementations/databaseImpl/LocalImpl').then(({ default: LocalImpl }) => {
                    databaseImpl.set(new LocalImpl())
                    return databaseImpl
                })
            }
        })()
    })
}

export async function loadImplementationAuth(): Promise<IAuthImpl> {
    return new Promise(async (resolve, reject) => {
        authImpl.subscribe(async (impl) => {
            if (impl) return resolve(impl)
            if (authImplementation === 'firebase') { }
            else import('$lib/implementations/authImpl/LocalImpl').then(({ default: LocalImpl }) => {
                authImpl.set(new LocalImpl())
                return authImpl
            })
        })
    })
}

export async function loadImplementationSave(): Promise<ICustomStoreOptions> {
    return new Promise(async (resolve, reject) => {
        saveImpl.subscribe(async (impl) => {
            if (impl) return resolve(impl)
            if (saveImplementation === 'firebase') {
                await import('$lib/implementations/saveImplementations/FirebaseSaveImpl').then(({ default: FirebaseSaveImpl }) => {
                    saveImpl.set(new FirebaseSaveImpl())
                    return saveImpl
                })
            } else return impl
        })
    })
}

export async function loadImplementationSettings(): Promise<ISettingsImpl> {
    return new Promise(async (resolve, reject) => {
        settingsImpl.subscribe(async (impl) => {
            if (impl) return resolve(impl)
            if (databaseImplementation === 'firebase') { }
            else await import('$lib/implementations/settingsImpl/localImpl').then(({ default: LocalSettingsImpl }) => {
                settingsImpl.set(new LocalSettingsImpl())
                return settingsImpl
            })
        })
    })
}

export async function loadImplementationDataType() {
    return new Promise(async (resolve, reject) => {
        fileTypeImpl.subscribe(async (impl) => {
            if (impl) return resolve(impl)
            if (databaseImplementation === 'firebase') {
                await import('$lib/implementations/dataTypesImpl/FirebaseFileDataTypeImpl').then(({ default: FirebaseFileDataTypeImpl }) => {
                    fileTypeImpl.set(new FirebaseFileDataTypeImpl())
                    customFileTypeImpl.set(new FirebaseFileDataTypeImpl())
                    return fileTypeImpl
                })
            } else return impl
        })
    })
}
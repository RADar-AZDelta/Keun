import { authImpl, authImplementation, customFileTypeImpl, databaseImpl, databaseImplementation, fileTypeImpl, saveImpl, saveImplementation } from "./store";
import type { ICustomStoreOptions } from "@radar-azdelta/svelte-datatable/components/DataTable";
import type { IAuthImpl, IUpdatedFunctionalityImpl } from "./components/Types";

export async function loadImplementationDB(): Promise<IUpdatedFunctionalityImpl> {
    return new Promise(async (resolve, reject) => {
        databaseImpl.subscribe(async (impl) => {
            if (impl) return resolve(impl)
            if (databaseImplementation === 'firebase') { }
            else if (databaseImplementation === 'sqlite') { }
            else {
                await import('$lib/databaseImpl/LocalImpl').then(({ default: LocalImpl }) => {
                    impl = new LocalImpl()
                    return resolve(impl)
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
            else import('$lib/authImpl/LocalImpl').then(({ default: LocalImpl }) => {
                impl = new LocalImpl()
                return resolve(impl)
            })
        })
    })
}

export async function loadImplementationSave(): Promise<ICustomStoreOptions> {
    return new Promise(async (resolve, reject) => {
        saveImpl.subscribe(async (impl) => {
            if (impl) return resolve(impl)
            if (saveImplementation === 'firebase') {
                await import('$lib/saveImplementations/FirebaseSaveImpl').then(({ default: FirebaseSaveImpl }) => {
                    impl = new FirebaseSaveImpl()
                    return resolve(impl)
                })
            } else return impl
        })
    })
}

export async function loadImplementationDataType() {
    return new Promise(async (resolve, reject) => {
        fileTypeImpl.subscribe(async (impl) => {
            if (impl) return resolve(impl)
            if (databaseImplementation === 'firebase') {
                await import('$lib/dataTypes/FirebaseFileDataTypeImpl').then(({ default: FirebaseFileDataTypeImpl }) => {
                    impl = new FirebaseFileDataTypeImpl()
                    customFileTypeImpl.set(new FirebaseFileDataTypeImpl())
                    return resolve(impl)
                })
            } else return impl
        })
    })
}
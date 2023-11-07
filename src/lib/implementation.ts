import type { IAuthImpl, IUpdatedFunctionalityImpl } from "./components/Types";
import { authImpl, authImplementation, databaseImpl, databaseImplementation } from "./store";

export async function loadImplementationDB(): Promise<IUpdatedFunctionalityImpl> {
    return new Promise(async (resolve, reject) => {
        databaseImpl.subscribe((impl) => {
            if(impl) return resolve(impl)
            if(databaseImplementation === 'firebase') {}
            else if(databaseImplementation === 'sqlite') {}
            else {
                import('$lib/databaseImpl/LocalImpl').then(({ default: LocalImpl }) => {
                    impl = new LocalImpl()
                    resolve(impl)
                })
            }
        })()
      })
}

export async function loadImplementationAuth(): Promise<IAuthImpl> {
    return new Promise(async (resolve, reject) => {
        authImpl.subscribe((impl) => {
            if(impl) return resolve(impl)
            if(authImplementation === 'firebase') {}
        })
    })
}
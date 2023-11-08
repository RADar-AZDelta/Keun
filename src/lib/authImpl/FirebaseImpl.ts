import { dev } from "$app/environment";
import type { IAuthImpl, IUserRestriction } from "$lib/components/Types";
import type { User } from "firebase/auth";

export default class LocalImpl implements IAuthImpl {
    user: User | undefined

    async logIn(name?: string): Promise<void> {
        if(dev) console.log('logIn: Logging in via Firebase')
    }
    async logOut(): Promise<void> {
        if(dev) console.log('logOut: Logging out via Firebase')
    }

    async getAuthor(): Promise<string | null | void> {
        if(dev) console.log('getAuthor: Get the saved author via Firebase')
    }

    async getAllAuthors(): Promise<void | IUserRestriction> {}
}
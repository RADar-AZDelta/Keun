import { dev } from "$app/environment";
import type { IAuthImpl, IUserRestriction } from "$lib/components/Types";
import { user } from "$lib/store";

export default class LocalImpl implements IAuthImpl {
    async logIn(name?: string): Promise<void> {
        if(dev) console.log('logIn: Logging in and saving in localstorage')
        if(!name) return console.error('logIn: Provide a name to log in with just a name')
        localStorage.setItem("author", name)
        user.set({ name })
    }
    async logOut(): Promise<void> {}

    async getAuthor(): Promise<void> {
        if(dev) console.log('getAuthor: Get the saved author from localstorage')
        const author = localStorage.getItem("author")
        if(author) user.set({ name: author })
    }

    async getAllAuthors(): Promise<void | IUserRestriction> {}
}
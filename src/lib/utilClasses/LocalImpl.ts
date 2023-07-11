import { dev } from "$app/environment";
import type { IFunctionalityImpl } from "$lib/components/Types";
import { settings } from "$lib/store";
import { localStorageGetter, localStorageSetter } from "$lib/utils";

export default class LocalImpl implements IFunctionalityImpl {
    constructor() {}

    async deleteFile(fileName: string): Promise<string[] | void> {}

    async editFile(fileName: string, authorizedAuthors: string[]): Promise<void> {}

    async getFiles(): Promise<string[] | void> {}

    async getFilesAdmin(): Promise<string[] | void> {}

    async getAllAuthors(): Promise<void | Record<string, { email: string; files: Record<string, string>; }>> {}

    async downloadFile(fileName: string): Promise<void> {}

    async uploadFile(file: File, authorizedAuthors: string[]): Promise<string[] | void> {}

    async syncSettings(action: "read" | "write"): Promise<void> {}

    async readFileFirstTime(fileName: string): Promise<{ file: File | undefined; customConceptsFile: File | undefined; } | void> {}

    async watchValueFromDatabase(path: string, subCallback: () => unknown): Promise<void> {}

    async getSavedAuthor(): Promise<void> {
        const author = localStorageGetter('author-Keun')
        settings.update((settings) => {
            settings.author = { name: author.name }
            return settings
        })
        return
    }

    async logIn(author: string | null | undefined): Promise<void> {
        if (dev) console.log('saveAuthorUpdate: Saving auhtor update')
        settings.update((settings) => {
            if(settings.author) settings.author.name = author == undefined ? '' : author
            else settings.author = { name: author == undefined ? '' : author}
            localStorageSetter('author-Keun', settings.author)
            return settings
        })
    }

    async cancelLogIn(backupAuthor: string | null | undefined): Promise<void> {
        settings.update((settings) => {
            if(settings.author) settings.author.name = backupAuthor == undefined ? '' : backupAuthor
            else settings.author = { name: backupAuthor == undefined ? '': backupAuthor}
            return settings
        })
    }
}
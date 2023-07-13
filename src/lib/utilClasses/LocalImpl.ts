import { dev } from '$app/environment';
import { goto } from '$app/navigation';
import type { ICache, IFunctionalityImpl, ISync } from '$lib/components/Types';
import { settings } from '$lib/store';
import { convertBlobToHexString, convertHexStringToBlob, fileToBlob, localStorageGetter, localStorageSetter } from '$lib/utils';
import { IndexedDB } from './IndexedDB';
import { base } from '$app/paths'

export default class LocalImpl implements IFunctionalityImpl {
    constructor() {}

    async deleteFile(fileName: string): Promise<string[] | void> {}

    async editFile(fileName: string, authorizedAuthors: string[]): Promise<void> {}

    async getFiles(): Promise<string[] | void> {
        const db = new IndexedDB('localMapping', 'localMapping')
        const files = await db.keys(true)
        return files
    }

    async getFilesAdmin(): Promise<string[] | void> {}

    async getAllAuthors(): Promise<void | Record<string, { email: string; files: Record<string, string>; }>> {}

    async downloadFile(fileName: string): Promise<void> {
        let element = document.createElement('a')
        const db = new IndexedDB('localMapping', 'localMapping')
        const fileData = await db.get(fileName, true, true)
        const hex = fileData.file
        const blob = await convertHexStringToBlob(hex, 'text/csv')
        const file = new File([blob], fileName, { type: 'text/csv' })
        const url = URL.createObjectURL(file)
        element.setAttribute('href', url)
        element.setAttribute('download', fileName)
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
        URL.revokeObjectURL(url)
        this.removeCache(file.name)
        return
    }

    async uploadFile(file: File, authorizedAuthors: string[]): Promise<string[] | void> {
        if(dev) console.log('uploadFile: Uploading file to IndexedDB')
        const db = new IndexedDB('localMapping', 'localMapping')
        const blob = await fileToBlob(file)
        const hex = await convertBlobToHexString(blob)
        await db.set({ fileName: file.name, file: hex }, file.name, true)
        goto(`${base}/mapping`)
        return
    }

    async syncSettings(action: 'read' | 'write'): Promise<void> {
        if(action == 'read') {
            if(dev) console.log('syncSettings: Reading the settings from the localStorage')
            const storedSettings = await localStorageGetter('settings-Keun')
            if(storedSettings) settings.set(storedSettings)
        } else if (action == 'write') {
            if(dev) console.log('syncSettings: Write the settings to the localStorage')
            settings.subscribe(async(settings) => {
                await localStorageSetter('settings-Keun', settings)
            })
        }
    }

    async readFileFirstTime(fileName: string): Promise<{ file: File | undefined; customConceptsFile: File | undefined; } | void> {
        const db = new IndexedDB('localMapping', 'localMapping')
        if(dev) console.log(`readFileFirstTime: Get the file (${fileName}) from IndexedDB for local mapping`)
        const storedFile = await db.get(fileName, true)
        const storedCustomConcepts = await db.get('customConcepts.csv', true, true)
        if(storedFile && storedCustomConcepts) {
            const blob = await convertHexStringToBlob(storedFile.file, 'text/csv')
            const file = new File([blob], storedFile.fileName, { type: 'text/csv' })
            const customBlob = await convertHexStringToBlob(storedCustomConcepts.file, 'text/csv')
            const customFile = new File([customBlob], 'customConcepts.csv', { type: 'text/csv' })
            return {
                file,
                customConceptsFile: customFile
            }
        } else return
    }

    async watchValueFromDatabase(path: string, subCallback: () => unknown): Promise<void> {}

    async getSavedAuthor(): Promise<void> {
        const author = localStorageGetter('author-Keun')
        if(author){
            settings.update((settings) => {
                settings.author = { name: author.name }
                return settings
            })
        }
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

    async syncFile(data: ISync): Promise<File | void> {
        return new Promise(async(resolve, reject) => {
            const db = new IndexedDB('localMapping', 'localMapping')
            if(data.action == 'update' && data.blob) {
                if(dev) console.log('syncFile: Updating the file in IndexedDB')
                const hex = await convertBlobToHexString(data.blob)
                await db.set({ fileName: data.fileName, file: hex }, data.fileName, true)
                resolve()
            } else {
                const res = await db.get(data.fileName, true, true)
                if(res) {
                    if(dev) console.log('syncFile: Getting the file from IndexedDB')
                    const blob = await convertHexStringToBlob(res.file, 'text/csv')
                    const file = new File([blob], data.fileName, { type: 'text/csv' })
                    resolve(file)
                } else {
                    console.error('syncFile: There was no file found in IndexedDB')
                    resolve()
                }
            }
        })
    }

    async cache(data: ICache): Promise<File | void> {
        const db = new IndexedDB('localMapping', 'localMapping')
        if(data.action == 'update') {
            const hex = await convertBlobToHexString(data.blob)
            await db.set({ fileName: data.fileName, file: hex }, data.fileName, true)
            return
        } else if (data.action == 'get') {
            const fileData = await db.get(data.fileName, true, true)
            const blob = await convertHexStringToBlob(fileData.file, 'text/csv')
            const file = new File([blob], data.fileName, { type: 'text/csv' })
            return file
        } else {
            await db.close()
            console.error('cache: Provide a valid action to cache the downloaded data')
        }
    } 

    async removeCache(fileName: string): Promise<void> {
        const db = new IndexedDB('localMapping', 'localMapping')
        await db.remove(fileName, true)
        return
    }

    async checkForCache(fileName: string): Promise<boolean | void> {
        const db = new IndexedDB('localMapping', 'localMapping')
        const res = await db.get(fileName, true, true)
        if(res) return true
        else return false
    }
    
    async getCachedFiles(): Promise<string[] | void> {
        const db = new IndexedDB('localMapping', 'localMapping')
        const files = await db.keys(true)
        return files
    }

    async checkCustomConcepts(): Promise<File | void> {
        return new Promise(async(resolve, reject) => {
            const db = new IndexedDB('localMapping', 'localMapping')
            const res = await db.get('customConcepts.csv', true)    
            if(!res) {
                const blob = new Blob(['concept_id,concept_code,concept_name,concept_class_id,domain_id,vocabulary_id,standard_concept,valid_start_date,valid_end_date,invalid_reason\n0,0,test,test,test,0,0,05/07/2023,31/12/2099,null'])
                const file = new File([blob], 'customConcepts.csv', { type: 'text/csv' })
                const hex = await convertBlobToHexString(blob)
                await db.set({ fileName: 'customConcepts.csv', file: hex}, 'customConcepts.csv', true)
                resolve(file)
            } else {
                await db.close()
                const hex = res.file
                const blob = await convertHexStringToBlob(hex, "text/csv")
                const file = new File([blob], 'customConcepts.csv', { type: 'text/csv' })
                resolve(file)
            }
        })
    }
}
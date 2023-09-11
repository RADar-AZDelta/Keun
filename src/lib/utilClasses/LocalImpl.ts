import { dev } from '$app/environment';
import { goto } from '$app/navigation';
import type { ICache, IFunctionalityImpl, ISync } from '$lib/components/Types';
import { settings } from '$lib/store';
import { convertBlobToHexString, convertHexStringToBlob, fileToBlob, localStorageGetter, localStorageSetter, blobToString, stringToBlob } from '$lib/utils';
import { IndexedDB } from './IndexedDB';
import { base } from '$app/paths'

export default class LocalImpl implements IFunctionalityImpl {
    db: IndexedDB | undefined
    
    constructor() {}

    async deleteFile(fileName: string): Promise<string[] | void> {}

    async editFile(fileName: string, authorizedAuthors: string[]): Promise<void> {}

    async getFiles(): Promise<string[] | void> {
        const db = new IndexedDB('localMapping', 'localMapping')
        const files = await db.keys(true)
        const filteredFiles = files.filter(f => !f.includes('_concept'))
        return filteredFiles
    }

    async getFilesAdmin(): Promise<string[] | void> {}

    async getAllAuthors(): Promise<void | Record<string, { email: string; files: Record<string, string>; }>> {}

    async downloadFile(fileName: string, usagiString: boolean = false, customString: boolean = false): Promise<void> {
        const extensionFiltered = fileName.includes('.csv') ? fileName.split('.csv')[0] : fileName
        const filteredName = extensionFiltered.includes('_usagi') ? `${extensionFiltered.split('_usagi')[0]}` : extensionFiltered
        const usagiFileName = usagiString ? `${filteredName.split('.csv')[0]}_usagi` : filteredName
        let customFileName = customString ? `${usagiFileName.split('_usagi_concept')[0]}_concept` : usagiFileName
        if(customFileName.includes('_concept_concept')) customFileName = `${customFileName.split('_concept')[0]}_concept`
        let element = document.createElement('a')
        const db = new IndexedDB('localMapping', 'localMapping')
        const fileData = await db.get(fileName, true)
        const hex = fileData.file
        const blob = fileData.type == "hex" ? await convertHexStringToBlob(hex, 'text/csv') : await stringToBlob(fileData.file)
        if(customFileName.includes('_concept')) {
            // If the file is a custom concepts file, check if the test line is still in the blob
            // If the test line is still in the blob, this means there are no custom concepts created so don't download the file
            const text = await blob.text()
            if(text.includes('0,test,test,test,test,S,123,2000-01-01,2099-01-01,U')) return
        }
        const file = new File([blob], `${customFileName}.csv`, { type: 'text/csv' })
        const url = URL.createObjectURL(file)
        element.setAttribute('href', url)
        element.setAttribute('download', `${customFileName}.csv`)
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
        URL.revokeObjectURL(url)
        this.removeCache(fileName)
        return
    }

    async uploadFile(file: File, authorizedAuthors: string[]): Promise<string[] | void> {
        if(dev) console.log('uploadFile: Uploading file to IndexedDB')
        const blob = await fileToBlob(file)
        if(await this.isOpen() == false) await this.openDatabase()
        if(blob.size > 1000000) {
            const str = await blobToString(blob)
            await this.db!.set({ fileName: file.name, type: "text", file: str, fileType: 'concepts' }, file.name, true)
        } else {
            const hex = await convertBlobToHexString(blob)
            await this.db!.set({ fileName: file.name, type: "hex", file: hex, fileType: 'concepts' }, file.name, true)
        }
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
        if(dev) console.log(`readFileFirstTime: Get the file (${fileName}) from IndexedDB for local mapping`)
        if(await this.isOpen() == false) await this.openDatabase()
        const storedFile = await this.db!.get(fileName, true)
        const customName = `${fileName.split('.csv')[0]}_concept.csv`
        const storedCustomConcepts = await this.db!.get(customName, true, true)
        if(storedFile && storedCustomConcepts) {
            if(storedFile.type == "hex") {
                const blob = await convertHexStringToBlob(storedFile.file, 'text/csv')
                const file = new File([blob], storedFile.fileName, { type: 'text/csv' })
                const customBlob = await convertHexStringToBlob(storedCustomConcepts.file, 'text/csv')
                const customFile = new File([customBlob], customName, { type: 'text/csv' })
                return {
                    file,
                    customConceptsFile: customFile
                }
            } else if(storedFile.type == "text") {
                const blob = await stringToBlob(storedFile.file)
                const file = new File([blob], storedFile.fileName, { type: 'text/csv' })
                const customBlob = await convertHexStringToBlob(storedCustomConcepts.file, 'text/csv')
                const customFile = new File([customBlob], customName, { type: 'text/csv' })
                return {
                    file,
                    customConceptsFile: customFile
                }
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
            if(await this.isOpen() == false) await this.openDatabase()
            if(data.action == 'update' && data.blob) {
                if(dev) console.log('syncFile: Updating the file in IndexedDB')
                if(data.blob.size > 1000000) {
                    const str = await blobToString(data.blob)
                    await this.db!.set({ fileName: data.fileName, type: "text", file: str, fileType: 'concepts' }, data.fileName, true)
                    resolve()
                } else {
                    const hex = await convertBlobToHexString(data.blob)
                    await this.db!.set({ fileName: data.fileName, type: "hex", file: hex, fileType: 'concepts' }, data.fileName, true)
                    resolve()
                }
            } else {
                const res = await this.db!.get(data.fileName, true, true)
                if(res) {
                    if(dev) console.log('syncFile: Getting the file from IndexedDB')
                    const blob = res.type == "hex" ? await convertHexStringToBlob(res.file, 'text/csv') : await stringToBlob(res.file)
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
        if(await this.isOpen() == false) await this.openDatabase()
        if(data.action == 'update') {
            if(data.blob.size > 1000000) {
                const str = await blobToString(data.blob)
                await this.db!.set({ fileName: data.fileName, type: "text", file: str, fileType: 'concepts' }, data.fileName, true)
            } else {
                const hex = await convertBlobToHexString(data.blob)
                await this.db!.set({ fileName: data.fileName, type: "hex", file: hex, fileType: 'concepts' }, data.fileName, true)
            }
            return
        } else if (data.action == 'get') {
            const fileData = await this.db!.get(data.fileName, true, true)
            const blob = fileData.type == "hex" ? await convertHexStringToBlob(fileData.file, 'text/csv') : await stringToBlob(fileData.file)
            const file = new File([blob], data.fileName, { type: 'text/csv' })
            return file
        } else {
            console.error('cache: Provide a valid action to cache the downloaded data')
        }
    } 

    async removeCache(fileName: string): Promise<void> {
        if(await this.isOpen() == false) await this.openDatabase()
        await this.db!.remove(fileName, true)
        return
    }

    async checkForCache(fileName: string): Promise<boolean | void> {
        if(await this.isOpen() == false) await this.openDatabase()
        const res = await this.db!.get(fileName, true, true)
        if(res) return true
        else return false
    }
    
    async getCachedFiles(): Promise<string[] | void> {
        const db = new IndexedDB('localMapping', 'localMapping')
        const files = await db.keys(true)
        return files
    }

    async checkCustomConcepts(name: string): Promise<File | void> {
        return new Promise(async(resolve, reject) => {
            const customName = `${name.split('.csv')[0]}_concept.csv`
            if(await this.isOpen() == false) await this.openDatabase()
            const res = await this.db!.get(customName, true)
            if(!res) {
                // TODO: check to delete the first test row, this row is needed because Arquero expects the columns as well as one row
                const blob = new Blob(['concept_id,concept_name,domain_id,vocabulary_id,concept_class_id,standard_concept,concept_code,valid_start_date,valid_end_date,invalid_reason\n0,test,test,test,test,S,123,2000-01-01,2099-01-01,U'])
                const file = new File([blob], customName, { type: 'text/csv' })
                const hex = await convertBlobToHexString(blob)
                await this.db!.set({ fileName: customName, file: hex, fileType: 'custom'}, customName, true)
                resolve(file)
            } else {
                const hex = res.file
                const blob = await convertHexStringToBlob(hex, "text/csv")
                const file = new File([blob], customName, { type: 'text/csv' })
                resolve(file)
            }
        })
    }

    async openDatabase(): Promise<void> {
        if(await this.isOpen() == false) this.db = new IndexedDB('localMapping', 'localMapping')
    }

    async closeDatabase(): Promise<void> {
        if(await this.isOpen()) this.db!.close()
    }

    async isOpen() {
        return this.db instanceof IDBDatabase && !this.db.hasOwnProperty('_secret_did_close');
      }
      
}
import { deleteDatabase, deleteFileStorage, logIn, pushToDatabase, readDatabase, readFileStorage, uploadFileToStorage, userSessionStore, watchValueDatabase, writeToDatabase } from '$lib/firebase'
import { settings } from '$lib/store';
import { goto } from '$app/navigation';
import type { UserSession } from '../../app';
import { dev } from '$app/environment';
import type { ICache, IFunctionalityImpl, ISync } from '$lib/components/Types';
import { IndexedDB } from '../helperClasses/IndexedDB';
import { convertBlobToHexString, convertHexStringToBlob } from '$lib/utils';
import { base } from '$app/paths'

export default class FirebaseImpl implements IFunctionalityImpl {
    dbVersion: number = 0
    customDBVersion: number = 0

    constructor() {}

    async deleteFile(fileName: string): Promise<string[] | void> {
        return new Promise(async(resolve, reject) => {
          let user: UserSession = {}
          userSessionStore.subscribe((u) => user = u)
          if(user?.uid && user?.roles?.includes('Admin')) {
            // Get filesArray and search for the fileName to get the UID of the file
            const filesArray = await readDatabase('/admin')
            for (let [uid, name] of Object.entries(filesArray)) {
              if (name == fileName) await deleteDatabase(`/admin/${uid}`)
            }
            // Delete the file from the file storage from Firebase
            await deleteFileStorage(`/mapping-files/${fileName}`)
            // Delete the version & lastAuthor object for the file in Firebase Realtime Database
            await deleteDatabase(`/files/${fileName.substring(0, fileName.indexOf('.'))}`)
            // Get all the authors of this file & delete the file from their accessable files in Realtime Database
            const authors: Record<string, { email: string; files: Record<string, string> }> = await readDatabase('/authors')
            for (let [uid, info] of Object.entries(authors)) {
              if (info.email) {
                if (info.files) {
                  for (let [fileUid, name] of Object.entries(info.files)) {
                    if (name == fileName) await deleteDatabase(`/authors/${uid}/files/${fileUid}`)
                  }
                }
              }
            }
          }
          resolve(await this.getFiles())
        })
      }
    
    async editFile(fileName: string, authorizedAuthors: string[]): Promise<void> {
      let user: UserSession = {}
      userSessionStore.subscribe((u) => user = u)
      if(user?.uid && user?.roles?.includes('Admin')) {
        if(dev) console.log('editFile: Editing the authorized authors for the file ', fileName)
        const authors = await this.getAllAuthors()
        if(authors) {
          for (let [uid, info] of Object.entries(authors)) {
            // Check if the user is registered, it could be that a user has no email
            if (info.email) {
              if (info.files) {
                // If the user has access to the file, but he is removed from the list of authorized authors
                if (Object.values(info.files).includes(fileName) && !authorizedAuthors.includes(uid)) {
                  const fileComb = Object.entries(info.files).find(arr => arr.includes(fileName))
                  // Delete the file from the user his files list
                  await deleteDatabase(`/authors/${uid}/files/${fileComb![0] === fileName ? fileComb![1] : fileComb![0]}`)
                } else if (!Object.values(info.files).includes(fileName) && authorizedAuthors.includes(uid)) {
                  // If the user didn't have access, but now he does
                  await pushToDatabase(`/authors/${uid}/files`, fileName)
                }
              } else if (authorizedAuthors.includes(uid)) {
                // If the user didn't have access to any files yet
                await pushToDatabase(`/authors/${uid}/files`, fileName)
              }
            }
          }
        }
      }
    }
  
    async getFiles(): Promise<string[] | void> {
      let user: UserSession = {}
      userSessionStore.subscribe((u) => user = u)
      // Check if the user has logged in
      if (user?.uid) {
        let filesArray: Record<string, string>
        // If the user has the role admin, get all the files
        if (user.roles?.includes('Admin')) {
          filesArray = await readDatabase(`/admin`)
        } else {
          // If the user is not an admin, get the files that the user has access to
          filesArray = await readDatabase(`/authors/${user.uid}/files`)
        }
        if (filesArray) return(Object.values(filesArray))
        else return []
      } else return []
    }

    async getFilesAdmin(): Promise<string[] | void> {
      let user: UserSession = {}
      userSessionStore.subscribe((u) => user = u)
      if(user.uid && user.roles?.includes('Admin')){
        const filesArray: Record<string, string> = await readDatabase(`/admin`)
        return Object.values(filesArray)
      }
    }
  
    async getAllAuthors(): Promise<Record<string, { email: string; files: Record<string, string> }> | void> {
      let user: UserSession = {}
      userSessionStore.subscribe((u) => user = u)
      if (user?.uid && user?.roles?.includes('Admin'))
        return (await readDatabase('/authors')) as Record<string, { email: string; files: Record<string, string> }>
      else return
    }
  
    async downloadFile(fileName: string) {
      let user: UserSession = {}
      userSessionStore.subscribe((u) => user = u)
      if(user?.uid && user?.roles?.includes('Admin')) {
        let element = document.createElement('a')
        // Get the file from the file storage in Firebase
        const fileToDownload = await readFileStorage(`/mapping-files/${fileName}`)
        if (fileToDownload) {
          const url = URL.createObjectURL(fileToDownload)
          element.setAttribute('href', url)
          element.setAttribute('download', `${fileName.split(".csv")[0]}_usagi.csv`)
          document.body.appendChild(element)
          element.click()
          document.body.removeChild(element)
          URL.revokeObjectURL(url)
        }
      }
    }
  
    async uploadFile(file: File, authorizedAuthors: string[]): Promise<string[] | void> {
      let user: UserSession = {}
      userSessionStore.subscribe((u) => user = u)
      if(file && user?.uid && user?.roles?.includes('Admin')) {
        await uploadFileToStorage(`/mapping-files/${file.name}`, file)
        // Push the file name to admin in Firebase
        await pushToDatabase('/admin', file.name)
        if (authorizedAuthors) {
          for (let u of authorizedAuthors) {
            // For every authorized author for this file, push the name to there Firebase object
            await pushToDatabase(`/authors/${u}/files`, file.name)
          }
        }
        // Set the version & lastAuthor for this file in Firebase
        await writeToDatabase(`/files/${file.name.substring(0, file.name.indexOf('.'))}`, { version: 1, lastAuthor: '' })
      }
      return await this.getFiles()
    }
  
    async syncSettings(action: 'read' | 'write'): Promise<void> {
      let user: UserSession = {}
      userSessionStore.subscribe((u) => user = u)
      if (action == 'read') {
        if (dev) console.log('syncSettings: Reading the settings for Keun from database')
        const storedSettings = await readDatabase(`/authors/${user?.uid}/usagi-settings`)
        if (storedSettings) settings.set(storedSettings)
      } else if (action == 'write') {
        settings.subscribe(async(settings) => {
          // Write the settings to Firebase
          if (dev) console.log('syncSettings: Write the settings for keun to database')
          await writeToDatabase(`/authors/${user?.uid}/usagi-settings`, settings)
        })
      } else console.error(`syncSettings: Action (${action}) is not supported`)
    }
  
    async readFileFirstTime(fileName: string): Promise<{
      file: File | undefined;
      customConceptsFile: File | undefined;
  } | void> {
      let file: File | undefined, customConceptsFile: File | undefined
      if (dev) console.log('readFileFirstTime: Get the file from storage for the setup')
      // Get the file for the page, but also the custom concepts file
      const blob = await readFileStorage(`/mapping-files/${fileName}`)
      const customBlob = await readFileStorage(`/mapping-files/${fileName.split('.csv')[0]}_concept.csv`)
      this.dbVersion = await readDatabase(`/files/${fileName?.substring(0, fileName.indexOf('.'))}/version`)
      this.customDBVersion = await readDatabase(`/files/customConcepts/version`)
      if (blob) file = new File([blob], fileName!, { type: 'text/csv' })
      else {
        if (dev) console.error('readFileFirstTime: There was no file found in storage')
        goto(`${base}/`)
      }
  
      if (customBlob) customConceptsFile = new File([customBlob], `${fileName.split('.csv')[0]}_concept.csv`, { type: 'text/csv' })
  
      return {
        file,
        customConceptsFile
      }
    }
  
    async watchValueFromDatabase(path: string, subCallback: () => unknown, remove?: boolean): Promise<void> {
      let user: UserSession = {}
      userSessionStore.subscribe((u) => user = u)
      watchValueDatabase(path, snapshot => {
        const res = snapshot.val()
        if(res) {
          if(res.lastAuthor !== user.name && this.dbVersion !== res.version) {
            if (dev) console.log('watchValueDatabase: The version of the file has changed')
            this.dbVersion = res.version
          }
        }
        subCallback()
      }, remove)
    }

    async getSavedAuthor(): Promise<void> {
      userSessionStore.subscribe((u) => {
        settings.update((settings) => {
          settings.author = { name: u.name, uid: u.uid, roles: u.roles}
          return settings
        })
      })
    }

    async logIn(author: string | null | undefined): Promise<void> {
      const cred = await logIn('google')
      let user: UserSession
      userSessionStore.subscribe((u) => user = u)
      settings.update((settings) => {
        if(user) settings.author = { name: user.name, uid: user.uid, roles: user.roles }
        else settings.author = { name: cred.user.displayName, uid: cred.user.uid }
        return settings
      })
    }

    async cancelLogIn(backupAuthor: string | null | undefined): Promise<void> {}

    async syncFile(data: ISync): Promise<File | void> {
      return new Promise(async(resolve, reject) => {
        const { version } = await readDatabase(`files/${data.fileName.substring(0, data.fileName.indexOf('.'))}`)
        const db = new IndexedDB(data.fileName, data.fileName)
        let name: string = ""
        userSessionStore.subscribe((user) => {
          if(user && user?.name) name = user.name
        })
        if(data.action == "update" && data.blob) {
          const file = new File([data.blob], data.fileName, { type: "text/csv"})
          await uploadFileToStorage(`/mapping-files/${data.fileName}`, file)
          await writeToDatabase(`/files/${data.fileName.substring(0, data.fileName.indexOf('.'))}`, { version: version + 1, lastAuthor: name})
          const hex = await convertBlobToHexString(data.blob)
          await db.set({ fileName: data.fileName, file: hex}, 'fileData')
          await db.set(version + 1, 'version', true)
          resolve()
        } else {
          const fileData = await db.get('fileData', true)
          const indexedVersion = fileData.version
          if(indexedVersion > version) {
            const blob = await convertHexStringToBlob(fileData.file, "text/csv")
            const file = new File([blob], data.fileName, { type: "text/csv" })
            await writeToDatabase(`/files/${data.fileName.substring(0, data.fileName.indexOf('.'))}`, { version: indexedVersion, lastAuthor: name})
            await uploadFileToStorage(`/mapping-files/${data.fileName}`, file)
            await db.close()
            resolve(file)
          } else if(version > indexedVersion) {
            const blob = await readFileStorage(`/mapping-files/${data.fileName}`)
            if(blob) {
              const hex = await convertBlobToHexString(blob)
              await db.set({ fileName: data.fileName, file: hex}, 'fileData')
              await db.set(version, 'version', true)
              const file = new File([blob], data.fileName, { type: 'text/csv' })
              resolve(file)
            } else {
              await db.close()
              console.error('syncFile: There was no file found in the file storage')
            }
          } else {
            const fileData = await db.get('fileData', true)
            if(fileData) {
              const blob = convertHexStringToBlob(fileData.file, 'text/csv')
              const file = new File([blob], data.fileName)
              resolve(file)
            } else {
              const blob = await readFileStorage(`/mapping-files/${data.fileName}`)
              if(blob) {
                const file = new File([blob], data.fileName, { type: 'text/csv' })
                const hex = await convertBlobToHexString(blob)
                await db.set({ fileName: data.fileName, file: hex }, 'fileData')
                await db.set(version, 'version', true)
                resolve(file)
              } else {
                await db.close()
                console.error('syncFile: There was no file found in IndexedDB or the storage')
              }
            }
          }
        }
      })
    }

    async cache(data: ICache): Promise<void | File> {}

    async removeCache(fileName: string): Promise<void> {}

    async checkForCache(fileName: string): Promise<boolean | void> {}

    async getCachedFiles(): Promise<void | string[]> {}

    async checkCustomConcepts(): Promise<void> {}
}
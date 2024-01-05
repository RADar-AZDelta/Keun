import { dev } from '$app/environment'
import initial from '$lib/data/customBlobInitial.json'
import { IndexedDB } from '$lib/helperClasses/IndexedDB'
import { blobToString, downloadWithUrl, fileToBlob, stringToBlob, stringToFile } from '$lib/obsolete/utils'
import type { IConceptFiles, IFile, IUpdatedFunctionalityImpl, IUserRestriction } from '$lib/components/Types'

export default class LocalImpl implements IUpdatedFunctionalityImpl {
  db: IndexedDB | undefined
  customDb: IndexedDB | undefined

  async getFile(id: string): Promise<IConceptFiles | void> {
    if (dev) console.log(`getFile: Get file with id ${id} in IndexedDB`)
    await this.openDatabase()
    const fileInfo = await this.db?.get(id, true, true)
    if (!fileInfo || !fileInfo.content) return console.error('getFile: File not found in IndexedDB')
    await this.openCustomDatabase()
    const customFileInfo = await this.customDb!.get(id, true, true)
    const file = await stringToFile(fileInfo.content, fileInfo.name)
    const fileObj: IFile = { id: fileInfo.id, name: fileInfo.name, file }
    const customFile = customFileInfo ? await stringToFile(customFileInfo.content, customFileInfo.name) : undefined
    const customFileObj: IFile = {
      id: customFileInfo?.id ?? undefined,
      name: customFileInfo?.name ?? undefined,
      file: customFile ?? undefined,
    }
    return { file: fileObj, customFile: customFileObj }
  }

  async checkFileExistance(fileName: string): Promise<boolean | string | void> {
    if (dev) console.log(`checkFileExistence: Check if the file with name ${fileName} exists`)
    await this.openDatabase()
    const files = await this.getFiles()
    if (!files) return false
    for (const file of files) if (file.name === fileName) return file.id
  }

  async getFiles(): Promise<IFile[]> {
    if (dev) console.log('getFiles: Get files in IndexedDB')
    await this.openDatabase()
    const blobs = await this.db!.getAll(true)
    const files: IFile[] = []
    for (const blob of blobs)
      files.push({ id: blob.id, name: blob.name, file: await stringToFile(blob.content, blob.name) })
    return files
  }

  async uploadFile(file: File): Promise<string[] | void> {
    if (dev) console.log('uploadFile: Uploading file to IndexedDB')
    await this.openDatabase()
    const blob = await fileToBlob(file)
    const fileString = await blobToString(blob)
    const fileId = crypto.randomUUID()
    const fileContent = { id: fileId, name: file.name, content: fileString }
    await this.db!.set(fileContent, fileId, true)
    const customBlob = new Blob([initial.initial])
    const customFileString = await blobToString(customBlob)
    const customFileContent = {
      id: fileId,
      name: `${file.name.split('.')[0]}_concepts.csv`,
      content: customFileString,
    }
    await this.openCustomDatabase()
    await this.customDb!.set(customFileContent, fileId, true)
    // goto(`${base}/mapping&id=${fileId}`)
  }

  async editFile(id: string, blob: Blob, customBlob?: Blob): Promise<void> {
    if (dev) console.log(`editFile: Editing the file with id ${id}`)
    await this.openDatabase()
    const fileInfo = await this.db?.get(id, true)
    if (!fileInfo) return console.error(`editFile: No file found with id ${id}`)
    const fileString = await blobToString(blob)
    const fileContent = { id, name: fileInfo.name, content: fileString }
    await this.db?.set(fileContent, id, true)
    if (!customBlob) return
    await this.openCustomDatabase()
    const customFileInfo: IFile | undefined = await this.customDb?.get(id, true)
    if (!customFileInfo) return console.error(`editFile: No custom file foun with id ${id}`)
    const customFileString = await blobToString(customBlob)
    const customFileContent = { id, name: fileInfo.name, content: customFileString }
    await this.customDb?.set(customFileContent, id, true)
  }

  async editFileAuthors(): Promise<void> {}

  async deleteFile(id: string): Promise<void> {
    if (dev) console.log(`deleteFile: Delete the file with id ${id} in IndexedDB`)
    await this.openDatabase()
    await this.db!.remove(id, true)
    await this.openCustomDatabase()
    await this.customDb!.remove(id, true)
  }

  async downloadFile(id: string): Promise<void> {
    if (dev) console.log('downloadFile: Download the file & the custom concepts')
    await this.openDatabase()
    const fileInfo = await this.db?.get(id, true, true)
    if (!fileInfo || !fileInfo.content) return console.error('getFile: File not found in IndexedDB')
    const blob = await stringToBlob(fileInfo.content)
    const file = new File([blob], fileInfo.name, { type: 'text/csv' })
    const needsPrefix = !file.name.endsWith('_usagi.csv')
    const updatedName = needsPrefix ? file.name.split('.')[0] + '_usagi.csv' : file.name
    await this.download(updatedName, file)
    await this.downloadCustomFile(fileInfo.id)
    await this.deleteFile(id)
  }

  private async downloadCustomFile(fileId: string) {
    await this.openCustomDatabase()
    const customFileInfo = await this.customDb?.get(fileId, true, true)
    if (!customFileInfo || !customFileInfo.content) return
    if (customFileInfo.content.includes('0,test,test,test,test,S,123')) return
    const customBlob = await stringToBlob(customFileInfo.content)
    const customFile = new File([customBlob], customFileInfo.name, { type: 'text/csv' })
    const updatedName = customFile.name.split('.')[0] + '_concept.csv'
    await this.download(updatedName, customFile)
  }

  async getAllAuthors(): Promise<void | IUserRestriction> {}

  private async openDatabase(): Promise<void> {
    if ((await this.isOpen(this.db)) == false) this.db = new IndexedDB('localMapping', 'localMapping')
  }

  private async openCustomDatabase(): Promise<void> {
    if ((await this.isOpen(this.customDb)) == false) this.customDb = new IndexedDB('customMapping', 'customMapping')
  }

  private async isOpen(db: IndexedDB | undefined) {
    return db instanceof IDBDatabase && !db.hasOwnProperty('_secret_did_close')
  }

  private async download(name: string, file: File) {
    const url = URL.createObjectURL(file)
    await downloadWithUrl(url, name)
  }
}

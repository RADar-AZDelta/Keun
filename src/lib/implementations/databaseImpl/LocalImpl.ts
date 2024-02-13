import { FileHelper, blobToString, fileToBlob, logWhenDev, stringToFile } from '@radar-azdelta/radar-utils'
import initial from '$lib/data/customBlobInitial.json'
import { IndexedDB } from '@radar-azdelta/radar-utils'
import type { IDatabaseImpl, IFile, IFileInformation } from '$lib/components/Types'
import { databaseImpl } from '$lib/store'

interface IDatabaseFile {
  id: string
  name: string
  content: string
  custom: string
  customId: string
}

export default class LocalImpl implements IDatabaseImpl {
  db: IndexedDB | undefined
  customDb: IndexedDB | undefined

  async getKeunFile(id: string): Promise<IFile | undefined> {
    logWhenDev(`getKeunFile: Get file with id ${id} in IndexedDB`)
    await this.openDatabase()
    const file = await this.getFileFromDatabase(this.db, id)
    return file
  }

  async getCustomKeunFile(id: string): Promise<IFile | undefined> {
    logWhenDev(`getCustomKeunFile: Get file with id ${id} in IndexedDB`)
    await this.openCustomDatabase()
    const file = await this.getFileFromDatabase(this.customDb, id)
    return file
  }

  private async getFileFromDatabase(database: IndexedDB | undefined, id: string) {
    if (!database) return
    const fileInfo: undefined | IDatabaseFile = await database.get(id, true, true)
    if (!fileInfo || !fileInfo.content) return undefined
    const { name, content, customId } = fileInfo
    const file = await stringToFile(content, name)
    const fileObj: IFile = { id, name: name, file, customId }
    return fileObj
  }

  async downloadFiles(id: string): Promise<void> {
    await this.openDatabase()
    const file = await this.getFileFromDatabase(this.db, id)
    if (!file || !file.file) return
    await FileHelper.downloadFile(file.file)
    const isCustomFileNotEmpty = await this.checkIfCustomFileIsNotEmpty(file.customId)
    if (!isCustomFileNotEmpty) return
    const customFile = await this.getFileFromDatabase(this.customDb, id)
    if (!customFile || !customFile.file) return
    await FileHelper.downloadFile(customFile.file)
  }

  private async checkIfCustomFileIsNotEmpty(id: string) {
    await this.openCustomDatabase()
    const fileInfo: undefined | IDatabaseFile = await this.customDb?.get(id, true)
    if (!fileInfo) return false
    const content = fileInfo.content
    if (!content || content.includes(',,,,,,,,,')) return false
    return true
  }

  async checkFileExistance(id: string) {
    logWhenDev(`checkFileExistance: Check if the file with id ${id} exists`)
    await this.openDatabase()
    const file: undefined | IDatabaseFile = await this.db?.get(id, true)
    if (!file) return false
    return true
  }

  async getFilesList(): Promise<IFileInformation[]> {
    logWhenDev('getFiles: Get files in IndexedDB')
    await this.openDatabase()
    const files: undefined | IDatabaseFile[] = await this.db!.getAll(true)
    if (!files) return []
    return files.map(file => ({ id: file.id, name: file.name, customId: file.customId, custom: file.custom }))
  }

  async uploadKeunFile(file: File, authors: string[]) {
    logWhenDev('uploadKeunFile: Uploading file to IndexedDB')
    await this.openDatabase()
    const customName = `${file.name.split('.')[0]}_concepts.csv`
    const customId = crypto.randomUUID()
    const fileString = await this.transformFileToString(file)
    const id = crypto.randomUUID()
    const fileContent: IDatabaseFile = { id, name: file.name, content: fileString, custom: customName, customId }
    await this.db!.set(fileContent, file.name, true)
    const customBlob = new Blob([initial.initial])
    const customFileString = await blobToString(customBlob)
    const customFileContent = { id: customId, name: customName, content: customFileString }
    await this.openCustomDatabase()
    await this.customDb!.set(customFileContent, customName, true)
  }

  private async transformFileToString(file: File) {
    const blob = await fileToBlob(file)
    const fileString = await blobToString(blob)
    return fileString
  }

  async editKeunFile(id: string, blob: Blob) {
    logWhenDev(`editKeunFile: Editing the file with id ${id}`)
    await this.openDatabase()
    const fileInfo = await this.db?.get(id, true)
    if (!fileInfo) return
    const { customId, custom, name } = fileInfo
    const fileString = await blobToString(blob)
    const fileContent: IDatabaseFile = { id, name, content: fileString, customId, custom }
    await this.db?.set(fileContent, id, true)
  }

  async editCustomKeunFile(id: string, blob: Blob) {
    await this.openCustomDatabase()
    const fileInfo = await this.customDb?.get(id, true)
    if (!fileInfo) return
    const customFileString = await blobToString(blob)
    const customFileContent = { id, name: fileInfo.name, content: customFileString }
    await this.customDb?.set(customFileContent, id, true)
  }

  async editKeunFileAuthors(id: string, authors: string[]) {}

  async deleteKeunFile(id: string) {
    logWhenDev(`deleteKeunFile: Delete the file with id ${id} in IndexedDB`)
    await this.openDatabase()
    await this.db!.remove(id, true)
    await this.openCustomDatabase()
    await this.customDb!.remove(id, true)
  }

  async getAllPossibleAuthors() {
    return []
  }

  private async openDatabase() {
    if ((await this.isOpen(this.db)) == false) this.db = new IndexedDB('localMapping', 'localMapping')
  }

  private async openCustomDatabase() {
    if ((await this.isOpen(this.customDb)) == false) this.customDb = new IndexedDB('customMapping', 'customMapping')
  }

  private async isOpen(db: IndexedDB | undefined) {
    return db instanceof IDBDatabase && !db.hasOwnProperty('_secret_did_close')
  }
}

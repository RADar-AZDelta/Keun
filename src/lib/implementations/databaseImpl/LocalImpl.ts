import { dev } from '$app/environment'
import { IndexedDB } from '$lib/helperClasses/IndexedDB'
import { fileToBlob, blobToString, stringToBlob } from '$lib/utils'
import type { IConceptFiles, IFile, IUpdatedFunctionalityImpl, IUserRestriction } from '$lib/components/Types'

export default class LocalImpl implements IUpdatedFunctionalityImpl {
  db: IndexedDB | undefined
  customDb: IndexedDB | undefined

  async getFile(id: string): Promise<IConceptFiles | void> {
    if (dev) console.log(`getFile: Get file with id ${id} in IndexedDB`)
    await this.openDatabase()
    const fileInfo: IFile | undefined = await this.db?.get(id, true, true)
    if (!fileInfo || !fileInfo.content) return console.error('getFile: File not found in IndexedDB')
    await this.openCustomDatabase()
    const customFileInfo: IFile | undefined = await this.customDb!.get(id, true, true)
    return { file: fileInfo, customFile: customFileInfo }
  }

  async checkFileExistance(fileName: string): Promise<boolean | string | void> {
    if (dev) console.log(`checkFileExistence: Check if the file with name ${fileName} exists`)
    await this.openDatabase()
    const files = await this.getFiles()
    if (!files) return false
    for (let file of files) if (file.name === fileName) return file.id
  }

  async getFiles(): Promise<IFile[]> {
    if (dev) console.log(`getFiles: Get files in IndexedDB`)
    await this.openDatabase()
    const files = await this.db!.getAll(true)
    return files
  }

  async getFilesAdmin(): Promise<IFile[] | void> {}

  async uploadFile(file: File, authors: string[]): Promise<string[] | void> {
    if (dev) console.log('uploadFile: Uploading file to IndexedDB')
    await this.openDatabase()
    const blob = await fileToBlob(file)
    const fileString = await blobToString(blob)
    const fileId = crypto.randomUUID()
    const fileContent: IFile = { id: fileId, name: file.name, authors: [], version: 1, content: fileString }
    await this.db!.set(fileContent, fileId, true)
    const customBlob = new Blob([
      'concept_id,concept_name,domain_id,vocabulary_id,concept_class_id,standard_concept,concept_code,valid_start_date,valid_end_date,invalid_reason\n0,test,test,test,test,S,123,2000-01-01,2099-01-01,U',
    ])
    const customFileString = await blobToString(customBlob)
    const customFileContent: IFile = {
      id: fileId,
      name: `${file.name.split('.')[0]}_concepts.csv`,
      authors: [],
      version: 1,
      content: customFileString,
    }
    await this.openCustomDatabase()
    await this.customDb!.set(customFileContent, fileId, true)
    // goto(`${base}/mapping&id=${fileId}`)
  }

  async editFile(id: string, blob: Blob, customBlob?: Blob): Promise<void> {
    if (dev) console.log(`editFile: Editing the file with id ${id}`)
    await this.openDatabase()
    const fileInfo: IFile | undefined = await this.db?.get(id, true)
    if (!fileInfo) return console.error(`editFile: No file found with id ${id}`)
    const fileString = await blobToString(blob)
    const fileContent: IFile = {
      id,
      name: fileInfo.name,
      authors: [],
      version: fileInfo.version++,
      content: fileString,
    }
    await this.db?.set(fileContent, id, true)
    if (!customBlob) return
    await this.openCustomDatabase()
    const customFileInfo: IFile | undefined = await this.customDb?.get(id, true)
    if (!customFileInfo) return console.error(`editFile: No custom file foun with id ${id}`)
    const customFileString = await blobToString(customBlob)
    const customFileContent: IFile = {
      id,
      name: fileInfo.name,
      authors: [],
      version: customFileInfo.version++,
      content: customFileString,
    }
    await this.customDb?.set(customFileContent, id, true)
  }

  async editFileAuthors(id: string, authors: string[]): Promise<void> {}

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
    const fileInfo: IFile | undefined = await this.db?.get(id, true, true)
    if (!fileInfo || !fileInfo.content) return console.error('getFile: File not found in IndexedDB')
    const fileId = fileInfo.id
    const blob = await stringToBlob(fileInfo.content)
    const file = new File([blob], fileInfo.name, { type: 'text/csv' })
    const updatedName = file.name.split('.')[0] + '_usagi.csv'
    await this.download(updatedName, file)
    await this.downloadCustomFile(fileId)
    await this.deleteFile(id)
  }

  private async downloadCustomFile(fileId: string) {
    await this.openCustomDatabase()
    const customFileInfo: IFile | undefined = await this.customDb?.get(fileId, true, true)
    if (!customFileInfo || !customFileInfo.content) return
    if (customFileInfo.content.includes('0,test,test,test,test,S,123')) return
    const customBlob = await stringToBlob(customFileInfo.content)
    const customFile = new File([customBlob], customFileInfo.name, { type: 'text/csv' })
    const updatedName = customFile.name.split('.')[0] + '_concept.csv'
    await this.download(updatedName, customFile)
  }

  async getAllAuthors(): Promise<void | IUserRestriction> {}

  async watchValueFromDatabase(path: string, subCallback: () => unknown): Promise<void> {}

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
    let element = document.createElement('a')
    element.setAttribute('href', url)
    element.setAttribute('download', name)
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    URL.revokeObjectURL(url)
  }
}

import { FileHelper, blobToString, fileToBlob, logWhenDev, stringToFile } from '@radar-azdelta-int/radar-utils'
import { IndexedDB } from '@radar-azdelta-int/radar-utils'
import { Config } from '$lib/helperClasses/Config'
import type { ICustomConceptCompact, IDatabaseFile, IDatabaseImpl, IFile, IFileInformation } from '$lib/Types'

export default class LocalImpl implements IDatabaseImpl {
  db: IndexedDB | undefined
  customDb: IndexedDB | undefined
  flaggedDb: IndexedDB | undefined
  customConceptsDb: IndexedDB | undefined

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

  async getFlaggedFile(id: string): Promise<IFile | undefined> {
    logWhenDev(`getFlaggedFile: Get file with id ${id} in IndexedDB`)
    await this.openFlaggedDatabase()
    const file = await this.getFileFromDatabase(this.flaggedDb, id)
    return file
  }

  private async getFileFromDatabase(database: IndexedDB | undefined, id: string) {
    if (!database) return
    const fileInfo: undefined | IDatabaseFile = await database.get(id, true, true)
    if (!fileInfo || !fileInfo.content) return undefined
    const { name, content, customId, flaggedId } = fileInfo
    const file = await stringToFile(content, name)
    const fileObj: IFile = { id, name: name, file, customId, flaggedId }
    return fileObj
  }

  async downloadFiles(id: string): Promise<void> {
    logWhenDev(`downloadFiles: Downloading files with id ${id} from the database`)
    await this.openDatabase()
    const file = await this.getFileFromDatabase(this.db, id)
    if (!file || !file.file) return
    await FileHelper.downloadFile(file.file)
    const isCustomFileNotEmpty = await this.checkIfCustomFileIsNotEmpty(file.customId)
    if (!isCustomFileNotEmpty) return
    const customFile = await this.getFileFromDatabase(this.customDb, file.customId)
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
    if (!file || !file.id) return
    return { id: file.id, customId: file.customId, flaggedId: file.flaggedId }
  }

  async checkForFileWithSameName(name: string): Promise<string | false> {
    logWhenDev(`checkForFileWithSameName: Check if a file with name ${name} exists`)
    await this.openDatabase()
    const files = await this.db?.getAll(true)
    if (!files) return false
    const file = files.find((file: IFile) => file.name === name)
    if (!file) return false
    return file.id
  }

  async getFilesList(): Promise<IFileInformation[]> {
    logWhenDev('getFiles: Get files in IndexedDB')
    await this.openDatabase()
    const files: undefined | IDatabaseFile[] = await this.db!.getAll(true)
    if (!files) return []
    return files.map(file => ({ id: file.id, name: file.name, customId: file.custom, custom: file.custom }))
  }

  async uploadKeunFile(file: File) {
    logWhenDev('uploadKeunFile: Uploading file to IndexedDB')
    await this.openDatabase()
    const { name } = file
    const customName = `${name.split('.')[0]}_concepts.csv`
    const flaggedName = `${name.split('.')[0]}_flagged.csv`
    const customId = crypto.randomUUID()
    const fileString = await this.transformFileToString(file)
    const id = crypto.randomUUID()
    const fileContent: IDatabaseFile = {
      id,
      name,
      content: fileString,
      custom: customName,
      customId,
      flaggedId: flaggedName,
      flagged: flaggedName,
    }
    await this.db!.set(fileContent, id, true)
    const customBlob = new Blob([Config.customBlobInitial])
    const customFileString = await blobToString(customBlob)
    const customFileContent = { id: customId, name: customName, content: customFileString }
    await this.openCustomDatabase()
    await this.customDb!.set(customFileContent, customId, true)
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
    const { customId, custom, name, flagged, flaggedId } = fileInfo
    const fileString = await blobToString(blob)
    const fileContent: IDatabaseFile = { id, name, content: fileString, customId, custom, flaggedId, flagged }
    await this.db?.set(fileContent, id, true)
  }

  async editCustomKeunFile(id: string, blob: Blob) {
    logWhenDev(`editCustomKeunFile: Editing the custom file with id ${id}`)
    await this.openDatabase()
    const fileInfo = await this.db?.get(id, true, true)
    if (!fileInfo) return
    const { customId, custom: name } = fileInfo
    const customFileString = await blobToString(blob)
    const customFileContent = { id: customId, name, content: customFileString }
    await this.openCustomDatabase()
    await this.customDb?.set(customFileContent, customId, true)
  }

  async editFlaggedFile(id: string, blob: Blob): Promise<void> {
    logWhenDev(`editFlaggedFile: Editing the flagged file with id ${id}`)
    await this.openFlaggedDatabase()
    const fileInfo = await this.flaggedDb?.get(id, true)
    if (!fileInfo) return
    const flaggedFileString = await blobToString(blob)
    const flaggedFileContent = { id, name: fileInfo.name, content: flaggedFileString }
    await this.flaggedDb?.set(flaggedFileContent, id, true)
  }

  async deleteKeunFile(id: string) {
    logWhenDev(`deleteKeunFile: Delete the file with id ${id} in IndexedDB`)
    await this.openDatabase()
    const file: undefined | IDatabaseFile = await this.db?.get(id, true)
    if (!file || !file.customId) return
    await this.db!.remove(id, true)
    await this.openCustomDatabase()
    await this.customDb!.remove(file.customId, true)
  }

  async checkIfCustomConceptAlreadyExists(conceptInput: ICustomConceptCompact): Promise<boolean> {
    logWhenDev('checkIfCustomConceptAlreadyExists: Check if a custom concept already exists')
    await this.openConceptsDatabase()
    const { concept_name, concept_class_id, domain_id, vocabulary_id } = conceptInput
    const recordName = `${concept_name}-${domain_id.replaceAll('/', '')}-${concept_class_id.replaceAll('/', '')}-${vocabulary_id}`
    const customConcept = await this.customConceptsDb?.get(recordName, true)
    if (!customConcept) return false
    return true
  }

  async getCustomConcepts(): Promise<any> {
    logWhenDev('getCustomConcepts: Get custom concepts from IndexedDB')
    await this.openConceptsDatabase()
    const customConcepts: undefined | any[] = await this.customConceptsDb?.getAll(true)
    if (!customConcepts) return []
    return customConcepts
  }

  async addCustomConcept(customConcept: ICustomConceptCompact): Promise<any> {
    logWhenDev('getCustomConcepts: Add a new custom concept to IndexedDB')
    await this.openConceptsDatabase()
    const { concept_name, concept_class_id, domain_id, vocabulary_id } = customConcept
    const recordName = `${concept_name}-${domain_id.replaceAll('/', '')}-${concept_class_id.replaceAll('/', '')}-${vocabulary_id}`
    await this.customConceptsDb?.set(customConcept, recordName, true)
  }

  private async openDatabase() {
    const open = await this.isOpen(this.db)
    if (open) return
    this.db = new IndexedDB('localMapping', 'localMapping')
  }

  private async openCustomDatabase() {
    const open = await this.isOpen(this.customDb)
    if (open) return
    this.customDb = new IndexedDB('customMapping', 'customMapping')
  }

  private async openFlaggedDatabase() {
    const open = await this.isOpen(this.flaggedDb)
    if (open) return
    this.flaggedDb = new IndexedDB('flaggedMapping', 'flaggedMapping')
  }

  private async openConceptsDatabase() {
    const open = await this.isOpen(this.customConceptsDb)
    if (open) return
    this.customConceptsDb = new IndexedDB('customConcepts', 'customConcepts')
  }

  private async isOpen(db: IndexedDB | undefined) {
    return db instanceof IDBDatabase && !db.hasOwnProperty('_secret_did_close')
  }
}

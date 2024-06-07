import { dev } from '$app/environment'
import Config from '$lib/helpers/Config'
import FileHelper from '$lib/helpers/FileHelper'
import { IndexedDB } from './IndexedDB'
import type { ICustomConceptCompact, IDatabaseFile, IFile } from '$lib/interfaces/Types'

export default class Database {
  private static db: IndexedDB | undefined
  private static customDb: IndexedDB | undefined
  private static flaggedDb: IndexedDB | undefined
  private static customConceptsDb: IndexedDB | undefined

  static async checkIfCustomConceptAlreadyExists(row: ICustomConceptCompact) {
    if (dev) console.log('checkIfCustomConceptAlreadyExists: Check if a custom concept already exists')
    await this.openConceptsDatabase()
    const { concept_name, concept_class_id, domain_id, vocabulary_id } = row
    const recordName = `${concept_name}-${domain_id.replaceAll('/', '')}-${concept_class_id.replaceAll('/', '')}-${vocabulary_id}`
    const customConcept = await this.customConceptsDb?.get(recordName, true)
    if (!customConcept) return false
    return true
  }

  static async checkForCustomConceptWithSameName(name: string) {
    if (dev) console.log('checkForCustomConceptWithSameName: Check if a custom concept with the same name already exists')
    await this.openConceptsDatabase()
    const keys = await this.customConceptsDb?.keys(true)
    if (!keys) return false
    for (const key of keys) if (key.startsWith(`${name}-`)) return true
    return false
  }

  static async addCustomConcept(concept: ICustomConceptCompact) {
    if (dev) console.log('getCustomConcepts: Add a new custom concept to IndexedDB')
    await this.openConceptsDatabase()
    const { concept_name, concept_class_id, domain_id, vocabulary_id } = concept
    const recordName = `${concept_name}-${domain_id.replaceAll('/', '')}-${concept_class_id.replaceAll('/', '')}-${vocabulary_id}`
    await this.customConceptsDb?.set(concept, recordName, true)
  }

  static async updateCustomConcept(concept: ICustomConceptCompact, existingConcept: ICustomConceptCompact) {
    if (dev) console.log('updateCustomConcept: Update a custom concept in IndexedDB')
    await this.openConceptsDatabase()
    const { concept_name, concept_class_id, domain_id, vocabulary_id } = concept
    const { concept_name: name, concept_class_id: classId, domain_id: domain, vocabulary_id: vocab } = existingConcept
    const oldName = `${name}-${domain.replaceAll('/', '')}-${classId.replaceAll('/', '')}-${vocab}`
    const recordName = `${concept_name}-${domain_id.replaceAll('/', '')}-${concept_class_id.replaceAll('/', '')}-${vocabulary_id}`
    await this.customConceptsDb?.set(concept, recordName, oldName === recordName)
    if (oldName === recordName) return
    await this.customConceptsDb?.remove(oldName, true)
  }

  static async getCustomConcepts() {
    if (dev) console.log('getCustomConcepts: Get custom concepts from IndexedDB')
    await this.openConceptsDatabase()
    const customConcepts: undefined | any[] = await this.customConceptsDb?.getAll(true)
    if (!customConcepts) return []
    return customConcepts
  }

  static async checkFileExistance(id: string) {
    if (dev) console.log(`checkFileExistance: Check if the file with id ${id} exists`)
    await this.openDatabase()
    const file: undefined | IDatabaseFile = await this.db?.get(id, true)
    if (!file || !file.id) return
    return { id: file.id, customId: file.customId, flaggedId: file.flaggedId }
  }

  static async checkForFileWithSameName(name: string) {
    if (dev) console.log(`checkForFileWithSameName: Check if a file with name ${name} exists`)
    await this.openDatabase()
    const files = await this.db?.getAll(true)
    if (!files) return false
    const file = files.find((file: IFile) => file.name === name)
    if (!file) return false
    return file.id
  }

  static async downloadFiles(id: string) {
    if (dev) console.log(`downloadFiles: Downloading files with id ${id} from the database`)
    const file = await this.downloadFile(id)
    if (!file) return
    const { customId, flaggedId } = file
    await this.downloadCustomFile(customId)
    await this.downloadFlaggedFile(flaggedId)
  }

  private static async downloadFile(id: string) {
    await this.openDatabase()
    const file = await this.getFileFromDatabase(this.db, id)
    if (!file || !file.file) return
    if (!file.name.includes('_usagi.csv')) file.name = `${file.name.split('_usagi')[0]}_usagi.csv`
    await FileHelper.downloadFile(file.file)
    const { customId, flaggedId } = file
    return { customId, flaggedId }
  }

  private static async downloadFlaggedFile(flaggedId: string) {
    const isFlaggedFileNotEmpty = await this.checkIfFlaggedFileIsNotEmpty(flaggedId)
    if (!isFlaggedFileNotEmpty) return
    const flaggedFile = await this.getFileFromDatabase(this.flaggedDb, flaggedId)
    if (!flaggedFile || !flaggedFile.file) return
    await FileHelper.downloadFile(flaggedFile.file)
  }

  private static async getFileFromDatabase(database: IndexedDB | undefined, id: string) {
    if (!database) return
    const fileInfo: undefined | IDatabaseFile = await database.get(id, true, true)
    if (!fileInfo || !fileInfo.content) return undefined
    const { name, content, customId, flaggedId } = fileInfo
    const file = await FileHelper.stringToFile(content, name)
    const fileObj: IFile = { id, name: name, file, customId, flaggedId }
    return fileObj
  }

  private static async checkIfCustomFileIsNotEmpty(id: string) {
    await this.openCustomDatabase()
    const fileInfo: undefined | IDatabaseFile = await this.customDb?.get(id, true)
    if (!fileInfo) return false
    const { content } = fileInfo
    if (!content || content.includes(',,,,,,,,,')) return false
    return true
  }

  private static async checkIfFlaggedFileIsNotEmpty(id: string) {
    await this.openFlaggedDatabase()
    const fileInfo: undefined | IDatabaseFile = await this.flaggedDb?.get(id, true)
    if (!fileInfo) return false
    const { content } = fileInfo
    if (!content || content.includes(',,,,,,,,,,,,,,,,,,,,,,,')) return false
    return true
  }

  private static async downloadCustomFile(customId: string) {
    const isCustomFileNotEmpty = await this.checkIfCustomFileIsNotEmpty(customId)
    if (!isCustomFileNotEmpty) return
    const customFile = await this.getFileFromDatabase(this.customDb, customId)
    if (!customFile || !customFile.file) return
    await FileHelper.downloadFile(customFile.file)
  }

  private static blobToFile = async (blob: Blob, name: string) => new File([blob], name, { type: 'text/csv' })

  static async deleteKeunFile(id: string) {
    if (dev) console.log(`deleteKeunFile: Delete the file with id ${id} in IndexedDB`)
    await this.openDatabase()
    const file: undefined | IDatabaseFile = await this.db?.get(id, true)
    if (!file || !file.customId) return
    await this.db!.remove(id, true)
    await this.openCustomDatabase()
    await this.customDb!.remove(file.customId, true)
  }

  static async uploadKeunFile(file: File, domain: string | null) {
    if (dev) console.log('uploadKeunFile: Uploading file to IndexedDB')
    await this.openDatabase()
    const { name } = file
    const fileNameHasUsagiSequal = file.name.endsWith('_usagi.csv')
    const fileName = !fileNameHasUsagiSequal ? `${file.name.split('.')[0]}_usagi.csv` : file.name
    const customName = `${name.split('.')[0]}_concept.csv`
    const flaggedName = `${name.split('.')[0]}_flagged.csv`
    const customId = crypto.randomUUID()
    const flaggedId = crypto.randomUUID()
    const fileString = await this.transformFileToString(file)
    const id = crypto.randomUUID()
    const fileContent: IDatabaseFile = {
      id,
      name: fileName,
      content: fileString,
      custom: customName,
      customId,
      flaggedId,
      flagged: flaggedName,
      domain,
    }
    await this.db!.set(fileContent, id, true)
    const customBlob = new Blob([Config.customBlobInitial])
    const flaggedBlob = new Blob([Config.flaggedBlobInitial])
    const customFileString = await FileHelper.blobToString(customBlob)
    const flaggedFileString = await FileHelper.blobToString(flaggedBlob)
    const customFileContent = { id: customId, name: customName, content: customFileString }
    const flaggedFileContent = { id: flaggedId, name: flaggedName, content: flaggedFileString }
    await this.openCustomDatabase()
    await this.customDb!.set(customFileContent, customId, true)
    await this.openFlaggedDatabase()
    await this.flaggedDb!.set(flaggedFileContent, flaggedId, true)
  }

  private static async transformFileToString(file: File) {
    const blob = await FileHelper.fileToBlob(file)
    const fileString = await FileHelper.blobToString(blob)
    return fileString
  }

  static async editKeunFile(id: string, blob: Blob) {
    if (dev) console.log(`editKeunFile: Editing the file with id ${id}`)
    await this.openDatabase()
    const fileInfo = await this.db?.get(id, true)
    if (!fileInfo) return
    const { customId, custom, name, flagged, flaggedId, domain } = fileInfo
    const fileString = await FileHelper.blobToString(blob)
    const fileContent: IDatabaseFile = { id, name, content: fileString, customId, custom, flaggedId, flagged, domain }
    await this.db?.set(fileContent, id, true)
  }

  static async editCustomKeunFile(id: string, blob: Blob) {
    if (dev) console.log(`editCustomKeunFile: Editing the custom file with id ${id}`)
    await this.openDatabase()
    const fileInfo = await this.db?.get(id, true, true)
    if (!fileInfo) return
    const { customId, custom: name } = fileInfo
    const customFileString = await FileHelper.blobToString(blob)
    const customFileContent = { id: customId, name, content: customFileString }
    await this.openCustomDatabase()
    await this.customDb?.set(customFileContent, customId, true)
  }

  static async editFlaggedFile(id: string, blob: Blob) {
    if (dev) console.log(`editFlaggedFile: Editing the flagged file with id ${id}`)
    await this.openDatabase()
    const fileInfo = await this.db?.get(id, true, true)
    if (!fileInfo) return
    const { flaggedId, flagged: name } = fileInfo
    const flaggedFileString = await FileHelper.blobToString(blob)
    const flaggedFileContent = { id: flaggedId, name, content: flaggedFileString }
    await this.openFlaggedDatabase()
    await this.flaggedDb?.set(flaggedFileContent, flaggedId, true)
  }

  static async getFilesList() {
    if (dev) console.log('getFiles: Get files in IndexedDB')
    await this.openDatabase()
    const files: undefined | IDatabaseFile[] = await this.db!.getAll(true)
    if (!files) return []
    return files.map(file => ({
      id: file.id,
      name: file.name,
      customId: file.custom,
      custom: file.custom,
      domain: file.domain,
    }))
  }

  static async getKeunFile(id: string) {
    if (dev) console.log(`getKeunFile: Get file with id ${id} in IndexedDB`)
    await this.openDatabase()
    const file = await this.getFileFromDatabase(this.db, id)
    return file
  }

  static async getCustomKeunFile(id: string) {
    if (dev) `getCustomKeunFile: Get file with id ${id} in IndexedDB`
    await this.openCustomDatabase()
    const file = await this.getFileFromDatabase(this.customDb, id)
    return file
  }

  static async getFlaggedFile(id: string) {
    if (dev) `getFlaggedFile: Get file with id ${id} in IndexedDB`
    await this.openFlaggedDatabase()
    const file = await this.getFileFromDatabase(this.flaggedDb, id)
    return file
  }

  static async reset() {
    await this.openDatabase()
    await this.db!.deleteDatabase()
    await this.openCustomDatabase()
    await this.customDb!.deleteDatabase()
    await this.openFlaggedDatabase()
    await this.flaggedDb!.deleteDatabase()
    return []
  }

  private static async openDatabase() {
    const open = await this.isOpen(this.db)
    if (open) return
    this.db = new IndexedDB('localMapping', 'localMapping')
  }

  private static async openCustomDatabase() {
    const open = await this.isOpen(this.customDb)
    if (open) return
    this.customDb = new IndexedDB('customMapping', 'customMapping')
  }

  private static async openFlaggedDatabase() {
    const open = await this.isOpen(this.flaggedDb)
    if (open) return
    this.flaggedDb = new IndexedDB('flaggedMapping', 'flaggedMapping')
  }

  private static async openConceptsDatabase() {
    const open = await this.isOpen(this.customConceptsDb)
    if (open) return
    this.customConceptsDb = new IndexedDB('customConcepts', 'customConcepts')
  }

  private static async isOpen(db: IndexedDB | undefined) {
    return db instanceof IDBDatabase && !db.hasOwnProperty('_secret_did_close')
  }
}

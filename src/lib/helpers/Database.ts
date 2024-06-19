import { dev } from '$app/environment'
import FileHelper from '$lib/helpers/FileHelper'
import { IndexedDB } from './IndexedDB'
import type { ICustomConceptCompact, IDatabaseFile, IFile } from '$lib/interfaces/Types'

export default class Database {
  private static db: IndexedDB | undefined
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
    if (dev) console.log(`checkFileExistance: Check if the file exists`)
    await this.openDatabase()
    const file: undefined | IDatabaseFile = await this.db?.get(id, true)
    if (!file || !file.id) return
    return { id: file.id }
  }

  static async checkForFileWithSameName(name: string) {
    if (dev) console.log(`checkForFileWithSameName: Check if a file exists`)
    await this.openDatabase()
    const files = await this.db?.getAll(true)
    if (!files) return false
    const file = files.find((file: IFile) => file.name === name)
    if (!file) return false
    return file.id
  }

  static async downloadFiles(id: string, flaggedBlob: Blob | undefined, customBlob: Blob | undefined) {
    if (dev) console.log(`downloadFiles: Downloading files from the database`)
    const name = await this.downloadFile(id)
    await this.downloadCustomFile(name, customBlob)
    await this.downloadFlaggedFile(name, flaggedBlob)
  }

  private static async downloadFile(id: string) {
    await this.openDatabase()
    const file = await this.getFileFromDatabase(this.db, id)
    if (!file || !file.file) return
    if (!file.name.includes('_usagi.csv')) {
      const hasSequel = file.name.includes('_usagi.csv')
      file.name = `${hasSequel ? file.name.split('_usagi.csv')[0] : file.name.split('.csv')}_usagi.csv`
    }
    await FileHelper.downloadFile(file.file)
    return file.name
  }

  private static async downloadFlaggedFile(name: string | undefined, flaggedBlob: Blob | undefined) {
    if (!flaggedBlob) return
    const flaggedName = name ? `${name.split('_usagi.csv')[0]}_flagged.csv` : 'flagged.csv'
    const flaggedFile = await this.blobToFile(flaggedBlob, flaggedName)
    await FileHelper.downloadFile(flaggedFile)
  }

  private static async getFileFromDatabase(database: IndexedDB | undefined, id: string) {
    if (!database) return
    const fileInfo: undefined | IDatabaseFile = await database.get(id, true, true)
    if (!fileInfo || !fileInfo.content) return undefined
    const { name, content } = fileInfo
    const file = await FileHelper.stringToFile('\ufeff' + content, name, 'text/csv; charset=utf-8')
    const fileObj: IFile = { id, name: name, file }
    return fileObj
  }

  private static async downloadCustomFile(name: string | undefined, customBlob: Blob | undefined) {
    if (!customBlob) return
    const customName = name ? `${name.split('_usagi.csv')[0]}_concept.csv` : 'concept.csv'
    const customFile = await this.blobToFile(customBlob, customName)
    await FileHelper.downloadFile(customFile)
  }

  private static blobToFile = async (blob: Blob, name: string) => new File([blob], name, { type: 'text/csv' })

  static async deleteKeunFile(id: string) {
    if (dev) console.log(`deleteKeunFile: Delete the file in IndexedDB`)
    await this.openDatabase()
    const file: undefined | IDatabaseFile = await this.db?.get(id, true)
    if (!file) return
    await this.db!.remove(id, true)
  }

  static async uploadKeunFile(file: File, domain: string | null) {
    if (dev) console.log('uploadKeunFile: Uploading file to IndexedDB')
    await this.openDatabase()
    const fileNameHasUsagiSequal = file.name.endsWith('_usagi.csv')
    const fileName = !fileNameHasUsagiSequal ? `${file.name.split('.')[0]}_usagi.csv` : file.name
    const fileString = await this.transformFileToString(file)
    const id = crypto.randomUUID()
    const fileContent: IDatabaseFile = { id, name: fileName, content: fileString, domain }
    await this.db!.set(fileContent, id, true)
  }

  private static async transformFileToString(file: File) {
    const blob = await FileHelper.fileToBlob(file)
    const fileString = await FileHelper.blobToString(blob)
    return fileString
  }

  static async editKeunFile(id: string, blob: Blob) {
    if (dev) console.log(`editKeunFile: Editing the file`)
    await this.openDatabase()
    const fileInfo = await this.db?.get(id, true)
    if (!fileInfo) return
    const { name, domain } = fileInfo
    const fileString = await FileHelper.blobToString(blob)
    const fileContent: IDatabaseFile = { id, name, content: fileString, domain }
    await this.db?.set(fileContent, id, true)
  }

  static async getFilesList() {
    if (dev) console.log('getFiles: Get files in IndexedDB')
    await this.openDatabase()
    const files: undefined | IDatabaseFile[] = await this.db!.getAll(true)
    if (!files) return []
    return files.map(file => ({
      id: file.id,
      name: file.name,
      domain: file.domain,
    }))
  }

  static async getKeunFile(id: string) {
    if (dev) console.log(`getKeunFile: Get file in IndexedDB`)
    await this.openDatabase()
    const file = await this.getFileFromDatabase(this.db, id)
    return file
  }

  static async reset() {
    await this.openDatabase()
    await this.db!.deleteDatabase()
    return []
  }

  private static async openDatabase() {
    const open = await this.isOpen(this.db)
    if (open) return
    this.db = new IndexedDB('localMapping', 'localMapping')
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

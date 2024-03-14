import { PUBLIC_CLOUD_DATABASE_IMPLEMENTATION } from '$env/static/public'
import { Providers } from '$lib/enums'
import type { ICustomConceptCompact, IDatabaseImpl } from '$lib/Types'

export default class DatabaseImpl {
  private static database: IDatabaseImpl
  static databaseImplementation = PUBLIC_CLOUD_DATABASE_IMPLEMENTATION || Providers.Local

  static async checkIfCustomConceptAlreadyExists(row: ICustomConceptCompact) {
    await this.loadImpl()
    return await this.database.checkIfCustomConceptAlreadyExists(row)
  }

  static async addCustomConcept(concept: ICustomConceptCompact) {
    await this.loadImpl()
    await this.database.addCustomConcept(concept)
  }

  static async getCustomConcepts() {
    await this.loadImpl()
    return await this.database.getCustomConcepts()
  }

  static async checkFileExistance(id: string) {
    await this.loadImpl()
    return await this.database.checkFileExistance(id)
  }

  static async checkForFileWithSameName(name: string) {
    await this.loadImpl()
    return await this.database.checkForFileWithSameName(name)
  }

  static async downloadFiles(id: string) {
    await this.loadImpl()
    return await this.database.downloadFiles(id)
  }

  static async deleteKeunFile(id: string) {
    await this.loadImpl()
    return await this.database.deleteKeunFile(id)
  }

  static async uploadKeunFile(file: File, domain: string | null) {
    await this.loadImpl()
    return await this.database.uploadKeunFile(file, domain)
  }

  static async editKeunFile(id: string, blob: Blob) {
    await this.loadImpl()
    return await this.database.editKeunFile(id, blob)
  }

  static async editCustomKeunFile(id: string, blob: Blob) {
    await this.loadImpl()
    return await this.database.editCustomKeunFile(id, blob)
  }

  static async editFlaggedFile(id: string, blob: Blob) {
    await this.loadImpl()
    return await this.database.editFlaggedFile(id, blob)
  }

  static async getFilesList() {
    await this.loadImpl()
    return await this.database.getFilesList()
  }

  static async getKeunFile(id: string) {
    await this.loadImpl()
    return await this.database.getKeunFile(id)
  }

  static async getCustomKeunFile(id: string) {
    await this.loadImpl()
    return await this.database.getCustomKeunFile(id)
  }

  static async getFlaggedFile(id: string) {
    await this.loadImpl()
    return await this.database.getFlaggedFile(id)
  }

  static async prepareFile() {
    await this.loadImpl()
  }

  private static async loadImpl() {
    if (this.database) return
    if (this.databaseImplementation === Providers.Firebase)
      await import('$lib/implementations/databaseImpl/FirebaseImpl').then(
        ({ default: Impl }) => (this.database = new Impl()),
      )
    else
      await import('$lib/implementations/databaseImpl/LocalImpl').then(
        ({ default: Impl }) => (this.database = new Impl()),
      )
  }
}

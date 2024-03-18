import FirebaseFirestore from '$lib/firebase/FirebaseFirestore'
import FirebaseStorage from '$lib/firebase/FirebaseStorage'
import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
} from '$env/static/public'
import { Config } from '$lib/helperClasses/Config'
import FileHelper from '$lib/helperClasses/FileHelper'
import type {
  ICustomConceptCompact,
  IDatabaseImpl,
  IFile,
  IFileInformation,
  IFirestoreFile,
  IStorageCustomMetadata,
  IStorageMetadata,
} from '$lib/Types'
import type { FirebaseOptions } from 'firebase/app'

const firebaseConfig: FirebaseOptions = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID,
}

export default class FirebaseImpl implements IDatabaseImpl {
  firestore: FirebaseFirestore = new FirebaseFirestore(firebaseConfig)
  storage: FirebaseStorage = new FirebaseStorage(firebaseConfig)
  storageCollection: string = 'Keun-files'
  storageCustomColl: string = 'Keun-custom-files'
  storageFlaggedColl: string = 'Keun-flagged-files'
  firestoreFileColl: string = 'files'
  firestoreCustomConceptsColl: string = 'customConcepts'

  getKeunFile = async (id: string) => await this.readFileFromCollection(id, this.storageCollection)
  getCustomKeunFile = async (id: string) => await this.readFileFromCollection(id, this.storageCustomColl)
  getFlaggedFile = async (id: string) => await this.readFileFromCollection(id, this.storageFlaggedColl)

  private async readFileFromCollection(id: string, collection: string): Promise<IFile | undefined> {
    const fileInfo = await this.storage.readFileStorage(`${collection}/${id}`)
    if (!fileInfo.file || !fileInfo.meta) return
    const name = fileInfo.meta.customMetadata?.name ?? fileInfo.meta.name
    const customId = fileInfo.meta.customMetadata?.customId ?? ''
    const flaggedId = fileInfo.meta.customMetadata?.flaggedId ?? ''
    const file = await this.blobToFile(fileInfo.file, name)
    const fileObj: IFile = { id, name, file, customId, flaggedId }
    return fileObj
  }

  private blobToFile = async (blob: Blob, name: string) => new File([blob], name, { type: 'text/csv' })

  async downloadFiles(id: string): Promise<void> {
    const file = await this.readFileFromCollection(id, this.storageCollection)
    if (!file || !file.file) return
    if (!file.name.includes('_usagi.csv')) file.name = `${file.name.split('.')[0]}_usagi.csv`
    await FileHelper.downloadFile(file.file)
    await this.downloadFlaggedFile(file.flaggedId)
    await this.downloadCustomFile(file.customId)
  }

  private async downloadCustomFile(customId: string) {
    const customFile = await this.readFileFromCollection(customId, this.storageCustomColl)
    if (!customFile || !customFile.file) return
    const customString = await FileHelper.blobToString(customFile.file)
    if (!customString || customString.includes(',,,,,,,,,')) return
    await FileHelper.downloadFile(customFile.file)
  }

  private async downloadFlaggedFile(flaggedId: string) {
    const flaggedFile = await this.readFileFromCollection(flaggedId, this.storageFlaggedColl)
    if (!flaggedFile || !flaggedFile.file) return
    const flaggedString = await FileHelper.blobToString(flaggedFile.file)
    if (!flaggedString || flaggedString.includes(',,,,,,,,,,,,,,,,,,,,,,,')) return
    await FileHelper.downloadFile(flaggedFile.file)
  }

  async checkFileExistance(id: string) {
    const existance = await this.storage.readFileStorage(`${this.storageCollection}/${id}`).catch(() => false)
    if (typeof existance === 'boolean') return
    return {
      id,
      customId: existance.meta?.customMetadata?.customId ?? '',
      flaggedId: existance.meta?.customMetadata?.flaggedId ?? '',
    }
  }

  async checkForFileWithSameName(name: string) {
    const files = await this.firestore.readFirestoreCollection(this.firestoreFileColl)
    if (!files) return false
    const file = files.docs.find(file => file.data().name === name)
    if (!file) return false
    return file.id
  }

  async getFilesList(): Promise<IFileInformation[]> {
    const fileIds = await this.getFilesFromFirestore()
    const fileNames = []
    for (let fileId of fileIds) {
      const fileInfo = await this.getFileNameFromStorage(fileId)
      if (fileInfo)
        fileNames.push({
          id: fileId,
          name: fileInfo.fileName,
          customId: fileInfo.customId,
          custom: '',
          flaggedId: fileInfo.flaggedId,
          domain: fileInfo.domain,
        })
    }
    return fileNames
  }

  private async getFilesFromFirestore() {
    const fileIds = await this.firestore.readFirestoreCollection(this.firestoreFileColl)
    if (!fileIds) return []
    const files = fileIds.docs.map(file => file.id)
    return files
  }

  private async getFileNameFromStorage(id: string) {
    const fileInfo = await this.storage.readMetaData(`${this.storageCollection}/${id}`)
    if (!fileInfo || !fileInfo.customMetadata) return
    const fileName = (<IStorageMetadata>fileInfo.customMetadata).name
    const customId = (<IStorageMetadata>fileInfo.customMetadata).customId
    const flaggedId = (<IStorageMetadata>fileInfo.customMetadata).flaggedId
    const domain = (<IStorageMetadata>fileInfo.customMetadata).domain
    return { fileName, customId, flaggedId, domain }
  }

  async uploadKeunFile(file: File, domain: string | null): Promise<void> {
    const fileId = crypto.randomUUID()
    const customId = crypto.randomUUID()
    const flaggedId = crypto.randomUUID()
    const fileNameHasUsagiSequal = file.name.endsWith('_usagi.csv')
    const fileName = !fileNameHasUsagiSequal ? `${file.name.split('.')[0]}_usagi.csv` : file.name
    await this.uploadFile(fileId, fileName, file, customId, flaggedId, domain)
    const customName = await this.uploadCustomFile(customId, file.name, flaggedId, domain)
    const flaggedName = await this.uploadFlaggedFile(flaggedId, file.name, customId, domain)
    const fileData = { name: fileName, customId, custom: customName, flaggedId, flaggedName, domain }
    await this.firestore.updateToFirestoreIfNotExist(this.firestoreFileColl, fileId, fileData)
  }

  private async uploadFile(
    id: string,
    name: string,
    file: File,
    customId: string,
    flaggedId: string,
    domain: string | null,
  ) {
    const metaData: IStorageCustomMetadata = {
      customMetadata: { name, customId, flaggedId, domain: domain! },
    }
    await this.storage.uploadFileStorage(`${this.storageCollection}/${id}`, file, metaData)
  }

  private async uploadCustomFile(id: string, name: string, flaggedId: string, domain: string | null) {
    const customName = `${name.split('.')[0]}_concept.csv`
    const customFile = await this.blobToFile(new Blob([Config.customBlobInitial]), customName)
    const customMetaData: IStorageCustomMetadata = {
      customMetadata: { name: customName, customId: id, flaggedId, domain: domain! },
    }
    await this.storage.uploadFileStorage(`${this.storageCustomColl}/${id}`, customFile, customMetaData)
    return customName
  }

  private async uploadFlaggedFile(id: string, name: string, customId: string, domain: string | null) {
    const flaggedName = `${name.split('.')[0]}_flagged.csv`
    const flaggedFile = await this.blobToFile(new Blob([Config.flaggedBlobInitial]), flaggedName)
    const customMetaData: IStorageCustomMetadata = {
      customMetadata: { name: flaggedName, customId, flaggedId: id, domain: domain! },
    }
    await this.storage.uploadFileStorage(`${this.storageFlaggedColl}/${id}`, flaggedFile, customMetaData)
    return flaggedName
  }

  async editKeunFile(id: string, blob: Blob): Promise<void> {
    const fileData = await this.getFileDataFromFirestore(id)
    if (!fileData) return
    const { name, customId, flaggedId, domain } = fileData
    const file = await this.blobToFile(blob, name)
    const metaData: IStorageCustomMetadata = {
      customMetadata: { name: file.name, customId, flaggedId, domain: domain! },
    }
    await this.storage.uploadFileStorage(`${this.storageCollection}/${id}`, file, metaData)
  }

  async editFlaggedFile(id: string, blob: Blob) {
    const fileData = await this.getFileDataFromFirestore(id)
    if (!fileData) return
    const { flaggedId, flaggedName: name, customId, domain } = fileData
    const file = await this.blobToFile(blob, name)
    const metaData: IStorageCustomMetadata = { customMetadata: { name, customId, flaggedId, domain: domain! } }
    await this.storage.uploadFileStorage(`${this.storageFlaggedColl}/${flaggedId}`, file, metaData)
  }

  async editCustomKeunFile(id: string, blob: Blob) {
    const fileData = await this.getFileDataFromFirestore(id)
    if (!fileData) return
    const { custom: name, customId, flaggedId, domain } = fileData
    const file = await this.blobToFile(blob, name)
    const metaData: IStorageCustomMetadata = {
      customMetadata: { name: file.name, customId, flaggedId, domain: domain! },
    }
    await this.storage.uploadFileStorage(`${this.storageCustomColl}/${customId}`, file, metaData)
  }

  private async getFileDataFromFirestore(id: string) {
    const fileInfo = await this.firestore.readFirestore(this.firestoreFileColl, id)
    if (!fileInfo) return
    const fileData = <IFirestoreFile | undefined>fileInfo.data()
    if (!fileData) return
    return fileData
  }

  async deleteKeunFile(id: string): Promise<void> {
    const ids = await this.retrieveFileIds(id)
    const fileSnapshot = await this.firestore.readFirestore(this.firestoreFileColl, id)
    if (!fileSnapshot || !fileSnapshot.data()) return
    const fileInfo = fileSnapshot.data()
    if (!fileInfo) return
    await this.storage.deleteFileStorage(`${this.storageCollection}/${id}`)
    await this.firestore.deleteDocumentFirestore(this.firestoreFileColl, id)
    if (ids?.customId) await this.storage.deleteFileStorage(`${this.storageCustomColl}/${ids.customId}`)
    if (ids?.flaggedId) await this.storage.deleteFileStorage(`${this.storageFlaggedColl}/${ids.flaggedId}`)
  }

  private async retrieveFileIds(id: string) {
    const fileDocument = await this.firestore.readFirestore(this.firestoreFileColl, id)
    if (!fileDocument) return
    const fileInfo = fileDocument.data()
    if (!fileInfo) return
    return { customId: <string>fileInfo.customId, flaggedId: <string>fileInfo.flaggedId }
  }

  async getCustomConcepts(): Promise<any> {
    const concepts = await this.firestore.readFirestoreCollection(this.firestoreCustomConceptsColl)
    if (!concepts) return []
    const customConcepts = concepts.docs.map(doc => doc.data())
    return customConcepts
  }

  async addCustomConcept(customConcept: ICustomConceptCompact) {
    const { concept_name, concept_class_id, domain_id, vocabulary_id } = customConcept
    const recordName = `${concept_name}-${domain_id.replaceAll('/', '')}-${concept_class_id.replaceAll('/', '')}-${vocabulary_id}`
    await this.firestore.writeToFirestore(this.firestoreCustomConceptsColl, recordName, customConcept)
  }

  async checkIfCustomConceptAlreadyExists(conceptInput: ICustomConceptCompact) {
    const { concept_name, concept_class_id, domain_id, vocabulary_id } = conceptInput
    const recordName = `${concept_name}-${domain_id.replaceAll('/', '')}-${concept_class_id.replaceAll('/', '')}-${vocabulary_id}`
    const conceptDocument = await this.firestore.readFirestore(this.firestoreCustomConceptsColl, recordName)
    if (!conceptDocument) return false
    const concept = conceptDocument.data()
    if (!concept) return false
    return true
  }

  async reset() {
    const fileIds = await this.getFilesFromFirestore()
    for (const id of fileIds) await this.deleteKeunFile(id)
    return []
  }
}

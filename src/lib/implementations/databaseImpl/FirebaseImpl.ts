import { FileHelper } from '@radar-azdelta-int/radar-utils'
import { FirebaseFirestore, FirebaseStorage } from '@radar-azdelta-int/radar-firebase-utils'
import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
} from '$env/static/public'
import { Config } from '$lib/helperClasses/Config'
import type { ICustomConceptCompact, IDatabaseImpl, IFile, IFileInformation } from '$lib/components/Types'
import type { FirebaseOptions } from 'firebase/app'

// TODO: implement this in the program & check if all the functionalities work before removing the firebase file

const firebaseConfig: FirebaseOptions = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID,
}

export interface IFirestoreFile {
  name: string
  custom: string
  customId: string
}

export interface IFirestoreUser {
  id: string
  name: string
  files: string[]
}

export interface IStorageMetadata {
  name: string
  customId: string
  [key: string]: string
}

interface IStorageCustomMetadata {
  customMetadata: IStorageMetadata
}

export default class FirebaseImpl implements IDatabaseImpl {
  firestore: FirebaseFirestore = new FirebaseFirestore(firebaseConfig)
  storage: FirebaseStorage = new FirebaseStorage(firebaseConfig)
  storageCollection: string = 'Keun-files'
  storageCustomColl: string = 'Keun-custom-files'
  firestoreFileColl: string = 'files'
  firestoreCustomConceptsColl: string = 'customConcepts'

  getKeunFile = async (id: string) => await this.readFileFromCollection(id, this.storageCollection)
  getCustomKeunFile = async (id: string) => await this.readFileFromCollection(id, this.storageCustomColl)

  private async readFileFromCollection(id: string, collection: string): Promise<IFile | undefined> {
    const fileInfo = await this.storage.readFileStorage(`${collection}/${id}`)
    if (!fileInfo.file || !fileInfo.meta) return
    const name = fileInfo.meta.customMetadata?.name ?? fileInfo.meta.name
    const customId = fileInfo.meta.customMetadata?.customId ?? ''
    const file = await this.blobToFile(fileInfo.file, name)
    const fileObj: IFile = { id, name, file, customId }
    return fileObj
  }

  private blobToFile = async (blob: Blob, name: string) => new File([blob], name, { type: 'text/csv' })

  async downloadFiles(id: string): Promise<void> {
    const file = await this.readFileFromCollection(id, this.storageCollection)
    if (!file || !file.file) return
    await FileHelper.downloadFile(file.file)
    const customFile = await this.readFileFromCollection(file.customId, this.storageCustomColl)
    if (!customFile || !customFile.file) return
    await FileHelper.downloadFile(customFile.file)
  }

  async checkFileExistance(id: string) {
    const existance = await this.storage.readFileStorage(`${this.storageCollection}/${id}`).catch(() => false)
    if (typeof existance === 'boolean') return
    return { id, customId: existance.meta?.customMetadata?.customId ?? '' }
  }

  async getFilesList(): Promise<IFileInformation[]> {
    const fileIds = await this.getFilesFromFirestore()
    const fileNames = []
    for (let fileId of fileIds) {
      const fileInfo = await this.getFileNameFromStorage(fileId)
      if (fileInfo) fileNames.push({ id: fileId, name: fileInfo.fileName, customId: fileInfo.customId, custom: '' })
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
    return { fileName, customId }
  }

  async uploadKeunFile(file: File): Promise<void> {
    const fileId = crypto.randomUUID()
    const customFileId = crypto.randomUUID()
    const metaData: IStorageCustomMetadata = { customMetadata: { name: file.name, customId: customFileId } }
    await this.storage.uploadFileStorage(`${this.storageCollection}/${fileId}`, file, metaData)
    const customName = `${file.name.split('.')[0]}_concepts.csv`
    const customFile = await this.blobToFile(new Blob([Config.customBlobInitial]), customName)
    const customMetaData: IStorageCustomMetadata = { customMetadata: { name: customName, customId: customFileId } }
    await this.storage.uploadFileStorage(`${this.storageCustomColl}/${customFileId}`, customFile, customMetaData)
    const fileData = { name: file.name, customId: customFileId, custom: customName }
    await this.firestore.updateToFirestoreIfNotExist(this.firestoreFileColl, fileId, fileData)
  }

  async editKeunFile(id: string, blob: Blob): Promise<void> {
    const fileData = await this.getFileDataFromFirestore(id)
    if (!fileData) return
    const { name, customId } = fileData
    const file = await this.blobToFile(blob, name)
    const metaData: IStorageCustomMetadata = { customMetadata: { name: file.name, customId } }
    await this.storage.uploadFileStorage(`${this.storageCollection}/${id}`, file, metaData)
  }

  async editCustomKeunFile(id: string, blob: Blob): Promise<void> {
    const fileData = await this.getFileDataFromFirestore(id)
    if (!fileData) return
    const { name } = fileData
    const file = await this.blobToFile(blob, name)
    await this.storage.uploadFileStorage(`${this.storageCustomColl}/${id}`, file)
  }

  private async getFileDataFromFirestore(id: string) {
    const fileInfo = await this.firestore.readFirestore(this.firestoreFileColl, id)
    if (!fileInfo) return
    const fileData = <IFirestoreFile | undefined>fileInfo.data()
    if (!fileData) return
    return fileData
  }

  async deleteKeunFile(id: string): Promise<void> {
    const customId = await this.retrieveCustomFileId(id)
    const fileSnapshot = await this.firestore.readFirestore(this.firestoreFileColl, id)
    if (!fileSnapshot || !fileSnapshot.data()) return
    const fileInfo = fileSnapshot.data()
    if (!fileInfo) return
    await this.storage.deleteFileStorage(`${this.storageCollection}/${id}`)
    await this.firestore.deleteDocumentFirestore(this.firestoreFileColl, id)
    if (customId) await this.storage.deleteFileStorage(`${this.storageCustomColl}/${customId}`)
  }

  private async retrieveCustomFileId(id: string) {
    const fileDocument = await this.firestore.readFirestore(this.firestoreFileColl, id)
    if (!fileDocument) return
    const fileInfo = fileDocument.data()
    if (!fileInfo) return
    return <string>fileInfo.customId
  }

  async getCustomConcepts(): Promise<any> {
    const concepts = await this.firestore.readFirestoreCollection(this.firestoreCustomConceptsColl)
    if (!concepts) return []
    const customConcepts = concepts.docs.map(doc => doc.data())
    return customConcepts
  }

  async addCustomConcept(customConcept: ICustomConceptCompact) {
    await this.firestore.writeToFirestore(this.firestoreCustomConceptsColl, customConcept.concept_name, customConcept)
  }
}

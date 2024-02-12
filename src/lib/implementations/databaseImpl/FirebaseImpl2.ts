import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
} from '$env/static/public'
import type { IDatabaseImpl, IFile } from '$lib/components/Types'
import { FirebaseFirestore, FirebaseStorage, type FirebaseOptions } from '@radar-azdelta/radar-firebase-utils'
import initial from '$lib/data/customBlobInitial.json'

// TODO: implement this in the program & check if all the functionalities work before removing the firebase file

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
  firestoreFileColl: string = 'files'
  firestoreUserColl: string = 'users'

  async getKeunFile(id: string): Promise<IFile | undefined> {
    const file = await this.readFileFromCollection(id, this.storageCollection)
    return file
  }

  async getCustomKeunFile(id: string): Promise<IFile | undefined> {
    const file = await this.readFileFromCollection(id, this.storageCustomColl)
    return file
  }

  private async readFileFromCollection(id: string, collection: string): Promise<IFile | undefined> {
    const fileInfo = await this.storage.readFileStorage(`${collection}/${id}`)
    if (!fileInfo.file || !fileInfo.meta) return
    const name = fileInfo.meta.customMetadata?.name ?? fileInfo.meta.name
    const file = await this.blobToFile(fileInfo.file, name)
    const fileObj: IFile = { id, name, file }
    return fileObj
  }

  private async blobToFile(blob: Blob, name: string) {
    return new File([blob], name, { type: 'text/csv' })
  }

  async checkFileExistance(id: string): Promise<boolean> {
    const existance = await this.storage.checkIfFileExists(`${this.storageCollection}/${id}`)
    return existance
  }

  async getFilesList(): Promise<string[]> {
    const files = await this.storage.getFilesFromRef(this.storageCollection)
    if (!files) return []
    const fileNames = files.items.map(item => item.name)
    return fileNames
  }

  async uploadKeunFile(file: File, authors: string[]): Promise<void> {
    await this.storage.uploadFileStorage(`${this.storageCollection}/${file.name}`, file)
    const customName = `${file.name.split('.')[0]}_concepts.csv`
    const customFile = await this.blobToFile(new Blob([initial.initial]), customName)
    await this.storage.uploadFileStorage(`${this.storageCustomColl}/${customName}`, customFile)
    const fileData = { name: file.name, authors, custom: customName }
    await this.firestore.writeToFirestore(this.firestoreFileColl, file.name, fileData)
  }

  async editKeunFile(id: string, blob: Blob): Promise<void> {
    const fileName = await this.getFileNameFromFirestore(id)
    const file = await this.blobToFile(blob, fileName)
    await this.storage.uploadFileStorage(`${this.storageCollection}/${fileName}`, file)
  }

  async editCustomKeunFile(id: string, blob: Blob): Promise<void> {
    const fileName = await this.getFileNameFromFirestore(id, true)
    const file = await this.blobToFile(blob, fileName)
    await this.storage.uploadFileStorage(`${this.storageCustomColl}/${fileName}`, file)
  }

  private async getFileNameFromFirestore(id: string, custom: boolean = false) {
    const fileInfo = await this.firestore.readFirestore(this.firestoreFileColl, id)
    if (!fileInfo) return id
    const fileData = fileInfo.data()
    if (!fileData) return id
    return custom ? fileData.custom : fileData.name
  }

  async editKeunFileAuthors(id: string, authors: string[]): Promise<void> {
    await this.firestore.updateToFirestore(this.firestoreFileColl, id, { authors })
  }

  async deleteKeunFile(id: string): Promise<void> {
    await this.storage.deleteFileStorage(`${this.storageCollection}/${id}`)
    await this.firestore.deleteDocumentFirestore(this.firestoreFileColl, id)
  }

  async deleteCustomKeunFile(id: string): Promise<void> {
    await this.storage.deleteFileStorage(`${this.storageCustomColl}/${id}`)
  }

  async getAllPossibleAuthors(): Promise<string[]> {
    const usersList = await this.firestore.readFirestoreCollection(this.firestoreUserColl)
    if (!usersList) return []
    const userListData = usersList.docs.map(doc => doc.data())
    const userNames = userListData.map(userData => userData.name)
    return userNames
  }
}

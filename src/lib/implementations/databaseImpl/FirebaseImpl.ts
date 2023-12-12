import { dev } from '$app/environment'
import initial from '$lib/data/customBlobInitial.json'
import {
  deleteDocumentFirestore,
  deleteFileStorage,
  readFileStorage,
  readFirestore,
  readFirestoreCollection,
  updateToFirestore,
  uploadFileStorage,
  writeToFirestore,
} from '$lib/obsolete/firebase'
import { downloadWithUrl } from '$lib/obsolete/utils'
import type { IConceptFiles, IFile, IUpdatedFunctionalityImpl } from '$lib/components/Types'

/* Possible Firestore structure

files: {
  {id}: {
    name: string
    authors: string[]
    customName: string
  }
},
users: {
  {userId}: {
    files: [
      {
        id: string
        options: ITableOptions
        columns: IColumnMetaData[]
      }
    ],
    name: string
    lastName: string
  }
}
  
*/

/* Possible Storage structure (id of custom file is the same as the id of the file)

Keun-files: {
  {id}: {
    file: Blob
    meta: {
      customMetadata : {
        name: string
      }
    }
  }
}

Keun-custom-files: {
  {id}: {
    file: Blob
    meta: {
      customMetaData: {
        name: string
      }
    }
  }
}
  
*/

// TODO: create Database impl
// TODO: implement auth
// TODO: implement save impl
// TODO: implement type impl
// TODO: write security rules Firestore
// TODO: write security rules Storage

export default class FirebaseImpl implements IUpdatedFunctionalityImpl {
  storageCollection: string = 'Keun-files'
  storageCustomColl: string = 'Keun-custom-files'
  firestoreFileColl: string = 'files'
  firestoreUserColl: string = 'users'

  async getFile(id: string): Promise<IConceptFiles | void> {
    if (dev) console.log(`getFile: Get file with id ${id} in IndexedDB`)
    const file = await this.getFileFromColl(this.storageCollection, id)
    const customFile = await this.getFileFromColl(this.storageCustomColl, id)
    if (!file || !customFile) return console.error(`getFile: Error when fetching the file & custom file with id ${id}`)
    return { file, customFile }
  }

  async checkFileExistance(name: string): Promise<string | boolean | void> {
    // This method will only be available if you are admin, so we can fetch all the files & check if the same name is found
    if (dev) console.log('checkFileExistence: Check if the file with name')
    const files = await readFirestoreCollection(this.firestoreFileColl)
    for (const file of files) if (file.name === name) return file.id
  }

  async getFiles(userId?: string, roles?: string[]): Promise<IFile[] | void> {
    if (dev) console.log('getFiles: Get files from Firebase Storage')
    if (!userId) return console.error('getFiles: The user is not logged in, so his files could not be fetched')
    if (roles && roles?.includes('admin')) {
      const res = await readFirestoreCollection(this.firestoreFileColl)
      return res.map(doc => ({ id: doc.id, name: doc.name, file: new File([], '') }))
    }
    const userInfo = await readFirestore(this.firestoreUserColl, userId)
    if (!userInfo)
      return console.error('getFiles: Could not get files for user, there were no files assigned to his account')
    const { files } = userInfo.files
    const allFiles: IFile[] = []
    for (const file of files) {
      const res = await this.getFileFromColl(this.storageCollection, file.id)
      if (res) allFiles.push(res)
    }
    return allFiles
  }

  async uploadFile(file: File, authors: string[]): Promise<void | string[]> {
    if (dev) console.log('uploadFile: Uploading file to Firebase Storage & Firestore')
    const customName = `${file.name.split('.')[0]}_concepts.csv`
    const id = await this.uploadToFirebase(this.storageCollection, file, authors)
    const customFile = await this.blobToFile(new Blob([initial.initial]), customName)
    await this.uploadToFirebase(this.storageCustomColl, customFile, authors, id)
  }

  async editFile(id: string, blob: Blob, customBlob?: Blob | undefined): Promise<void> {
    if (dev) console.log(`editFile: Editing the file with id ${id}`)
    const { name, customName } = await this.getFileName(id)
    const file = await this.blobToFile(blob, name)
    await uploadFileStorage(`${this.storageCollection}/${id}`, file, { customMetadata: { id, name } })
    if (!customBlob) return
    const customFile = await this.blobToFile(customBlob, customName)
    await uploadFileStorage(`${this.storageCustomColl}/${id}`, customFile, { customMetadata: { id, name: customName } })
  }

  async editFileAuthors(id: string, authors: string[]): Promise<void> {
    if (dev) console.log(`editFileAuthors: Editing authors of file ${id}`)
    await updateToFirestore(this.firestoreFileColl, id, { authors })
    for (const author of authors) {
      const userInfo = await readFirestore(this.firestoreUserColl, author)
      if (userInfo) await writeToFirestore(this.firestoreUserColl, author, { files: [...userInfo.files, id] })
    }
  }

  async deleteFile(id: string): Promise<void> {
    if (dev) console.log(`deleteFile: Deleting the file with id ${id}`)
    await deleteFileStorage(`${this.storageCollection}/${id}`)
    await deleteFileStorage(`${this.storageCustomColl}/${id}`)
    await deleteDocumentFirestore(this.firestoreFileColl, id)
  }

  async downloadFile(id: string): Promise<void> {
    if (dev) console.log(`downloadFile: Downloading the file with id ${id}`)
    await this.download(this.storageCollection, id)
    await this.download(this.storageCustomColl, id)
  }

  private async getFileName(id: string) {
    const fileInfo = await readFirestore(this.firestoreFileColl, id)
    return { name: fileInfo?.id ?? '', customName: fileInfo?.custom?.name ?? '' }
  }

  private async blobToFile(blob: Blob, name: string) {
    return new File([blob], name, { type: 'text/csv' })
  }

  private async getFileFromColl(coll: string, id: string): Promise<IFile | void> {
    const result = await readFileStorage(`${coll}/${id}`)
    if (!result || !result.meta.customMetadata?.name)
      return console.error('getFile: File not found in Firebase Storage')
    const { name } = result.meta.customMetadata
    return { id, name, file: await this.blobToFile(result.file, name ?? 'file') }
  }

  private async uploadToFirebase(coll: string, file: File, authors: string[], id?: string) {
    const fileId = id ?? crypto.randomUUID()
    await uploadFileStorage(`${coll}/${id}`, file, { customMetadata: { id: fileId, name: file.name } })
    await writeToFirestore(this.firestoreFileColl, fileId, { name: file.name, authors })
    return id
  }

  private async download(coll: string, id: string) {
    const fileInfo = await readFileStorage(`${coll}/${id}`)
    if (!fileInfo?.file || !fileInfo?.meta.customMetadata?.name) return
    const name = fileInfo.meta.customMetadata.name
    const file = await this.blobToFile(fileInfo?.file, name)
    const url = URL.createObjectURL(file)
    await downloadWithUrl(url, name)
  }
}

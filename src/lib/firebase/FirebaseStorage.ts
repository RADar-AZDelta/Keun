import {
    deleteObject,
    getBlob,
    getDownloadURL,
    getMetadata,
    getStorage,
    listAll,
    ref,
    uploadBytes,
  } from 'firebase/storage'
  import Firebase from './Firebase.js'
  import type { FirebaseError, FirebaseOptions } from 'firebase/app'
  import type { FirebaseStorage as Storage, UploadMetadata } from 'firebase/storage'
import type { IMessage } from './Types.js'
  
  export default class FirebaseStorage extends Firebase {
    private storage: Storage
  
    constructor(config: FirebaseOptions) {
      super(config)
      this.storage = getStorage(this.firebaseApp)
    }
  
    async uploadFileStorage(reference: string, file: File, metadata?: UploadMetadata) {
      const storageReference = ref(this.storage, reference)
      await uploadBytes(storageReference, file, metadata).catch(this.logErrorAndReturn)
    }
  
    async readFileStorage(reference: string) {
      const storageReference = ref(this.storage, reference)
      const meta = await getMetadata(storageReference).catch(this.logErrorAndReturn)
      const file = await getBlob(storageReference).catch(this.logErrorAndReturn)
      return { file, meta }
    }
  
    async readMetaData(reference: string) {
      const storageReference = ref(this.storage, reference)
      const meta = await getMetadata(storageReference).catch(this.logErrorAndReturn)
      return meta
    }
  
    async getFilesFromRef(reference: string) {
      const storageReference = ref(this.storage, reference)
      const list = await listAll(storageReference).catch(this.logErrorAndReturn)
      return list
    }
  
    async deleteFileStorage(reference: string) {
      const storageReference = ref(this.storage, reference)
      await deleteObject(storageReference).catch(this.logErrorAndReturn)
    }
  
    async checkIfFileExists(reference: string) {
      const storageReference = ref(this.storage, reference)
      const existance = await getDownloadURL(storageReference)
        .then(url => true)
        .catch(err => false)
      return existance
    }
  
    private logErrorAndReturn(error: FirebaseError) {
      const message: IMessage = {
        result: 'error',
        title: error.name,
        message: error.message,
      }
      throw message
    }
  }
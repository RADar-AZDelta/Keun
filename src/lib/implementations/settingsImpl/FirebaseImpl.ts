import FirebaseFirestore from '$lib/firebase/FirebaseFirestore'
import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
  PUBLIC_VOCABULARY,
} from '$env/static/public'
import { user } from '$lib/store'
import { logWhenDev } from '$lib/utils'
import type { ISettings, ISettingsImpl, IUser } from '$lib/Types'
import type { FirebaseOptions } from 'firebase/app'

const defaultSettings: ISettings = {
  mapToMultipleConcepts: false,
  autoMap: false,
  language: 'en',
  savedAuthors: [],
  vocabularyIdCustomConcept: PUBLIC_VOCABULARY,
  popupSidesShowed: { filters: true, details: true },
}

const firebaseConfig: FirebaseOptions = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID,
}

export default class FirebaseImpl implements ISettingsImpl {
  firestore: FirebaseFirestore = new FirebaseFirestore(firebaseConfig)
  collection: string = 'settings'

  async getSettings(): Promise<ISettings> {
    logWhenDev('getSettings: Reading the settings from Firestore')
    const retrievedUser = await this.getUser()
    if (!retrievedUser?.uid) return defaultSettings
    const userInfoDocument = await this.firestore.readFirestore(this.collection, retrievedUser.uid)
    if (!userInfoDocument) return defaultSettings
    const userInfo = userInfoDocument.data()
    if (!userInfo) return defaultSettings
    return userInfo as ISettings
  }

  async updateSettings(settings: ISettings): Promise<void> {
    logWhenDev('updateSettings: Updating the settings to the Firestore')
    const retrievedUser = await this.getUser()
    if (!retrievedUser?.uid) return
    await this.firestore.updateToFirestoreIfNotExist(this.collection, retrievedUser.uid, settings)
  }

  private async getUser(): Promise<IUser> {
    return new Promise(resolve => user.subscribe(user => resolve(user))())
  }
}

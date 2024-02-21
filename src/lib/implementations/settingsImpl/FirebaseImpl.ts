import { dev } from '$app/environment'
import type { ISettings, ISettingsImpl } from '$lib/components/Types'
import { FirebaseFirestore, type FirebaseOptions } from '@radar-azdelta-int/radar-firebase-utils'
import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
} from '$env/static/public'
import { user } from '$lib/store'

const defaultSettings: ISettings = {
  mapToMultipleConcepts: false,
  autoMap: false,
  language: 'en',
  savedAuthors: [],
  vocabularyIdCustomConcept: '',
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
    return new Promise(resolve => {
      if (dev) console.log('getSettings: Reading the settings from Firestore')
      user.subscribe(async user => {
        if (!user?.uid) return defaultSettings
        const userInfoDocument = await this.firestore.readFirestore(this.collection, user.uid)
        if (!userInfoDocument) return defaultSettings
        const userInfo = userInfoDocument.data()
        if (!userInfo) return defaultSettings
        resolve(userInfo.settings)
      })()
    })
  }

  async updateSettings(settings: ISettings): Promise<void> {
    if (dev) console.log('updateSettings: Updating the settings to the Firestore')
    user.subscribe(async user => {
      if (!user?.uid) return
      await this.firestore.updateToFirestore(this.collection, user.uid, settings)
    })()
  }
}

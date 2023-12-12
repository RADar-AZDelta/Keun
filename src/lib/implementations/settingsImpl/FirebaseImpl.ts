import { dev } from '$app/environment'
import type { ISettings, ISettingsImpl } from '$lib/components/Types'
import { readFirestore, updateToFirestore, userSessionStore } from '$lib/obsolete/firebase'

const defaultSettings: ISettings = {
  mapToMultipleConcepts: false,
  autoMap: false,
  language: 'en',
  savedAuthors: [],
  vocabularyIdCustomConcept: '',
  popupSidesShowed: { filters: true, details: true },
}

export default class FirebaseImpl implements ISettingsImpl {
  collection: string = 'settings'

  async getSettings(): Promise<ISettings> {
    return new Promise((resolve, reject) => {
      if (dev) console.log('getSettings: Reading the settings from Firestore')
      userSessionStore.subscribe(async user => {
        if (!user?.uid) return defaultSettings
        const userInfo = await readFirestore(this.collection, user.uid)
        if (!userInfo) return defaultSettings
        resolve(userInfo.settings)
      })()
    })
  }

  async updateSettings(settings: ISettings): Promise<void> {
    if (dev) console.log('updateSettings: Updating the settings to the Firestore')
    userSessionStore.subscribe(async user => {
      if (!user?.uid) return
      await updateToFirestore(this.collection, user.uid, settings)
    })()
  }
}

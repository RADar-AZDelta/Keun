import { getApps, getApp, initializeApp } from 'firebase/app'
import type { FirebaseApp, FirebaseOptions } from 'firebase/app'

export default class Firebase {
  firebaseApp: FirebaseApp

  constructor(config: FirebaseOptions) {
    const existingApps = getApps().length
    this.firebaseApp = existingApps ? getApp() : initializeApp(config)
  }
}

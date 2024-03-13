import { logWhenDev } from '$lib/utils'
import { user } from '$lib/store'
import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
  PUBLIC_TENANT_ID,
} from '$env/static/public'
import type { IAuthImpl } from '$lib/Types'
import type { FirebaseOptions } from 'firebase/app'
import FirebaseAuth, { onlyReadableUserSessionStore } from '$lib/firebase/FirebaseAuth'
import type { UserSession } from '$lib/firebase/Types'

const firebaseConfig: FirebaseOptions = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID,
}

export default class LocalImpl implements IAuthImpl {
  auth: FirebaseAuth = new FirebaseAuth(firebaseConfig, PUBLIC_TENANT_ID)

  async logIn(provider: string): Promise<void> {
    logWhenDev('logIn: Logging in via Firebase')
    const userCred = await this.auth.logIn(provider ?? 'microsoft')
    const firebaseUser = userCred
    if (!firebaseUser) return
    const { uid, name, roles } = firebaseUser
    user.set({ uid, name, roles })
  }

  async logOut(): Promise<void> {
    logWhenDev('logOut: Logging out via Firebase')
    await this.auth.logOut()
    user.set({ uid: undefined, name: undefined, roles: undefined })
  }

  async getAuthor(): Promise<string | null | void> {
    logWhenDev('getAuthor: Get the saved author via Firebase')
    await this.auth.userSessionInitialized
    const retrievedUser = await this.getUser()
    if (!retrievedUser) return null
    const { uid, name, roles } = retrievedUser
    user.set({ uid, name, roles })
    return retrievedUser.name ?? null
  }

  private async getUser(): Promise<UserSession> {
    return new Promise(resolve => onlyReadableUserSessionStore.subscribe(user => resolve(user))())
  }
}

import { writable } from 'svelte/store'
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import Firebase from './Firebase.js'
import FirebaseFirestore from './FirebaseFirestore.js'
import type { FirebaseOptions } from 'firebase/app'
import type { Auth, UserCredential, User, ParsedToken } from 'firebase/auth'
import { sleep } from '$lib/utils.js'
import type { IAuthProviders, IRole, UserSession } from './Types.js'

const userSessionStore = writable<UserSession>()
export const onlyReadableUserSessionStore = { subscribe: userSessionStore.subscribe }

export default class FirebaseAuth extends Firebase {
  private firebaseAuth: Auth
  private firestore: FirebaseFirestore
  private authProviders: IAuthProviders
  private tenantId: string | undefined
  private _resolve: (value?: unknown) => void = () => {}

  constructor(config: FirebaseOptions, tenantId?: string) {
    super(config)
    this.firebaseAuth = getAuth(this.firebaseApp)
    this.firestore = new FirebaseFirestore(config)
    this.authProviders = { google: new GoogleAuthProvider(), microsoft: new OAuthProvider('microsoft.com') }
    this.tenantId = tenantId
    if (this.tenantId) this.authProviders.microsoft.setCustomParameters({ tenant: this.tenantId })
    this.authChange()
  }

  async logIn(provider: string): Promise<UserCredential | void> {
    const authProvider = await this.getAuthProvider(provider)
    const userCred = await signInWithPopup(this.firebaseAuth, authProvider)
    if (!userCred.user) return userCred
    const { token, claims } = await userCred.user.getIdTokenResult(true)
    await this.setToken(token, claims.exp)
  }

  private async getAuthProvider(provider: string) {
    const authProvider = this.authProviders[provider.toLowerCase()]
    if (authProvider) return authProvider
    else return this.authProviders.google
  }

  async logOut() {
    await signOut(this.firebaseAuth)
    await this.setToken()
  }

  private async setToken(token?: string, expiration?: string) {
    const headers = { 'Content-Type': 'application/json;charset=utf-8', Authorization: token ?? '' }
    const body = JSON.stringify({ token, expiration })
    const options: RequestInit = { ...headers, mode: 'cors', method: 'POST', body }
    // await fetch('/api/token', options)
  }

  private decodeToken(user: User, token: string, claims?: IRole): UserSession {
    const { uid, displayName, email } = user
    return { uid: uid, name: displayName ?? undefined, email: email ?? undefined, roles: claims?.roles, token }
  }

  private refreshTokenTrigger(user: User, token: ParsedToken, set: (value: UserSession) => void) {
    if (!user) return
    const ms = (Number(token.exp) - Number(token.iat)) * 1000 - 10 * 1000 //refresh token 10 sec before expiration
    sleep(ms).then(() => {
      user.getIdTokenResult(true).then(async token => {
        const roles = await this.getRoleFromFirestore(user)
        set(this.decodeToken(user, token.token, roles))
      })
    })
  }

  userSessionInitialized = new Promise(resolve => (this._resolve = resolve))

  private authChange() {
    onAuthStateChanged(this.firebaseAuth, async user => {
      if (!user) {
        userSessionStore.set({ uid: undefined, name: undefined, email: undefined, roles: undefined })
        return this._resolve()
      }
      const { token, claims } = await user.getIdTokenResult(false)
      this.refreshTokenTrigger(user, claims, userSessionStore.set)
      const roles = await this.getRoleFromFirestore(user).catch(err => ({ roles: [] }))
      userSessionStore.set(this.decodeToken(user, token, roles))
      await this.setToken(token, claims.exp)
      this._resolve()
    })
  }

  private async getRoleFromFirestore(user: User) {
    if (!user.email) return { roles: [] }
    // For as long as the role is not in the custom claim of the user, it needs to be fetched from Firestore
    const roleSnapshot = await this.firestore.readFirestore('roles', user.email)
    const roles: IRole = roleSnapshot ? roleSnapshot.data() ?? { roles: [] } : { roles: [] }
    return roles
  }
}

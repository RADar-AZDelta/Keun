import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_DATABASE_URL,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
} from '$env/static/public'
import { initializeApp, type FirebaseOptions, type FirebaseApp, getApps } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  type AuthProvider,
  signInWithPopup,
  signOut,
  type UserCredential,
} from 'firebase/auth'
import { user } from '$lib/store'

const firebaseConfig: FirebaseOptions = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: PUBLIC_FIREBASE_DATABASE_URL,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID,
}

let firebaseApp: FirebaseApp | undefined

if (!getApps().length) firebaseApp = initializeApp(firebaseConfig)

const firebaseAuth = getAuth(firebaseApp)

async function login(provider: string): Promise<UserCredential> {
  let authProvider: AuthProvider
  switch (provider) {
    case 'google':
      authProvider = new GoogleAuthProvider()
      break
    default:
      throw new Error('There are no other providers configured at the moment')
  }

  let userCreds = await signInWithPopup(firebaseAuth, authProvider)

  return userCreds
}

async function logout() {
  await signOut(firebaseAuth)
  user.update(user => {
    user = undefined
    return user
  })
}

export { login, logout }

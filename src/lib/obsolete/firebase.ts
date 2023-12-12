import { PUBLIC_FIREBASE_MESSAGING_SENDER_ID } from '$env/static/public'
import { PUBLIC_FIREBASE_STORAGE_BUCKET, PUBLIC_FIREBASE_APP_ID, PUBLIC_TENANT_ID } from '$env/static/public'
import { PUBLIC_FIREBASE_API_KEY, PUBLIC_FIREBASE_AUTH_DOMAIN, PUBLIC_FIREBASE_PROJECT_ID } from '$env/static/public'
import { sleep } from '$lib/obsolete/utils'
import { getApps, getApp, initializeApp } from '@firebase/app'
import { collection, getFirestore, query } from '@firebase/firestore'
import { getBlob, getMetadata, getStorage, ref, uploadBytes, listAll } from '@firebase/storage'
import { deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from '@firebase/firestore'
import { getAuth, signInWithPopup, signOut, onAuthStateChanged, OAuthProvider } from '@firebase/auth'
import type { UserSession } from '../../app'
import type { FirebaseApp, FirebaseOptions } from '@firebase/app'
import { deleteObject, type FirebaseStorage, type UploadMetadata } from '@firebase/storage'
import type { Firestore, QueryFieldFilterConstraint } from '@firebase/firestore'
import type { Auth, ParsedToken, User, UserCredential } from '@firebase/auth'
import { writable } from 'svelte/store'

const firebaseConfig: FirebaseOptions = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
let firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Auth
const firebaseAuth: Auth = getAuth(firebaseApp)

// Firestore
const firestore: Firestore = getFirestore(firebaseApp)

// Storage
const storage: FirebaseStorage = getStorage(firebaseApp)

const microsoftAuthProvider = new OAuthProvider('microsoft.com')
microsoftAuthProvider.setCustomParameters({ tenant: PUBLIC_TENANT_ID })

/////////////////////////////////////////// AUTHENTICATION ///////////////////////////////////////////

async function logIn(): Promise<UserCredential | void> {
  const userCred = await signInWithPopup(firebaseAuth, microsoftAuthProvider)
  if (!userCred.user) return userCred
  const token = await userCred.user.getIdTokenResult(true)
  await setToken(token.token)
}

async function logOut() {
  await signOut(firebaseAuth)
  await setToken()
}

// Set the token in the cookies
async function setToken(token?: string) {
  const headers = { 'Content-Type': 'application/json;charset=utf-8', Authorization: token ? token : '' }
  const options: RequestInit = { ...headers, mode: 'cors', method: 'POST', body: JSON.stringify({ token }) }
  await fetch('/api/token', options)
}

const decodeToken = (user: User, token: string, claims: ParsedToken): UserSession => {
  const { uid, displayName, email } = user
  return { uid: uid, name: displayName ?? undefined, email: email ?? undefined, roles: <any>claims.role, token }
}

const refreshTokenTrigger = (user: User, token: ParsedToken, set: (value: UserSession) => void) => {
  if (!user) return
  const ms = (Number(token.exp) - Number(token.iat)) * 1000 - 10 * 1000 //refresh token 10 sec before expiration
  sleep(ms).then(() => {
    user.getIdTokenResult(true).then(token => set(decodeToken(user, token.token, token.claims)))
  })
}

// Store
const userSessionStore = writable<UserSession>({})
let _resolve: any
const userSessionInitialized = new Promise(resolve => (_resolve = resolve))

onAuthStateChanged(firebaseAuth, async u => {
  if (u) {
    const tokenResult = await u.getIdTokenResult(false)
    const token = tokenResult.token
    const claims = tokenResult.claims
    refreshTokenTrigger(u, claims, userSessionStore.set)
    userSessionStore.set(decodeToken(u, token, claims))
    await setToken(token)
  } else {
    userSessionStore.set({ uid: undefined, name: undefined, email: undefined, roles: undefined })
  }
  _resolve()
})

const onlyReadableUserSessionStore = { subscribe: userSessionStore.subscribe }

/////////////////////////////////////////// FIRESTORE ///////////////////////////////////////////

async function writeToFirestore(collection: string, id: string, data: Object) {
  await setDoc(doc(firestore, collection, id), data)
}

async function updateToFirestore(collection: string, id: string, data: any) {
  await updateDoc(doc(firestore, collection, id), data)
}

async function readFirestore(collection: string, id: string) {
  const refer = doc(firestore, collection, id)
  const docSnap = await getDoc(refer)
  return docSnap.data()
}

async function readFirestoreCollection(coll: string) {
  const q = query(collection(firestore, coll))
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => doc.data())
}

async function executeFilterQueryFirestore(coll: string, filter: QueryFieldFilterConstraint) {
  const q = query(collection(firestore, coll), filter)
  const querySnapshot = await getDocs(q)
  let queriedData: Record<string, any> = {}
  querySnapshot.forEach(doc => {
    queriedData[doc.id as keyof Object] = doc.data()
  })
  return queriedData
}

async function deleteDocumentFirestore(coll: string, id: string) {
  const refer = doc(firestore, coll, id)
  await deleteDoc(refer)
}

/////////////////////////////////////////// STORAGE ///////////////////////////////////////////

async function uploadFileStorage(reference: string, file: File, metadata?: UploadMetadata) {
  const storageReference = ref(storage, reference)
  uploadBytes(storageReference, file, metadata).catch(e => console.error(e))
}

async function readFileStorage(reference: string) {
  try {
    const storageReference = ref(storage, reference)
    const meta = await getMetadata(storageReference)
    const file = await getBlob(storageReference)
    return { file, meta }
  } catch (e) {
    return undefined
  }
}

async function readMetaData(reference: string) {
  try {
    const storageReference = ref(storage, reference)
    const meta = await getMetadata(storageReference)
    return { meta }
  } catch (e) {
    return undefined
  }
}

async function getFilesFromRef(reference: string) {
  try {
    const storageReference = ref(storage, reference)
    const list = await listAll(storageReference)
    return list.items.map(item => item.name)
  } catch (e) {
    return undefined
  }
}

async function deleteFileStorage(reference: string) {
  const storageReference = ref(storage, reference)
  await deleteObject(storageReference)
}

export {
  logIn,
  logOut,
  onlyReadableUserSessionStore as userSessionStore,
  userSessionInitialized,
  writeToFirestore,
  updateToFirestore,
  readFirestore,
  readFirestoreCollection,
  executeFilterQueryFirestore,
  deleteDocumentFirestore,
  uploadFileStorage,
  readFileStorage,
  readMetaData,
  getFilesFromRef,
  deleteFileStorage
}
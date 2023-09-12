import { getApps, initializeApp, cert, type App } from 'firebase-admin/app'
import { PUBLIC_FIREBASE_PROJECT_ID, PUBLIC_FIREBASE_DATABASE_URL, PUBLIC_CLOUD_IMPLEMENTATION } from '$env/static/public'
import { getAuth, type DecodedIdToken, Auth, UserRecord } from 'firebase-admin/auth'
import { getDatabase, type Database } from 'firebase-admin/database'

// Initialize Firebase
let firebaseAdminApp: App | undefined

// Auth & Database
let firebaseAdminAuth: Auth, firebaseAdminDatabase: Database

async function setup(): Promise<unknown> {
  return new Promise(async(resolve, reject) => {
    if(PUBLIC_CLOUD_IMPLEMENTATION !== "firebase") return
    await import('$env/static/private').then(({ SECRET_FIREBASE_ADMIN_SDK_PRIVATE_KEY, SECRET_FIREBASE_ADMIN_SDK_CLIENT_EMAIL }) => {
      const firebaseAdminConfig = {
        projectId: PUBLIC_FIREBASE_PROJECT_ID,
        privateKey: SECRET_FIREBASE_ADMIN_SDK_PRIVATE_KEY.replace(/\\n/gm, '\n'),
        clientEmail: SECRET_FIREBASE_ADMIN_SDK_CLIENT_EMAIL
      }

      if (!getApps().length) {
        firebaseAdminApp = initializeApp({
          credential: cert(firebaseAdminConfig),
          databaseURL: PUBLIC_FIREBASE_DATABASE_URL
        })
      } else if(!firebaseAdminApp) firebaseAdminApp = getApps()[0]

      firebaseAdminAuth = getAuth(firebaseAdminApp)
      firebaseAdminDatabase = getDatabase(firebaseAdminApp)
      return resolve(true)
    })
  })
}

// decode JWT token
async function decodeToken(token: string): Promise<DecodedIdToken | null> {
  if(!firebaseAdminAuth) await setup()
  if (!token || token === 'null' || token === 'undefined') return null
  try {
    return await firebaseAdminAuth.verifyIdToken(token)
  } catch (err) {
    console.error(err)
    return null
  }
}

// create user
async function createUser(email: string, customClaims?: object): Promise<UserRecord | undefined> {
  try {
    if(!firebaseAdminAuth) await setup()
    const userRecord = await firebaseAdminAuth.createUser({ email })
    console.log('Successfully created new user: ', userRecord)
    if(!customClaims) return
    await firebaseAdminAuth.setCustomUserClaims(userRecord.uid, customClaims)
    console.log('Successfully set custom user claims on user: ', userRecord)
    return userRecord
  } catch (error: any) {
    console.error(error)
    throw error
  }
}

async function writeToDatabaseAdmin(path: string, data: Object): Promise<void> {
  if(!firebaseAdminDatabase) await setup()
  const reference = firebaseAdminDatabase.ref(path)
  reference.set(data)
}

async function updateDatabaseAdmin(path: string, data: Object): Promise<void> {
  if(!firebaseAdminDatabase) await setup()
  const reference = firebaseAdminDatabase.ref(path)
  reference.update(data)
}

async function pushToDatabaseAdmin(path: string, data: any): Promise<void> {
  if(!firebaseAdminDatabase) await setup()
  const reference = firebaseAdminDatabase.ref(path)
  reference.push(data)
}

export { decodeToken, createUser, writeToDatabaseAdmin, updateDatabaseAdmin, pushToDatabaseAdmin }

import { getApps, initializeApp, cert, type App } from 'firebase-admin/app'
import { PUBLIC_FIREBASE_PROJECT_ID, PUBLIC_FIREBASE_DATABASE_URL } from '$env/static/public'
import { SECRET_FIREBASE_ADMIN_SDK_CLIENT_EMAIL, SECRET_FIREBASE_ADMIN_SDK_PRIVATE_KEY } from '$env/static/private'
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth'
import { getDatabase } from 'firebase-admin/database'

const firebaseAdminConfig = {
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  privateKey: SECRET_FIREBASE_ADMIN_SDK_PRIVATE_KEY.replace(/\\n/gm, '\n'),
  clientEmail: SECRET_FIREBASE_ADMIN_SDK_CLIENT_EMAIL
}

// Initialize Firebase
let firebaseAdminApp: App | undefined

if (!getApps().length) {
  firebaseAdminApp = initializeApp({
    credential: cert(firebaseAdminConfig),
    databaseURL: PUBLIC_FIREBASE_DATABASE_URL
  })
}

// Auth
const firebaseAdminAuth = getAuth(firebaseAdminApp)
// Database
const firebaseAdminDatabase = getDatabase(firebaseAdminApp)

// decode JWT token
async function decodeToken(token: string): Promise<DecodedIdToken | null> {
  if (!token || token === 'null' || token === 'undefined') return null
  try {
    return await firebaseAdminAuth.verifyIdToken(token)
  } catch (err) {
    return null
  }
}

// create user
async function createUser(email: string, customClaims?: object) {
  try {
    const userRecord = await firebaseAdminAuth.createUser({ email })
    console.log('Successfully created new user: ', userRecord)
    if (customClaims) {
      await firebaseAdminAuth.setCustomUserClaims(userRecord.uid, customClaims)
      console.log('Successfully set custom user claims on user: ', userRecord)
      return userRecord
    }
  } catch (error: any) {
    console.error(error)
    throw error
  }
}

async function writeToDatabaseAdmin(path: string, data: Object) {
  const reference = firebaseAdminDatabase.ref(path)
  reference.set(data)
}

async function updateDatabaseAdmin(path: string, data: Object) {
  const reference = firebaseAdminDatabase.ref(path)
  reference.update(data)
}

async function pushToDatabaseAdmin(path: string, data: any) {
  const reference = firebaseAdminDatabase.ref(path)
  reference.push(data)
}

export { decodeToken, createUser, writeToDatabaseAdmin, updateDatabaseAdmin, pushToDatabaseAdmin }

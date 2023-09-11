import { json, type RequestHandler } from '@sveltejs/kit'
import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { SECRET_FIREBASE_API_KEY } from '$env/static/private'
import {
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_DATABASE_URL,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
} from '$env/static/public'

export const POST: RequestHandler = async () => {
  const firebaseConfig: FirebaseOptions = {
    apiKey: SECRET_FIREBASE_API_KEY,
    authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: PUBLIC_FIREBASE_DATABASE_URL,
    projectId: PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: PUBLIC_FIREBASE_APP_ID,
  }
  const firebaseApp = initializeApp(firebaseConfig, 'POC')

  return json({
    app: firebaseApp
  })
}

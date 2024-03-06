// Apply roles to a group of people
// pnpm assignGroup

import { initializeApp, App } from 'firebase-admin/app'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import group from './group.json'

const app: App = initializeApp({ projectId: 'azd-dev-keun1' })
const firestore: Firestore = getFirestore(app)

async function assignRole(email: string, roles: string[]) {
  try {
    await assignRoleToUser(email, roles)
  } catch (e) {
    console.error(e)
  }
}

async function assignRoleToUser(email: string, roles: string[]) {
  const firestoreRoles = (await firestore.collection('roles').doc(email).get()).data()
  if (firestoreRoles?.roles !== roles) await firestore.collection('roles').doc(email).set({ roles })
}

function start() {
  for (let [mail, roles] of Object.entries(group)) assignRole(mail, roles)
}

start()

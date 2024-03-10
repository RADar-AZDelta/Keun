// Check the applied roles for the group
// pnpm checkGroup

import { App, initializeApp } from 'firebase-admin/app'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import group from './group.json'

const app: App = initializeApp({ projectId: 'azd-dev-portfolio-management' })
const firestore: Firestore = getFirestore(app)

async function checkRole(mail: string) {
  const dbRole = await (await firestore.collection('roles').doc(mail).get()).data()
  console.log('Role in Firestore database for ', mail, ' is ', dbRole?.roles)
}

function start() {
  for (let mail of Object.keys(group)) checkRole(mail)
}

start()

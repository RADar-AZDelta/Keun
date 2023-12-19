// Check the applied roles of a user
// pnpm check mail=pol.pollen@azdelta.be

import { App, initializeApp } from 'firebase-admin/app'
import { Auth, getAuth } from 'firebase-admin/auth'
import { Firestore, getFirestore } from 'firebase-admin/firestore'

const app: App = initializeApp({ projectId: 'azd-dev-keun1' })
const adminAuth: Auth = getAuth(app)
const firestore: Firestore = getFirestore(app)

async function checkRole(mail: string) {
  // Get the user & check his roles customClaims
  // Get the roles for the user with UID
  const user = await adminAuth.getUserByEmail(mail)
  const dbRole = await (await firestore.collection('roles').doc(user.uid).get()).data()
  console.log('Authentication custom claims for ', mail, ' are ', user.customClaims?.roles)
  console.log('Role in Firestore database for ', mail, ' is ', dbRole?.roles)
}

// Extract the mail from the script parameters & check the role for that mail address
const checkMail = (mailParam: string) => checkRole(mailParam.slice(mailParam.indexOf('=') + 1))

function start() {
  process.argv.slice(2).forEach(function (val) {
    if (val.includes('mail')) checkMail(val)
  })
}

start()

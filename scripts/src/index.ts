// Apply roles to the user with the given email
// pnpm assign role=admin mail=pol.pollen@azdelta.be

import { App, initializeApp } from 'firebase-admin/app'
import { Auth, getAuth } from 'firebase-admin/auth'
import { Firestore, getFirestore } from 'firebase-admin/firestore'

const app: App = initializeApp({ projectId: 'azd-dev-keun1' })
const adminAuth: Auth = getAuth(app)
const firestore: Firestore = getFirestore(app)

const roles = ['user', 'admin']
let receivedRole: string, receivedEmail: string

async function assignRole(email: string, role: string) {
  try {
    // Search for an existing user & if the user does not exists, create him
    const user = await adminAuth.getUserByEmail(email)
    await assignRoleToUser(user.uid, role)
  } catch (e) {
    // This would work if it wasn't for a microsoft account
    await createUser(email, role)
    console.error(e)
  }
}

async function createUser(email: string, role: string) {
  // Create the user through the Admin SDK
  const user = await adminAuth.createUser({ email })
  await assignRoleToUser(user.uid, role)
}

async function assignRoleToUser(uid: string, role: string) {
  // Check if the current roles in the custom claims don't include the role already
  const user = await adminAuth.getUser(uid)
  const currentRoles = user.customClaims?.roles ?? []
  // If the role was not included already, add it to the list
  if (!currentRoles.includes(role)) await adminAuth.setCustomUserClaims(uid, { roles: [...currentRoles, role] })
  // Check if the current roles in Firestore don't include the role already
  const firestoreRoles = await (await firestore.collection('roles').doc(user.uid).get()).data()
  const currentFirestoreRoles = firestoreRoles?.roles ?? []
  // If the role was not included already, add it to the list in Firestore
  if (!currentFirestoreRoles.includes(role)) {
    const newRoles = [...currentFirestoreRoles, role]
    await firestore.collection('roles').doc(uid).set({ roles: newRoles })
  }
}

function checkRole(roleParam: string) {
  // Get the role from the script parameters & check if it is a valid role
  const role = roleParam.slice(roleParam.indexOf('=') + 1)
  if (roles.includes(role.toLowerCase())) receivedRole = role
}

// Extract the mail from the script parameters
const checkMail = (mailParam: string) => (receivedEmail = mailParam.slice(mailParam.indexOf('=') + 1))

function start() {
  process.argv.slice(2).forEach(function (val) {
    if (val.includes('role')) checkRole(val)
    else if (val.includes('mail')) checkMail(val)
  })
  if (receivedEmail && receivedRole) assignRole(receivedEmail, receivedRole)
}

start()

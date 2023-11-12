// import { decodeToken } from '$lib/firebase/firebaseAdmin.server'
// import { redirect, type Handle } from '@sveltejs/kit'
import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
// import authorizedPages from '$lib/config/authorizedPages.json'
import { user } from './lib/store'
// import type { IdTokenResult } from '@firebase/auth'

const securityHeaders = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'X-XSS-Protection': '0',
}

const sessionHandle: Handle = async ({ event, resolve }) => {
  // const token = event.cookies.get('token') || ''
  // user.subscribe(async user => {
  //   const currentToken = await user?.getIdTokenResult()
  //   if (token !== currentToken?.token) return
  //   if (currentToken && user) {
  //     const { uid, displayName, email } = user
  //     const roles = currentToken.claims
  //     event.locals.userSession = { uid, name: displayName, email: email ? email : '', roles: <[string]>roles.role }
  //   }
  // })

  const response = await resolve(event)
  // Object.entries(securityHeaders).forEach(([header, value]) => {
  // 	response.headers.set(header, value)
  // })

  return response
}

// async function checkForPermissions(
//   page: { path: string; permission: string },
//   pathName: string,
//   token: IdTokenResult | undefined
// ) {
//   if (!new RegExp(page.path).test(pathName)) return
//   if (page.permission.toLowerCase() === 'admin' && (!token || !(<[string]>token.claims.role).includes('admin'))) {
//     throw redirect(302, '/login')
//   } else if (page.permission.toLowerCase() === 'user' && !token) {
//     throw redirect(302, '/login')
//   }
// }

const authorizationHandle: Handle = async ({ event, resolve }) => {
  // user.subscribe(async user => {
  //   const currentToken = await user?.getIdTokenResult()
  //   for (let authorizedPage of authorizedPages)
  //     await checkForPermissions(authorizedPage, event.url.pathname, currentToken)
  // })
  const response = await resolve(event)
  return response
}

export const handle = sequence(sessionHandle, authorizationHandle)

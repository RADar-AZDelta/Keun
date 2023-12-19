import { json, type RequestHandler } from '@sveltejs/kit'
import { dev } from '$app/environment'
import { firebaseUser } from '$lib/store'

// TODO: check this because firebaseUser !== user

export const POST: RequestHandler = async ({ request, cookies }) => {
  const payload = await request.json()
  const token: string = payload.token || ''
  firebaseUser.subscribe(async user => {
    const res = await user?.getIdTokenResult()
    if (token) {
      cookies.set('token', token, {
        path: '/',
        httpOnly: true,
        secure: !dev,
        expires: !res?.claims.exp ? undefined : new Date(res.claims.exp),
      })
    } else {
      cookies.delete('token', { path: '/' })
    }
  })()

  return json({})
}

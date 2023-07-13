import { dev } from '$app/environment'
import { json, type RequestHandler } from '@sveltejs/kit'

export const POST: RequestHandler = async ({ request, cookies }) => {
  const payload = await request.json()
  const token: string = payload.token || ''
  await import('$lib/firebaseAdmin.server').then(async({ decodeToken }) => {
    const decodedToken = await decodeToken(token) 
    if (token) {
      cookies.set('token', token, {
        path: '/',
        httpOnly: true,
        secure: !dev,
        expires: decodedToken?.exp ? undefined : new Date(decodedToken?.exp!)
      })
    } else {
      cookies.delete('token', { path: '/' })
    }
  })

  return json({})
}
import { dev } from '$app/environment'
import { json, type RequestHandler } from '@sveltejs/kit'
import { decodeToken } from '$lib/firebaseAdmin.server';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const payload = await request.json()
  const token: string = payload.token || ''
  const decodedToken = await decodeToken(token)
  if (token) {
    cookies.set('token', token, {
      path: '/',
      httpOnly: true,
      secure: !dev,
      expires: decodedToken?.auth_time ? undefined : new Date(decodedToken?.auth_time!)
    })
  } else {
    cookies.delete('token', { path: '/' })
  }

  return json({})
}
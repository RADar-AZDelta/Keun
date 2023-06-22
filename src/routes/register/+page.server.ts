import { createUser } from '$lib/firebaseAdmin.server'
import { redirect, type Actions, fail } from '@sveltejs/kit'

export const prerender = false

export const actions: Actions = {
  create: async ({ locals, request }) => {
    console.log('HERE IN CREATE')
    // if (!locals.userSession?.uid || !locals.userSession?.roles?.includes('admin')) {
    //   console.error(`'${locals.userSession?.email}' tried to create an user and was not authorised!`)
    //   throw redirect(302, '/')
    // }

    const formData = await request.formData()
    const email = formData.get('email')
    const role = formData.get('role')
    console.error("EMAIL ", email)
    console.error("ROLE ", role)
    // let fileNames = formData.get('fileNames')
    if (!email) return fail(422, { error: 'Email is required' })
    if (!role) return fail(422, { error: 'Role is required' })
    // else if (!fileNames) return fail(422, { error: 'File names are required' })

    let customClaims = {
      role: role,
      // fileNames: fileNames,
    }

    console.log('CUSTOMCLAIMS ', customClaims)

    try {
      await createUser(email?.toString(), customClaims)
    } catch (error: any) {
      return fail(422, {
        email,
        error: error.message,
      })
    }
  },
}

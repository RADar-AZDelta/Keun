import { createUser, pushToDatabaseAdmin, updateDatabaseAdmin } from '$lib/firebaseAdmin.server'
import { type Actions, fail } from '@sveltejs/kit'

export const prerender = false

export const actions: Actions = {
  create: async ({ locals, request }) => {
    const formData = await request.formData()
    const email = formData.get('email')
    const role = formData.get('role')
    let fileNames = formData.getAll('files')

    if (!email) return fail(422, { error: 'Email is required' })
    if (!role) return fail(422, { error: 'Role is required' })

    let customClaims = {
      role: role,
    }

    try {
      await createUser(email?.toString(), customClaims).then(async(user) => {
        if(user) await updateDatabaseAdmin('/authors', {
          [user.uid]: {
            email: user.email
          }
        })
        return user
      }).then(async (user) => {
        if(user && fileNames) {
          for(let file of fileNames) {
            await pushToDatabaseAdmin(`/authors/${user.uid}/files`, file)
          }
        }
      })
    } catch (error: any) {
      return fail(422, {
        email,
        error: error.message,
      })
    }
  },
}

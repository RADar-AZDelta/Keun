import { dev } from '$app/environment'
import type { IAuthImpl, IUserRestriction } from '$lib/components/Types'
import { logIn, logOut, readFirestoreCollection, userSessionStore } from 'firebase_utils'
import { user } from '$lib/store'

export default class LocalImpl implements IAuthImpl {
  async logIn(name?: string): Promise<void> {
    if (dev) console.log('logIn: Logging in via Firebase')
    await logIn()
    userSessionStore.subscribe(u => {
      const { uid, name, roles } = u
      user.set({ uid, name, roles })
    })()
  }
  async logOut(): Promise<void> {
    if (dev) console.log('logOut: Logging out via Firebase')
    await logOut()
    user.set({ uid: undefined, name: undefined, roles: undefined })
  }

  async getAuthor(): Promise<string | null | void> {
    if (dev) console.log('getAuthor: Get the saved author via Firebase')
    let name: string | undefined
    userSessionStore.subscribe(u => (name = u.name))()
    return name ?? null
  }

  async getAllAuthors(): Promise<void | IUserRestriction[]> {
    if (dev) console.log('getAllAuthors: Get all the authors via Firebase')
    let admin: boolean = false
    userSessionStore.subscribe(u => (admin = u.roles?.includes('admin') ?? false))()
    if (!admin) return
    let authors: IUserRestriction[] = []
    const users = await readFirestoreCollection('users')
    for (let [key, user] of Object.entries(users)) authors.push({ id: key, fileIds: user.files, name: user.name })
    return authors
  }
}

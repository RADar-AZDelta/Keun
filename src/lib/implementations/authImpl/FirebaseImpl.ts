import { dev } from '$app/environment'
import { logIn, logOut, readFirestoreCollection, userSessionStore } from '$lib/obsolete/firebase'
import { user } from '$lib/store'
import type { IAuthImpl, IUserRestriction } from '$lib/components/Types'
import type { UserSession } from '../../../app'

export default class LocalImpl implements IAuthImpl {
  async logIn(): Promise<void> {
    if (dev) console.log('logIn: Logging in via Firebase')
    await logIn()
    const loggedInUser = await this.getUser()
    const { uid, name, roles } = loggedInUser
    user.set({ uid, name, roles })
  }
  async logOut(): Promise<void> {
    if (dev) console.log('logOut: Logging out via Firebase')
    await logOut()
    user.set({ uid: undefined, name: undefined, roles: undefined })
  }

  async getAuthor(): Promise<string | null | void> {
    if (dev) console.log('getAuthor: Get the saved author via Firebase')
    const user = await this.getUser()
    return user.name ?? null
  }

  async getAllAuthors(): Promise<void | IUserRestriction[]> {
    if (dev) console.log('getAllAuthors: Get all the authors via Firebase')
    const user = await this.getUser()
    if (!user.roles?.includes('admin')) return
    const authors: IUserRestriction[] = []
    const users = await readFirestoreCollection('users')
    for (const [key, user] of Object.entries(users)) authors.push({ id: key, fileIds: user.files, name: user.name })
    return authors
  }

  private async getUser(): Promise<UserSession> {
    return new Promise(resolve => userSessionStore.subscribe(user => resolve(user))())
  }
}

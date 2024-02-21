import { user } from '$lib/store'
import { logWhenDev } from '@radar-azdelta-int/radar-utils'
import type { IAuthImpl } from '$lib/components/Types'

export default class LocalImpl implements IAuthImpl {
  async logIn(name?: string): Promise<void> {
    logWhenDev('logIn: Logging in and saving in localstorage')
    if (!name) return console.error('logIn: Provide a name to log in with just a name')
    localStorage.setItem('author', name)
    user.set({ name })
  }
  
  async logOut(): Promise<void> {}

  async getAuthor(): Promise<void> {
    logWhenDev('getAuthor: Get the saved author from localstorage')
    const author = localStorage.getItem('author')
    if (author) user.set({ name: author })
  }
}

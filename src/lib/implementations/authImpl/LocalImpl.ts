import { logWhenDev } from '@radar-azdelta-int/radar-utils'
import { user } from '$lib/store'
import type { IAuthImpl } from '$lib/Types'

export default class LocalImpl implements IAuthImpl {
  async logIn(name?: string): Promise<void> {
    logWhenDev('logIn: Logging in and saving in localstorage')
    if (!name) return console.error('logIn: Provide a name to log in with just a name')
    localStorage.setItem('author', name)
    await this.updateUser(name)
  }

  async logOut(): Promise<void> {}

  async getAuthor(): Promise<void> {
    logWhenDev('getAuthor: Get the saved author from localstorage')
    const name = localStorage.getItem('author')
    if (name) await this.updateUser(name)
  }

  private async updateUser(author: string) {
    user.set({ name: author })
  }
}

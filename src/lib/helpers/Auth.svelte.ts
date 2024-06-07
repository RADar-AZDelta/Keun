import { createUser } from '$lib/stores/runes.svelte'
import { dev } from '$app/environment'

const user = createUser()

export default class Auth {
  static async logIn(name: string) {
    if (dev) console.log('logIn: Logging in and saving in localstorage')
    if (!name) return console.error('logIn: Provide a name to log in with just a name')
    localStorage.setItem('author', name)
    user.update(name)
  }

  static async getAuthor() {
    if (dev) console.log('getAuthor: Get the saved author from localStorage')
    const retrievedUser = user.value
    if (!retrievedUser) return null
    return retrievedUser
  }
}

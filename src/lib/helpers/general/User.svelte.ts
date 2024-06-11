import { createUser } from '$lib/stores/runes.svelte'

const user = createUser()

export default class User {
  static async getUser(): Promise<string> {
    return user.value ?? ''
  }
}

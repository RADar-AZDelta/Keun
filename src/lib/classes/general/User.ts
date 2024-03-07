import type { IUser } from '$lib/components/Types'
import { user } from '$lib/store'

export default class User {
  static async getUser(): Promise<IUser> {
    return new Promise(resolve =>
      user.subscribe(user => {
        if (!user) throw new Error('User not found')
        resolve(user)
      }),
    )
  }
}

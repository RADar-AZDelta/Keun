import { PUBLIC_CLOUD_AUTH_IMPLEMENTATION } from '$env/static/public'
import { Providers } from '$lib/enums'
import type { IAuthImpl } from '$lib/Types'

export default class AuthImpl {
  private static auth: IAuthImpl
  static authImplementation = PUBLIC_CLOUD_AUTH_IMPLEMENTATION || Providers.Local

  static async logIn(name?: string) {
    await this.loadImpl()
    await this.auth.logIn(name)
  }

  static async getAuthor() {
    await this.loadImpl()
    await this.auth.getAuthor()
  }

  private static async loadImpl() {
    if (this.auth) return
    if (this.authImplementation === Providers.Firebase) {
      await import('$lib/implementations/authImpl/FirebaseImpl').then(({ default: Impl }) => (this.auth = new Impl()))
    } else await import('$lib/implementations/authImpl/LocalImpl').then(({ default: Impl }) => (this.auth = new Impl()))
  }
}

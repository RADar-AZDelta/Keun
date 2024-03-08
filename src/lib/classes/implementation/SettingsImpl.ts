import { PUBLIC_CLOUD_DATABASE_IMPLEMENTATION } from '$env/static/public'
import { Providers } from '$lib/enums'
import type { ISettings, ISettingsImpl } from '$lib/Types'

export default class SettingsImpl {
  private static settings: ISettingsImpl
  private static settingsImplementation = PUBLIC_CLOUD_DATABASE_IMPLEMENTATION || Providers.Local
  static settingsRetrievedFromStorage: boolean = false

  static async updateSettings(settings: ISettings) {
    await this.loadImpl()
    await this.settings.updateSettings(settings)
  }

  static async getSettings() {
    await this.loadImpl()
    const settings = await this.settings.getSettings()
    this.settingsRetrievedFromStorage = true
    return settings
  }

  private static async loadImpl() {
    if (this.settings) return
    if (this.settingsImplementation === Providers.Firebase)
      await import('$lib/implementations/settingsImpl/FirebaseImpl').then(
        ({ default: Impl }) => (this.settings = new Impl()),
      )
    else
      await import('$lib/implementations/settingsImpl/localImpl').then(
        ({ default: Impl }) => (this.settings = new Impl()),
      )
  }
}

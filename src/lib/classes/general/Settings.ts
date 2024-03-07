import type { ISettings } from '$lib/components/Types'
import { settings } from '$lib/store'

export default class Settings {
  static async getLanguage() {
    const settings = await this.getSettings()
    return settings.language
  }

  static async getAutoMap() {
    const settings = await this.getSettings()
    return settings.autoMap
  }

  static async getMappingToMultiple() {
    const settings = await this.getSettings()
    return settings.mapToMultipleConcepts
  }

  private static async getSettings(): Promise<ISettings> {
    return new Promise(resolve =>
      settings.subscribe(settings => {
        if (!settings) throw new Error('Settings not found')
        resolve(settings)
      }),
    )
  }
}

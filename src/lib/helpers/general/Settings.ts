import { createSettings } from '$lib/stores/runes.svelte'
import type { ISettings } from '$lib/interfaces/Types'

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
    const settings = createSettings()
    return settings.value
  }
}

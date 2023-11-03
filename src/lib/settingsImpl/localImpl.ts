import { dev } from '$app/environment'
import type { ISettings, ISettingsImpl } from '$lib/components/Types'

const defaultSettings: ISettings = {
  mapToMultipleConcepts: false,
  autoMap: false,
  language: 'en',
  author: {},
  savedAuthors: [],
  vocabularyIdCustomConcept: '',
  fontsize: 10,
  popupSidesShowed: { filters: true, details: true },
}

export default class LocalImpl implements ISettingsImpl {
  settings: ISettings | undefined

  async getSettings(): Promise<ISettings> {
    if (dev) console.log('getSettings: Reading the settings from localstorage')
    const localStorageSettings = await localStorage.getItem('settings')
    this.settings = localStorageSettings ? JSON.parse(localStorageSettings) : defaultSettings
    return this.settings!
  }

  async updateSettings(settings: ISettings): Promise<ISettings> {
    if (dev) console.log('updateSettings: Updating the settings to the localstorage')
    await localStorage.setItem('settings', JSON.stringify(settings))
    this.settings = settings
    return this.settings
  }
}

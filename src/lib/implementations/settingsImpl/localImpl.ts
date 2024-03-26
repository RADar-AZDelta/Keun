import { logWhenDev } from '$lib/utils'
import { PUBLIC_VOCABULARY } from '$env/static/public'
import type { ISettings, ISettingsImpl } from '$lib/Types'

const defaultSettings: ISettings = {
  mapToMultipleConcepts: false,
  autoMap: false,
  language: 'en',
  savedAuthors: [],
  vocabularyIdCustomConcept: PUBLIC_VOCABULARY,
  popupSidesShowed: { filters: true, details: true },
}

export default class LocalImpl implements ISettingsImpl {
  async getSettings(): Promise<ISettings> {
    logWhenDev('getSettings: Reading the settings from localstorage')
    const localStorageSettings = await localStorage.getItem('settings')
    return localStorageSettings ? JSON.parse(localStorageSettings) : defaultSettings
  }

  async updateSettings(settings: ISettings): Promise<void> {
    logWhenDev('updateSettings: Updating the settings to the localstorage')
    localStorage.setItem('settings', JSON.stringify(settings))
  }
}

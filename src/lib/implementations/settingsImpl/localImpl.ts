import { dev } from '$app/environment'
import type { ISettings, ISettingsImpl } from '$lib/components/Types'

const defaultSettings: ISettings = { mapToMultipleConcepts: false, autoMap: false, language: 'en', savedAuthors: [], vocabularyIdCustomConcept: '', popupSidesShowed: { filters: true, details: true } }

export default class LocalImpl implements ISettingsImpl {
  async getSettings(): Promise<ISettings> {
    if (dev) console.log('getSettings: Reading the settings from localstorage')
    const localStorageSettings = await localStorage.getItem('settings')
    return localStorageSettings ? JSON.parse(localStorageSettings) : defaultSettings
  }

  async updateSettings(settings: ISettings): Promise<void> {
    if (dev) console.log('updateSettings: Updating the settings to the localstorage')
    await localStorage.setItem('settings', JSON.stringify(settings))
  }
}
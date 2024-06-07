import { dev } from '$app/environment'
import type { ISettings } from '$lib/interfaces/Types'

const defaultSettings: ISettings = {
  mapToMultipleConcepts: false,
  autoMap: false,
  language: 'en',
  savedAuthors: [],
  vocabularyIdCustomConcept: '',
  popupSidesShowed: { filters: true, details: true },
}

export default class Settings {
  static settingsRetrievedFromStorage: boolean = false

  static async updateSettings(settings: ISettings) {
    if (dev) console.log('updateSettings: Updating the settings to LocalStorage')
    localStorage.setItem('settings', JSON.stringify(settings))
  }

  static async getSettings() {
    if (dev) console.log('getSettings: Reading the settings from LocalStorage')
    const localStorageSettings = await localStorage.getItem('settings')
    return localStorageSettings ? JSON.parse(localStorageSettings) : defaultSettings
  }
}

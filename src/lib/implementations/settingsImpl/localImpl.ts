import { localStorageGetter, localStorageSetter, logWhenDev } from '@radar-azdelta-int/radar-utils'
import type { ISettings, ISettingsImpl } from '$lib/Types'

const defaultSettings: ISettings = {
  mapToMultipleConcepts: false,
  autoMap: false,
  language: 'en',
  savedAuthors: [],
  vocabularyIdCustomConcept: '',
  popupSidesShowed: { filters: true, details: true },
}

export default class LocalImpl implements ISettingsImpl {
  async getSettings(): Promise<ISettings> {
    logWhenDev('getSettings: Reading the settings from localstorage')
    const localStorageSettings = await localStorageGetter('settings')
    return localStorageSettings ? JSON.parse(localStorageSettings) : defaultSettings
  }

  async updateSettings(settings: ISettings): Promise<void> {
    logWhenDev('updateSettings: Updating the settings to the localstorage')
    await localStorageSetter('settings', JSON.stringify(settings))
  }
}

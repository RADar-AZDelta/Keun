import filters from '$lib/constants/athenaFilters.json'
import customConceptInfo from '$lib/constants/customConceptInfo.json'
import columns from '$lib/constants/columns.json'
import tableOptions from '$lib/constants/tableOptions.json'
import smallConfig from '$lib/constants/config.json'
import defaultSettings from '$lib/constants/defaultSettings.json'
import type { ITableOptions } from '@radar-azdelta/svelte-datatable'
import type { ISettings } from '$lib/interfaces/Types'

export default class Config {
  static filters = filters
  static domains = filters.find(filter => filter.name === 'Domain')?.options ?? []
  static customConceptInfo: Record<string, string[]> = customConceptInfo
  static additionalColumns = columns.additionalColumns
  static columnsCustomConcept = columns.columnsCustomConcept
  static columnsMapped = columns.columnsMapped
  static columnsUsagi = columns.columnsUsagi
  static tableOptions: ITableOptions = tableOptions.tableOptions
  static customTableOptions: ITableOptions = tableOptions.customTableOptions
  static flaggedTableOptions: ITableOptions = tableOptions.flaggedTableOptions
  static colors: Record<string, string> = smallConfig.colors
  static languages: Record<string, string> = smallConfig.languages
  static usagiRowConfig = smallConfig.usagiRow
  static athenaViews = smallConfig.athenaViews
  static customBlobInitial = smallConfig.customBlobInitial
  static flaggedBlobInitial = smallConfig.flaggedBlobInitial
  static equivalenceOptions = smallConfig.equivalenceOptions
  static defaultSettings: ISettings = defaultSettings
  static limitedFilters = smallConfig.limitedFilters
}

import config from '$lib/config.json'
import type { ITableOptions } from '@radar-azdelta/svelte-datatable'

export class Config {
  static additionalColumns = config.additionalColumns
  static columnsCustomConcept = config.columnsCustomConcept
  static columnsMapped = config.columnsMapped
  static columnsUsagi = config.columnsUsagi
  static customBlobInitial = config.customBlobInitial
  static flaggedBlobInitial = config.flaggedBlobInitial
  static customConceptInfo = config.customConceptInfo
  static equivalenceOptions = config.equivalenceOptions
  static filters = config.filters
  static domains = config.filters.find(filter => filter.name === 'Domain')?.options ?? []
  static tableOptions = config.tableOptions
  static colors = config.colors
  static usagiRowConfig = config.usagiRow
  static athenaViews = config.athenaViews
  static customTableOptions: ITableOptions = config.customTableOptions
  static flaggedTableOptions: ITableOptions = config.flaggedTableOptions
  static languages: Record<string, string> = config.languages
}

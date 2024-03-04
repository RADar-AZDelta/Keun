import additionalColumns from '$lib/data/additionalColumns.json'
import columnsCustomConcept from '$lib/data/columnsCustomConcept.json'
import columnsMapped from '$lib/data/columnsMapped.json'
import columnsUsagi from '$lib/data/columnsUsagi.json'
import customBlobInitial from '$lib/data/customBlobInitial.json'
import customConceptInfo from '$lib/data/customConceptInfo.json'
import equivalenceOptions from '$lib/data/equivalenceOptions.json'
import filters from '$lib/data/filters.json'
import tableOptions from '$lib/data/tableOptions.json'
import config from '$lib/data/config.json'
import type { ITableOptions } from '@radar-azdelta/svelte-datatable'

// TODO: put config & data combined in less files

export class Config {
  static additionalColumns = additionalColumns
  static columnsCustomConcept = columnsCustomConcept
  static columnsMapped = columnsMapped
  static columnsUsagi = columnsUsagi
  static customBlobInitial = customBlobInitial
  static customConceptInfo = customConceptInfo
  static equivalenceOptions = equivalenceOptions
  static filters = filters
  static tableOptions = tableOptions
  static colors = config.colors
  static usagiRowConfig = config.usagiRow
  static athenaViews = config.athenaViews
  static customTableOptions: ITableOptions = config.customTableOptions
}

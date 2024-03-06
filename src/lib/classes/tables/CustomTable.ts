import { query } from 'arquero'
import { reformatDate } from '@radar-azdelta-int/radar-utils'
import StoreMethods from '$lib/classes/StoreMethods'
import { Config } from '$lib/helperClasses/Config'
import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
import type { ICustomConceptInput, IUsagiRow } from '$lib/components/Types'

export default class CustomTable {
  static modifyColumnMetadata(columns: IColumnMetaData[]) {
    const customConceptsColumnMap = Config.columnsCustomConcept.reduce((acc, cur) => {
      acc.set(cur.id, cur)
      return acc
    }, new Map<string, IColumnMetaData>())
    const columnIds = columns.map(col => col.id)
    const modifiedColumns = columns.map(col => {
      const customConceptColumn = customConceptsColumnMap.get(col.id)
      if (customConceptColumn) Object.assign(col, customConceptColumn)
      else col.visible = false
      return col
    })
    const addedColumns = Config.columnsCustomConcept.reduce<IColumnMetaData[]>((acc, cur) => {
      if (!columnIds.includes(cur.id)) acc.push(cur)
      return acc
    }, [])
    return modifiedColumns.concat(addedColumns)
  }

  static async extractCustomConcepts() {
    const customQuery = query()
      .filter((r: any) => r['ADD_INFO:customConcept'] === true)
      .toObject()
    const concepts = await StoreMethods.executeQueryOnTable(customQuery)
    if (!concepts?.indices?.length) return
    const testRow = await StoreMethods.getCustomTableRow(0)
    if (testRow?.domain_id === 'test') await StoreMethods.deleteCustomTableRows([0])
    for (let concept of concepts.queriedData) await this.addCustomConceptToTable(concept)
  }

  private static async addCustomConceptToTable(concept: IUsagiRow) {
    const { conceptId, sourceName, conceptName, className, domainId, vocabularyId } = concept
    const custom: ICustomConceptInput = {
      concept_id: conceptId ?? 0,
      concept_code: sourceName,
      concept_name: conceptName ?? '',
      concept_class_id: className ?? '',
      domain_id: domainId ?? '',
      vocabulary_id: vocabularyId ?? '',
      standard_concept: '',
      valid_start_date: reformatDate(),
      valid_end_date: '2099-12-31',
      invalid_reason: '',
    }
    await StoreMethods.insertCustomTableRow(custom)
  }
}

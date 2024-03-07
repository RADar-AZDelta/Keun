import { query } from 'arquero'
import { reformatDate } from '@radar-azdelta-int/radar-utils'
import StoreMethods from '$lib/classes/StoreMethods'
import { Config } from '$lib/helperClasses/Config'
import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
import type { ICustomConceptInput, IUsagiRow } from '$lib/components/Types'

export default class CustomTable {
  private static firstRowIsEmpty: boolean = true
  private static customTableWasFilled: boolean = false

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
    await this.deleteFirstEmptyConceptIfNeeded()
    if (this.customTableWasFilled) return
    const columnsAreAdded = await this.checkIfColumnsAreAdded()
    if (!columnsAreAdded) return
    const customQuery = query()
      .filter((r: any) => r['ADD_INFO:customConcept'] === true)
      .toObject()
    const concepts = await StoreMethods.executeQueryOnTable(customQuery)
    if (!concepts?.indices?.length) return
    const testRow = await StoreMethods.getCustomTableRow(0)
    if (testRow?.domain_id === 'test') await StoreMethods.deleteCustomTableRows([0])
    for (let concept of concepts.queriedData) await this.addCustomConceptToTable(concept)
  }

  private static async checkIfColumnsAreAdded() {
    const conceptQuery = query().slice(0, 1).toObject()
    const concept = await StoreMethods.executeQueryOnTable(conceptQuery)
    return Object.hasOwn(concept.queriedData[0], 'ADD_INFO:customConcept')
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

  static async deleteFirstEmptyConceptIfNeeded() {
    if (!this.firstRowIsEmpty) return (this.customTableWasFilled = true)
    const emptyConceptQuery = query().slice(0, 1).toObject()
    const firstConceptRes = await StoreMethods.executeQueryOnCustomTable(emptyConceptQuery)
    const firstConcept = firstConceptRes.queriedData[0]
    if (firstConcept.concept_name) {
      this.firstRowIsEmpty = false
      this.customTableWasFilled = true
      return
    }
    await StoreMethods.deleteCustomTableRows([0])
    this.firstRowIsEmpty = false
    this.customTableWasFilled = false
  }
}

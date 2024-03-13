import { query } from 'arquero'
import { Config } from '$lib/helperClasses/Config'
import { reformatDate } from '$lib/utils'
import Table from './Table'
import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
import type { ICustomConceptInput, ICustomQueryResult, IUsagiRow } from '$lib/Types'
import type DataTable from '@radar-azdelta/svelte-datatable'
import DatabaseImpl from '../implementation/DatabaseImpl'

export default class CustomTable {
  static table: DataTable
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
    if (this.customTableWasFilled) return
    const columnsAreAdded = await this.checkIfColumnsAreAdded()
    if (!columnsAreAdded) return
    const customQuery = query()
      .filter((r: any) => r['ADD_INFO:customConcept'] === true)
      .toObject()
    const concepts = await Table.executeQueryOnTable(customQuery)
    if (!concepts?.indices?.length) return
    const testRow = await this.getCustomTableRow(0)
    if (!testRow?.domain_id) await this.deleteCustomTableRows([0])
    for (let concept of concepts.queriedData) await this.addCustomConceptToTable(concept)
    await this.deleteFirstEmptyConceptIfNeeded()
  }

  private static async checkIfColumnsAreAdded() {
    const conceptQuery = query().slice(0, 1).toObject()
    const concept = await Table.executeQueryOnTable(conceptQuery)
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
    await this.insertCustomTableRow(custom)
  }

  static async deleteFirstEmptyConceptIfNeeded() {
    if (!this.firstRowIsEmpty) return (this.customTableWasFilled = true)
    const emptyConceptQuery = query().slice(0, 1).toObject()
    const firstConceptRes = await this.executeQueryOnCustomTable(emptyConceptQuery)
    const firstConcept = firstConceptRes.queriedData[0]
    if (firstConcept.concept_name) {
      this.firstRowIsEmpty = false
      this.customTableWasFilled = true
      return
    }
    await this.deleteCustomTableRows([0])
    this.firstRowIsEmpty = false
    this.customTableWasFilled = false
  }

  static async syncFile(id: string) {
    const blob = await this.getBlob()
    if (!blob) return
    await DatabaseImpl.editCustomKeunFile(id, blob)
  }

  static async getCustomTableRow(index: number) {
    await this.throwIfTableNotInitialized()
    return <ICustomConceptInput>await this.table.getFullRow(index)
  }

  static async deleteCustomTableRows(indices: number[]) {
    await this.throwIfTableNotInitialized()
    await this.table.deleteRows(indices)
  }

  static async executeQueryOnCustomTable(query: object): Promise<ICustomQueryResult> {
    await this.throwIfTableNotInitialized()
    return await this.table.executeQueryAndReturnResults(query)
  }

  static async insertCustomTableRow(row: ICustomConceptInput) {
    await this.throwIfTableNotInitialized()
    await this.table.insertRows([row])
  }

  static async getBlob() {
    await this.throwIfTableNotInitialized().catch(() => console.error('THIS GIVES ERRORS'))
    return await this.table.getBlob()
  }

  private static async throwIfTableNotInitialized() {
    if (!this.table) throw new Error('Custom table is not initialized')
  }
}

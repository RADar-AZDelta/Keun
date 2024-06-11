import { query } from 'arquero'
import { reformatDate } from '$lib/helpers/utils'
import Config from '$lib/helpers/Config'
import Database from '$lib/helpers/Database'
import Table from '$lib/helpers/tables/Table'
import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
import type { ICustomConceptCompact, ICustomConceptInput, ICustomQueryResult, IUsagiRow } from '$lib/interfaces/Types'
import type DataTable from '@radar-azdelta/svelte-datatable'
import type Query from 'arquero/dist/types/query/query'

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
    // console.log("EXTRACT :)")
    if (this.customTableWasFilled) return
    const columnsAreAdded = await this.checkIfColumnsAreAdded()
    if (!columnsAreAdded) return
    const customQuery = query()
      .filter((r: any) => r['ADD_INFO:customConcept'] === true)
      .toObject()
    const concepts = await Table.executeQueryOnTable(customQuery)
    if (!concepts?.indices?.length) return
    await this.deleteFullTable()
    for (const concept of concepts.queriedData) await this.addCustomConceptToTable(concept)
    const testRow = await this.getCustomTableRow(0)
    if (!testRow?.domain_id) await this.deleteCustomTableRows([0])
    await this.deleteFirstEmptyConceptIfNeeded()
    this.customTableWasFilled = true
  }

  private static async checkIfColumnsAreAdded() {
    const conceptQuery = query().slice(0, 1).toObject()
    const concept = await Table.executeQueryOnTable(conceptQuery)
    return Object.hasOwn(concept.queriedData[0], 'ADD_INFO:customConcept')
  }

  private static async addCustomConceptToTable(concept: IUsagiRow) {
    const { conceptId, sourceCode, conceptName, className, domainId, vocabularyId } = concept
    const custom: ICustomConceptInput = {
      concept_id: conceptId ?? 0,
      concept_code: sourceCode,
      concept_name: conceptName ?? '',
      concept_class_id: className ?? 'Observable Entity',
      domain_id: domainId ?? 'Observation',
      vocabulary_id: vocabularyId ?? 'AZDELTA',
      standard_concept: '',
      valid_start_date: reformatDate(),
      valid_end_date: '2099-12-31',
      invalid_reason: '',
    }
    const { concept_name, concept_class_id, vocabulary_id, domain_id } = custom
    await Database.addCustomConcept({ concept_name, concept_class_id, vocabulary_id, domain_id })
    await this.insertCustomTableRow(custom)
  }

  static async deleteFirstEmptyConceptIfNeeded() {
    if (!this.firstRowIsEmpty) return
    const emptyConceptQuery = query().slice(0, 1).toObject()
    const firstConceptRes = await this.executeQueryOnCustomTable(emptyConceptQuery)
    const firstConcept = firstConceptRes.queriedData[0]
    if (firstConcept.concept_name) {
      this.firstRowIsEmpty = false
      return
    }
    await this.deleteCustomTableRows([0])
    this.firstRowIsEmpty = false
  }

  private static async deleteFullTable() {
    const numberOfRowsQuery = query().toObject()
    const numberOfRows = await this.executeQueryOnCustomTable(numberOfRowsQuery)
    await this.deleteCustomTableRows(numberOfRows.indices)
  }

  static async syncFile(id: string) {
    const blob = await this.getBlob()
    if (!blob) return
    await Database.editCustomKeunFile(id, blob)
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

  static async updateCustomTableRow(oldRow: ICustomConceptCompact, newRow: ICustomConceptCompact) {
    await this.throwIfTableNotInitialized()
    const index = await this.getRowIndex(oldRow)
    if (index < 0 || index === undefined || index === null) return
    await this.table.updateRows(new Map([[index, newRow]]))
  }

  private static async getRowIndex(row: ICustomConceptCompact) {
    const { concept_name, domain_id, vocabulary_id, concept_class_id } = row
    const params = { concept_name, domain_id, vocabulary_id, concept_class_id }
    const indexQuery = (<Query>query().params(params))
      .filter(
        (r: any, p: any) =>
          r.concept_name === p.concept_name && r.domain_id === p.domain_id && r.vocabulary_id === p.vocabulary_id && r.concept_class_id === p.concept_class_id,
      )
      .toObject()
    const indexResult = await this.executeQueryOnCustomTable(indexQuery)
    return indexResult.indices[0]
  }

  static async getBlob() {
    await this.throwIfTableNotInitialized()
    return await this.table.getBlob()
  }

  private static async throwIfTableNotInitialized() {
    if (!this.table) throw new Error('Custom table is not initialized')
  }
}

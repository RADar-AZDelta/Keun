import { query } from 'arquero'
import { Config } from '$lib/helperClasses/Config'
import { table } from '$lib/store'
import MappedConcepts from '../general/MappedConcepts'
import type Query from 'arquero/dist/types/query/query'
import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
import type { IMappedRow, IMappedRows, IQueryResult, IUsagiRow } from '$lib/Types'
import type DataTable from '@radar-azdelta/svelte-datatable'

export default class Table {
  private static columnsAdded: boolean = false

  static modifyColumnMetadata(columns: IColumnMetaData[]): IColumnMetaData[] {
    const usagiColumnsMap = Config.columnsUsagi.reduce((acc, cur) => {
      acc.set(cur.id, cur)
      return acc
    }, new Map<string, IColumnMetaData>())
    const columnIds = columns.map(col => col.id)
    const modifiedColumns = columns.map(col => {
      const usagiColumn = usagiColumnsMap.get(col.id)
      if (usagiColumn) Object.assign(col, usagiColumn)
      else col.visible = false
      return col
    })
    const addedColumns = Config.columnsUsagi.reduce<IColumnMetaData[]>((acc, cur) => {
      if (!columnIds.includes(cur.id)) acc.push(cur)
      return acc
    }, [])
    return modifiedColumns.concat(addedColumns)
  }

  static async getAllMappedConcepts(sourceCode: string) {
    const mappedConcepts = await this.getAllMappedConceptsToRow(sourceCode)
    const mappedRows: (object | IMappedRow)[] = []
    for (let mappedConcept of mappedConcepts.queriedData) {
      if (mappedConcept.conceptId === undefined || mappedConcept.conceptId === null) continue
      const row = await this.transformConceptToRowFormat(mappedConcept)
      if (!mappedRows.includes(row)) mappedRows.push(row)
    }
    return mappedRows
  }

  static async saveAllMappedConcepts(sourceCode: string) {
    const concepts = await this.getAllMappedConceptsToRow(sourceCode)
    for (let concept of concepts.queriedData) await this.addConceptToMappedConceptsIfExists(concept)
  }

  private static async addConceptToMappedConceptsIfExists(concept: IUsagiRow) {
    const customConcept = concept['ADD_INFO:customConcept']
    if ((!concept.conceptId && !customConcept) || (!concept.conceptName && customConcept)) return
    const updatedConcepts: IMappedRows = {
      [concept.sourceCode]: {
        [customConcept ? `custom-${concept.conceptName ?? ''}` : concept.conceptId ?? '']: concept.mappingStatus ?? '',
      },
    }
    await MappedConcepts.updateMappedConceptsBib(updatedConcepts)
  }

  private static async getAllMappedConceptsToRow(sourceCode: string) {
    const params = { sourceCode, columnsAdded: this.columnsAdded }
    if (!this.columnsAdded) this.columnsAdded = await this.checkIfTableConceptsAreWithNewColumns()
    const conceptsQuery = (<Query>query().params(params))
      .filter((r: any, p: any) => (r.sourceCode === p.sourceCode && p.columnsAdded ? r.conceptName : true))
      .toObject()
    const queryResult = await this.executeQueryOnTable(conceptsQuery)
    return queryResult
  }

  private static async checkIfTableConceptsAreWithNewColumns() {
    const conceptQuery = query().slice(0, 1).toObject()
    const queryResult = await this.executeQueryOnTable(conceptQuery)
    return Object.hasOwn(queryResult.queriedData[0], 'conceptName')
  }

  private static async transformConceptToRowFormat(concept: IUsagiRow) {
    const { sourceCode, sourceName, conceptId, conceptName } = concept
    const customConcept = (concept.conceptId ?? 0) === 0
    const row: IMappedRow = {
      sourceCode,
      sourceName,
      conceptId: conceptId ?? 0,
      conceptName: conceptName ?? '',
      customConcept,
    }
    return row
  }

  static async extractFlaggedConcepts() {
    const columnsWereAdded = await this.checkIfTableConceptsAreWithNewColumns()
    if (!columnsWereAdded) return []
    const flaggedConceptsQuery = query()
      .filter((r: any) => r.mappingStatus === 'FLAGGED')
      .toObject()
    const flaggedConceptsResult = await this.executeQueryOnTable(flaggedConceptsQuery)
    return flaggedConceptsResult.queriedData
  }

  static async getTableRow(index: number) {
    const table = await this.getTable()
    return <IUsagiRow>await table.getFullRow(index)
  }

  static async deleteTableRow(index: number) {
    const table = await this.getTable()
    await table.deleteRows([index])
  }

  static async updateTableRow(index: number, updatedProperties: object) {
    const table = await this.getTable()
    await table.updateRows(new Map([[index, updatedProperties]]))
  }

  static async updateTableRows(rows: Map<number, object>) {
    const table = await this.getTable()
    await table.updateRows(rows)
  }

  static async insertTableRow(row: IUsagiRow) {
    const table = await this.getTable()
    await table.insertRows([row])
  }

  static async executeQueryOnTable(query: object): Promise<IQueryResult> {
    const table = await this.getTable()
    return await table.executeQueryAndReturnResults(query)
  }

  static async getTablePagination() {
    const table = await this.getTable()
    return table.getTablePagination()
  }

  static async disableTable() {
    const table = await this.getTable()
    table.setDisabled(true)
  }

  static async enableTable() {
    const table = await this.getTable()
    table.setDisabled(false)
  }

  static async getBlob() {
    const table = await this.getTable()
    return await table.getBlob()
  }

  private static async getTable(): Promise<DataTable> {
    return new Promise(resolve =>
      table.subscribe(table => {
        if (table) resolve(table)
      }),
    )
  }
}

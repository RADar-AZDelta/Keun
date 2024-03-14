import { query } from 'arquero'
import { Config } from '$lib/helperClasses/Config'
import MappedConcepts from '../general/MappedConcepts'
import type Query from 'arquero/dist/types/query/query'
import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
import type { IMappedRow, IMappedRows, IQueryResult, IUsagiRow } from '$lib/Types'
import type DataTable from '@radar-azdelta/svelte-datatable'
import DatabaseImpl from '../implementation/DatabaseImpl'

export default class Table {
  static table: DataTable
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

  static async prepareFile() {
    const unmappedRowsQuery = query()
      .filter((r: any) => !r.mappingStatus && !r.conceptId)
      .toObject()
    const unmappedRows = await this.executeQueryOnTable(unmappedRowsQuery)
    const { indices, queriedData } = unmappedRows
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i]
      const row = queriedData[i]
      row.conceptId = 0
      row.mappingStatus = 'UNCHECKED'
      await this.updateTableRow(index, row)
    }
  }

  static async syncFile(id: string) {
    const blob = await this.getBlob()
    if (!blob) return
    await DatabaseImpl.editKeunFile(id, blob)
  }

  static async getTableRow(index: number) {
    await this.throwIfTableNotInitialized()
    return <IUsagiRow>await this.table.getFullRow(index)
  }

  static async deleteTableRow(index: number) {
    await this.throwIfTableNotInitialized()
    await this.table.deleteRows([index])
  }

  static async updateTableRow(index: number, updatedProperties: object) {
    await this.throwIfTableNotInitialized()
    await this.table.updateRows(new Map([[index, updatedProperties]]))
  }

  static async updateTableRows(rows: Map<number, object>) {
    await this.throwIfTableNotInitialized()
    await this.table.updateRows(rows)
  }

  static async insertTableRow(row: IUsagiRow) {
    await this.throwIfTableNotInitialized()
    await this.table.insertRows([row])
  }

  static async executeQueryOnTable(query: object): Promise<IQueryResult> {
    await this.throwIfTableNotInitialized()
    return await this.table.executeQueryAndReturnResults(query)
  }

  static async getTablePagination() {
    await this.throwIfTableNotInitialized()
    return this.table.getTablePagination()
  }

  static async changePagination(currentPage: number) {
    await this.throwIfTableNotInitialized()
    return this.table.changePagination({ currentPage })
  }

  static async disableTable() {
    await this.throwIfTableNotInitialized()
    this.table.setDisabled(true)
  }

  static async enableTable() {
    await this.throwIfTableNotInitialized()
    this.table.setDisabled(false)
  }

  static async getBlob() {
    await this.throwIfTableNotInitialized()
    return await this.table.getBlob()
  }

  static async getNextRow(currentIndex: number) {
    await this.throwIfTableNotInitialized()
    return this.table.getNextRow(currentIndex)
  }

  static async getPreviousRow(currentIndex: number) {
    await this.throwIfTableNotInitialized()
    return this.table.getPreviousRow(currentIndex)
  }

  private static async throwIfTableNotInitialized() {
    if (!this.table) throw new Error('Table is not initialized')
  }
}

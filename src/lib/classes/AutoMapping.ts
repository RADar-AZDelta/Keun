import { query } from 'arquero'
import { PUBLIC_MAPPINGDATA_PATH } from '$env/static/public'
import { abortAutoMapping, disableActions } from '$lib/store'
import Mapping from './Mapping'
import StoreMethods from './StoreMethods'
import { BergamotTranslator } from '$lib/helperClasses/BergamotTranslator'
import type { IAthenaRow, IQueryResult, IUsagiRow } from '$lib/components/Types'

export default class AutoMapping {
  private static autoMappingAbortController: AbortController
  private static autoMappingPromise: Promise<void> | undefined
  private static signal: AbortSignal
  private static mappingUrl = PUBLIC_MAPPINGDATA_PATH
  static previousPage: number

  static async autoMapPage() {
    const autoMap = await StoreMethods.getAutoMap()
    if (!autoMap) return
    if (this.autoMappingPromise) this.autoMappingAbortController.abort()
    this.autoMappingAbortController = new AbortController()
    this.signal = this.autoMappingAbortController.signal
    this.disableTable()
    this.autoMappingPromise = this.autoMapPageRows().then(this.enableTable)
  }

  static async startAutoMappingRow(index: number) {
    if (this.autoMappingPromise) this.autoMappingAbortController.abort()
    this.autoMappingAbortController = new AbortController()
    this.signal = this.autoMappingAbortController.signal
    this.autoMappingPromise = this.autoMapSingleRow(index)
  }

  private static async autoMapPageRows() {
    const pagination = await StoreMethods.getTablePagination()
    const { currentPage, rowsPerPage } = pagination
    if (!currentPage || !rowsPerPage) return
    this.previousPage = currentPage
    const concepts = await this.getTableConcepts(rowsPerPage, currentPage)
    if (concepts.indices.length) await StoreMethods.disableTable()
    for (let i = 0; i < concepts.queriedData.length; i++) await this.getConceptInfoForAutoMapping(concepts, i)
  }

  private static async getConceptInfoForAutoMapping(concepts: IQueryResult, index: number) {
    if (this.signal.aborted) return Promise.resolve()
    const row = concepts.queriedData[index]
    const rowIndex = concepts.indices[index]
    if (row.conceptId || row.sourceAutoAssignedConceptIds || row.conceptName) return
    await this.autoMapRow(row, rowIndex)
  }

  private static async getTableConcepts(rowsPerPage: number, currentPage: number) {
    const startIndex = rowsPerPage * (currentPage - 1)
    const endingIndex = rowsPerPage * currentPage
    const conceptsQuery = query().slice(startIndex, endingIndex).toObject()
    const concepts = await StoreMethods.executeQueryOnTable(conceptsQuery)
    return concepts
  }

  private static async autoMapSingleRow(index: number) {
    const row = await StoreMethods.getTableRow(index)
    await this.autoMapRow(row, index)
  }

  private static async autoMapRow(row: IUsagiRow, index: number): Promise<void> {
    if (this.signal.aborted || !row.sourceName) return
    const filter = await this.getTranslatedSourceName(row.sourceName)
    if (this.signal.aborted || !filter) return
    const concepts = await this.fetchFirstConcept(filter)
    if (!concepts) return
    await Mapping.updateAthenaRow(concepts[0])
    const { mappedIndex, mappedRow } = await Mapping.rowMapping(index)
    mappedRow['ADD_INFO:lastAthenaFilter'] = filter ?? null
    if (this.signal.aborted) return
    await StoreMethods.updateTableRow(mappedIndex, mappedRow)
  }

  private static async getTranslatedSourceName(sourceName: string) {
    const language = await StoreMethods.getLanguage()
    const translated = await BergamotTranslator.translate(sourceName, language)
    return translated
  }

  private static async fetchFirstConcept(filter: string): Promise<IAthenaRow[] | undefined> {
    const url = encodeURI(this.mappingUrl + `&page=1&pageSize=1&standardConcept=Standard&query=${filter}`)
    const conceptsResult = await fetch(url)
    const conceptsData = await conceptsResult.json()
    if (!conceptsData.content?.length) return
    return conceptsData.content
  }

  static async abortAutoMap() {
    if (this.autoMappingPromise) this.autoMappingAbortController.abort()
    abortAutoMapping.set(false)
    this.enableTable()
    const pag = await StoreMethods.getTablePagination()
    if (this.previousPage !== pag.currentPage) return new Map<number, IUsagiRow>()
  }

  private static enableTable() {
    disableActions.set(false)
    StoreMethods.enableTable()
  }

  private static disableTable() {
    disableActions.set(true)
    StoreMethods.disableTable()
  }
}
import { query } from 'arquero'
import { PUBLIC_MAPPINGDATA_PATH } from '$env/static/public'
import { createAbortAutoMapping, createDisableActions } from '$lib/stores/runes.svelte'
import Table from '$lib/helpers/tables/Table'
import Settings from '$lib/helpers/general/Settings'
import BergamotTranslator from '$lib/helpers/BergamotTranslator'
import Mapping from '$lib/helpers/mapping/Mapping'
import type { IAthenaInfo, IAthenaRow, IQueryResult, IUsagiRow } from '$lib/interfaces/Types'

export default class AutoMapping {
  private static autoMappingAbortController: AbortController
  private static autoMappingPromise: Promise<void> | undefined
  private static signal: AbortSignal
  private static mappingUrl = PUBLIC_MAPPINGDATA_PATH
  private static domain: string | null = null
  static previousPage: number

  static async autoMapPage(domain: string | null) {
    const autoMap = await Settings.getAutoMap()
    if (!autoMap) return
    this.domain = domain
    if (this.autoMappingPromise) this.autoMappingAbortController.abort()
    this.autoMappingAbortController = new AbortController()
    this.signal = this.autoMappingAbortController.signal
    this.disableTable()
    this.autoMappingPromise = this.autoMapPageRows().then(this.enableTable)
  }

  static async startAutoMappingRow(index: number, domain: string | null) {
    this.domain = domain
    if (this.autoMappingPromise) this.autoMappingAbortController.abort()
    this.autoMappingAbortController = new AbortController()
    this.signal = this.autoMappingAbortController.signal
    this.autoMappingPromise = this.autoMapSingleRow(index)
  }

  private static async autoMapPageRows() {
    const pagination = await Table.getTablePagination()
    const { currentPage, rowsPerPage } = pagination
    if (!currentPage || !rowsPerPage) return
    this.previousPage = currentPage
    const concepts = await this.getTableConcepts(rowsPerPage, currentPage)
    if (concepts.indices.length) await Table.disableTable()
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
    const concepts = await Table.executeQueryOnTable(conceptsQuery)
    return concepts
  }

  private static async autoMapSingleRow(index: number) {
    const row = await Table.getTableRow(index)
    await this.autoMapRow(row, index)
  }

  private static async autoMapRow(row: IUsagiRow, index: number): Promise<void> {
    if (this.signal.aborted || !row.sourceName) return
    const filter = await this.getTranslatedSourceName(row.sourceName)
    if (this.signal.aborted || !filter) return
    const concepts = await this.fetchFirstConcept(filter)
    if (!concepts) return
    const athenaInfo: IAthenaInfo = { athenaRow: concepts[0], usagiRow: row, usagiRowIndex: index }
    await Mapping.mapRow(athenaInfo, 'EQUAL', 'UNCHECKED')
  }

  private static async getTranslatedSourceName(sourceName: string) {
    const language = await Settings.getLanguage()
    const translated = await BergamotTranslator.translate(sourceName, language)
    return translated
  }

  private static async fetchFirstConcept(filter: string): Promise<IAthenaRow[] | undefined> {
    let urlString = this.mappingUrl + `&page=1&pageSize=1&standardConcept=Standard&query=${filter}`
    if (this.domain) urlString += `&domain=${this.domain}`
    const url = encodeURI(urlString)
    const conceptsResult = await fetch(url)
    const conceptsData = await conceptsResult.json()
    if (!conceptsData.content?.length) return
    return conceptsData.content
  }

  static async abortAutoMap() {
    if (this.autoMappingPromise) this.autoMappingAbortController.abort()
    const abortAutoMapping = createAbortAutoMapping()
    abortAutoMapping.update(false)
    const autoMappingTriggered = await this.checkIfTheAutomappingIsTriggered()
    if (!autoMappingTriggered) return
    this.enableTable()
    const pag = await Table.getTablePagination()
    if (this.previousPage !== pag.currentPage) return new Map<number, IUsagiRow>()
  }

  private static async checkIfTheAutomappingIsTriggered() {
    const disableActions = createDisableActions()
    return disableActions.value
  }

  private static async enableTable() {
    const disableActions = createDisableActions()
    disableActions.update(false)
    Table.enableTable()
  }

  private static async disableTable() {
    const disableActions = createDisableActions()
    if (disableActions.value) return
    disableActions.update(true)
    Table.disableTable()
  }
}

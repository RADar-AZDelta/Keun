import type {
  IAthenaRow,
  ICustomConceptInput,
  IMappedRow,
  IMappedRows,
  IMappingExtra,
  IQueryResult,
  IRowMappingInformation,
  IUsagiRow,
} from '$lib/components/Types'
import type Query from 'arquero/dist/types/query/query'
import { query } from 'arquero'
import StoreMethods from './StoreMethods'
import { reformatDate } from '@radar-azdelta-int/radar-utils'

export default class Mapping {
  private static athenaRow?: IAthenaRow
  private static usagiRow?: IUsagiRow
  private static usagiRowIndex?: number
  private static action?: string
  private static equivalence?: string

  static async updateMappingInfo(index: number, mappingInfo: IMappingExtra) {
    await StoreMethods.updateTableRow(index, mappingInfo)
  }

  static async updateAthenaRow(row: IAthenaRow) {
    this.athenaRow = row
  }

  static async saveAllMappedConcepts(sourceCode: string) {
    const concepts = await this.getAllMappedConceptsToRow(sourceCode)
    for (let concept of concepts.queriedData) await this.addConceptToMappedConceptsIfExists(concept)
  }

  private static async getAllMappedConceptsToRow(sourceCode: string) {
    const params = { sourceCode }
    const conceptsQuery = (<Query>query().params(params))
      .filter((r: any, p: any) => r.sourceCode === p.sourceCode && r.conceptName)
      .toObject()
    const queryResult = await StoreMethods.executeQueryOnTable(conceptsQuery)
    return queryResult
  }

  private static async addConceptToMappedConceptsIfExists(concept: IUsagiRow) {
    if (!concept.conceptId) return
    const updatedConcepts: IMappedRows = {
      [concept.sourceCode]: {
        [concept.conceptId]: concept.mappingStatus ?? '',
      },
    }
    await StoreMethods.updateMappedConceptsBib(updatedConcepts)
  }

  static async getAllMappedConcepts(sourceCode: string) {
    const mappedConcepts = await this.getAllMappedConceptsToRow(sourceCode)
    const mappedRows: (object | IMappedRow)[] = []
    for (let mappedConcept of mappedConcepts.queriedData) {
      if (!mappedConcept.conceptId) continue
      const row = await this.transformConceptToRowFormat(mappedConcept)
      if (!mappedRows.includes(row)) mappedRows.push(row)
    }
    return mappedRows
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
      concept_class_id: className,
      domain_id: domainId ?? '',
      vocabulary_id: vocabularyId ?? '',
      standard_concept: '',
      valid_start_date: reformatDate(),
      valid_end_date: '2099-12-31',
      invalid_reason: '',
    }
    await StoreMethods.insertCustomTableRow(custom)
  }

  static async mapRow(rowMappingInfo: IRowMappingInformation, equivalence: string, action: string) {
    await this.setVariables(rowMappingInfo, equivalence, action)
    const settings = await StoreMethods.getSettings()
    const { mapToMultipleConcepts } = settings
    if (mapToMultipleConcepts) await this.multipleMapping()
    else await this.singleMapping()
  }

  private static async setVariables(rowMappingInfo: IRowMappingInformation, equivalence: string, action: string) {
    const { athenaRow, usagiRow, usagiRowIndex } = rowMappingInfo
    this.athenaRow = athenaRow
    this.usagiRow = usagiRow
    this.usagiRowIndex = usagiRowIndex
    this.action = action
    this.equivalence = equivalence
  }

  private static async multipleMapping() {
    const alreadyMapped = await this.checkIfRowIsNotAlreadyMapped()
    if (!alreadyMapped) return
    const alreadyMappedRows = await this.getAlreadyMappedRows()
    const isTheFirstConceptUnmapped = await this.checkIfRowIsMapped(alreadyMappedRows.queriedData[0])
    if (!isTheFirstConceptUnmapped) return await this.singleMapping()
    const mappedRowIndex = await this.getRowIndexFromQueryData(alreadyMappedRows)
    await this.mapConceptOfMultiple(alreadyMappedRows, mappedRowIndex)
    await this.updateNumberOfConcepts(alreadyMappedRows, mappedRowIndex)
  }

  private static async checkIfRowIsMapped(row: IUsagiRow) {
    const customMapped = row['ADD_INFO:customConcept']
    if (customMapped && row.conceptName) return true
    else if (row.conceptId) return true
    else return false
  }

  private static async mapConceptOfMultiple(mapped: IQueryResult, index: number) {
    if (!this.usagiRow?.sourceCode || !this.athenaRow?.id) return
    const updatedConcepts: IMappedRows = {
      [this.usagiRow.sourceCode]: {
        [this.athenaRow.id]: this.action ?? '',
      },
    }
    await StoreMethods.updateMappedConceptsBib(updatedConcepts)
    const { mappedRow } = await this.rowMapping(index)
    if (index >= 0) {
      mappedRow['ADD_INFO:numberOfConcepts'] = mapped.indices.length
      await StoreMethods.updateTableRow(index, mappedRow)
    } else {
      mappedRow['ADD_INFO:numberOfConcepts'] = mapped.indices.length + 1
      await StoreMethods.insertTableRow(mappedRow)
    }
  }

  private static async updateNumberOfConcepts(mapped: IQueryResult, index: number) {
    const numberOfConcepts = mapped.indices.length + 1
    const rowsToUpdate = new Map()
    for (let rowIndex of mapped.indices) rowsToUpdate.set(rowIndex, { 'ADD_INFO:numberOfConcepts': numberOfConcepts })
    await StoreMethods.updateTableRows(rowsToUpdate)
  }

  private static async getRowIndexFromQueryData(data: IQueryResult) {
    const rowIndex = data.queriedData.findIndex(r => r.conceptId === this.athenaRow!.id)
    return data.indices[rowIndex]
  }

  private static async checkIfRowIsNotAlreadyMapped() {
    const mappedToConceptIds = await StoreMethods.getMappedConceptsBib()
    if (!this.usagiRow?.sourceCode || !this.athenaRow?.id) return false
    const mappedConcept = mappedToConceptIds[this.usagiRow.sourceCode]?.[this.athenaRow.id]
    return !mappedConcept || mappedConcept !== this.action
  }

  private static async getAlreadyMappedRows() {
    const params = { sourceCode: this.usagiRow!.sourceCode }
    const rowsQuery = (<Query>query().params(params))
      .filter((r: any, p: any) => r.sourceCode === p.sourceCode)
      .toObject()
    const alreadyMappedRows = await StoreMethods.executeQueryOnTable(rowsQuery)
    return alreadyMappedRows
  }

  private static async singleMapping() {
    if (!this.usagiRow?.sourceCode || !this.athenaRow?.id) return
    const updatedConcepts: IMappedRows = {
      [this.usagiRow.sourceCode]: {
        [this.athenaRow.id]: this.action ?? '',
      },
    }
    await StoreMethods.updateMappedConceptsBib(updatedConcepts)
    const { mappedIndex, mappedRow } = await this.rowMapping()
    if (!mappedRow) return
    await StoreMethods.updateTableRow(mappedIndex, mappedRow)
  }

  private static async assembleExtraInfoSingleMapping() {
    const user = await StoreMethods.getUser()
    const updatedProperties = {
      mappingStatus: this.action,
      statusSetBy: user.name,
      statusSetOn: Date.now(),
      createdBy: user.name,
      createdOn: Date.now(),
      'ADD_INFO:lastAthenaFilter': null,
      'ADD_INFO:numberOfConcepts': 1,
      equivalence: this.equivalence,
      vocabularyId: this.athenaRow!.vocabulary,
      matchScore: 0,
      mappingType: null,
      'ADD_INFO:approvedBy': null,
      'ADD_INFO:approvedOn': null,
      'ADD_INFO:customConcept': null,
    }
    return updatedProperties
  }

  private static async assembleAthenaInfo() {
    const { id, name, domain, vocabulary } = this.athenaRow!
    const mappedProperties = { conceptId: id, conceptName: name, domainId: domain, vocabularyId: vocabulary }
    return mappedProperties
  }

  static async rowMapping(index?: number) {
    let rowIndex: number = index !== undefined ? index : this.usagiRowIndex!
    const mappedUsagiRow = await StoreMethods.getTableRow(rowIndex)
    const mappedProperties = await this.assembleAthenaInfo()
    const extraProps = await this.assembleExtraInfoSingleMapping()
    Object.assign(mappedUsagiRow, mappedProperties, extraProps)
    return { mappedIndex: rowIndex, mappedRow: mappedUsagiRow }
  }
}

import type {
  IAthenaRow,
  IMappingInformation,
  IQueryResult,
  IRowMappingInformation,
  IUsagiRow,
} from '$lib/components/Types'
import type Query from 'arquero/dist/types/query/query'
import { query } from 'arquero'
import StoreMethods from './StoreMethods'

export default class Mapping {
  private static athenaRow?: IAthenaRow
  private static usagiRow?: IUsagiRow
  private static usagiRowIndex?: number
  private static action?: string
  private static mappingInfo?: IMappingInformation

  static async mapRow(rowMappingInfo: IRowMappingInformation, mappingInfo: IMappingInformation, action: string) {
    await this.setVariables(rowMappingInfo, mappingInfo, action)
    const settings = await StoreMethods.getSettings()
    const { mapToMultipleConcepts } = settings
    if (mapToMultipleConcepts) await this.multipleMapping()
    else await this.singleMapping()
  }

  private static async setVariables(
    rowMappingInfo: IRowMappingInformation,
    mappingInfo: IMappingInformation,
    action: string,
  ) {
    const { athenaRow, usagiRow, usagiRowIndex } = rowMappingInfo
    this.athenaRow = athenaRow
    this.usagiRow = usagiRow
    this.usagiRowIndex = usagiRowIndex
    this.action = action
    this.mappingInfo = mappingInfo
  }

  private static async multipleMapping() {
    const alreadyMapped = await this.checkIfRowIsNotAlreadyMapped()
    if (!alreadyMapped) return
    const alreadyMappedRows = await this.getAlreadyMappedRows()
    if (alreadyMappedRows.indices.length === 1) return await this.singleMapping()
    // Is this correct? If there are multiple concepts mapped to a Athena concept, this won't work
    const mappedRowIndex = await this.getRowIndexFromQueryData(alreadyMappedRows)
    await this.mapConceptOfMultiple(alreadyMappedRows, mappedRowIndex)
    await this.updateNumberOfConcepts(alreadyMappedRows, mappedRowIndex)
  }

  private static async mapConceptOfMultiple(mapped: IQueryResult, index: number) {
    await StoreMethods.updateMappedConceptsBib({ [this.athenaRow!.id]: this.action })
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
    const numberOfConcepts = index >= 0 ? mapped.indices.length + 1 : mapped.indices.length
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
    const mappedConcept = mappedToConceptIds[this.athenaRow!.id]
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
    await StoreMethods.updateMappedConceptsBib({ [this.athenaRow!.id]: this.action })
    const { mappedIndex, mappedRow } = await this.rowMapping()
    if (!mappedRow) return
    await StoreMethods.updateTableRow(mappedIndex, mappedRow)
  }

  private static async assembleExtraInfoSingleMapping() {
    const user = await StoreMethods.getUser()
    const { equivalence, comment, reviewer: assignedReviewer } = this.mappingInfo!
    const updatedProperties = {
      mappingStatus: this.action,
      statusSetBy: user.name,
      statusSetOn: Date.now(),
      createdBy: user.name,
      createdOn: Date.now(),
      'ADD_INFO:lastAthenaFilter': null,
      'ADD_INFO:numberOfConcepts': 1,
      comment,
      assignedReviewer,
      equivalence,
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

  private static async rowMapping(index?: number) {
    let rowIndex: number = index !== undefined ? index : this.usagiRowIndex!
    const mappedUsagiRow = await StoreMethods.getTableRow(rowIndex)
    const mappedProperties = await this.assembleAthenaInfo()
    const extraProps = await this.assembleExtraInfoSingleMapping()
    Object.assign(mappedUsagiRow, mappedProperties, extraProps)
    return { mappedIndex: rowIndex, mappedRow: mappedUsagiRow }
  }
}

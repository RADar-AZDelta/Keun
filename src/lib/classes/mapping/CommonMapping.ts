import StoreMethods from '$lib/classes/StoreMethods'
import type { IAthenaInfo, IAthenaRow, IUsagiRow } from '$lib/components/Types'

export default class CommonMapping {
  static athenaRow: IAthenaRow
  static usagiRow: IUsagiRow
  static usagiRowIndex: number
  static action: string
  static equivalence: string

  static async setVars({ athenaRow, usagiRow, usagiRowIndex }: IAthenaInfo, action: string, equivalence: string) {
    this.athenaRow = athenaRow
    this.usagiRow = usagiRow
    this.usagiRowIndex = usagiRowIndex
    this.action = action
    this.equivalence = equivalence
  }

  static async rowMapping(index?: number) {
    let rowIndex: number = index !== undefined ? index : this.usagiRowIndex!
    const mappedUsagiRow = await StoreMethods.getTableRow(rowIndex)
    const mappedProperties = await this.assembleAthenaInfo()
    const extraProps = await this.assembleExtraInfoSingleMapping()
    Object.assign(mappedUsagiRow, mappedProperties, extraProps)
    return { mappedIndex: rowIndex, mappedRow: mappedUsagiRow }
  }

  private static async assembleAthenaInfo() {
    const { id, name, domain, vocabulary } = this.athenaRow!
    const mappedProperties = { conceptId: id, conceptName: name, domainId: domain, vocabularyId: vocabulary }
    return mappedProperties
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
}

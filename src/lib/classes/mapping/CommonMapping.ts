import type { IAthenaInfo, IAthenaRow, IUsagiRow } from '$lib/components/Types'
import User from '../general/User'
import Table from '../tables/Table'

export default class CommonMapping {
  static athenaRow: IAthenaRow
  static usagiRow: IUsagiRow
  static usagiRowIndex: number
  static action: string
  static equivalence: string
  static custom: boolean

  static async setVars(
    { athenaRow, usagiRow, usagiRowIndex }: IAthenaInfo,
    action: string,
    equivalence: string,
    custom: boolean,
  ) {
    this.athenaRow = athenaRow
    this.usagiRow = usagiRow
    this.usagiRowIndex = usagiRowIndex
    this.action = action
    this.equivalence = equivalence
    this.custom = custom
  }

  static async rowMapping(index?: number, numberOfConcepts: number = 1) {
    let rowIndex: number = index !== undefined ? index : this.usagiRowIndex!
    const mappedUsagiRow = await Table.getTableRow(rowIndex)
    const mappedProperties = await this.assembleAthenaInfo()
    const extraProps = await this.assembleExtraInfoSingleMapping(numberOfConcepts)
    Object.assign(mappedUsagiRow, mappedProperties, extraProps)
    return { mappedIndex: rowIndex, mappedRow: mappedUsagiRow }
  }

  private static async assembleAthenaInfo() {
    const { id, name, domain, vocabulary, className } = this.athenaRow!
    const mappedProperties = { conceptId: id, conceptName: name, domainId: domain, vocabularyId: vocabulary, className  }
    return mappedProperties
  }

  private static async assembleExtraInfoSingleMapping(numberOfConcepts: number) {
    const user = await User.getUser()
    const updatedProperties = {
      mappingStatus: this.action,
      statusSetBy: user.name,
      statusSetOn: Date.now(),
      createdBy: user.name,
      createdOn: Date.now(),
      'ADD_INFO:lastAthenaFilter': null,
      'ADD_INFO:numberOfConcepts': numberOfConcepts,
      equivalence: this.equivalence,
      vocabularyId: this.athenaRow!.vocabulary,
      className: this.athenaRow.className,
      matchScore: 0,
      mappingType: null,
      'ADD_INFO:approvedBy': null,
      'ADD_INFO:approvedOn': null,
      'ADD_INFO:customConcept': this.custom,
    }
    return updatedProperties
  }
}

import Mapping from '$lib/classes/mapping/Mapping'
import MappedConcepts from '../general/MappedConcepts'
import User from '../general/User'
import Table from '../tables/Table'
import type { IAthenaInfo, IAthenaRow, IUsagiRow } from '$lib/Types'

export default class AthenaActions {
  private static athenaRow: IAthenaRow
  private static usagiRow: IUsagiRow
  private static usagiRowIndex: number

  static async approveRow({ athenaRow, usagiRow, usagiRowIndex }: IAthenaInfo) {
    await this.setVars(athenaRow, usagiRow, usagiRowIndex)
    if (!this.usagiRow.sourceCode || this.usagiRow.mappingStatus === 'SEMI-APPROVED') return
    const user = await User.getUser()
    const updatedProperties = { statusSetBy: user.name, statusSetOn: new Date(), mappingStatus: 'APPROVED' }
    await MappedConcepts.updateMappedConceptsBib({
      [this.usagiRow.sourceCode]: {
        [this.athenaRow.id]: 'APPROVED',
      },
    })
    await Table.updateTableRow(this.usagiRowIndex, updatedProperties)
    return true
  }

  static async mapRowApproved({ athenaRow, usagiRow, usagiRowIndex }: IAthenaInfo, equivalence: string) {
    await this.setVars(athenaRow, usagiRow, usagiRowIndex)
    const rowMappingInfo = { athenaRow: this.athenaRow, usagiRow: this.usagiRow, usagiRowIndex: this.usagiRowIndex }
    await Mapping.mapRow(rowMappingInfo, equivalence, 'SEMI-APPROVED')
  }

  static async mapRowFlagged({ athenaRow, usagiRow, usagiRowIndex }: IAthenaInfo, equivalence: string) {
    await this.setVars(athenaRow, usagiRow, usagiRowIndex)
    const rowMappingInfo = { athenaRow: this.athenaRow, usagiRow: this.usagiRow, usagiRowIndex: this.usagiRowIndex }
    await Mapping.mapRow(rowMappingInfo, equivalence, 'FLAGGED')
  }

  static async mapRowUnapproved({ athenaRow, usagiRow, usagiRowIndex }: IAthenaInfo, equivalence: string) {
    await this.setVars(athenaRow, usagiRow, usagiRowIndex)
    const rowMappingInfo = { athenaRow: this.athenaRow, usagiRow: this.usagiRow, usagiRowIndex: this.usagiRowIndex }
    await Mapping.mapRow(rowMappingInfo, equivalence, 'UNAPPROVED')
  }

  private static async setVars(athenaRow: IAthenaRow, usagiRow: IUsagiRow, usagiRowIndex: number) {
    this.athenaRow = athenaRow
    this.usagiRow = usagiRow
    this.usagiRowIndex = usagiRowIndex
  }
}

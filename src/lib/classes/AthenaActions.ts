import Mapping from './Mapping'
import StoreMethods from './StoreMethods'
import type { IAthenaRow, IUsagiRow } from '$lib/components/Types'

export default class AthenaActions {
  athenaRow: IAthenaRow
  row: IUsagiRow
  rowIndex: number

  constructor(athenaRow: IAthenaRow, row: IUsagiRow, rowIndex: number) {
    this.athenaRow = athenaRow
    this.row = row
    this.rowIndex = rowIndex
  }

  async updateSelectedRow(athenaRow: IAthenaRow, row: IUsagiRow, rowIndex: number) {
    this.athenaRow = athenaRow
    this.row = row
    this.rowIndex = rowIndex
  }

  async approveRow() {
    if (!this.row.sourceCode || this.row.mappingStatus === 'SEMI-APPROVED') return
    const user = await StoreMethods.getUser()
    const updatedProperties = { statusSetBy: user.name, statusSetOn: new Date(), mappingStatus: 'APPROVED' }
    await StoreMethods.updateMappedConceptsBib({ [this.athenaRow.id]: 'APPROVED' })
    await StoreMethods.updateTableRow(this.rowIndex, updatedProperties)
    return true
  }

  async mapRowApproved(equivalence: string) {
    const rowMappingInfo = { athenaRow: this.athenaRow, usagiRow: this.row, usagiRowIndex: this.rowIndex }
    await Mapping.mapRow(rowMappingInfo, equivalence, 'SEMI-APPROVED')
  }

  async mapRowFlagged(equivalence: string) {
    const rowMappingInfo = { athenaRow: this.athenaRow, usagiRow: this.row, usagiRowIndex: this.rowIndex }
    await Mapping.mapRow(rowMappingInfo, equivalence, 'FLAGGED')
  }

  async mapRowUnapproved(equivalence: string) {
    const rowMappingInfo = { athenaRow: this.athenaRow, usagiRow: this.row, usagiRowIndex: this.rowIndex }
    await Mapping.mapRow(rowMappingInfo, equivalence, 'UNAPPROVED')
  }
}

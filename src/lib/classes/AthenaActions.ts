import Mapping from './Mapping'
import { mappedToConceptIds, table, user } from '$lib/store'
import type DataTable from '@radar-azdelta/svelte-datatable'
import type { IAthenaRow, IMappingInformation, IUsagiRow, IUser } from '$lib/components/Types'

export default class AthenaActions {
  athenaRow: IAthenaRow
  row: IUsagiRow
  rowIndex: number

  constructor(athenaRow: IAthenaRow, row: IUsagiRow, rowIndex: number) {
    this.athenaRow = athenaRow
    this.row = row
    this.rowIndex = rowIndex
  }

  async approveRow() {
    if (!this.row.sourceCode || this.row.mappingStatus === 'SEMI-APPROVED') return
    const user = await this.getUser()
    const updatedProperties = { statusSetBy: user.name, statusSetOn: new Date(), mappingStatus: 'APPROVED' }
    await this.updateMappedConceptsBib({ [this.athenaRow.id]: 'APPROVED' })
    await this.updateTableRow(this.rowIndex, updatedProperties)
    return true
  }

  mapRowApproved = async (equivalence: string) => {
    const rowMappingInfo = { athenaRow: this.athenaRow, usagiRow: this.row, usagiRowIndex: this.rowIndex }
    await Mapping.mapRow(rowMappingInfo, equivalence, 'SEMI-APPROVED')
  }
  mapRowFlagged = async (equivalence: string) => {
    const rowMappingInfo = { athenaRow: this.athenaRow, usagiRow: this.row, usagiRowIndex: this.rowIndex }
    await Mapping.mapRow(rowMappingInfo, equivalence, 'FLAGGED')
  }

  mapRowUnapproved = async (equivalence: string) => {
    const rowMappingInfo = { athenaRow: this.athenaRow, usagiRow: this.row, usagiRowIndex: this.rowIndex }
    await Mapping.mapRow(rowMappingInfo, equivalence, 'UNAPPROVED')
  }

  private getUser(): Promise<IUser> {
    return new Promise(resolve =>
      user.subscribe(user => {
        if (!user) throw new Error('User not found')
        resolve(user)
      }),
    )
  }

  private async getTable(): Promise<DataTable> {
    return new Promise(resolve =>
      table.subscribe(table => {
        if (!table) throw new Error('Table not found')
        resolve(table)
      }),
    )
  }

  private async updateTableRow(index: number, updatedProperties: object) {
    const table = await this.getTable()
    await table.updateRows(new Map([[index, updatedProperties]]))
  }

  private async updateMappedConceptsBib(updatedConcept: object) {
    mappedToConceptIds.update(concepts => Object.assign(concepts, updatedConcept))
  }
}

import type { IAthenaRow, IUsagiRow, IUser } from '$lib/components/Types'
import { table, user } from '$lib/store'
import type DataTable from '@radar-azdelta/svelte-datatable'

export default class AthenaLogic {
  athenaRow: IAthenaRow
  row: IUsagiRow
  rowIndex: number

  constructor(athenaRow: IAthenaRow, row: IUsagiRow, rowIndex: number) {
    this.athenaRow = athenaRow
    this.row = row
    this.rowIndex = rowIndex
  }

  async approveRow() {
    const { sourceCode, mappingStatus } = this.row
    if (!sourceCode || mappingStatus === 'SEMI-APPROVED') return
    const user = await this.getUser()
    if (!user) return
    const updatedProperties = {
      statusSetBy: user.name,
      statusSetOn: new Date(),
      mappingStatus: 'APPROVED',
    }
    const table = await this.getTable()
    if (!table) return
    await table.updateRows(new Map([[this.rowIndex, updatedProperties]]))
    return true
  }

  private getUser(): Promise<IUser> {
    return new Promise(resolve => user.subscribe(user => resolve(user)))
  }

  private async getTable(): Promise<DataTable | undefined> {
    return new Promise(resolve => table.subscribe(table => resolve(table)))
  }
}

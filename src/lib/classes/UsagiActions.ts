import { table, user } from '$lib/store'
import type { IUsagiActions, IUsagiRow, IUser } from '$lib/components/Types'
import type DataTable from '@radar-azdelta/svelte-datatable'

export default class UsagiActions implements IUsagiActions {
  row: IUsagiRow
  index: number

  constructor(row: IUsagiRow, index: number) {
    this.row = row
    this.index = index
  }

  approveRow = async () => await this.performActionOnRow('APPROVE')
  flagRow = async () => await this.performActionOnRow('FLAG')
  unapproveRow = async () => await this.performActionOnRow('UNAPPROVE')

  private async checkApprovalConditionsAndReturnUpdate() {
    const user = await this.getUser()
    if (!user || !user.name) return {}
    const { mappingStatus, statusSetBy, conceptId: id, sourceAutoAssignedConceptIds } = this.row
    const semiApproval = mappingStatus === 'SEMI-APPROVED'
    const fullApproval = mappingStatus === 'APPROVED'
    const userIsTheLastAuthor = user.name === statusSetBy
    const conceptId = id ?? sourceAutoAssignedConceptIds
    if (userIsTheLastAuthor && (semiApproval || fullApproval)) return {}
    else if (semiApproval)
      return { 'ADD_INFO:approvedBy': user.name, 'ADD_INFO:approvedOn': Date.now(), mappingStatus: 'APPROVED' }
    else if (!semiApproval && !fullApproval)
      return { statusSetBy: user.name, statusSetOn: Date.now(), mappingStatus: 'SEMI-APPROVED', conceptId }
    else return {}
  }

  private async checkFlaggingConditionsAndReturnUpdate() {
    const user = await this.getUser()
    if (!user || !user.name) return {}
    const { mappingStatus } = this.row
    const rowIsFlagged = mappingStatus === 'FLAGGED'
    if (rowIsFlagged) return {}
    return { statusSetBy: user.name, statusSetOn: new Date(), mappingStatus: 'FLAGGED' }
  }

  private async checkUnapprovalConditionsAndReturnUpdate() {
    const user = await this.getUser()
    if (!user || !user.name) return {}
    const { mappingStatus } = this.row
    const rowIsUnapproved = mappingStatus === 'UNAPPROVED'
    if (rowIsUnapproved) return {}
    return { statusSetBy: user.name, statusSetOn: new Date(), mappingStatus: 'UNAPPROVED' }
  }

  private async getConditionMethod(action: string) {
    if (action === 'APPROVE') return await this.checkApprovalConditionsAndReturnUpdate()
    else if (action === 'FLAG') return await this.checkFlaggingConditionsAndReturnUpdate()
    else if (action === 'UNAPPROVE') return await this.checkUnapprovalConditionsAndReturnUpdate()
    return {}
  }

  private async performActionOnRow(action: string) {
    const updatedProperties = await this.getConditionMethod(action)
    const table = await this.getTable()
    if (!table) return
    table.updateRows(new Map([[this.index, updatedProperties]]))
  }

  private getUser(): Promise<IUser> {
    return new Promise(resolve => user.subscribe(user => resolve(user)))
  }

  private async getTable(): Promise<DataTable | undefined> {
    return new Promise(resolve => table.subscribe(table => resolve(table)))
  }
}

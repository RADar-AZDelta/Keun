import type { IExtraUsagiCols, IUsagiAllExtra, IUsagiRow, IUser } from '$lib/components/Types'
import type TableLogic from '$lib/classes/TableLogic'
import { table, user } from '$lib/store'
import additionalColumns from '$lib/data/additionalColumns.json'

const additionalFields: IExtraUsagiCols = additionalColumns

export default class UsagiLogic {
  row: IUsagiRow
  index: number

  constructor(row: IUsagiRow, index: number) {
    this.row = row
    this.index = index
  }

  approveRow = async () => await this.performActionOnRow(this.checkApprovalConditionsAndReturnUpdate)
  flagRow = async () => await this.performActionOnRow(this.checkFlaggingConditionsAndReturnUpdate)
  unapproveRow = async () => await this.performActionOnRow(this.checkUnapprovalConditionsAndReturnUpdate)

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

  private async performActionOnRow(conditionMethod: () => Promise<object>) {
    const updatedProperties = await conditionMethod()
    const table = await this.getTable()
    if (!table) return
    table.updateRows(new Map([[this.index, updatedProperties]]))
  }

  async resetRow() {
    const table = await this.getTable()
    if (!table) return
    const resetProperties = this.resetPropertiesOfRow()
    await table.updateRows(new Map([[this.index, resetProperties]]))
  }

  private resetPropertiesOfRow() {
    const reset: IUsagiAllExtra = additionalFields
    reset.conceptId = null
    reset.domainId = null
    reset.vocabularyId = null
    reset.conceptName = null
    delete reset.sourceAutoAssignedConceptIds
    return reset
  }

  async deleteRow() {
    // TODO: delete row
    // TODO: check for custom concepts
  }

  private getUser(): Promise<IUser> {
    return new Promise(resolve => user.subscribe(user => resolve(user)))
  }

  private async getTable(): Promise<TableLogic | undefined> {
    return new Promise(resolve => table.subscribe(table => resolve(table)))
  }
}

import User from '../general/User'
import Table from '../tables/Table'
import type { IUsagiInfo, IUsagiRow } from '$lib/Types'

export default class UsagiActions {
  private static usagiRow: IUsagiRow
  private static usagiRowIndex: number

  static async approveRow(usagiInfo: IUsagiInfo) {
    await this.updateVars(usagiInfo)
    await this.performActionOnRow('APPROVE')
  }

  static async flagRow(usagiInfo: IUsagiInfo) {
    await this.updateVars(usagiInfo)
    await this.performActionOnRow('FLAG')
  }

  static async unapproveRow(usagiInfo: IUsagiInfo) {
    await this.updateVars(usagiInfo)
    await this.performActionOnRow('UNAPPROVE')
  }

  private static async updateVars({ usagiRow, usagiRowIndex }: IUsagiInfo) {
    this.usagiRow = usagiRow
    this.usagiRowIndex = usagiRowIndex
  }

  private static async performActionOnRow(action: string) {
    const updatedProperties = await this.getConditionMethod(action)
    await Table.updateTableRows(new Map([[this.usagiRowIndex, updatedProperties]]))
  }

  private static async getConditionMethod(action: string) {
    if (action === 'APPROVE') return await this.checkApprovalConditionsAndReturnUpdate()
    else if (action === 'FLAG') return await this.checkFlaggingConditionsAndReturnUpdate()
    else if (action === 'UNAPPROVE') return await this.checkUnapprovalConditionsAndReturnUpdate()
    return {}
  }

  private static async checkApprovalConditionsAndReturnUpdate() {
    const user = await User.getUser()
    if (!user || !user.name) return {}
    const { mappingStatus, statusSetBy, conceptId: id, sourceAutoAssignedConceptIds } = this.usagiRow
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

  private static async checkFlaggingConditionsAndReturnUpdate() {
    const user = await User.getUser()
    if (!user || !user.name) return {}
    const { mappingStatus } = this.usagiRow
    const rowIsFlagged = mappingStatus === 'FLAGGED'
    if (rowIsFlagged) return {}
    return { statusSetBy: user.name, statusSetOn: new Date(), mappingStatus: 'FLAGGED' }
  }

  private static async checkUnapprovalConditionsAndReturnUpdate() {
    const user = await User.getUser()
    if (!user || !user.name) return {}
    const { mappingStatus } = this.usagiRow
    const rowIsUnapproved = mappingStatus === 'UNAPPROVED'
    if (rowIsUnapproved) return {}
    return { statusSetBy: user.name, statusSetOn: new Date(), mappingStatus: 'UNAPPROVED' }
  }
}

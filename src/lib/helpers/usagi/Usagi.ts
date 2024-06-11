import UsagiUpdate from '$lib/helpers/usagi/UsagiUpdate'
import UsagiActions from '$lib/helpers/usagi/UsagiActions'
import UsagiRowDelete from '$lib/helpers/usagi/UsagiRowDelete'
import type { IUsagiInfo, IUsagiRow } from '$lib/interfaces/Types'

export default class Usagi {
  usagiInfo: IUsagiInfo

  constructor(usagiRow: IUsagiRow, usagiRowIndex: number) {
    this.usagiInfo = { usagiRow, usagiRowIndex }
  }

  approveRow = async () => await UsagiActions.approveRow(this.usagiInfo)
  flagRow = async () => await UsagiActions.flagRow(this.usagiInfo)
  unapproveRow = async () => await UsagiActions.unapproveRow(this.usagiInfo)
  deleteRow = async () => await UsagiRowDelete.deleteRow(this.usagiInfo)
  updatePropertyValue = async (column: string, value: string) => await UsagiUpdate.updateProperties(this.usagiInfo.usagiRowIndex, column, value)
  updateUsagiRow = async (usagiInfo: IUsagiInfo) => (this.usagiInfo = usagiInfo)
}

import UsagiUpdate from '$lib/classes/usagi/UsagiUpdate'
import UsagiActions from '$lib/classes/usagi/UsagiActions'
import UsagiRowDelete from '$lib/classes/usagi/UsagiRowDelete'
import type { IUsagiInfo, IUsagiRow } from '$lib/components/Types'

export default class Usagi {
  usagiInfo: IUsagiInfo

  constructor(usagiRow: IUsagiRow, usagiRowIndex: number) {
    this.usagiInfo = { usagiRow, usagiRowIndex }
  }

  approveRow = async () => await UsagiActions.approveRow(this.usagiInfo)
  flagRow = async () => await UsagiActions.flagRow(this.usagiInfo)
  unapproveRow = async () => await UsagiActions.unapproveRow(this.usagiInfo)
  deleteRow = async () => await UsagiRowDelete.deleteRow(this.usagiInfo)
  updatePropertyValue = async (column: string, value: string) =>
    await UsagiUpdate.updateProperties(this.usagiInfo.usagiRowIndex, column, value)
  updateUsagiRow = async (usagiInfo: IUsagiInfo) => (this.usagiInfo = usagiInfo)
}

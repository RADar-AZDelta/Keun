import AthenaActions from '$lib/classes/athena/AthenaActions'
import type { IAthenaInfo, IAthenaRow, IUsagiRow } from '$lib/components/Types'

export default class Athena {
  athenaInfo: IAthenaInfo

  constructor(athenaRow: IAthenaRow, usagiRow: IUsagiRow, usagiRowIndex: number) {
    this.athenaInfo = { athenaRow, usagiRow, usagiRowIndex }
  }

  approveRow = async () => await AthenaActions.approveRow(this.athenaInfo)
  mapRowApproved = async (equivalence: string) => await AthenaActions.mapRowApproved(this.athenaInfo, equivalence)
  mapRowFlagged = async (equivalence: string) => await AthenaActions.mapRowFlagged(this.athenaInfo, equivalence)
  mapRowUnapproved = async (equivalence: string) => await AthenaActions.mapRowUnapproved(this.athenaInfo, equivalence)
  updateCurrentRow = async (athenaInfo: IAthenaInfo) => (this.athenaInfo = athenaInfo)
}

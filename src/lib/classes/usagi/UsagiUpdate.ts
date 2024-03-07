import Table from '../tables/Table'

export default class UsagiUpdate {
  private static usagiRowIndex: number

  static async updateProperties(usagiRowIndex: number, column: string, value: string) {
    await this.updateVars(usagiRowIndex)
    await this.updateProps(column, value)
  }

  private static async updateVars(usagiRowIndex: number) {
    this.usagiRowIndex = usagiRowIndex
  }

  private static async updateProps(column: string, value: string) {
    const updatedProperty = { [column]: value }
    await Table.updateTableRows(new Map([[this.usagiRowIndex, updatedProperty]]))
  }
}

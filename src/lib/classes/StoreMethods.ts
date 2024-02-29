import { mappedToConceptIds, settings, table, user } from '$lib/store'
import type DataTable from '@radar-azdelta/svelte-datatable'
import type { IMappedRows, ISettings, IUsagiRow, IUser } from '$lib/components/Types'

export default class StoreMethods {
  static async getUser(): Promise<IUser> {
    return new Promise(resolve =>
      user.subscribe(user => {
        if (!user) throw new Error('User not found')
        resolve(user)
      }),
    )
  }

  static async getSettings(): Promise<ISettings> {
    return new Promise(resolve =>
      settings.subscribe(settings => {
        if (!settings) throw new Error('Settings not found')
        resolve(settings)
      }),
    )
  }

  static async getMappedConceptsBib(): Promise<IMappedRows> {
    return new Promise(resolve =>
      mappedToConceptIds.subscribe(concepts => {
        if (!concepts) throw new Error('Concepts not found')
        resolve(concepts)
      }),
    )
  }

  static async getTable(): Promise<DataTable> {
    return new Promise(resolve =>
      table.subscribe(table => {
        if (!table) throw new Error('Table not found')
        resolve(table)
      }),
    )
  }

  static async getTableRow(index: number) {
    const table = await this.getTable()
    return <IUsagiRow>await table.getFullRow(index)
  }

  static async updateTableRow(index: number, updatedProperties: object) {
    const table = await this.getTable()
    await table.updateRows(new Map([[index, updatedProperties]]))
  }

  static async updateTableRows(rows: Map<number, object>) {
    const table = await this.getTable()
    await table.updateRows(rows)
  }

  static async insertTableRow(row: IUsagiRow) {
    const table = await this.getTable()
    await table.insertRows([row])
  }

  static async executeQueryOnTable(query: object) {
    const table = await this.getTable()
    return await table.executeQueryAndReturnResults(query)
  }

  static async updateMappedConceptsBib(updatedConcept: object) {
    mappedToConceptIds.update(concepts => Object.assign(concepts, updatedConcept))
  }
}

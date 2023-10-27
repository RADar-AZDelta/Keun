import { base } from "$app/paths";
import type { IMessage, IUpdatedFunctionalityImpl } from "$lib/components/Types";

export default class SQLiteImpl implements IUpdatedFunctionalityImpl {
    path = `${base}/api/sqlite/file`

    // Get full file to start mapping
    async getFile(id: string): Promise<any> {
        const updatedPath = `${this.path}?id=${id}`
        return await this.performRequest(updatedPath)
    }

    // Get some info of the file to show in the choice menu
    async getFiles(): Promise<any> {
        return await this.performRequest(this.path)
    }
    
    private async performRequest(path: string, options: Object = {}): Promise<IMessage> {
        const res = await fetch(path, options)
        const message: IMessage = await res.json()
        return message
      }
}
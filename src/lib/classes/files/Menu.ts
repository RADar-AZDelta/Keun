import { logWhenDev } from '@radar-azdelta-int/radar-utils'
import DatabaseImpl from '../implementation/DatabaseImpl'

// TODO: is it necessary to have this class?

export default class Menu {
  static async getFiles() {
    const getFilesRes = await DatabaseImpl.getFilesList()
    return getFilesRes ?? []
  }

  static async deleteFile(id: string | undefined) {
    if (!id) return
    await DatabaseImpl.deleteKeunFile(id)
    logWhenDev('deleteFile: File has been deleted')
  }

  static async uploadFile(file: File) {
    logWhenDev('uploadFile: Uploading a file')
    await DatabaseImpl.uploadKeunFile(file)
    return await this.getFiles()
  }

  static async openColumnDialog() {
    
  }
}

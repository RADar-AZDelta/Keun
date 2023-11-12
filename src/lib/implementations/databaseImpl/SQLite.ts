import { dev } from '$app/environment'
import { goto } from '$app/navigation'
import { base } from '$app/paths'
import type { IFile, IMessage, IUpdatedFunctionalityImpl } from '$lib/components/Types'

// TODO: implement Auth implementation for SQLite

export default class SQLiteImpl implements IUpdatedFunctionalityImpl {
  path = `${base}/api/sqlite/file`

  // Get full file to start mapping
  async getFile(id: string): Promise<any> {
    const updatedPath = `${this.path}?id=${id}`
    return await this.performRequest(updatedPath)
  }

  // Get some info of the file to show in the choice menu
  async getFiles(): Promise<any> {
    return await this.performRequest(`${this.path}?info`)
  }

  async getFilesAdmin(): Promise<IFile[] | void> {}

  async uploadFile(file: File, authors: string[]): Promise<void | string[]> {
    return new Promise((async, resolve) => {
      if (dev) console.log('uploadFile: Uploading file to SQLite database')
      const reader = new FileReader()
      reader.onload = async () => {
        if (reader.result && typeof reader.result !== 'string') {
          await this.performRequest(this.path, {
            fileName: file.name,
            file: JSON.stringify(Array.from(new Uint8Array(reader.result))),
            fileType: 'concepts',
          })
          goto(`${base}/mapping`)
          resolve()
        }
      }
      reader.readAsArrayBuffer(file)
    })
  }

  async editFileAuthors(id: string, authors: string[]): Promise<void> {
    await this.performRequest(this.path + 'authors', { id, authors })
  }

  async deleteFile(id: string): Promise<void> {
    await this.performRequest(this.path, { id })
  }

  async downloadFile(id: string): Promise<void> {
    const updatedPath = `${this.path}?id=${id}`
    const fileInfo = await this.performRequest(updatedPath)
    if (!fileInfo.details.file || !fileInfo.details.name) return
    const fileArray = fileInfo.details.file
    const buffer = new Uint8Array(fileArray)
    const blob = new Blob([buffer], { type: 'text/csv' })
    const file = new File([blob], fileInfo.details.name, { type: 'text/csv' })
    let element = document.createElement('a')
    const url = URL.createObjectURL(file)
    element.setAttribute('href', url)
    element.setAttribute('download', fileInfo.details.name)
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    URL.revokeObjectURL(url)
  }

  async watchValueFromDatabase(path: string, subCallback: () => unknown, remove?: boolean | undefined): Promise<void> {}

  private async performRequest(path: string, options: Object = {}): Promise<IMessage> {
    const res = await fetch(path, options)
    const message: IMessage = await res.json()
    return message
  }
}

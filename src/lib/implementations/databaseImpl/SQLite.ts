import { blobToString, downloadWithUrl, fileToBlob, logWhenDev, stringToFile } from '@radar-azdelta-int/radar-utils'
import { dev } from '$app/environment'
import { base } from '$app/paths'
import initial from '$lib/data/customBlobInitial.json'
import type { IConceptFiles, IDatabaseImpl, IFile, IMessage, IUpdatedFunctionalityImpl } from '$lib/components/Types'

export default class SQLiteImpl implements IDatabaseImpl {
  path = `${base}/api/sqlite/file`

  async getKeunFile(id: string): Promise<IFile | undefined> {
    logWhenDev(`getKeunFile: Get file with id ${id} in SQLite`)
    const file = await this.readFileFromDatabase(id)
    return file
  }

  async getCustomKeunFile(id: string): Promise<IFile | undefined> {
    logWhenDev(`getCustomKeunFile: Get file with id ${id} in SQLite`)
    const file = await this.readFileFromDatabase(id)
    return file
  }

  private async readFileFromDatabase(id: string) {
    const customInfo = await this.performRequest(this.path + `?id=${id}&custom=true`)
    if (!customInfo) return
    const { name, content } = customInfo.details
    const file = await stringToFile(content, name)
    const fileObj: IFile = { id, file, name }
    return fileObj
  }

  async checkFileExistance(id: string) {
    logWhenDev(`checkFileExistance: Check if the file with id ${id} exists`)
    const fileInfo = await this.performRequest(this.path + `?id=${id}`)
    if (!fileInfo || !fileInfo?.details?.id) return false
    return true
  }

  async getFilesList() {
    logWhenDev('getFilesList: Get files in SQLite')
    const filesInfo = await this.performRequest(this.path)
    if (!filesInfo.details) return []
    const fileNames = filesInfo.details.map((file: IFile) => file.name)
    return fileNames
  }

  async uploadKeunFile(file: File, authors: string[]) {
    logWhenDev('uploadKeunFile: Uploading file to SQLite')
    const customBlob = new Blob([initial.initial])
    const customFileString = await blobToString(customBlob)
    const customFileContent = {
      id: fileId,
      name: `${file.name.split('.')[0]}_concepts.csv`,
      content: customFileString,
    }
    const blob = await fileToBlob(file)
    const fileString = await blobToString(blob)
    const fileId = crypto.randomUUID()
    const fileContent = { id: fileId, name: file.name, content: fileString, custom:  }
    await this.performRequest(this.path, { method: 'POST', body: JSON.stringify({ file: fileContent }) })
    await this.performRequest(this.path + '?custom=true', {
      method: 'POST',
      body: JSON.stringify({ file: customFileContent }),
    })
  }

  async editFile(id: string, blob: Blob, customBlob?: Blob): Promise<void> {
    if (dev) console.log(`editFile: Editing the file with id ${id}`)
    const fileString = await blobToString(blob)
    const fileContent = { id, content: fileString }
    await this.performRequest(this.path, { method: 'PUT', body: JSON.stringify(fileContent) })
    if (!customBlob) return
    const customFileString = await blobToString(customBlob)
    const customFileContent = { id, content: customFileString }
    await this.performRequest(this.path + '?custom=true', { method: 'PUT', body: JSON.stringify(customFileContent) })
  }

  async editFileAuthors(): Promise<void> {}

  async deleteFile(id: string): Promise<void> {
    if (dev) console.log(`deleteFile: Delete the file with id ${id} in IndexedDB`)
    await this.performRequest(this.path, { method: 'DELETE', body: JSON.stringify({ id }) })
    await this.performRequest(this.path, { method: 'DELETE', body: JSON.stringify({ id }) })
  }

  async downloadFile(id: string): Promise<void> {
    if (dev) console.log('downloadFile: Download the file & the custom concepts')
    const fileInfo = await this.performRequest(this.path + `?id=${id}`)
    if (!fileInfo || !fileInfo.details.content) return console.error('getFile: File not found')
    const { name, content } = fileInfo.details
    const file = await stringToFile(content, name, 'text/csv')
    const needsPrefix = !file.name.endsWith('_usagi.csv')
    const updatedName = needsPrefix ? file.name.split('.')[0] + '_usagi.csv' : file.name
    await this.download(updatedName, file)
    await this.downloadCustomFile(id)
    await this.deleteFile(id)
  }

  private async downloadCustomFile(fileId: string) {
    const fileInfo = await this.performRequest(this.path + `?id=${fileId}&custom=true`)
    if (!fileInfo || !fileInfo.details.content) return console.error('getFile: File not found')
    if (fileInfo.details.content.includes('0,test,test,test,test,S,123')) return
    const { name, content } = fileInfo.details
    const file = await stringToFile(content, name, 'text/csv')
    const updatedName = file.name.split('.')[0] + '_concept.csv'
    await this.download(updatedName, file)
  }

  private async performRequest(path: string, options: object = {}): Promise<IMessage> {
    const res = await fetch(path, options)
    const message: IMessage = await res.json()
    return message
  }

  private async download(name: string, file: File) {
    const url = URL.createObjectURL(file)
    await downloadWithUrl(url, name)
  }
}

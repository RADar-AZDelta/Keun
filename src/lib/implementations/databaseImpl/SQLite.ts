import { dev } from '$app/environment'
import { base } from '$app/paths'
import initial from '$lib/data/customBlobInitial.json'
import { blobToString, downloadWithUrl, fileToBlob, stringToFile } from '$lib/obsolete/utils'
import type { IConceptFiles, IFile, IMessage, IUpdatedFunctionalityImpl } from '$lib/components/Types'

export default class SQLiteImpl implements IUpdatedFunctionalityImpl {
  path = `${base}/api/sqlite/file`

  async getFile(id: string): Promise<void | IConceptFiles> {
    if (dev) console.log(`getFile: Get file with id ${id} in SQLite`)
    const fileInfo = await this.performRequest(this.path + `?id=${id}`)
    if (!fileInfo) return
    const { name, content } = fileInfo.details
    const fileObj = { id, file: await stringToFile(content, name), name }
    let customFile = undefined
    const customInfo = await this.performRequest(this.path + `?id=${id}&custom=true`)
    if (customInfo) {
      const { name, content } = customInfo.details
      if (name && content) customFile = { id, file: await stringToFile(content, name), name }
    }
    return { file: fileObj, customFile }
  }

  async checkFileExistance(name: string): Promise<string | boolean | void> {
    if (dev) console.log(`checkFileExistance: Check if the file with name ${name} exists`)
    const fileInfo = await this.performRequest(this.path + `?name=${name}`)
    if (!fileInfo || !fileInfo?.details?.id) return
    return fileInfo.details.id
  }

  async getFiles(): Promise<void | IFile[]> {
    if (dev) console.log('getFiles: Get files in SQLite')
    const filesInfo = await this.performRequest(this.path)
    const files: IFile[] = []
    for (const fileInfo of filesInfo.details)
      files.push({ id: fileInfo.id, name: fileInfo.name, file: await stringToFile(fileInfo.content, fileInfo.name) })
    return files
  }

  async uploadFile(file: File): Promise<void | string[]> {
    if (dev) console.log('uploadFile: Uploading file to SQLite')
    const blob = await fileToBlob(file)
    const fileString = await blobToString(blob)
    const fileId = crypto.randomUUID()
    const fileContent = { id: fileId, name: file.name, content: fileString }
    await this.performRequest(this.path, { method: 'POST', body: JSON.stringify({ file: fileContent }) })
    const customBlob = new Blob([initial.initial])
    const customFileString = await blobToString(customBlob)
    const customFileContent = {
      id: fileId,
      name: `${file.name.split('.')[0]}_concepts.csv`,
      content: customFileString,
    }
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
    const updatedName = file.name.split('.')[0] + '_usagi.csv'
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

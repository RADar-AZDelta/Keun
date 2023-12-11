import { dev } from '$app/environment'
import { base } from '$app/paths'
import type { IConceptFiles, IFile, IMessage, IUpdatedFunctionalityImpl } from '$lib/components/Types'

/* Possible SQLite structure

files: {
  {id}: {
    name: string
    authors: string[]
    customName: string
    content: string
  }
},
users: {
  {userId}: {
    files: [
      {
        id: string
        options: ITableOptions
        columns: IColumnMetaData[]
      }
    ],
    name: string
    lastName: string
    role: string
  }
}
  
*/

export default class SQLiteImpl implements IUpdatedFunctionalityImpl {
  path = `${base}/api/sqlite/file`
  customPath = `${base}/api/sqlite/customFile`

  async getFile(id: string): Promise<void | IConceptFiles> {
    // SELECT id, name, content FROM files WHERE id == $id
    // SELECT id, name, content FROM customFiles WHERE id == $id
    if (dev) console.log(`getFile: Get flie with id ${id} in SQLite`)
    const fileInfo = await this.performRequest(this.path, { id })
    if (!fileInfo) return
    const { file, name, customName } = fileInfo.details
    const fileObj = { id, file, name }
    let customFile = undefined
    if (customName) {
      const customInfo = await this.performRequest(this.customPath, { id })
      if (customInfo) customFile = { id, file: customInfo.details.file, name: customInfo.details.name }
    }
    return { file: fileObj, customFile }
  }

  checkFileExistance(name: string): Promise<string | boolean | void> {
    // SELECT id FROM files WHERE id == $id
    throw new Error('Method not implemented.')
  }

  getFiles(userId?: string | undefined, roles?: string[] | undefined): Promise<void | IFile[]> {
    // SELECT files FROM user WHERE id == $userId
    // SELECT id, name, content FROM files WHERE files IN $files
    throw new Error('Method not implemented.')
  }

  uploadFile(file: File, authors: string[]): Promise<void | string[]> {
    // INSERT INTO files (id, name, content, authors) VALUES ($id, $name, $content, $authors)
    // UPDATE user SET files = json_insert(files, '$[#]', fileId) WHERE id = authorId
    throw new Error('Method not implemented.')
  }

  editFile(id: string, blob: Blob, customBlob?: Blob | undefined): Promise<void> {
    // UPDATE files SET content = blob WHERE id = id
    // UPDATE customFiles SET content = customBlob WHERE id = id
    throw new Error('Method not implemented.')
  }

  editFileAuthors(id: string, authors: string[]): Promise<void> {
    throw new Error('Method not implemented.')
  }
  deleteFile(id: string): Promise<void> {
    throw new Error('Method not implemented.')
  }
  downloadFile(id: string): Promise<void> {
    throw new Error('Method not implemented.')
  }

  private async performRequest(path: string, options: Object = {}): Promise<IMessage> {
    const res = await fetch(path, options)
    const message: IMessage = await res.json()
    return message
  }
}

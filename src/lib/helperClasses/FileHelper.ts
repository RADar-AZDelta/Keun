export interface IFileHelper {
  createFileFromString: (content: string, fileName: string, type: string) => Promise<File>
  downloadFile: (file: File) => Promise<void>
  extractFilesFromInput: (fileList: FileList | null, allowedExtensions: string[]) => Promise<File[]>
  csvToJson: (file: File) => Promise<Record<string, any>[]>
}

export default class FileHelper {
  private static downloadURL: string

  public static blobToString = async (blob: Blob) => {
    const buffer = await blob.arrayBuffer()
    const decoder = new TextDecoder()
    const text = decoder.decode(buffer)
    return text
  }

  public static fileToBlob = async (file: File) => {
    const blobContent = new Uint8Array(await file.arrayBuffer())
    const blob = new Blob([blobContent], { type: file.type })
    return blob
  }

  public static stringToFile = async (str: string, name: string, type: string = 'text/csv') => {
    const blob = new Blob([str], { type })
    return new File([blob], name, { type })
  }

  public static createFileFromString = async (content: string, fileName: string, type: string) => {
    const blob = await this.getBlobFromString(content, type)
    const file = await this.getFileFromBlob(blob, fileName, type)
    return file
  }

  private static getBlobFromString = async (content: string, type: string) => {
    const blob = new Blob([content], { type })
    return blob
  }

  private static getFileFromBlob = async (blob: Blob, fileName: string, type: string) => {
    const file = new File([blob], fileName, { type })
    return file
  }

  public static downloadFile = async (file: File) => {
    await this.createDownloadURL(file)
    await this.downloadElementThroughCreatedHref(file.name)
    await this.revokeAndRemoveDownloadURL()
  }

  private static createDownloadURL = async (file: File) => {
    this.downloadURL = URL.createObjectURL(file)
  }

  private static revokeAndRemoveDownloadURL = async () => {
    URL.revokeObjectURL(this.downloadURL)
    this.downloadURL = ''
  }

  private static downloadElementThroughCreatedHref = async (fileName: string) => {
    const element = document.createElement('a')
    element.setAttribute('href', this.downloadURL)
    element.setAttribute('download', fileName)
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  public static extractFilesFromInput = async (fileList: FileList | null, allowedExtensions: string[]) => {
    if (!fileList) return []
    const extractedFileList: File[] = []
    for (const file of fileList) {
      const extractedFile = await this.extractSingleFile(file, allowedExtensions)
      if (extractedFile) extractedFileList.push(extractedFile)
    }
    return extractedFileList
  }

  private static extractSingleFile = async (file: File, allowedExtensions: string[]) => {
    const extension = file.name.split('.').pop()
    if (!extension) return undefined
    const extensionAllowed = allowedExtensions.includes(extension)
    if (!extensionAllowed) return undefined
    return file
  }

  public static csvToJson = async (file: File) => {
    const text = await file.text()
    const array = text.split('\n')
    const result = []
    const headers = array[0].split(',')
    for (let i = 1; i < array.length - 1; i++) {
      const obj: Record<string, any> = {}
      const props = array[i].split(',')
      for (const j in headers) {
        if (props[j].includes(', ')) obj[headers[j]] = props[j].split(', ').map(item => item.trim())
        else obj[headers[j]] = props[j]
      }
      result.push(obj)
    }
    return result
  }
}

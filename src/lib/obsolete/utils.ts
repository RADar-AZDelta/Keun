export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function localStorageSetter(key: string, value: any) {
  const json = JSON.stringify(value, jsonMapReplacer)
  localStorage.setItem(key, json)
}

export function localStorageGetter(key: string) {
  const item = localStorage.getItem(key)
  if (!item) return undefined
  return JSON.parse(item, jsonMapReviver)
}

// Transform a transformed Map object back to a usefull Map object
export async function jsonMapReviver(key: string, value: any) {
  if (value && value.dataType === 'Map') {
    return new Map(value.value)
  }
  return value
}

// Transform a Map object to write to Localstorage for example
export async function jsonMapReplacer(key: string, value: any) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: [...value],
    }
  } else {
    return value
  }
}

export function reformatDate(date: Date = new Date()) {
  return `${date.getFullYear()}-${
    (date.getMonth() + 1).toString().length === 2 ? date.getMonth() + 1 : `0${date.getMonth() + 1}`
  }-${date.getDate().toString().length === 2 ? date.getDate() : `0${date.getDate()}`}`
}

export async function downloadWithUrl(url: string, fileName: string) {
  const element = document.createElement('a')
  element.setAttribute('href', url)
  element.setAttribute('download', fileName)
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
  URL.revokeObjectURL(url)
}

export async function stringToFile(str: string, name: string, type: string = 'text/csv'): Promise<File> {
  const blob = new Blob([str], { type })
  return new File([blob], name, { type })
}

export async function blobToString(blob: Blob): Promise<any> {
  const buffer = await blob.arrayBuffer()
  const decoder = new TextDecoder()
  const text = decoder.decode(buffer)
  return text
}

export async function stringToBlob(str: string, type: string = 'text/csv'): Promise<Blob> {
  return new Blob([str], { type })
}

export async function fileToBlob(file: File) {
  return new Blob([new Uint8Array(await file.arrayBuffer())], {
    type: file.type,
  })
}

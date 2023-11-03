import { dev } from "$app/environment"
import { onDestroy } from "svelte"

function jsonMapReviver(key: string, value: any) {
  if (value && value.dataType === 'Map') {
    return new Map(value.value)
  }
  return value
}

function jsonMapReplacer(key: string, value: any) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: [...value],
    }
  } else {
    return value
  }
}

export function localStorageSetter(key: string, value: any) {
  const json = JSON.stringify(value, jsonMapReplacer)
  localStorage.setItem(key, json)
}

export function localStorageGetter(key: string) {
  const item = localStorage.getItem(key)
  if (!item) return undefined
  return JSON.parse(item, jsonMapReviver)
}

export function fileToBase64(file: File): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    var reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsDataURL(file)
  })
}

export function base64ToFile(dataUrl: string, fileName: string) {
  var arr = dataUrl.split(','),
    mime = arr[0].match(/:(.*?);/)![1],
    bstr = atob(arr[arr.length - 1]),
    n = bstr.length,
    u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], fileName, { type: mime })
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function removeUndefinedsAndNulls(obj: any, specificProperties?: string[] | undefined): any {
  if (!obj) {
      return false;
  }
  if(typeof obj !== 'object') return obj
  for(let [key, value] of Object.entries(obj)) {
    if(specificProperties && specificProperties?.includes(key)) obj[key] = removeUndefinedsAndNulls(value, specificProperties)
    else obj[key] = removeUndefinedsAndNulls(value, specificProperties)
  }
  return obj;
}


export function onInterval(callback: () => void, milliseconds: number) {
  const interval = setInterval(callback, milliseconds)

  onDestroy(() => {
    clearInterval(interval)
  })
}

export async function convertBlobToHexString(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const hex = [...new Uint8Array(buffer)]
      .map(x => x.toString(16).padStart(2, '0'))
      .join('')
  return "\\x".concat(hex)
}

export function convertHexStringToBlob(hex: string, mimeType: string): Blob {
  if (hex.startsWith("\\x"))
      hex = hex.slice("\\x".length)
  let previousValue = ""
  const bytes = [...hex].reduce((acc, _, i) => {
      if (i - 1 & 1) //even
          previousValue = _
      else //odd  
          acc.push(parseInt(previousValue.concat(_), 16))
      return acc
  }, [] as number[])
  return new Blob([new Uint8Array(bytes)], {type: mimeType})
}

export async function fileToBlob (file: File) {
  return new Blob([new Uint8Array(await file.arrayBuffer())], {type: file.type })
}

export async function urlToFile(url: string, fileName: string) {
  try {
    let res = await fetch(url)
    let data = await res.blob()
    let file = new File([data], fileName, { type: 'text/csv' })
    return file
  } catch(e) {
    if(dev) console.log(e)
    return undefined
  }
}
export async function blobToString(blob: Blob): Promise<any> {
  const buffer = await blob.arrayBuffer()
  const decoder = new TextDecoder()
  const text = decoder.decode(buffer)
  return text
}

export async function stringToBlob(str: string, type: string = "text/csv"): Promise<Blob> {
  return new Blob([str], { type })
}

export async function stringToFile(str: string, name: string, type: string = "text/csv"): Promise<File> {
  const blob = new Blob([str], { type })
  return new File([blob], name, { type })
}
export async function jsonMapReviver(key: string, value: any) {
  if (value && value.dataType === 'Map') {
    return new Map(value.value)
  }
  return value
}

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

export function localStorageSetter(key: string, value: any) {
  const json = JSON.stringify(value, jsonMapReplacer)
  localStorage.setItem(key, json)
}

export function localStorageGetter(key: string) {
  const item = localStorage.getItem(key)
  if (!item) return undefined
  return JSON.parse(item, jsonMapReviver)
}

export function reformatDate(date: Date = new Date()) {
  return `${date.getFullYear()}-${
    (date.getMonth() + 1).toString().length === 2 ? date.getMonth() + 1 : `0${date.getMonth() + 1}`
  }-${date.getDate().toString().length === 2 ? date.getDate() : `0${date.getDate()}`}`
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function debounce<T extends (...args: any[]) => any>(cb: T, wait: number) {
  let h: any
  const callable = (...args: any) => {
    clearTimeout(h)
    h = setTimeout(() => cb(...args), wait)
  }
  return <T>(<any>callable)
}

export const range = (start: number, stop: number, step: number) => Array.from({ length: (stop - start) / step + 1 }, (_, i) => start + i * step)

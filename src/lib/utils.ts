import { browser } from '$app/environment'
import type { IColumnMetaData, IPagination } from '../../lib/RADar-DataTable/src/lib/components/DataTable'
import type { SingleSorting, IStatus } from './components/Types'

/*
    Basic helper methods
*/

function jsonMapReviver(key: string, value: any) {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value)
    }
  }
  return value
}

function jsonMapReplacer(key: string, value: any) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()),
    }
  } else {
    return value
  }
}

export function localStorageSetter(key: string, value: any, mapReplacer: boolean = false) {
  mapReplacer == true
    ? localStorage.setItem(key, JSON.stringify(value, jsonMapReplacer))
    : localStorage.setItem(key, JSON.stringify(value))
}

export function localStorageGetter(key: string, mapReviver: boolean = false) {
  if (localStorage.getItem(key) != null) {
    if (mapReviver == true) return JSON.parse(localStorage.getItem(key)!, jsonMapReviver)
    else return JSON.parse(localStorage.getItem(key)!, jsonMapReviver)
  } else {
    return null
  }
}

export const checkForScroll = (list: any[], limit: number): 'scroll' | null | undefined => {
  if (list.length > limit) return 'scroll'
  else return null
}

export const getAuthor = (getAuthorEvent?: Function) => {
  let auth
  if (browser == true) {
    if (localStorageGetter('author') !== null) {
      auth = localStorageGetter('author')
    } else {
      if (getAuthorEvent != undefined) getAuthorEvent()
      else {
        auth = 'Placeholder author'
        console.warn('No author found')
      }
    }
  } else auth = 'SSR author'
  return auth
}

export const checkForAuthor = (data: any, columns: IColumnMetaData[], author: string) => {
  const author1Index = columns.findIndex(col => col.id == 'ADD_INFO:author1')
  const author2Index = columns.findIndex(col => col.id == 'ADD_INFO:author2')
  if (data[author1Index] != '' && data[author1Index] != undefined && data[author1Index] != author) {
    return {
      first: author,
      second: data[author1Index],
    }
  } else if (
    data[author1Index] != '' &&
    data[author1Index] != undefined &&
    data[author2Index] != '' &&
    data[author2Index] != undefined
  ) {
    return {
      first: author,
      second: data[author1Index],
    }
  } else {
    return {
      first: author,
      second: '',
    }
  }
}

export const updateSettings = async (settings: Map<string, boolean>, name: string, value: boolean) => {
  settings.set(name, !value)
  localStorageSetter('options', settings, true)
  return settings
}

/*
    Methods for the color of a row
*/
export function getColorFromStatus(columns: IColumnMetaData[], row: any, statuses: IStatus[], author: string) {
  const allStatuses = []
  for (let status of statuses) {
    let error = false
    for (let dep of status.dependencies) {
      const column = columns.find(col => col.id.toLowerCase() == dep.column.toLowerCase())
      if (column != undefined) {
        const rowValue = String(row[column.id])
        if (rowValue != undefined) {
          if (dep.status.toLowerCase() == 'author') dep.status = author
          if (dep.equal == true) {
            if (dep.status.toLowerCase() !== rowValue.toLowerCase()) {
              error = true
            }
          } else if (dep.equal == false) {
            if (dep.status.toLowerCase() == rowValue.toLowerCase()) {
              error = true
            }
          }
        } else error = true
      } else error = true
    }
    error == false ? allStatuses.push(status) : null
  }
  const priority = Math.max(...allStatuses.map(status => status.priority))
  if (allStatuses.length > 0) {
    return allStatuses.find(status => status.priority == priority)!.color
  } else {
    return '#FFFFFF'
  }
}

/*
  Methods for updating data, URL, ... everything data related
*/

export const assembleURL = (
  URL: string,
  filters: string[],
  athenaPagination: IPagination,
  athenaFilter: string,
  athenaSorting: SingleSorting,
  athenaNames: Object
) => {
  URL += `?pageSize=${athenaPagination.rowsPerPage}`
  if (athenaPagination.currentPage != undefined) {
    if (athenaPagination.currentPage == 0) {
      URL += `&page=1`
    } else {
      URL += `&page=${athenaPagination.currentPage}`
    }
  } else URL += `$page=1`

  // Add filter to URL if it exists
  if (athenaFilter != undefined) {
    URL += `&query=${athenaFilter}`
  } else {
    URL += `&query=`
  }

  filters = Array.from(new Set(filters))
  if (filters != undefined) {
    for (let filter of filters) {
      URL += filter
    }
  }

  // Add sorting to URL if there is sorting
  if (athenaSorting) {
    if (athenaNames[athenaSorting.column as keyof Object]) {
      URL += `&sort=${athenaNames[athenaSorting.column as keyof Object]}&order=${
        athenaSorting.sortDirection == 'asc' || athenaSorting.sortDirection == 'desc' ? athenaSorting.sortDirection : ''
      }`
    }
  }
  return encodeURI(URL)
}

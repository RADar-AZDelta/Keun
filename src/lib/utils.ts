import { browser } from '$app/environment'
import type { IColumnMetaData, IPagination } from 'svelte-radar-datatable'
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

export function localStorageGetter(key: string, mapReviver: boolean = false, json: boolean = true) {
  if (localStorage.getItem(key) != null) {
    if (mapReviver == true) return JSON.parse(localStorage.getItem(key)!, jsonMapReviver)
    else if (mapReviver == false && json == true) return JSON.parse(localStorage.getItem(key)!)
    else if (mapReviver == false && json == false) return localStorage.getItem(key)
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
  if (data['ADD_INFO:author1'] != '' && data['ADD_INFO:author1'] != undefined && data['ADD_INFO:author1'] != author) {
    return {
      first: author,
      second: data['ADD_INFO:author1'],
    }
  } else if (
    data['ADD_INFO:author1'] != '' &&
    data['ADD_INFO:author1'] != undefined &&
    data['ADD_INFO:author2'] != '' &&
    data['ADD_INFO:author2'] != undefined
  ) {
    return {
      first: author,
      second: data['ADD_INFO:author1'],
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
export function getColorFromStatus(
  row: any,
  columns: IColumnMetaData[],
  state: string,
  statuses: IStatus[],
  author: string
) {
  const allStatuses = []
  if (row != undefined) {
    for (let status of statuses) {
      let error = false
      for (let dep of status.dependencies) {
        const columnIndex = columns.findIndex(col => col.id.toLowerCase() == dep.column.toLowerCase())
        if (columnIndex != undefined) {
          let rowValue
          dep.column.toLowerCase() == 'mappingstatus' ? (rowValue = state) : (rowValue = String(row[columnIndex]))
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
      URL += `&sort=${athenaNames[athenaSorting.column as keyof Object]}&order=${athenaSorting.sortDirection == 'asc' || athenaSorting.sortDirection == 'desc' ? athenaSorting.sortDirection : ''
        }`
    }
  }
  return encodeURI(URL)
}

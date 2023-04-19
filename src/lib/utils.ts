import { browser } from '$app/environment'
import type { IColumnMetaData, IPagination } from '../../lib/RADar-DataTable/src/lib/components/DataTable'
import type { SingleSorting, IStatus } from './components/Types'

/*
    Basic helper methods
*/

export function mapReviver(key: string, value: any) {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value)
    }
  }
  return value
}

export function jsonMapReplacer(key: string, value: any) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()),
    }
  } else {
    return value
  }
}

export const getAuthor = (getAuthorEvent?: Function) => {
  let auth
  if (browser == true) {
    if (localStorage.getItem('author') !== null) {
      auth = localStorage.getItem('author')
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
  // Fill in old data to find authors
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

export const checkValuesOfAuthor = (data: any, columns: IColumnMetaData[]) => {
  const author1Index = columns.findIndex(col => col.id == 'ADD_INFO:author1')
  const author2Index = columns.findIndex(col => col.id == 'ADD_INFO:author2')
  const mappingStatusIndex = columns.findIndex(col => col.id == 'mappingStatus')
  const lastEditorIndex = columns.findIndex(col => col.id == 'ADD_INFO:lastEditor')
  const author = getAuthor()
  let value = ''
  if (author1Index != -1 && author2Index != -1 && mappingStatusIndex != -1 && lastEditorIndex != -1) {
    const author1 = data[author1Index]
    const author2 = data[author2Index]
    const mappingStatus = data[mappingStatusIndex]
    const lastEditor = data[lastEditorIndex]
    if (author1 != undefined && author2 != undefined) {
      if (author1 == '') {
        if (author2 == '' && mappingStatus == '' && lastEditor == '') {
          value = 'ADD_INFO:author1'
        } else
          console.warn(
            'Author 1 is empty and somehow there is a second author or a mapping status or a last editor filled in'
          )
      } else if (author1 != '') {
        if (mappingStatus != 'APPROVED') {
          return 'ADD_INFO:author1'
        } else if (mappingStatus == 'APPROVED') {
          if (lastEditor == author) {
            return 'ADD_INFO:author1'
          } else {
            return 'ADD_INFO:author2'
          }
        }
      }
      return value
    }
  }
  return ''
}

export const updateSettings = async (settings: Map<string, boolean>, name: string, value: boolean) => {
  settings.set(name, !value)
  console.log('HEY THERE ', settings)
  localStorage.setItem('options', JSON.stringify(settings, jsonMapReplacer))
  return settings
}

/*
    Methods for the color of a row
*/
export function checkStatuses(scheme: IColumnMetaData[], statuses: IStatus[], data: any) {
  const allStatuses = []
  for (let status of statuses) {
    allStatuses.push(status)
    for (let dep of status.dependencies) {
      if (dep.equal == true) {
        if (
          dep.status.toLowerCase() !=
          data[scheme.indexOf(scheme.filter(col => col.id.toLowerCase() == dep.column.toLowerCase())[0])].toLowerCase()
        ) {
          allStatuses.splice(allStatuses.indexOf(status), 1)
        }
      } else if (dep.equal == false) {
        if (
          dep.status.toLowerCase() ==
          data[scheme.indexOf(scheme.filter(col => col.id.toLowerCase() == dep.column.toLowerCase())[0])].toLowerCase()
        ) {
          allStatuses.splice(allStatuses.indexOf(status), 1)
        }
      }
    }
  }
  if (allStatuses.length > 0) {
    return true
  } else {
    return false
  }
}

export function getColorFromStatus(columns: IColumnMetaData[], row: any, statuses: IStatus[], author: string) {
  const allStatuses = []
  for (let status of statuses) {
    let error = false
    for (let dep of status.dependencies) {
      const column = columns.find(col => col.id.toLowerCase() == dep.column.toLowerCase())
      if (column != undefined) {
        const rowValue = row[column.id]
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
  console.log('FILTER ', athenaFilter)
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

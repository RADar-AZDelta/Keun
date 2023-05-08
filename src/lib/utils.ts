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
  if (!item)
    return undefined
  return JSON.parse(item, jsonMapReviver)
}

export const checkForScroll = (list: any[], limit: number): 'scroll' | null | undefined => {
  if (list.length > limit) return 'scroll'
  else return null
}

export const updateSettings = async (
  settings: Map<string, boolean | string | number>,
  name: string,
  value: boolean | string | number
) => {
  settings.set(name, value)
  localStorageSetter('options', settings, true)
  return settings
}

/*
    Methods for the color of a cell / row
*/

export function getColorFromStatus(row: Record<string, any>, state: string | undefined, statuses: IStatus[]) {
  const allStatuses = []
  if (row != undefined) {
    for (let status of statuses) {
      let error = false
      for (let dep of status.dependencies) {
        let rowValue
        dep.column.toLowerCase() == 'mappingstatus'
          ? state != undefined
            ? (rowValue = state)
            : (rowValue = row[dep.column])
          : (rowValue = row[dep.column])
        if (String(rowValue) != undefined) {
          if (dep.equal == true) {
            if (
              String(dep.status).toLowerCase().replaceAll(' ', '') !==
              String(rowValue).toLowerCase().replaceAll(' ', '')
            ) {
              error = true
            }
          } else if (dep.equal == false) {
            if (
              String(dep.status).toLowerCase().replaceAll(' ', '') == String(rowValue).toLowerCase().replaceAll(' ', '')
            ) {
              error = true
            }
          }
        } else error = true
      }
      error == false ? allStatuses.push(status) : null
    }
  }
  const priority = Math.max(...allStatuses.map(status => status.priority))
  if (allStatuses.length > 0) return allStatuses.find(status => status.priority == priority)!.color
  else return 'inherit'
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
  URL += `pageSize=${athenaPagination.rowsPerPage}`
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

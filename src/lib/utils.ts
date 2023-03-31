import { browser } from '$app/environment'
import type IFilter from '../../lib/RADar-DataTable/src/lib/interfaces/IFilter'
import type IMapper from '../../lib/RADar-DataTable/src/lib/interfaces/IMapper'
import type IPaginated from '../../lib/RADar-DataTable/src/lib/interfaces/IPaginated'
import type IScheme from '../../lib/RADar-DataTable/src/lib/interfaces/IScheme'
import type ISort from '../../lib/RADar-DataTable/src/lib/interfaces/ISort'
import type IStatus from '../../lib/RADar-DataTable/src/lib/interfaces/IStatus'
import type IMapping from './interfaces/IMapping'
import type IOption from './interfaces/IOption'

/*
    Basic helper methods
*/

export const getAuthor = (getAuthorEvent?: Function) => {
  let auth
  if (browser == true) {
    if (localStorage.getItem('author') !== null) {
      auth = localStorage.getItem('author')
    } else {
      if (getAuthorEvent != undefined) getAuthorEvent()
      else console.warn('No author found')
    }
  } else auth = 'SSR author'

  return auth
}

export const checkForAuthor = (newData: any, oldData: any, oldColumns: IScheme[], row: any) => {
  // Fill in old data to find authors
  const author1Index = oldColumns.findIndex(col => col.column == 'ADD_INFO:author1')
  const author2Index = oldColumns.findIndex(col => col.column == 'ADD_INFO:author2')
  if (oldData[author1Index] != '' && oldData[author1Index] != undefined && oldData[author1Index] != getAuthor()) {
    newData['ADD_INFO:author1'] = getAuthor()
    newData['ADD_INFO:author2'] = oldData[author1Index]
  } else if (
    oldData[author1Index] != '' &&
    oldData[author1Index] != undefined &&
    oldData[author2Index] != '' &&
    oldData[author2Index] != undefined
  ) {
    const previousAuthor = oldData[author1Index]
    newData['ADD_INFO:author1'] = getAuthor()
    newData['ADD_INFO:author2'] = previousAuthor
  } else {
    newData['ADD_INFO:author1'] = getAuthor()
    oldData[author1Index] = getAuthor()
    newData['ADD_INFO:author2'] = ''
  }
  return newData
}

export const updateSettings = async (option: IOption) => {
  const oldOptions = JSON.parse(localStorage.getItem('options')!)
  let updateOption = oldOptions.find((opt: IOption) => opt.name == option.name)
  oldOptions.splice(oldOptions.indexOf(updateOption), 1)
  updateOption.value = option.value
  oldOptions.push(updateOption)
  localStorage.setItem('options', JSON.stringify(oldOptions))
}

/*
    Methods for the color of a row
*/
export function checkStatuses(scheme: IScheme[], statuses: IStatus[], data: any) {
  const allStatuses = statuses.filter(obj => {
    const index = scheme.indexOf(scheme.filter(col => col.column.toLowerCase() == obj.column.toLowerCase())[0])
    if (index != -1 && data.length > 0) {
      if (data[index] != undefined && data[index] != '') {
        if (obj.status.toLowerCase() == data[index].toLowerCase()) {
          return obj
        }
      }
    } else {
      return false
    }
  })
  if (allStatuses.length > 0) {
    return true
  } else {
    return false
  }
}

export function getColorFromStatus(scheme: IScheme[], row: number, statuses: IStatus[], data: any) {
  const allStatuses = statuses.filter(obj => {
    if (
      obj.status.toLowerCase() ==
      data[row][
        scheme.indexOf(scheme.filter(col => col.column.toLowerCase() == obj.column.toLowerCase())[0])
      ].toLowerCase()
    ) {
      return obj
    }
  })
  const priority = Math.max(...allStatuses.map(status => status.priority))
  const status = allStatuses.filter(status => status.priority == priority)[0]
  return status.color
}

/*
  Methods for updating data, URL, ... everything data related
*/

export const updateData = async (
  worker: Worker | undefined,
  index: string,
  value: string,
  filters: IFilter[],
  sorting: ISort[],
  pagination: IPaginated,
  columns: IScheme[],
  mapper: IMapper
): Promise<void> => {
  worker?.postMessage({
    editData: {
      index: index,
      value: value,
    },
    filter: filters,
    order: sorting,
    pagination: pagination,
    columns: columns,
    mapper: mapper,
    extraChanges: [
      {
        column: 'createdBy',
        value: getAuthor(),
      },
    ],
  })
}

export const assembleURL = (
  URL: string,
  filters: string[],
  athenaPagination: IPaginated,
  athenaFilter: string,
  athenaSorting: ISort,
  athenaColumn: string,
  athenaNames: Object,
  selectedRow: number,
  selectedRowPage: number,
  columns: IScheme[],
  data: any,
  columnChange: boolean = false
) => {
  let filterUpdate: boolean = false
  URL += `?pageSize=${athenaPagination.rowsPerPage}`
  if (athenaPagination.currentPage != undefined) {
    if (athenaPagination.currentPage == 0) {
      URL += `&page=1`
    } else {
      URL += `&page=${athenaPagination.currentPage}`
    }
  } else URL += `$page=1`

  // Add filter to URL if it exists
  if (columnChange == false) {
    if (athenaFilter != 'undefined' && athenaFilter != undefined && !athenaFilter.includes('undefined')) {
      URL += `&query=${athenaFilter}`
      filterUpdate = true
    } else if (selectedRow != undefined && selectedRowPage != undefined) {
      const index = columns.indexOf(columns.filter(col => col.column == athenaColumn)[0])
      const sourceName = data[selectedRowPage][index]
      athenaFilter = sourceName
      filterUpdate = true
      URL += `&query=${sourceName}`
    } else {
      URL += `&query=`
    }
  } else {
    if (columns.length > 0) {
      const index = columns.indexOf(columns.filter(col => col.column.toLowerCase() == athenaColumn.toLowerCase())[0])
      if (isNaN(selectedRowPage)) selectedRowPage = 0
      const sourceName = data[selectedRowPage][index]
      athenaFilter = sourceName
      filterUpdate = true
      URL += `&query=${sourceName}`
    }
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
        athenaSorting.direction == 2 ? 'desc' : 'asc'
      }`
    }
  }
  if (filterUpdate == true) {
    return {
      URL: encodeURI(URL),
      filter: athenaFilter,
    }
  } else {
    return {
      URL: encodeURI(URL),
    }
  }
}

/*
  Methods for mapping
*/

export const createMapping = async (
  id: string,
  athenaPagination: IPaginated,
  athenaColumns: IScheme[],
  athenaData: any,
  equivalenceMapping: string,
  selectedRow: number,
  columns: IScheme[],
  data: any
): Promise<IMapping> => {
  const row = Number(id) - athenaPagination.rowsPerPage * (athenaPagination.currentPage - 1)
  let rowValues = athenaData[row]
  rowValues.equivalence = equivalenceMapping
  rowValues.author = getAuthor()
  rowValues = await checkForAuthor(rowValues, data[selectedRow], columns, selectedRow)
  const mapping: IMapping = {
    row: selectedRow,
    columns: athenaColumns,
    data: rowValues,
  }

  return mapping
}

export const createMappingMultiple = async (
  athenaColumns: IScheme[],
  athenaData: any,
  athenaRows: number[],
  equivalenceMapping: string,
  selectedRow: number,
  columns: IScheme[],
  data: any
) => {
  let count = 0
  const multipleMapping: IMapping[] = []
  for (let athenaRow of athenaRows) {
    const rowIndex = athenaData.findIndex((obj: any) => obj.id == athenaRow)
    let rowValues = athenaData[rowIndex]
    rowValues.equivalence = equivalenceMapping
    rowValues.author = getAuthor()
    rowValues = await checkForAuthor(rowValues, data[selectedRow], columns, selectedRow)
    multipleMapping.push({
      row: selectedRow,
      columns: athenaColumns,
      data: rowValues,
    })
    count += 1
  }
  return multipleMapping
}

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
      else {
        auth = 'Placeholder author'
        console.warn('No author found')
      }
    }
  } else auth = 'SSR author'
  return auth
}

export const checkForAuthor = (newData: any, oldData: any, oldColumns: IScheme[], row: any) => {
  // Fill in old data to find authors
  const author1Index = oldColumns.findIndex(col => col.column == 'ADD_INFO:author1')
  const author2Index = oldColumns.findIndex(col => col.column == 'ADD_INFO:author2')
  if (oldData[author1Index] != '' && oldData[author1Index] != undefined && oldData[author1Index] != getAuthor()) {
    console.log('SCENARIO 1')
    newData['ADD_INFO:author1'] = getAuthor()
    newData['ADD_INFO:author2'] = oldData[author1Index]
  } else if (
    oldData[author1Index] != '' &&
    oldData[author1Index] != undefined &&
    oldData[author2Index] != '' &&
    oldData[author2Index] != undefined
  ) {
    console.log('SCENARIO 2')
    const previousAuthor = oldData[author1Index]
    newData['ADD_INFO:author1'] = getAuthor()
    newData['ADD_INFO:author2'] = previousAuthor
  } else {
    console.log('SCENARIO 3')
    newData['ADD_INFO:author1'] = getAuthor()
    oldData[author1Index] = getAuthor()
    newData['ADD_INFO:author2'] = ''
  }
  return newData
}

export const checkValuesOfAuthor = (data: any, columns: IScheme[]) => {
  const author1Index = columns.findIndex(col => col.column == 'ADD_INFO:author1')
  const author2Index = columns.findIndex(col => col.column == 'ADD_INFO:author2')
  const mappingStatusIndex = columns.findIndex(col => col.column == 'mappingStatus')
  const lastEditorIndex = columns.findIndex(col => col.column == 'ADD_INFO:lastEditor')
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

export const checkAllValuesOfAuthor = (data: any, columns: IScheme[]) => {
  let authorCols = []
  for (let row of data) {
    // TODO: return columns for rows when action on full page
    const author1Index = columns.findIndex(col => col.column == 'ADD_INFO:author1')
    const author2Index = columns.findIndex(col => col.column == 'ADD_INFO:author2')
    const mappingStatusIndex = columns.findIndex(col => col.column == 'mappingStatus')
    const lastEditorIndex = columns.findIndex(col => col.column == 'ADD_INFO:lastEditor')
    const author = getAuthor()
    let value = ''
    if (author1Index != -1 && author2Index != -1 && mappingStatusIndex != -1 && lastEditorIndex != -1) {
      const author1 = row[author1Index]
      const author2 = row[author2Index]
      const mappingStatus = row[mappingStatusIndex]
      const lastEditor = row[lastEditorIndex]
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
        authorCols.push(value)
      }
    }
  }
  return authorCols
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
  const allStatuses = []
  for (let status of statuses) {
    allStatuses.push(status)
    for (let dep of status.dependencies) {
      if (dep.equality == 'equal') {
        if (
          dep.status.toLowerCase() !=
          data[
            scheme.indexOf(scheme.filter(col => col.column.toLowerCase() == dep.column.toLowerCase())[0])
          ].toLowerCase()
        ) {
          allStatuses.splice(allStatuses.indexOf(status), 1)
        }
      } else if (dep.equality == 'not equal') {
        if (
          dep.status.toLowerCase() ==
          data[
            scheme.indexOf(scheme.filter(col => col.column.toLowerCase() == dep.column.toLowerCase())[0])
          ].toLowerCase()
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

export function getColorFromStatus(scheme: IScheme[], row: number, statuses: IStatus[], data: any) {
  const allStatuses = []
  // TODO: fix issue with author --> when author is changed it doesnt change in statuses
  for (let status of statuses) {
    allStatuses.push(status)
    for (let dep of status.dependencies) {
      if (dep.equality == 'equal') {
        if (dep.status.toLowerCase() == 'author') dep.status = getAuthor()!
        if (
          dep.status.toLowerCase() !=
          data[row][
            scheme.indexOf(scheme.filter(col => col.column.toLowerCase() == dep.column.toLowerCase())[0])
          ].toLowerCase()
        ) {
          allStatuses.splice(allStatuses.indexOf(status), 1)
        }
      } else if (dep.equality == 'not equal') {
        if (
          dep.status.toLowerCase() ==
          data[row][
            scheme.indexOf(scheme.filter(col => col.column.toLowerCase() == dep.column.toLowerCase())[0])
          ].toLowerCase()
        ) {
          allStatuses.splice(allStatuses.indexOf(status), 1)
        }
      }
    }
  }
  const priority = Math.max(...allStatuses.map(status => status.priority))
  if (allStatuses.length > 0) {
    const status = allStatuses.filter(status => status.priority == priority)[0]
    return status.color
  } else {
    return '#000000'
  }
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
      {
        column: 'ADD_INFO:lastEditor',
        value: getAuthor(),
      },
      {
        column: 'ADD_INFO:author1',
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
  rowValues['ADD_INFO:lastEditor'] = getAuthor()
  console.log('PRE')
  rowValues = await checkForAuthor(rowValues, data[selectedRow], columns, selectedRow)
  console.log('AFTER')
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

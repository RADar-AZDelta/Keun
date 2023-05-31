<script lang="ts">
  import columnsUsagi from '$lib/data/columnsUsagi.json'
  import columnsAthena from '$lib/data/columnsAthena.json'
  import Header from '$lib/components/Extra/Header.svelte'
  import User from '$lib/components/Extra/User.svelte'
  import type {
    ActionPerformedEventDetail,
    DeleteRowEventDetail,
    FilterOptionsChangedEventDetail,
    MultipleMappingEventDetail,
    SingleMappingEventDetail,
    VisibilityChangedEventDetail,
    RowChangeEventDetail,
    DeleteRowInnerMappingEventDetail,
    CustomMappingEventDetail,
    FileUploadedEventDetail,
    SettingsChangedEventDetail,
    AutoMapRowEventDetail,
    UpdateDetailsEventDetail,
  } from '$lib/components/Types'
  import type { IColumnMetaData, IPagination, SortDirection, TFilter } from '@radar-azdelta/svelte-datatable'
  import { localStorageGetter, localStorageSetter } from '$lib/utils'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import UsagiRow from '$lib/components/Mapping/UsagiRow.svelte'
  import { onMount, tick } from 'svelte'
  import { query } from 'arquero'
  import Download from '$lib/components/Extra/Download.svelte'
  import Settings from '$lib/components/Extra/Settings.svelte'
  import { LatencyOptimisedTranslator } from '@browsermt/bergamot-translator/translator.js'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import { page } from '$app/stores'
  import { browser, dev } from '$app/environment'
  import DragAndDrop from '$lib/components/Extra/DragAndDrop.svelte'
  import Spinner from '$lib/components/Extra/Spinner.svelte'
  import DataTable from '@radar-azdelta/svelte-datatable'
  import Manual from '$lib/components/Extra/Manual.svelte'

  let file: File | undefined
  let currentFileName: string | undefined = undefined
  let params = ['standardConcept', 'vocabulary', 'invalidReason', 'domain', 'conceptClass']

  let settings: Record<string, any> | undefined = undefined
  let translator: LatencyOptimisedTranslator

  let mappingVisibility: boolean = false
  let uploaded: boolean = false

  let apiFilters: string[] = ['&standardConcept=Standard']
  let equivalenceMapping: string = 'EQUAL'
  let selectedRow: Record<string, any>
  let selectedRowIndex: number
  let rowsMapping = new Map<number, Record<string, any>>()

  let mappingUrl: string = import.meta.env.VITE_MAPPINGDATA_PATH
  let url: string
  let athenaFiltering: string
  let athenaFilters: Map<string, string[]>
  let lastFilter: string

  let tableInit: boolean = false
  let progressInit: boolean = false
  let mappingStatusChanged: boolean = false
  let currentRows: Map<number, Record<string, any>> = new Map<number, Record<string, any>>()
  let totalRows: number | undefined = undefined
  let mappedRows: number | undefined = undefined
  let approvedRows: number | undefined = undefined
  let globalAthenaFilter = { column: 'all', filter: undefined }

  let athenaFacets: Record<string, any> | undefined = undefined

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////

  let dataTableFile: DataTable
  let dataTableCustomConcepts: DataTable

  let columns: IColumnMetaData[] | undefined = undefined // dataTableColumns
  let customConceptsColumns: IColumnMetaData[] = [
    {
      id: 'concept_id',
    },
    {
      id: 'concept_name',
    },
    {
      id: 'domain_id',
    },
    {
      id: 'vocabulary_id',
    },
    {
      id: 'concept_class_id',
    },
    {
      id: 'standard_concept',
    },
    {
      id: 'concept_code',
    },
    {
      id: 'valid_start_date',
    },
    {
      id: 'valid_end_date',
    },
    {
      id: 'invalid_reason',
    },
  ]

  let customConceptsArrayOfObjects: Record<string, any>[] = [{}]

  let importantAthenaColumns = new Map<string, string>([
    ['id', 'conceptId'],
    ['name', 'conceptName'],
    ['domain', 'domainId'],
  ])
  let additionalFields: Record<string, any> = {
    matchScore: 0,
    statusSetBy: null,
    statusSetOn: 0,
    mappingType: null,
    comment: null,
    createdBy: null,
    createdOn: 0,
    assignedReviewer: null,
    equivalence: null,
    sourceAutoAssignedConceptIds: null,
    'ADD_INFO:approvedBy': null,
    'ADD_INFO:approvedOn': null,
    'ADD_INFO:additionalInfo': null,
    'ADD_INFO:prescriptionID': null,
    'ADD_INFO:ATC': null,
    'ADD_INFO:numberOfConcepts': null,
    'ADD_INFO:customConcept': null,
    mappingStatus: null,
  }

  let autoMappingAbortController: AbortController
  let autoMappingPromise: Promise<void> | undefined

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // When there is a new file uploaded
  async function onFileInputChange(e: Event) {
    if (dev) console.log('onFileInputChange: New file uploaded')
    uploaded = true
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()
    columns = undefined
    file = undefined
    await tick()

    const allowedExtensions = ['csv', 'json']
    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return

    // Check the files if the extension is allowed
    for (const f of inputFiles) {
      const extension = f.name.split('.').pop()
      if (extension && allowedExtensions.includes(extension)) {
        file = f
        currentFileName = f.name
        break
      }
    }
  }

  // When there is a new file uploaded for the first time (drag & drop)
  async function fileUploaded(e: CustomEvent<FileUploadedEventDetail>) {
    if (dev) console.log('fileUploaded: New file uploaded')
    uploaded = true
    file = e.detail.file
    currentFileName = e.detail.file.name
  }

  // When the visibility of the mapping pop-up changes
  function mappingVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    if (dev)
      console.log('mappingVisibilityChanged: Visibility of the mapping pop-up changed to ', event.detail.visibility)
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()

    // Change the visiblity and update the selected row and index if there is a new row selected
    globalAthenaFilter.filter = undefined
    mappingVisibility = event.detail.visibility
    if (event.detail.data) {
      selectedRow = event.detail.data.row
      selectedRowIndex = event.detail.data.index
    }
    // Reset the athena filter
    athenaFiltering = ''
  }

  // When the filters in the Athena pop-up change (filters on the left-side for the query)
  function filterOptionsChanged(event: CustomEvent<FilterOptionsChangedEventDetail>) {
    if (dev) console.log('filterOptionsChanged: Filters in the Athena pop-up changed to ', event.detail.filters)
    if (event.detail.filters) {
      athenaFilters = event.detail.filters
      apiFilters = []
      // Transform the filters to a string that can be used in the query for Athena
      for (let [filter, options] of athenaFilters) {
        const substring = options.map(option => `&${filter}=${option}`).join()
        if (!apiFilters.includes(substring)) apiFilters.push(substring)
      }
      apiFilters = apiFilters
      // Update the update fetch function so the table will be initialized again
      fetchDataFunc = fetchData
    }
  }

  // When the mapping button in the Athena pop-up is clicked and the settins "Map to multiple concepts" is disabled
  async function singleMapping(event: CustomEvent<SingleMappingEventDetail>) {
    if (dev) console.log('singleMapping: Single mapping for the row with sourceCode ', selectedRow.sourceCode)
    // Map the selected row with the selected concept
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow!, event.detail.row)
    // Add extra information like the number of concepts mapped for this row, comments & the assigned reviewer to the row
    if (!mappedRow['ADD_INFO:numberOfConcepts']) mappedRow['ADD_INFO:numberOfConcepts'] = 1
    if (event.detail.extra) {
      mappedRow.comment = event.detail.extra.comment
      mappedRow.assignedReviewer = event.detail.extra.assignedReviewer
    }
    // Update the selected row to the updated row
    mappedRow['ADD_INFO:lastAthenaFilter'] = lastFilter
    await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
    calculateProgress()
  }

  async function customMapping(event: CustomEvent<CustomMappingEventDetail>) {
    if (dev) console.log('customMapping: Custom mapping for the row with sourceCode ', selectedRow.sourceCode)
    // Remove the first empty object from the array (this empty object is needed to determain the datatype)
    if (customConceptsArrayOfObjects.length > 0) {
      if (Object.keys(customConceptsArrayOfObjects[0]).length == 0) {
        customConceptsArrayOfObjects = []
      }
    }
    const customConcept = {
      concept_id: event.detail.conceptId,
      concept_name: event.detail.conceptName,
      domain_id: event.detail.domainId,
      vocabulary_id: event.detail.vocabularyId,
      concept_class_id: event.detail.conceptClassId,
      standard_concept: event.detail.standardConcept,
      concept_code: event.detail.conceptCode,
      valid_start_date: event.detail.validStartDate,
      valid_end_date: event.detail.validEndDate,
      invalid_reason: event.detail.invalidReason,
    }
    customConceptsArrayOfObjects.push(customConcept)
    customConceptsArrayOfObjects = customConceptsArrayOfObjects

    // Map the selected row with the custom concept
    const { mappedIndex, mappedRow } = await customRowMapping(selectedRow, customConcept)
    if (!mappedRow['ADD_INFO:numberOfConcepts']) mappedRow['ADD_INFO:numberOfConcepts'] = 1
    if (settings) {
      if (settings.mapToMultipleConcepts) {
        // Get previous mapped concepts
        const q = query()
          .params({ sourceCode: mappedRow.sourceCode })
          .filter((r: any, params: any) => r.sourceCode == params.sourceCode)
          .toObject()
        const res = await dataTableFile.executeQueryAndReturnResults(q)
        // Add extra information like the number of concepts mapped for this row, comments & the assigned reviewer to the row
        if (event.detail.extra) {
          mappedRow.comment = event.detail.extra.comment
          mappedRow.assignedReviewer = event.detail.extra.assignedReviewer
        }
        if (res.queriedData.length === 1 && !res.queriedData[0].conceptId) {
          mappedRow['ADD_INFO:numberOfConcepts'] = 1
          await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
        } else {
          mappedRow['ADD_INFO:numberOfConcepts'] = res.queriedData.length + 1
          const rowsToUpdate = new Map()
          // Update the number of concepts in the already mapped rows
          for (let index of res.indices) {
            rowsToUpdate.set(index, { 'ADD_INFO:numberOfConcepts': res.queriedData.length + 1 })
          }
          await dataTableFile.updateRows(rowsToUpdate)
          await dataTableFile.insertRows([mappedRow])
        }
      }
    }

    calculateProgress()
  }

  // When the mapping button in the Athena pop-up is clicked and the settins "Map to multiple concepts" is enabled
  async function multipleMapping(event: CustomEvent<MultipleMappingEventDetail>) {
    if (dev) console.log('multipleMapping: Multiple mapping for the row with sourceCode ', selectedRow.sourceCode)
    // Map the selected row with the selected concept
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow!, event.detail.row)

    // Create a query and execute it to get all the rows that are already mapped and got the same sourceCode
    const q = query()
      .params({ value: mappedRow.sourceCode })
      .filter((r: any, params: any) => r.sourceCode == params.value)
      .toObject()
    const res = await dataTableFile.executeQueryAndReturnResults(q)

    // Add extra information like the number of concepts mapped for this row, comments & the assigned reviewer to the row
    mappedRow.mappingStatus = 'SEMI-APPROVED'
    mappedRow.statusSetBy = settings!.author
    mappedRow.comment = event.detail.extra!.comment
    mappedRow.assignedReviewer = event.detail.extra!.assignedReviewer
    mappedRow['ADD_INFO:lastAthenaFilter'] = lastFilter

    // Check if it's the first concept that will be mapped to this row
    if (res.queriedData.length === 1 && !res.queriedData[0].conceptId) {
      // This is the first concepts mapped to the row and the current row wil be updated
      mappedRow['ADD_INFO:numberOfConcepts'] = 1
      await dataTableFile.updateRows(new Map([[res.indices[0], mappedRow]]))
    } else {
      // This is not the first concept mapped to the row and the current row will be added to the table and the others will be updated
      mappedRow['ADD_INFO:numberOfConcepts'] = res.queriedData.length + 1
      const rowsToUpdate = new Map()
      // Update the number of concepts in the already mapped rows
      for (let index of res.indices) {
        rowsToUpdate.set(index, { 'ADD_INFO:numberOfConcepts': res.queriedData.length + 1 })
      }
      await dataTableFile.updateRows(rowsToUpdate)
      await dataTableFile.insertRows([mappedRow])
    }
    calculateProgress()
  }

  async function updateDetailsRow(event: CustomEvent<UpdateDetailsEventDetail>) {
    await dataTableFile.updateRows(
      new Map([
        [event.detail.index, { comment: event.detail.comment, assignedReviewer: event.detail.assignedReviewer }],
      ])
    )
  }

  // When a action (approve, flag, unapprove) button is clicked (left-side of the table in the action column)
  async function actionPerformed(event: CustomEvent<ActionPerformedEventDetail>) {
    if (dev)
      console.log(
        `actionPerformed: Action performed (${event.detail.action}) for the row with sourceCode ${event.detail.row.sourceCode}`
      )
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()
    const updatingObj: { [key: string]: any } = {}

    // Check if the action is already set for the row and if so, remove it
    if (event.detail.action === event.detail.row.mappingStatus && event.detail.action !== 'APPROVED') {
      updatingObj.mappingStatus = null
      if (event.detail.row['ADD_INFO:approvedBy']) {
        updatingObj['ADD_INFO:approvedBy'] = null
        updatingObj['ADD_INFO:approvedOn'] = 0
      }
      if (event.detail.row.statusSetBy) {
        updatingObj.statusSetBy = null
        updatingObj.statusSetOn = 0
      }
    } else {
      // Check if there is a conceptId or a sourceAutoAssignedConceptIds (this is the conceptId that is assigned by the automapping proces)
      if (event.detail.action == 'APPROVED') {
        if (event.detail.row.statusSetBy == undefined || event.detail.row.statusSetBy == settings!.author) {
          // If statusSetBy is empty, it means the author is the first reviewer of this row
          updatingObj.statusSetBy = settings!.author
          updatingObj.statusSetOn = Date.now()
          updatingObj.mappingStatus = 'SEMI-APPROVED'
          if (!event.detail.row.conceptId) updatingObj.conceptId = event.detail.row.sourceAutoAssignedConceptIds
          else updatingObj.conceptId = event.detail.row.conceptId
        } else if (event.detail.row.statusSetBy && event.detail.row.statusSetBy != settings!.author) {
          // StatusSetBy is not empty and it's not the current author so it means it's the second reviewer
          updatingObj['ADD_INFO:approvedBy'] = settings!.author
          updatingObj['ADD_INFO:approvedOn'] = Date.now()
          updatingObj.mappingStatus = 'APPROVED'
        }
      } else {
        updatingObj.statusSetBy = settings!.author
        updatingObj.statusSetOn = Date.now()
        updatingObj.mappingStatus = event.detail.action
      }
    }
    await dataTableFile.updateRows(new Map([[event.detail.index, updatingObj]]))
    calculateProgress()
  }

  // When the delete button is clicked (left-side of the table in the action column)
  async function deleteRow(event: CustomEvent<DeleteRowEventDetail>) {
    if (dev)
      console.log(
        'deleteRow: Delete row with sourceCode ',
        event.detail.sourceCode,
        ' on indexes ',
        event.detail.indexes
      )
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()

    if (event.detail.custom) {
      await dataTableCustomConcepts.deleteRows(event.detail.indexes)
    }

    // If it not the only concept that is mapped for that row (multiple mapping), erase the row
    if (event.detail.erase == true) {
      // Create a query to get all the rows that has the same sourceCode (row mapped to multiple concepts)
      const q = query()
        .params({ source: event.detail.sourceCode })
        .filter((r: any, params: any) => r.sourceCode == params.source)
        .toObject()
      const res = await dataTableFile.executeQueryAndReturnResults(q)
      if (res.queriedData.length >= 1) {
        const rowsToUpdate = new Map()
        // Update the all the rows and set the number of concepts - 1
        for (let index of res.indices) {
          rowsToUpdate.set(index, { 'ADD_INFO:numberOfConcepts': res.queriedData.length - 1 })
        }
        await dataTableFile.updateRows(rowsToUpdate)
      }
      await dataTableFile.deleteRows(event.detail.indexes)
    } else {
      // When the mapping is one on one, erase the mapping from that row
      const updatedFields = additionalFields
      updatedFields.conceptId = null
      updatedFields.domainId = null
      updatedFields.conceptName = null
      updatedFields['ADD_INFO:customConcept'] = null
      delete updatedFields.sourceAutoAssignedConceptIds
      await dataTableFile.updateRows(new Map([[event.detail.indexes[0], updatedFields]]))
    }
    calculateProgress()
  }

  async function deleteRowInnerMapping(event: CustomEvent<DeleteRowInnerMappingEventDetail>) {
    if (dev) console.log('deleteRowInnerMapping: Delete mapping with conceptId ', event.detail.conceptId)
    if (event.detail.custom) {
      for (let row of customConceptsArrayOfObjects) {
        if (row.concept_id === event.detail.conceptId && row.concept_name === event.detail.conceptName) {
          const index = customConceptsArrayOfObjects.indexOf(row)
          customConceptsArrayOfObjects.splice(index, 1)
          customConceptsArrayOfObjects = customConceptsArrayOfObjects
        }
      }
    }
    const q = query()
      .params({
        conceptId: event.detail.conceptId,
        sourceCode: selectedRow.sourceCode,
        conceptName: event.detail.conceptName,
      })
      .filter(
        (r: any, params: any) =>
          r.conceptId == params.conceptId && r.sourceCode == params.sourceCode && r.conceptName == params.conceptName
      )
      .toObject()
    const res = await dataTableFile.executeQueryAndReturnResults(q)
    if (event.detail.erase) {
      const q = query()
        .params({ sourceCode: selectedRow.sourceCode })
        .filter((r: any, params: any) => r.sourceCode == params.sourceCode)
        .toObject()
      const res2 = await dataTableFile.executeQueryAndReturnResults(q)
      const updatedRows = new Map<number, Record<string, any>>()
      res2.indices.forEach((index: number) => {
        updatedRows.set(index, { 'ADD_INFO:numberOfConcepts': res2.indices.length - 1 })
      })
      await dataTableFile.updateRows(updatedRows)
      await dataTableFile.deleteRows(res.indices)
    } else {
      const updatedFields = additionalFields
      updatedFields.conceptId = null
      updatedFields.domainId = null
      updatedFields['ADD_INFO:numberOfConcepts'] = 1
      delete updatedFields.sourceAutoAssignedConceptIds
      await dataTableFile.updateRows(new Map([[res.indices[0], updatedFields]]))
    }
  }

  // When the arrow button in the Athena pop-up is clicked to navigate to a different row
  async function selectRow(event: CustomEvent<RowChangeEventDetail>) {
    globalAthenaFilter.filter = undefined
    const tablePagination = await dataTableFile.getTablePagination()
    if (event.detail.up && selectedRowIndex + 1 < tablePagination.totalRows!) selectedRowIndex += 1
    if (!event.detail.up && selectedRowIndex - 1 >= 0) selectedRowIndex -= 1

    if (dev) console.log('selectRow: Select row with index ', selectedRowIndex)

    selectedRow = await dataTableFile.getFullRow(selectedRowIndex)
    athenaFiltering = selectedRow.sourceName
    fetchDataFunc = fetchData

    // When the index exceeds the number of rows per page, go to the next page
    if (event.detail.up && selectedRowIndex !== 0) {
      if (selectedRowIndex % tablePagination.rowsPerPage! === 0) {
        dataTableFile.changePagination({ currentPage: tablePagination.currentPage! + 1 })
      }
    } else if (!event.detail.up && selectedRowIndex !== 0) {
      if ((selectedRowIndex + 1) % tablePagination.rowsPerPage! === 0) {
        dataTableFile.changePagination({ currentPage: tablePagination.currentPage! - 1 })
      }
    }
  }

  async function autoMapSingleRow(event: CustomEvent<AutoMapRowEventDetail>) {
    if (dev) console.log('autoMapSingleRow: automap the row with index ', event.detail.index)
    // Automap a row manually
    if (autoMappingPromise) autoMappingAbortController.abort()
    // Create a abortcontroller to abort the auto mapping in the future if needed
    autoMappingAbortController = new AbortController()
    const signal = autoMappingAbortController.signal
    autoMappingPromise = new Promise(async (resolve, reject): Promise<void> => {
      const row = await dataTableFile.getFullRow(event.detail.index)
      await autoMapRow(signal, row, event.detail.index)
    })
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  async function translate(text: string) {
    if (browser) {
      if (!translator) {
        // Recreate a translator if it's a browser because the previous instance is still pending and can't be used
        translator = new LatencyOptimisedTranslator(
          {
            workers: 1,
            batchSize: 1,
            registryUrl: 'bergamot/registry.json',
            html: true,
          },
          undefined
        )
      }
    }
    let translation = await translator.translate({
      from: settings!.language,
      to: 'en',
      text: text,
      html: true,
    })
    let result = translation.target.text
    return result
  }

  // A method to automatically map a given row
  async function autoMapRow(signal: AbortSignal, row: Record<string, any>, index: number) {
    let start: number, end: number
    if (dev) {
      start = performance.now()
      console.log('autoMapRow: Start automapping row with index ', index)
    }
    // When the signal is aborted quit the method
    if (signal.aborted) return
    let filter = row.sourceName
    // Check the language set in the settings and translate the filter to English if it's not English
    if (settings) {
      if (!settings.language) settings.language = 'en'
      if (settings.language) {
        if (settings.language != 'en') {
          filter = await translate(filter)
        }
      }
    }
    if (signal.aborted) return
    // Assembe the Athena URL
    const url = await assembleAthenaURL(filter)
    if (signal.aborted) return
    // Get the first result of the Athena API call
    const res = await fetch(url)
    const resData = await res.json()
    if (resData.content && resData.content.length !== 0) {
      // Map the row with the first result
      const { mappedIndex, mappedRow } = await rowMapping(row, resData.content[0], true, index)
      rowsMapping.set(mappedIndex, mappedRow)
      mappedRow['ADD_INFO:numberOfConcepts'] = 1
      if (signal.aborted) return
      await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
    }
    if (dev) {
      end = performance.now()
      console.log('autoMapRow: Finished automapping row with index ', index, ' in ', Math.round(end - start!), ' ms')
    }
  }

  // A method to create the Athena URL
  const assembleAthenaURL = async (filter?: string, sorting?: string[], pagination?: IPagination) => {
    if (dev) console.log('assembleAthenaURL: Assemble Athena URL')

    url = mappingUrl

    if (apiFilters) {
      for (let filter of apiFilters) {
        url += filter
      }
    }

    // Add sorting to URL if there is sorting
    if (sorting) {
      const sortingName = columnsAthena[sorting[0] as keyof Object]
      url += `&sort=${sortingName}&order=${sorting[1]}`
    }

    // Add filter to URL if there is a filter
    if (filter) {
      lastFilter = filter
      url += `&query=${filter}`
    }

    // Add pagination to URL if there is pagination
    if (pagination) {
      url += `&page=${pagination.currentPage}`
      url += `&pageSize=${pagination.rowsPerPage}`
    }

    if (dev) console.log('assembleAthenaURL: Assembled Athena URL: ', encodeURI(url))
    return encodeURI(url)
  }

  // A method to fetch the data from the Athena API, this method is used for the DataTable in the Athena pop-up
  async function fetchData(
    filteredColumns: Map<String, TFilter>,
    sortedColumns: Map<string, SortDirection>,
    pagination: IPagination
  ) {
    let filter = filteredColumns.values().next().value
    if (globalAthenaFilter.filter === undefined) {
      if (settings && selectedRow) {
        if (settings.language !== 'en') {
          filter = await translate(selectedRow.sourceName)
          // TODO: refactor so that this globalAthenaFilter is set when chosing next row or when clicking on a row because this triggers the rendering again (twice)
          globalAthenaFilter.filter = filter
        }
      }
    } else if (globalAthenaFilter.filter && filter === undefined) {
      filter = globalAthenaFilter.filter
    }

    const url = await assembleAthenaURL(filter, sortedColumns.entries().next().value, pagination)
    const response = await fetch(url)
    const apiData = await response.json()
    saveFacets(apiData.facets)
    return {
      data: apiData.content,
      totalRows: apiData.totalElements,
    }
  }

  // A method to map a certain row to a given Athena concept
  async function rowMapping(
    usagiRow: Record<string, any>,
    athenaRow: Record<string, any>,
    autoMap = false,
    i?: number
  ) {
    let start: number, end: number
    let rowIndex: number = i !== undefined ? i : selectedRowIndex
    if (dev) {
      start = performance.now()
      console.log('rowMapping: Start mapping row with index ', rowIndex)
    }
    const mappedUsagiRow: Record<string, any> = usagiRow

    if (mappedUsagiRow != undefined) {
      // Map the import columns that are given from Athena
      for (let [name, alt] of importantAthenaColumns) {
        if (name === 'id' && autoMap) {
          mappedUsagiRow['sourceAutoAssignedConceptIds'] = athenaRow[name]
        } else mappedUsagiRow[alt] = athenaRow[name]
      }
      // Map the extra columns that are not from Athena
      for (let col of Object.keys(additionalFields)) {
        switch (col) {
          case 'equivalence':
            mappedUsagiRow.equivalence = equivalenceMapping
            break

          case 'statusSetBy':
          case 'statusSetOn':
            if (
              (String(usagiRow.statusSetBy).replaceAll(' ', '') == '' || usagiRow.statusSetBy == undefined) &&
              !autoMap
            ) {
              mappedUsagiRow.statusSetBy = settings!.author
              mappedUsagiRow.statusSetOn = Date.now()
            }
            break

          case 'createdBy':
          case 'createdOn':
            if (!usagiRow.createdBy && usagiRow.createdBy != settings!.author && !autoMap) {
              mappedUsagiRow.createdBy = settings!.author
              mappedUsagiRow.createdOn = Date.now()
            }
            break

          case 'mappingStatus':
            if (
              (usagiRow.statusSetBy == null ||
                usagiRow.statusSetBy == undefined ||
                usagiRow.statusSetBy == settings!.author) &&
              !autoMap
            ) {
              mappedUsagiRow.mappingStatus = 'SEMI-APPROVED'
              break
            } else if (usagiRow.statusSetBy != settings!.author && !autoMap) {
              mappedUsagiRow.mappingStatus = 'APPROVED'
              break
            }
            break
          case 'ADD_INFO:customConcept':
            mappedUsagiRow['ADD_INFO:customConcept'] = null
            break
          default:
            mappedUsagiRow[col] = additionalFields[col]
            break
        }
      }
    }

    if (dev) {
      end = performance.now()
      console.log('rowMapping: Finished mapping row with index ', rowIndex, ' in ', Math.round(end - start!), ' ms')
    }
    return {
      mappedIndex: rowIndex,
      mappedRow: mappedUsagiRow,
    }
  }

  // A method to map a certain row to a custom concept
  async function customRowMapping(usagiRow: Record<string, any>, customRow: Record<string, any>) {
    let start: number, end: number
    if (dev) {
      start = performance.now()
      console.log('customrowMapping: Start mapping row with index ', selectedRowIndex)
    }

    const mappedUsagiRow: Record<string, any> = usagiRow
    for (let col of Object.keys(customRow)) {
      switch (col) {
        case 'concept_id':
          mappedUsagiRow.conceptId = customRow[col]
          break
        case 'concept_name':
          mappedUsagiRow.conceptName = customRow[col]
          break
      }
    }
    for (let col of Object.keys(additionalFields)) {
      switch (col) {
        case 'equivalence':
          mappedUsagiRow.equivalence = equivalenceMapping
          break

        case 'statusSetBy':
        case 'statusSetOn':
          if (String(usagiRow.statusSetBy).replaceAll(' ', '') == '' || usagiRow.statusSetBy == undefined) {
            mappedUsagiRow.statusSetBy = settings!.author
            mappedUsagiRow.statusSetOn = Date.now()
          }
          break

        case 'createdBy':
        case 'createdOn':
          if (!usagiRow.createdBy && usagiRow.createdBy != settings!.author) {
            mappedUsagiRow.createdBy = settings!.author
            mappedUsagiRow.createdOn = Date.now()
          }
          break

        case 'mappingStatus':
          if (
            usagiRow.statusSetBy == null ||
            usagiRow.statusSetBy == undefined ||
            usagiRow.statusSetBy == settings!.author
          ) {
            mappedUsagiRow.mappingStatus = 'SEMI-APPROVED'
            break
          } else if (usagiRow.statusSetBy != settings!.author) {
            mappedUsagiRow.mappingStatus = 'APPROVED'
            break
          }

        case 'ADD_INFO:numberOfConcepts':
          mappedUsagiRow['ADD_INFO:numberOfConcepts'] = null
          break
        default:
          mappedUsagiRow[col] = additionalFields[col]
          break
      }
    }

    mappedUsagiRow['ADD_INFO:customConcept'] = true

    if (dev) {
      end = performance.now()
      console.log(
        'rowMapping: Finished mapping row with index ',
        selectedRowIndex,
        ' in ',
        Math.round(end - start!),
        ' ms'
      )
    }

    return {
      mappedIndex: selectedRowIndex,
      mappedRow: mappedUsagiRow,
    }
  }

  function dataTableInitialized() {
    tableInit = true
  }

  // A method to abort the auto mapping
  async function abortAutoMap() {
    if (dev) console.log('abortAutoMap: Aborting auto mapping')
    if (autoMappingPromise) autoMappingAbortController.abort()
    if (progressInit == false) {
      await calculateProgress()
      progressInit = true
    }
    currentRows = new Map<number, Record<string, any>>()
  }

  // A method to start the auto mapping
  async function autoMapPage() {
    let start: number, end: number
    if (mappingStatusChanged == false) {
      // Check for APPROVED values in mappingStatus and check how many authors there were already.
      // If there is only one author, the value will be changed to SEMI-APPROVED
      const q = query()
        .filter(
          (r: any) =>
            r.mappingStatus == 'APPROVED' && (r['ADD_INFO:approvedBy'] == null || r['ADD_INFO:approvedBy'] == undefined)
        )
        .toObject()
      const res = await dataTableFile.executeQueryAndReturnResults(q)
      const updatedRows = new Map<number, Record<string, any>>()
      for (let i = 0; i < res.queriedData.length; i++) {
        updatedRows.set(res.indices[i], { mappingStatus: 'SEMI-APPROVED' })
      }
      await dataTableFile.updateRows(updatedRows)
      mappingStatusChanged = true
    }
    if (settings!.autoMap) {
      if (dev) {
        start = performance.now()
        console.log('autoMapPage: Starting auto mapping')
      }
      // Abort any automapping that is happening at the moment
      if (autoMappingPromise) autoMappingAbortController.abort()
      // Create a abortcontroller to abort the auto mapping in the future if needed
      autoMappingAbortController = new AbortController()
      const signal = autoMappingAbortController.signal

      autoMappingPromise = new Promise(async (resolve, reject): Promise<void> => {
        const pag = dataTableFile.getTablePagination()
        const q = query()
          .slice(pag.rowsPerPage! * (pag.currentPage! - 1), pag.rowsPerPage! * pag.currentPage!)
          .toObject()
        const res = await dataTableFile.executeQueryAndReturnResults(q)
        for (let i = 0; i < res.queriedData.length; i++) {
          if (signal.aborted) return Promise.resolve()
          const row = res.queriedData[i]
          const index = res.indices[i]
          if (!row.conceptId && !row.sourceAutoAssignedConceptIds) await autoMapRow(signal, row, index)
        }
        if (dev) {
          end = performance.now()
          console.log('autoMapPage: Finished auto mapping in ', Math.round(end - start!), ' ms')
        }
        resolve(null)
      }).then(() => {
        if (progressInit == false) {
          calculateProgress()
          progressInit = true
        }
      })
    } else {
      calculateProgress()
    }
  }

  // A method to create the meta data per column
  function modifyUsagiColumnMetadata(columns: IColumnMetaData[]): IColumnMetaData[] {
    if (dev) console.log('modifyUsagiColumnMetadata: Modifying usagi column metadata')
    const usagiColumnsMap = columnsUsagi.reduce((acc, cur) => {
      acc.set(cur.id, cur)
      return acc
    }, new Map<string, IColumnMetaData>())
    const columnIds = columns.map(col => col.id)
    const modifiedColumns = columns.map(col => {
      const usagiColumn = usagiColumnsMap.get(col.id)
      if (usagiColumn) Object.assign(col, usagiColumn)
      else col.visible = false
      return col
    })
    const addedColumns = columnsUsagi.reduce<IColumnMetaData[]>((acc, cur) => {
      if (!columnIds.includes(cur.id)) acc.push(cur)
      return acc
    }, [])
    return modifiedColumns.concat(addedColumns)
  }

  async function approvePage() {
    if (dev) console.log('approvePage: Approving page')
    let approveRows = new Map<number, Record<string, any>>()
    for (let [index, row] of currentRows) {
      if (row.conceptId || row.sourceAutoAssignedConceptIds) {
        if (!row.conceptId) row.conceptId = row.sourceAutoAssignedConceptIds
        if (row.statusSetBy) {
          if (row.statusSetBy != settings!.author) {
            row['ADD_INFO:approvedBy'] = settings!.author
            row.mappingStatus = 'APPROVED'
          }
        } else {
          row.statusSetBy = settings!.author
          row.mappingStatus = 'SEMI-APPROVED'
        }
      }
      approveRows.set(index, row)
    }
    await dataTableFile.updateRows(approveRows)
    calculateProgress()
  }

  async function calculateProgress() {
    if (dev) console.log('calculateProgress: Calculating progress')
    const expressions = {
      total: 'd => op.count()',
      valid: 'd => op.valid(d.conceptId)',
    }
    const expressionResults = await dataTableFile.executeExpressionsAndReturnResults(expressions)
    const qAppr = query()
      .filter((r: any) => r.mappingStatus == 'APPROVED')
      .toObject()
    const resAppr = await dataTableFile.executeQueryAndReturnResults(qAppr)
    totalRows = expressionResults.expressionData[0].total
    mappedRows = expressionResults.expressionData[1].valid
    approvedRows = resAppr.queriedData.length
  }

  function settingsChanged(e: CustomEvent<SettingsChangedEventDetail>) {
    settings = e.detail.settings
    document.documentElement.style.setProperty('--font-size', `${settings.fontsize}px`)
  }

  function saveFacets(facets: Record<string, any>) {
    athenaFacets = facets
  }

  let fetchDataFunc = fetchData

  onMount(async () => {
    for (let param of params) {
      const urlParam = $page.url.searchParams.get(param)
      if (urlParam) {
        if (!apiFilters.includes(`&${param}=${urlParam}`)) apiFilters.push(`&${param}=${urlParam}`)
      }
    }

    // Get the settings from the local storage
    const storedSettings: Record<string, any> = localStorageGetter('settings')
    if (storedSettings) {
      settings = storedSettings
      if (!settings.hasOwnProperty('mapToMultipleConcepts')) settings!.mapToMultipleConcepts = false
      if (!settings.hasOwnProperty('autoMap')) settings!.autoMap = false
      if (!settings.hasOwnProperty('language')) settings!.language = 'nl'
      if (!settings.hasOwnProperty('author')) settings!.author = undefined
      if (!settings.hasOwnProperty('savedAuthors')) settings!.savedAuthors = []
      if (!settings.hasOwnProperty('vocabularyIdCustomConcept')) settings!.vocabularyIdCustomConcept = undefined
      if (!settings.hasOwnProperty('fontsize')) settings!.fontsize = 10
      if (!settings.hasOwnProperty('popupSidesShowed')) settings!.popupSidesShowed = { settings: true, details: true }
      localStorageSetter('settings', settings)
    } else
      settings = {
        mapToMultipleConcepts: false,
        autoMap: false,
        language: 'nl',
        author: undefined,
        savedAuthors: [],
        vocabularyIdCustomConcept: undefined,
        fontsize: 10,
        popupSidesShowed: { settings: true, details: true },
      }
  })

  if (!dev) {
    if (browser) {
      window.addEventListener('beforeunload', e => {
        const confirmationMessage = 'Save the file you were mapping before leaving the application.'
        ;(e || window.event).returnValue = confirmationMessage
        return confirmationMessage
      })
    }
  }

  $: {
    settings
    if (settings && tableInit == true) if (settings.autoMap == true && dataTableFile) autoMapPage()
  }
</script>

<svelte:head>
  <title>Keun</title>
  <meta
    name="description"
    content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi."
  />
</svelte:head>

<section data-name="header">
  <Header />

  <div data-name="table-options">
    {#if uploaded == true}
      <p data-name="filename" title={currentFileName}>{currentFileName}</p>
      <label title="Upload" for="file-upload" data-name="file-upload"
        ><SvgIcon href="icons.svg" id="upload" width="16px" height="16px" /></label
      >
      <input id="file-upload" type="file" accept=".csv, .json" on:change={onFileInputChange} />
      <Download dataTable={dataTableFile} title="Download file" svgId="download" />

      {#if customConceptsArrayOfObjects.length > 0}
        {#if Object.keys(customConceptsArrayOfObjects[0]).length != 0}
          <p>Custom concepts download:</p>
          <Download dataTable={dataTableCustomConcepts} title="Download custom concepts" svgId="download" />
        {/if}
      {/if}
    {/if}
  </div>

  {#if tableInit == true}
    <div data-name="progress">
      <div>
        <p>Total rows:</p>
        {#if !totalRows}
          <Spinner />
        {:else}
          <p>{totalRows}</p>
        {/if}
      </div>
      <div>
        <p>Mapped rows:</p>
        {#if mappedRows == undefined}
          <Spinner />
        {:else}
          <p>{mappedRows}</p>
        {/if}
      </div>
      <div>
        <p>Approved rows:</p>
        {#if approvedRows == undefined}
          <Spinner />
        {:else}
          <p>{approvedRows}</p>
        {/if}
      </div>
    </div>
  {/if}

  <div data-name="header-buttons-container" id="settings">
    <Manual />
    <Settings {settings} on:settingsChanged={settingsChanged} />
    <User {settings} />
  </div>
</section>

<AthenaLayout
  bind:urlFilters={apiFilters}
  bind:url
  bind:equivalenceMapping
  {selectedRow}
  {selectedRowIndex}
  mainTable={dataTableFile}
  fetchData={fetchDataFunc}
  {settings}
  bind:globalFilter={globalAthenaFilter}
  showModal={mappingVisibility}
  bind:facets={athenaFacets}
  on:rowChange={selectRow}
  on:singleMapping={singleMapping}
  on:multipleMapping={multipleMapping}
  on:deleteRowInnerMapping={deleteRowInnerMapping}
  on:filterOptionsChanged={filterOptionsChanged}
  on:generalVisibilityChanged={mappingVisibilityChanged}
  on:customMapping={customMapping}
  on:updateDetails={updateDetailsRow}
/>

{#if uploaded == true}
  <DataTable
    data={file}
    bind:columns
    bind:this={dataTableFile}
    options={{ id: 'usagi', rowsPerPage: 15, rowsPerPageOptions: [5, 10, 15, 20, 50, 100], actionColumn: true }}
    on:rendering={abortAutoMap}
    on:initialized={dataTableInitialized}
    on:renderingComplete={autoMapPage}
    modifyColumnMetadata={modifyUsagiColumnMetadata}
  >
    <UsagiRow
      slot="default"
      let:renderedRow
      let:columns
      let:originalIndex
      on:generalVisibilityChanged={mappingVisibilityChanged}
      on:actionPerformed={actionPerformed}
      on:deleteRow={deleteRow}
      on:autoMapRow={autoMapSingleRow}
      {renderedRow}
      {columns}
      {settings}
      index={originalIndex}
      bind:currentRows
    />
  </DataTable>
{:else}
  <DragAndDrop on:fileUploaded={fileUploaded} />
{/if}

<div data-name="custom-concepts">
  <DataTable data={customConceptsArrayOfObjects} columns={customConceptsColumns} bind:this={dataTableCustomConcepts} />
</div>

{#if tableInit == true}
  <button on:click={approvePage}>Approve page</button>
{/if}

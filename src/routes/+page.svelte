<script lang="ts">
  import columnsUsagi from '$lib/data/columnsUsagi.json'
  import columnNamesAthena from '$lib/data/columnNamesAthena.json'
  import additionalColumns from '$lib/data/additionalColumns.json'
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
    ISettings,
    ITableInformation,
    FileUploadWithColumnChanges,
  } from '$lib/components/Types'
  import type { IColumnMetaData, IPagination, SortDirection, TFilter } from '@radar-azdelta/svelte-datatable'
  import { localStorageGetter } from '$lib/utils'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import UsagiRow from '$lib/components/Mapping/UsagiRow.svelte'
  import { onMount, tick } from 'svelte'
  import { query } from 'arquero'
  import Download from '$lib/components/Extra/Download.svelte'
  import Settings from '$lib/components/Extra/Settings.svelte'
  // @ts-ignore
  import { LatencyOptimisedTranslator } from '@browsermt/bergamot-translator/translator.js'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import { page } from '$app/stores'
  import { browser, dev } from '$app/environment'
  import DragAndDrop from '$lib/components/Extra/DragAndDrop.svelte'
  import DataTable from '@radar-azdelta/svelte-datatable'
  import Manual from '$lib/components/Extra/Manual.svelte'
  import type Query from 'arquero/dist/types/query/query'
  import Progress from '$lib/components/Extra/Progress.svelte'
  import Upload from '$lib/components/Extra/Upload.svelte'

  // General variables
  let file: File | undefined = undefined
  let settings: ISettings = {
    mapToMultipleConcepts: false,
    autoMap: false,
    language: 'en',
    author: '',
    savedAuthors: [],
    vocabularyIdCustomConcept: '',
    fontsize: 10,
    popupSidesShowed: { filters: true, details: true },
  }
  let disableInteraction: boolean = false
  let translator: LatencyOptimisedTranslator

  // Athena related variables
  let mappingVisibility: boolean = false
  let mappingUrl: string = import.meta.env.VITE_MAPPINGDATA_PATH
  let lastTypedFilter: string
  let apiFilters: string[] = ['&standardConcept=Standard']
  let equivalenceMapping: string = 'EQUAL'
  let globalAthenaFilter = { column: 'all', filter: undefined }
  let athenaFacets: Record<string, any> | undefined = undefined

  // Table related variables
  let tableInit: boolean = false
  let currentVisibleRows: Map<number, Record<string, any>> = new Map<number, Record<string, any>>()
  let tableInformation: ITableInformation = {
    totalRows: undefined,
    mappedRows: undefined,
    approvedRows: undefined,
  }
  let selectedRow: Record<string, any>
  let selectedRowIndex: number
  let columnChanges: Record<string, string>
  let columnsNeedToChange: boolean = false

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////

  let dataTableFile: DataTable
  let dataTableCustomConcepts: DataTable

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
  let additionalFields: Record<string, any> = additionalColumns

  let autoMappingAbortController: AbortController
  let autoMappingPromise: Promise<void> | undefined

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // When there is a new file uploaded
  async function onFileInputChange(e: Event) {
    if (dev) console.log('onFileInputChange: New file uploaded')
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()
    var reader = new FileReader()
    file = undefined
    await tick()

    reader.onload = () => {
      let content = reader.result?.toString()
      if (content)
        if (
          !content.includes('sourceName') ||
          !content.includes('sourceCode') ||
          !content.includes('sourceFrequency')
        ) {
          alert('Provide a file that contains the following columns: sourceCode, sourceName & sourceFrequency')
          file = undefined
          tableInit = false
        }
    }

    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return

    // Check the files if the extension is allowed
    for (const f of inputFiles) {
      const extension = f.name.split('.').pop()
      if (extension == 'csv') {
        file = f
        reader.readAsText(f)
        break
      }
    }
  }

  // When there is a new file uploaded for the first time (drag & drop)
  async function fileUploaded(e: CustomEvent<FileUploadedEventDetail>) {
    if (dev) console.log('fileUploaded: New file uploaded')
    file = e.detail.file
  }

  async function fileUploadWithColumnChanges(e: CustomEvent<FileUploadWithColumnChanges>) {
    if (dev) console.log('fileUploadWithColumnChanges: New file uploaded and columns have changed')
    file = e.detail.file
    columnsNeedToChange = true
    columnChanges = Object.fromEntries(Object.entries(e.detail.columnChange).map(a => a.reverse()))
  }

  // When the visibility of the mapping pop-up changes
  async function mappingVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    if (dev)
      console.log('mappingVisibilityChanged: Visibility of the mapping pop-up changed to ', event.detail.visibility)
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()
    // Change the visiblity and update the selected row and index if there is a new row selected
    if (event.detail.visibility == true && event.detail.data) {
      selectedRow = event.detail.data.row
      selectedRowIndex = event.detail.data.index
      const translation = await translate(event.detail.data.row.sourceName)
      globalAthenaFilter.filter = typeof translation == 'string' ? translation : event.detail.data.row.sourceName
    }
    mappingVisibility = event.detail.visibility
  }

  // When the filters in the Athena pop-up change (filters on the left-side for the query)
  function filterOptionsChanged(event: CustomEvent<FilterOptionsChangedEventDetail>) {
    if (dev) console.log('filterOptionsChanged: Filters in the Athena pop-up changed to ', event.detail.filters)
    if (event.detail.filters) {
      apiFilters = []
      // Transform the filters to a string that can be used in the query for Athena
      for (let [filter, options] of event.detail.filters) {
        const substring = options.map(option => `&${filter}=${option}`).join()
        if (!apiFilters.includes(substring)) apiFilters.push(substring.replaceAll(',', '&'))
      }
      // Update the update fetch function so the table will be initialized again
      fetchDataFunc = fetchData
    }
  }

  // When the mapping button in the Athena pop-up is clicked and the settins "Map to multiple concepts" is disabled
  async function singleMapping(event: CustomEvent<SingleMappingEventDetail>) {
    if (dev) console.log('singleMapping: Single mapping for the row with sourceCode ', selectedRow.sourceCode)
    // Map the selected row with the selected concept
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow!, event.detail.row)
    // Add extra information like the number of concepts mapped for this row, and the last typed filter to the row
    if (!mappedRow['ADD_INFO:numberOfConcepts']) mappedRow['ADD_INFO:numberOfConcepts'] = 1
    mappedRow['ADD_INFO:lastAthenaFilter'] = lastTypedFilter
    mappedRow['comment'] = event.detail.extra.comment
    mappedRow['assignedReviewer'] = event.detail.extra.reviewer
    // Update the selected row to the updated row
    console.log('MAPPEDROW ', mappedRow)
    await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
    calculateProgress()
  }

  // When the user custom maps a concept to a row
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
    const existingConcept = customConceptsArrayOfObjects.find(
      concept =>
        concept.concept_id === customConcept.concept_id &&
        concept.concept_name === customConcept.concept_name &&
        concept.domain_id === customConcept.domain_id &&
        concept.vocabulary_id === customConcept.vocabulary_id &&
        concept.concept_class_id === customConcept.concept_class_id
    )
    // Push the custom concept to the hidden table that can be downloaded, if it does not exist yet
    if (!existingConcept) {
      customConceptsArrayOfObjects.push(customConcept)
      customConceptsArrayOfObjects = customConceptsArrayOfObjects
    }

    // Map the selected row with the custom concept
    const { mappedIndex, mappedRow } = await customRowMapping(selectedRow, customConcept)
    if (!mappedRow['ADD_INFO:numberOfConcepts']) mappedRow['ADD_INFO:numberOfConcepts'] = 1
    mappedRow['comment'] = event.detail.extra.comment
    mappedRow['assignedReviewer'] = event.detail.extra.reviewer
    if (settings) {
      // If multiplemapping is enabled, update the previous rows and add the new one
      if (settings.mapToMultipleConcepts) {
        // Get previous mapped concepts
        const q = (<Query>query().params({ sourceCode: mappedRow.sourceCode }))
          .filter((r: any, params: any) => r.sourceCode == params.sourceCode)
          .toObject()
        const res = await dataTableFile.executeQueryAndReturnResults(q)
        // Add extra information like the number of concepts mapped for this row, comments & the assigned reviewer to the row
        if (res.queriedData.length === 1 && !res.queriedData[0].conceptId) {
          mappedRow['ADD_INFO:numberOfConcepts'] = 1
          mappedRow['comment'] = event.detail.extra.comment
          mappedRow['assignedReviewer'] = event.detail.extra.reviewer
          await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
        } else {
          // If the custom concept didn't exist yet
          if (!existingConcept) {
            mappedRow['ADD_INFO:numberOfConcepts'] = res.queriedData.length + 1
            mappedRow['comment'] = event.detail.extra.comment
            mappedRow['assignedReviewer'] = event.detail.extra.reviewer
            const rowsToUpdate = new Map()
            // Update the number of concepts in the already mapped rows
            for (let index of res.indices) {
              rowsToUpdate.set(index, { 'ADD_INFO:numberOfConcepts': res.queriedData.length + 1 })
            }
            await dataTableFile.updateRows(rowsToUpdate)
            await dataTableFile.insertRows([mappedRow])
          }
        }
      } else await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
    } else await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))

    calculateProgress()
  }

  // When the mapping button in the Athena pop-up is clicked and the settins "Map to multiple concepts" is enabled
  async function multipleMapping(event: CustomEvent<MultipleMappingEventDetail>) {
    if (dev) console.log('multipleMapping: Multiple mapping for the row with sourceCode ', selectedRow.sourceCode)
    // Map the selected row with the selected concept
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow!, event.detail.row)

    // Create a query and execute it to get all the rows that are already mapped and got the same sourceCode
    const q = (<Query>query().params({ value: mappedRow.sourceCode }))
      .filter((r: any, params: any) => r.sourceCode == params.value)
      .toObject()
    const res = await dataTableFile.executeQueryAndReturnResults(q)

    // Add extra information like the number of concepts mapped for this row, comments & the assigned reviewer to the row
    mappedRow.mappingStatus = 'SEMI-APPROVED'
    mappedRow.statusSetBy = settings!.author

    mappedRow['ADD_INFO:lastAthenaFilter'] = lastTypedFilter

    // Check if it's the first concept that will be mapped to this row
    if (res.queriedData.length === 1 && !res.queriedData[0].conceptId) {
      // This is the first concepts mapped to the row and the current row wil be updated
      mappedRow['ADD_INFO:numberOfConcepts'] = 1
      mappedRow['comment'] = event.detail.extra.comment
      mappedRow['assignedReviewer'] = event.detail.extra.reviewer
      await dataTableFile.updateRows(new Map([[res.indices[0], mappedRow]]))
    } else {
      // This is not the first concept mapped to the row and the current row will be added to the table and the others will be updated
      mappedRow['ADD_INFO:numberOfConcepts'] = res.queriedData.length + 1
      mappedRow['comment'] = event.detail.extra.comment
      mappedRow['assignedReviewer'] = event.detail.extra.reviewer
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

  // When the comments or assingedReviewer are filled in, update these fields in a row
  async function updateDetailsRow(event: CustomEvent<UpdateDetailsEventDetail>) {
    if (dev) console.log(`updateDetailsRow: Update details for the row on index ${event.detail.index}`)
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
          if (event.detail.row.conceptId == 0 || !event.detail.row.conceptId) {
            updatingObj.conceptId = event.detail.row.sourceAutoAssignedConceptIds
          } else updatingObj.conceptId = event.detail.row.conceptId
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
    if (dev) console.log(`deleteRow: Delete row with sourceCode ${event.detail.sourceCode}`)
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()

    // If it not the only concept that is mapped for that row (multiple mapping), erase the row
    if (event.detail.erase == true) {
      // Create a query to get all the rows that has the same sourceCode (row mapped to multiple concepts)
      const q = (<Query>query().params({ source: event.detail.sourceCode }))
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
      delete updatedFields.sourceAutoAssignedConceptIds
      await dataTableFile.updateRows(new Map([[event.detail.indexes[0], updatedFields]]))
    }
    calculateProgress()
  }

  // When the delete button in the table of mapped concepts is clicked, delete the row
  async function deleteRowInnerMapping(event: CustomEvent<DeleteRowInnerMappingEventDetail>) {
    if (dev) console.log('deleteRowInnerMapping: Delete mapping with conceptId ', event.detail.conceptId)
    // If the row is a custom concept, delete it from the custom concepts table
    if (event.detail.custom) {
      const deletionIndex = customConceptsArrayOfObjects.findIndex(
        row => row.conceptId === event.detail.conceptId && row.concept_name === event.detail.conceptName
      )
      customConceptsArrayOfObjects.splice(deletionIndex, 1)
    }

    // Create a query to find the index of the row that needs to be removed, can be an index that is not visualised and therefor we use the query
    const q = (<Query>query().params({
      conceptId: event.detail.conceptId,
      sourceCode: selectedRow.sourceCode,
      conceptName: event.detail.conceptName,
    }))
      .filter(
        (r: any, params: any) =>
          r.conceptId == params.conceptId && r.sourceCode == params.sourceCode && r.conceptName == params.conceptName
      )
      .toObject()
    const res = await dataTableFile.executeQueryAndReturnResults(q)

    // If the row needs to be erased, in the case of multiple mapping
    if (event.detail.erase) {
      // A query to find all the rows that are multiple mapped with the same sourceCode
      const q = (<Query>query().params({ sourceCode: selectedRow.sourceCode }))
        .filter((r: any, params: any) => r.sourceCode == params.sourceCode)
        .toObject()
      const res2 = await dataTableFile.executeQueryAndReturnResults(q)
      const updatedRows = new Map<number, Record<string, any>>()
      // Update the number of concepts of all the found rows
      res2.indices.forEach((index: number) => {
        updatedRows.set(index, { 'ADD_INFO:numberOfConcepts': res2.indices.length - 1 })
      })
      await dataTableFile.updateRows(updatedRows)
      await dataTableFile.deleteRows(res.indices)
    } else {
      // Reset the row with the original values
      const updatedFields = additionalFields
      updatedFields.conceptId = null
      updatedFields.conceptName = null
      updatedFields.domainId = null
      updatedFields['ADD_INFO:numberOfConcepts'] = 1
      delete updatedFields.sourceAutoAssignedConceptIds
      await dataTableFile.updateRows(new Map([[res.indices[0], updatedFields]]))
    }
  }

  // When the arrow button in the Athena pop-up is clicked to navigate to a different row
  async function selectRow(event: CustomEvent<RowChangeEventDetail>) {
    let tablePagination: Record<string, any>
    new Promise(async (resolve, reject) => {
      tablePagination = await dataTableFile.getTablePagination()
      // Check to wich direction the user is moving
      if (event.detail.up && selectedRowIndex + 1 < tablePagination.totalRows!) selectedRowIndex += 1
      if (!event.detail.up && selectedRowIndex - 1 >= 0) selectedRowIndex -= 1

      if (dev) console.log('selectRow: Select row with index ', selectedRowIndex)

      // Set the new filter with the translated source name
      selectedRow = await dataTableFile.getFullRow(selectedRowIndex)
      const translation = await translate(selectedRow.sourceName)
      globalAthenaFilter.filter = typeof translation == 'string' ? translation : selectedRow.sourceName
      resolve(null)
    }).then(() => {
      // Check if the pagination needs to change, and do so if needed
      changePagination(event.detail.up, selectedRowIndex, tablePagination)
    })
  }

  // When the button to automap a single row is clicked, automap the row
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

  function createTranslator(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Recreate a translator if it's a browser because the previous instance is still pending and can't be used
      if (!translator) {
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
      if (translator) resolve(translator)
      else resolve(false)
    })
  }

  // A method to translate text
  async function translate(text: string): Promise<string | undefined> {
    if (!browser) return undefined
    // Check the settings and if the language set is not english, translate the text
    if (settings) {
      if (settings.language && settings.language !== 'en') {
        const translator = await createTranslator()
        let translation = await translator.translate({
          from: settings!.language,
          to: 'en',
          text: text,
          html: true,
        })
        return translation.target.text
      }
      {
        return text
      }
    } else {
      return text
    }
  }

  // A method to change the pagination of the table based on the index and the rows per page
  async function changePagination(
    up: boolean,
    selectedRowIndex: number,
    pagination: Record<string, any>
  ): Promise<void> {
    // When the index exceeds the number of rows per page, go to the next page or go to the previous page
    if (up && selectedRowIndex !== 0) {
      if (selectedRowIndex % pagination.rowsPerPage! === 0) {
        if (dev) console.log('changePagination: change pagination to ', pagination.currentPage! + 1)
        dataTableFile.changePagination({ currentPage: pagination.currentPage! + 1 })
      }
    } else if (!up && selectedRowIndex !== 0) {
      if ((selectedRowIndex + 1) % pagination.rowsPerPage! === 0) {
        if (dev) console.log('changePagination: change pagination to ', pagination.currentPage! - 1)
        dataTableFile.changePagination({ currentPage: pagination.currentPage! - 1 })
      }
    }
  }

  // A method to automatically map a given row
  async function autoMapRow(signal: AbortSignal, row: Record<string, any>, index: number): Promise<void> {
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
      filter = await translate(filter)
    }
    if (signal.aborted) return
    // Assembe the Athena URL
    const url = await assembleAthenaURL(filter, undefined, undefined, true)
    if (signal.aborted) return
    // Get the first result of the Athena API call
    const res = await fetch(url)
    const resData = await res.json()
    if (resData.content && resData.content.length !== 0) {
      const numberOfConcepts = row['ADD_INFO:numberOfConcepts']
      // Map the row with the first result
      const { mappedIndex, mappedRow } = await rowMapping(row, resData.content[0], true, index)
      mappedRow['ADD_INFO:numberOfConcepts'] = numberOfConcepts
      mappedRow['ADD_INFO:lastAthenaFilter'] = filter
      if (signal.aborted) return
      await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
    }
    if (dev) {
      end = performance.now()
      console.log('autoMapRow: Finished automapping row with index ', index, ' in ', Math.round(end - start!), ' ms')
    }
  }

  // A method to create the Athena URL
  const assembleAthenaURL = async (
    filter?: string,
    sorting?: string[],
    pagination?: IPagination,
    autoMap?: boolean
  ): Promise<string> => {
    if (dev) console.log('assembleAthenaURL: Assemble Athena URL')

    let assembledAthenaUrl = mappingUrl

    // Apply the api filters
    if (apiFilters) {
      for (let filter of apiFilters) {
        assembledAthenaUrl += filter
      }
    }

    // Add sorting to URL if there is sorting
    if (sorting) {
      const sortingName = columnNamesAthena[sorting[0] as keyof Object]
      assembledAthenaUrl += `&sort=${sortingName}&order=${sorting[1]}`
    }

    // Add filter to URL if there is a filter
    if (filter) {
      lastTypedFilter = filter
      assembledAthenaUrl += `&query=${filter}`
    }

    // Add pagination to URL if there is pagination
    if (autoMap) {
      assembledAthenaUrl += `&page=1`
      assembledAthenaUrl += `&pageSize=1`
    } else if (pagination && !autoMap) {
      assembledAthenaUrl += `&page=${pagination.currentPage}`
      assembledAthenaUrl += `&pageSize=${pagination.rowsPerPage}`
    }

    if (dev) console.log('assembleAthenaURL: Assembled Athena URL: ', encodeURI(assembledAthenaUrl))
    return encodeURI(assembledAthenaUrl)
  }

  // A method to fetch the data from the Athena API, this method is used for the DataTable in the Athena pop-up
  async function fetchData(
    filteredColumns: Map<String, TFilter>,
    sortedColumns: Map<string, SortDirection>,
    pagination: IPagination
  ): Promise<{ data: Record<string, any>[]; totalRows: number }> {
    // Get the filter
    let filter = filteredColumns.values().next().value
    // Check if there is a filter filled in
    if (globalAthenaFilter.filter === undefined) {
      if (selectedRow) {
        filter = await translate(selectedRow.sourceName)
      }
    } else if (globalAthenaFilter.filter && filter === undefined) {
      filter = globalAthenaFilter.filter
    }

    const url = await assembleAthenaURL(filter, sortedColumns.entries().next().value, pagination, false)
    const response = await fetch(url)
    const apiData = await response.json()
    // Save the facets to exclude filters later
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
  ): Promise<{ mappedIndex: number; mappedRow: Record<string, any> }> {
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
            mappedUsagiRow.statusSetBy = settings!.author
            mappedUsagiRow.statusSetOn = Date.now()
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
            if (col !== 'conceptName' && col !== 'conceptId') mappedUsagiRow[col] = additionalFields[col]
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
  async function customRowMapping(
    usagiRow: Record<string, any>,
    customRow: Record<string, any>
  ): Promise<{ mappedIndex: number; mappedRow: Record<string, any> }> {
    let start: number, end: number
    if (dev) {
      start = performance.now()
      console.log('customrowMapping: Start mapping row with index ', selectedRowIndex)
    }

    // Map the import columns that are given
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
    // Map the additional columns
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

  // A method to set a variable when the table is initialized
  function dataTableInitialized(): void {
    tableInit = true
    if (columnsNeedToChange) changeColumnNames()
  }

  // A method to abort the auto mapping
  async function abortAutoMap(): Promise<void> {
    if (dev) console.log('abortAutoMap: Aborting auto mapping')
    disableInteraction = false
    dataTableFile.setDisabled(false)
    if (autoMappingPromise) {
      autoMappingAbortController.abort()
      calculateProgress()
    }
    currentVisibleRows = new Map<number, Record<string, any>>()
  }

  // A method to start the auto mapping
  async function autoMapPage(): Promise<void> {
    let start: number, end: number
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
          disableInteraction = true
          dataTableFile.setDisabled(true)
          if (signal.aborted) return Promise.resolve()
          const row = res.queriedData[i]
          if (!row.conceptId && !row.sourceAutoAssignedConceptIds) await autoMapRow(signal, row, res.indices[i])
        }
        if (dev) {
          end = performance.now()
          console.log('autoMapPage: Finished auto mapping in ', Math.round(end - start!), ' ms')
        }
        resolve(null)
      }).then(() => {
        disableInteraction = false
        dataTableFile.setDisabled(false)
        calculateProgress()
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

  // A method to approve a whole page
  async function approvePage() {
    if (dev) console.log('approvePage: Approving page')
    let approveRows = new Map<number, Record<string, any>>()
    for (let [index, row] of currentVisibleRows) {
      if (!row.conceptId) row.conceptId = row.sourceAutoAssignedConceptIds
      if (row.statusSetBy) {
        if (row.statusSetBy != settings!.author) {
          row['ADD_INFO:approvedBy'] = settings!.author
          row['ADD_INFO:approvedOn'] = Date.now()
          row.mappingStatus = 'APPROVED'
        }
      } else {
        row.statusSetBy = settings!.author
        row.statusSetOn = Date.now()
        row.mappingStatus = 'SEMI-APPROVED'
      }
      approveRows.set(index, row)
    }
    await dataTableFile.updateRows(approveRows)
    calculateProgress()
  }

  // A method to calculate the progress of the mapping
  async function calculateProgress() {
    if (dev) console.log('calculateProgress: Calculating progress')
    const expressions = {
      total: 'd => op.count()',
      valid: 'd => op.valid(d.mappingStatus)',
    }
    const expressionResults = await dataTableFile.executeExpressionsAndReturnResults(expressions)
    const qAppr = query()
      .filter((r: any) => r.mappingStatus == 'APPROVED')
      .toObject()
    const resAppr = await dataTableFile.executeQueryAndReturnResults(qAppr)
    tableInformation = {
      totalRows: expressionResults.expressionData[0].total,
      mappedRows: expressionResults.expressionData[1].valid,
      approvedRows: resAppr.queriedData.length,
    }
  }

  // A method for when the settings are changed
  function settingsChanged(e: CustomEvent<SettingsChangedEventDetail>) {
    settings = e.detail.settings
    document.documentElement.style.setProperty('--font-size', `${settings.fontsize}px`)
    document.documentElement.style.setProperty('--font-number', `${settings.fontsize}`)
    if (e.detail.autoMap == true && tableInit == true) {
      autoMapPage()
    }
  }

  // A method to save the facets
  function saveFacets(facets: Record<string, any>) {
    athenaFacets = facets
  }

  async function changeColumnNames() {
    await dataTableFile.renameColumns(columnChanges)
    columnsNeedToChange = false
  }

  let fetchDataFunc = fetchData

  onMount(async () => {
    // Get the URL parameters and put them in apiFilters
    for (let param of Array.from($page.url.searchParams.keys())) {
      const urlParam = $page.url.searchParams.get(param)
      if (urlParam) {
        if (!apiFilters.includes(`&${param}=${urlParam}`)) apiFilters.push(`&${param}=${urlParam}`)
      }
    }

    // Get the settings from the local storage
    const storedSettings: ISettings = localStorageGetter('settings')
    if (storedSettings) {
      Object.assign(settings, storedSettings)
      settings = settings
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
    {#if file}
      <Upload on:fileUploaded={fileUploaded} on:fileUploadWithColumnChanges={fileUploadWithColumnChanges} />
      <Download dataTable={dataTableFile} title="Download file" />

      {#if customConceptsArrayOfObjects.length > 0}
        {#if Object.keys(customConceptsArrayOfObjects[0]).length != 0}
          <p>Custom concepts download:</p>
          <Download dataTable={dataTableCustomConcepts} title="Download custom concepts" />
        {/if}
      {/if}
    {/if}
  </div>

  {#if tableInit == true}
    <Progress {tableInformation} />
  {/if}

  <div data-name="header-buttons-container" id="settings">
    <Manual />
    {#if settings}
      <Settings {settings} on:settingsChanged={settingsChanged} />
      <User {settings} />
    {/if}
  </div>
</section>

{#if settings}
  <AthenaLayout
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
{/if}

{#if file}
  <DataTable
    data={file}
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
      disable={disableInteraction}
      index={originalIndex}
      bind:currentVisibleRows
    />
  </DataTable>
{:else}
  <DragAndDrop on:fileUploaded={fileUploaded} on:fileUploadWithColumnChanges={fileUploadWithColumnChanges} />
{/if}

<div data-name="custom-concepts">
  <DataTable data={customConceptsArrayOfObjects} columns={customConceptsColumns} bind:this={dataTableCustomConcepts} />
</div>

{#if tableInit == true}
  <button on:click={approvePage}>Approve page</button>
{/if}

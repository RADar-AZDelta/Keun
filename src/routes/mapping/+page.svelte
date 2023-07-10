<script lang="ts">
  import columnsUsagi from '$lib/data/columnsUsagi.json'
  import columnNamesAthena from '$lib/data/columnNamesAthena.json'
  import additionalColumns from '$lib/data/additionalColumns.json'
  import columnsCustomConcept from '$lib/data/columnsCustomConcept.json'
  import type {
    ActionPerformedEventDetail,
    DeleteRowEventDetail,
    FilterOptionsChangedEventDetail,
    MappingEventDetail,
    VisibilityChangedEventDetail,
    RowChangeEventDetail,
    DeleteRowInnerMappingEventDetail,
    CustomMappingEventDetail,
    AutoMapRowEventDetail,
    UpdateDetailsEventDetail,
    IDataTypeFile,
  } from '$lib/components/Types'
  import type {
    IColumnMetaData,
    IPagination,
    ITableOptions,
    SortDirection,
    TFilter,
  } from '@radar-azdelta/svelte-datatable'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import UsagiRow from '$lib/components/Mapping/UsagiRow.svelte'
  import { onDestroy, onMount } from 'svelte'
  import { query } from 'arquero'
  // @ts-ignore
  import { LatencyOptimisedTranslator } from '@browsermt/bergamot-translator/translator.js'
  import { page } from '$app/stores'
  import { browser, dev } from '$app/environment'
  import DataTable from '@radar-azdelta/svelte-datatable'
  import type Query from 'arquero/dist/types/query/query'
  import { implementation, settings, triggerAutoMapping } from '$lib/store'
  import { readDatabase, readFileStorage, userSessionStore, watchValueDatabase, writeToDatabase } from '$lib/firebase'
  import { goto } from '$app/navigation'
  import { FirebaseSaveImpl } from '$lib/utilClasses/FirebaseSaveImpl'
  import { FileDataTypeImpl } from '$lib/utilClasses/FileDataTypeImpl'
  import { urlToFile } from '$lib/utils'

  // General variables
  let file: File | undefined = undefined
  let customConceptsFile: File | undefined = undefined

  let tableOptions: ITableOptions = {
    id: `${$page.url.searchParams
      .get('fileName')
      ?.substring(0, $page.url.searchParams.get('fileName')?.indexOf('.'))}-usagi`,
    rowsPerPage: 15,
    rowsPerPageOptions: [5, 10, 15, 20, 50, 100],
    actionColumn: true,
  }

  let tableFullOptions: ITableOptions = Object.assign(tableOptions, {
    saveImpl: $implementation == 'firebase' ? new FirebaseSaveImpl(tableOptions) : undefined,
    dataTypeImpl:
      $implementation == 'firebase' ? new FileDataTypeImpl($page.url.searchParams.get('fileName')) : undefined,
  })

  let customTableOptions: ITableOptions = {
    id: 'customConceptsTable',
    dataTypeImpl: new FileDataTypeImpl('customConcepts.csv'),
    saveOptions: false,
  }

  let disableInteraction: boolean = false
  let translator: LatencyOptimisedTranslator
  let dbVersion: number = 1,
    customDBVersion: number = 1,
    fileName: string | null = ''

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
  let selectedRow: Record<string, any>
  let selectedRowIndex: number

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////

  let dataTableFile: DataTable
  let dataTableCustomConcepts: DataTable

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
  async function singleMapping(event: CustomEvent<MappingEventDetail>) {
    if (dev) console.log('singleMapping: Single mapping for the row with sourceCode ', selectedRow.sourceCode)
    // Map the selected row with the selected concept
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow!, event.detail.row)
    // Add extra information like the number of concepts mapped for this row, and the last typed filter to the row
    if (!mappedRow['ADD_INFO:numberOfConcepts']) mappedRow['ADD_INFO:numberOfConcepts'] = 1
    mappedRow['ADD_INFO:lastAthenaFilter'] = lastTypedFilter
    mappedRow['comment'] = event.detail.extra.comment
    mappedRow['assignedReviewer'] = event.detail.extra.reviewer
    // Update the selected row to the updated row
    await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
    // calculateProgress()
  }

  // When the user custom maps a concept to a row
  async function customMapping(event: CustomEvent<CustomMappingEventDetail>) {
    if (dev) console.log('customMapping: Custom mapping for the row with sourceCode ', selectedRow.sourceCode)
    // Create the custom concept object
    const customConcept = {
      concept_id: event.detail.customConcept.conceptId,
      concept_name: event.detail.customConcept.conceptName,
      domain_id: event.detail.customConcept.domainId,
      vocabulary_id: event.detail.customConcept.vocabularyId,
      concept_class_id: event.detail.customConcept.conceptClassId,
      standard_concept: event.detail.customConcept.standardConcept,
      concept_code: event.detail.customConcept.conceptCode,
      valid_start_date: event.detail.customConcept.validStartDate,
      valid_end_date: event.detail.customConcept.validEndDate,
      invalid_reason: event.detail.customConcept.invalidReason,
    }
    // Check if the custom concepts already exists in the custom concepts DataTable (avoid duplicates)
    const q = (<Query>query().params({
      concept_id: customConcept.concept_id,
      concept_name: customConcept.concept_name,
      domain_id: customConcept.domain_id,
      vocabulary_id: customConcept.vocabulary_id,
      concept_class_id: customConcept.concept_class_id,
    }))
      .filter(
        (r: any, params: any) =>
          r.concept_id == params.concept_id &&
          r.concept_name == params.concept_name &&
          r.domain_id == params.domain_id &&
          r.vocabulary_id == params.vocabulary_id &&
          r.concept_class_id == params.concept_class_id
      )
      .toObject()
    const customRes = await dataTableCustomConcepts.executeQueryAndReturnResults(q)
    // If there are no duplicates, add the row to the custom concepts DataTable
    if (customRes.queriedData.length === 0) {
      await dataTableCustomConcepts.insertRows([customConcept])
    } else if (dev) console.log('customMapping: The custom concept already exists in the custom concepts DataTable')

    // Map the selected row with the custom concept
    const { mappedIndex, mappedRow } = await customRowMapping(selectedRow, customConcept)
    if (!mappedRow['ADD_INFO:numberOfConcepts']) mappedRow['ADD_INFO:numberOfConcepts'] = 1
    mappedRow['comment'] = event.detail.extra.comment
    mappedRow['assignedReviewer'] = event.detail.extra.reviewer
    if ($settings) {
      // If multiplemapping is enabled, update the previous rows and add the new one
      if ($settings.mapToMultipleConcepts && fileName) {
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
          if (customRes.queriedData.length == 0) {
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

    // calculateProgress()
  }

  // When the mapping button in the Athena pop-up is clicked and the settins "Map to multiple concepts" is enabled
  async function multipleMapping(event: CustomEvent<MappingEventDetail>) {
    if (dev) console.log('multipleMapping: Multiple mapping for the row with sourceCode ', selectedRow.sourceCode)
    // Map the selected row with the selected concept
    const { mappedRow } = await rowMapping(event.detail.originalRow!, event.detail.row)

    // Create a query and execute it to get all the rows that are already mapped and got the same sourceCode
    const q = (<Query>query().params({ value: mappedRow.sourceCode }))
      .filter((r: any, params: any) => r.sourceCode == params.value)
      .toObject()
    const res = await dataTableFile.executeQueryAndReturnResults(q)

    // Add extra information like the number of concepts mapped for this row, comments & the assigned reviewer to the row
    mappedRow.mappingStatus = 'SEMI-APPROVED'
    mappedRow.statusSetBy = $userSessionStore.name

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
    // calculateProgress()
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
        if (event.detail.row.statusSetBy == undefined || event.detail.row.statusSetBy == $userSessionStore.name) {
          // If statusSetBy is empty, it means the author is the first reviewer of this row
          updatingObj.statusSetBy = $userSessionStore.name
          updatingObj.statusSetOn = Date.now()
          updatingObj.mappingStatus = 'SEMI-APPROVED'
          if (event.detail.row.conceptId == 0 || !event.detail.row.conceptId) {
            updatingObj.conceptId = event.detail.row.sourceAutoAssignedConceptIds
          } else updatingObj.conceptId = event.detail.row.conceptId
        } else if (
          event.detail.row.statusSetBy &&
          event.detail.row.statusSetBy != $userSessionStore.name &&
          event.detail.row.mappingStatus == 'SEMI-APPROVED'
        ) {
          // StatusSetBy is not empty and it's not the current author so it means it's the second reviewer
          updatingObj['ADD_INFO:approvedBy'] = $userSessionStore.name
          updatingObj['ADD_INFO:approvedOn'] = Date.now()
          updatingObj.mappingStatus = 'APPROVED'
        } else if (event.detail.row.statusSetBy && event.detail.row.statusSetBy != $userSessionStore.name) {
          // If the mappingStatus is APPROVED & the statusSetBy is an other author
          updatingObj.statusSetBy = $userSessionStore.name
          updatingObj.statusSetOn = Date.now()
          updatingObj.mappingStatus = 'SEMI-APPROVED'
          if (event.detail.row.conceptId == 0 || !event.detail.row.conceptId) {
            // If the conceptId is not filled in, fill in the sourceAutoAssignedConceptIds
            updatingObj.conceptId = event.detail.row.sourceAutoAssignedConceptIds
          } else updatingObj.conceptId = event.detail.row.conceptId
        }
      } else {
        // If the action clicked is UNAPPROVED or FLAGGED
        updatingObj.statusSetBy = $userSessionStore.name
        updatingObj.statusSetOn = Date.now()
        updatingObj.mappingStatus = event.detail.action
      }
    }
    await dataTableFile.updateRows(new Map([[event.detail.index, updatingObj]]))
    // calculateProgress()
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
      // Delete the selected row
      await dataTableFile.deleteRows(event.detail.indexes)
    } else {
      // When the mapping is one on one, erase the mapping from that row
      const updatedFields = additionalFields
      updatedFields.conceptId = null
      updatedFields.domainId = null
      updatedFields.conceptName = null
      delete updatedFields.sourceAutoAssignedConceptIds
      await dataTableFile.updateRows(new Map([[event.detail.indexes[0], updatedFields]]))
      // calculateProgress()
    }
  }

  // When the delete button in the table of mapped concepts is clicked, delete the row
  async function deleteRowInnerMapping(event: CustomEvent<DeleteRowInnerMappingEventDetail>) {
    if (dev) console.log('deleteRowInnerMapping: Delete mapping with conceptId ', event.detail.conceptId)
    // If the row is a custom concept, delete it from the custom concepts table
    if (event.detail.custom) {
      // Find a row with the same concept_id & concept_name
      const q = (<Query>query().params({ concept_id: event.detail.conceptId, concept_name: event.detail.conceptName }))
        .filter((r: any, params: any) => r.concept_id == params.concept_id && r.concept_name == params.concept_name)
        .toObject()
      const res = await dataTableCustomConcepts.executeQueryAndReturnResults(q)
      if (res.indices.length > 0) {
        // If a row exists with the same concept_id & concept_name, delete it
        await dataTableCustomConcepts.deleteRows(res.indices)
      }
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

  // A method to check if the translator exists, and if it doesn't exists, create one
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
    if ($settings) {
      if ($settings.language && $settings.language !== 'en') {
        // Check for translator
        const translator = await createTranslator()
        // Translate the text to English
        let translation = await translator.translate({
          from: $settings!.language,
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
      // If the selected row index divided is an even number & the direction is up, change pagination up
      if (selectedRowIndex % pagination.rowsPerPage! === 0) {
        if (dev) console.log('changePagination: change pagination to ', pagination.currentPage! + 1)
        dataTableFile.changePagination({ currentPage: pagination.currentPage! + 1 })
      }
    } else if (!up && selectedRowIndex !== 0) {
      // If the selected row index + 1 divided is an even number & the direction is down, change pagination down
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
    // Check the language set in the $settings and translate the filter to English if it's not English
    if ($settings) {
      if (!$settings.language) $settings.language = 'en'
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
        // If there is no filter, get the sourceName and translate it to English and use this as the filter
        filter = await translate(selectedRow.sourceName)
      }
    } else if (globalAthenaFilter.filter && filter === undefined) {
      // If the user types his own filter & the filter is undefinedv, use the custom filter
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

  // A method to fill in the additional fields of a row
  async function fillInAdditionalFields(
    row: Record<string, any>,
    usagiRow: Record<string, any>,
    autoMap: boolean
  ): Promise<Record<string, any>> {
    for (let col of Object.keys(additionalFields)) {
      switch (col) {
        case 'equivalence':
          row.equivalence = equivalenceMapping
          break

        case 'statusSetBy':
        case 'statusSetOn':
          row.statusSetBy = $userSessionStore.name
          row.statusSetOn = Date.now()
          break

        case 'createdBy':
        case 'createdOn':
          // If createdBy is not filled in or someone else
          if (!usagiRow.createdBy && usagiRow.createdBy != $userSessionStore.name) {
            row.createdBy = $userSessionStore.name
            row.createdOn = Date.now()
          }
          break

        case 'mappingStatus':
          // If the statusSetBy is not filled in or it is our name that is filled in & when not automapping
          if ((!usagiRow.statusSetBy || usagiRow.statusSetBy == $userSessionStore.name) && !autoMap) {
            row.mappingStatus = 'SEMI-APPROVED'
          }
          break
        case 'ADD_INFO:customConcept':
          row['ADD_INFO:customConcept'] = null
          break
        default:
          // Fill in the additionalFields, but skip the conceptName & conceptId
          if (col !== 'conceptName' && col !== 'conceptId') row[col] = additionalFields[col]
          break
      }
    }
    return row
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
    let mappedUsagiRow: Record<string, any> = usagiRow

    if (mappedUsagiRow != undefined) {
      // Map the import columns that are given from Athena
      for (let [name, alt] of importantAthenaColumns) {
        if (name === 'id' && autoMap) {
          mappedUsagiRow['sourceAutoAssignedConceptIds'] = athenaRow[name]
        } else mappedUsagiRow[alt] = athenaRow[name]
      }
      // Map the extra columns that are not from Athena
      mappedUsagiRow = await fillInAdditionalFields(mappedUsagiRow, usagiRow, autoMap)
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
    let mappedUsagiRow: Record<string, any> = usagiRow
    for (let col of Object.keys(customRow)) {
      if (col === 'concept_id') mappedUsagiRow.conceptId = customRow[col]
      else if (col === 'concept_name') mappedUsagiRow.conceptName = customRow[col]
    }
    // Map the additional columns
    mappedUsagiRow = await fillInAdditionalFields(mappedUsagiRow, usagiRow, false)
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
  }

  // A method to abort the auto mapping
  async function abortAutoMap(): Promise<void> {
    if (dev) console.log('abortAutoMap: Aborting auto mapping')
    // Enable the interaction with the DataTable
    disableInteraction = false
    dataTableFile.setDisabled(false)
    if (autoMappingPromise) {
      autoMappingAbortController.abort()
      // calculateProgress()
    }
    currentVisibleRows = new Map<number, Record<string, any>>()
  }

  // A method to start the auto mapping
  async function autoMapPage(): Promise<void> {
    let start: number, end: number
    if ($settings!.autoMap) {
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
        // Get the rows that are visible for the user
        const q = query()
          .slice(pag.rowsPerPage! * (pag.currentPage! - 1), pag.rowsPerPage! * pag.currentPage!)
          .toObject()
        const res = await dataTableFile.executeQueryAndReturnResults(q)
        if (res.queriedData.length > 0) {
          disableInteraction = true
          dataTableFile.setDisabled(true)
        }
        for (let i = 0; i < res.queriedData.length; i++) {
          if (signal.aborted) return Promise.resolve()
          const row = res.queriedData[i]
          // If the conceptId is empty & sourceAutoassignedConceptIds is not filled in. The sourceAutoAssignedConceptIds is filled in by automapping so if it was already filled in, it was automapped already
          if (!row.conceptId && !row.sourceAutoAssignedConceptIds) await autoMapRow(signal, row, res.indices[i])
        }
        if (dev) {
          end = performance.now()
          console.log('autoMapPage: Finished auto mapping in ', Math.round(end - start!), ' ms')
        }
        resolve(null)
      }).then(() => {
        // Enable interaction with the DataTable for the user
        disableInteraction = false
        dataTableFile.setDisabled(false)
        // calculateProgress()
      })
    } else {
      // calculateProgress()
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

  // A method to create the meta data per column for custom concepts
  function modifyCustomConceptsColumnMetadata(columns: IColumnMetaData[]): IColumnMetaData[] {
    if (dev) console.log('modifyCustomConceptsColumnMetaData: Modifying custom concepts column metadata')
    const customConceptsColumnMap = columnsCustomConcept.reduce((acc, cur) => {
      acc.set(cur.id, cur)
      return acc
    }, new Map<string, IColumnMetaData>())
    const columnIds = columns.map(col => col.id)
    const modifiedColumns = columns.map(col => {
      const customConceptColumn = customConceptsColumnMap.get(col.id)
      if (customConceptColumn) Object.assign(col, customConceptColumn)
      else col.visible = false
      return col
    })
    const addedColumns = columnsCustomConcept.reduce<IColumnMetaData[]>((acc, cur) => {
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
      // If the conceptId is not filled in, fill in the sourceAutoAssignedConceptIds
      if (!row.conceptId) row.conceptId = row.sourceAutoAssignedConceptIds
      if (row.statusSetBy) {
        // If the statusSetBy is not the current user, this means the user is the second authorv (4-eyes principal)
        if (row.statusSetBy != $userSessionStore.name) {
          row['ADD_INFO:approvedBy'] = $userSessionStore.name
          row['ADD_INFO:approvedOn'] = Date.now()
          row.mappingStatus = 'APPROVED'
        } else {
          // The user is the first author
          row.statusSetBy = $userSessionStore.name
          row.statusSetOn = Date.now()
          row.mappingStatus = 'SEMI-APPROVED'
        }
      } else {
        // The user is the first author
        row.statusSetBy = $userSessionStore.name
        row.statusSetOn = Date.now()
        row.mappingStatus = 'SEMI-APPROVED'
      }
      approveRows.set(index, row)
    }
    await dataTableFile.updateRows(approveRows)
    // calculateProgress()
  }

  // async function calculateProgress() {
  //   if (dev) console.log('calculateProgress: Calculating progress')
  //   const qMapping = query().slice(0, 1).toObject()
  //   const qMappingResult = await dataTableFile.executeQueryAndReturnResults(qMapping)
  //   if (qMappingResult[0]) {
  //     if (qMappingResult[0].mappingStatus) {
  //       const expressions = {
  //         total: 'd => op.count()',
  //         valid: 'd => op.valid(d.mappingStatus)',
  //       }
  //       const expressionResults = await dataTableFile.executeExpressionsAndReturnResults(expressions)
  //       const qAppr = query()
  //         .filter((r: any) => r.mappingStatus == 'APPROVED')
  //         .toObject()
  //       const resAppr = await dataTableFile.executeQueryAndReturnResults(qAppr)
  //       tableInformation = {
  //         totalRows: expressionResults.expressionData[0].total,
  //         mappedRows: expressionResults.expressionData[1].valid,
  //         approvedRows: resAppr.queriedData.length,
  //       }
  //     }
  //   }
  // }

  // A method to save the facets
  function saveFacets(facets: Record<string, any>) {
    athenaFacets = facets
  }

  // A method to sync the settings with Firebase
  async function syncSettings(action: 'read' | 'write') {
    // Get the settings from Firebase
    if (action == 'read') {
      if (dev) console.log('syncSettings: Reading the settings for Keun from database')
      const storedSettings = await readDatabase(`/authors/${$userSessionStore.uid}/usagi-settings`)
      if (storedSettings) settings.set(storedSettings)
    } else if (action == 'write') {
      // Write the settings to Firebase
      if (dev) console.log('syncSettings: Write the settings for keun to database')
      await writeToDatabase(`/authors/${$userSessionStore.uid}/usagi-settings`, $settings)
    } else console.error(`syncSettings: Action (${action}) is not supported`)
  }

  let fetchDataFunc = fetchData

  if (browser && window && $implementation == 'firebase') {
    window.addEventListener('beforeunload', async e => {
      await syncSettings('write')
    })
  }

  // A method to get the file from the Firebase file storage when loading the page
  async function readFileFirstTime() {
    if (dev) console.log('readFileFirstTime: Get the file from storage for the setup')
    // Get the file for the page, but also the custom concepts file
    const blob = await readFileStorage(`/mapping-files/${fileName}`)
    const customBlob = await readFileStorage('/mapping-files/customConcepts.csv')
    dbVersion = await readDatabase(`/files/${fileName?.substring(0, fileName.indexOf('.'))}/version`)
    customDBVersion = await readDatabase(`/files/customConcepts/version`)
    if (blob) file = new File([blob], fileName!, { type: 'text/csv' })
    else {
      if (dev) console.error('readFileFirstTime: There was no file found in storage')
      goto('/')
    }

    if (customBlob) customConceptsFile = new File([customBlob], 'customConcepts.csv', { type: 'text/csv' })
  }

  // A method to sync the file from the DataTable with the file storage & IndexedDB
  async function renewFile() {
    // If there is no file loaded
    if (!file) {
      const resFile = await (tableFullOptions.dataTypeImpl! as IDataTypeFile).syncFile(false, true)
      if (resFile) file = resFile
      else console.error('renewFile: Syncfile did not return a file, does the file exist?')
    } else {
      // If a file is already loaded
      const syncedFile = await (tableFullOptions.dataTypeImpl! as IDataTypeFile).syncFile()
      if (syncedFile) file = syncedFile
    }
  }

  // A method to sync the file from the DataTable with the file storage & IndexedDB
  async function renewCustomFile() {
    // If there is no custom concepts file loaded
    if (!customConceptsFile) {
      const resFile = await (customTableOptions.dataTypeImpl! as IDataTypeFile).syncFile(false, true)
      if (resFile) customConceptsFile = resFile
      else console.error('renewCustomFile: Syncfile did not return a file')
    } else {
      // If a custom concepts file is already loaded
      const syncedFile = await (customTableOptions.dataTypeImpl! as IDataTypeFile).syncFile()
      if (syncedFile) customConceptsFile = syncedFile
    }
  }

  async function getFileFromUrl(url: string) {
    const res = await urlToFile(url, fileName!)
    if (res) {
      file = res
      URL.revokeObjectURL(url)
    } else goto('/')
  }

  $: {
    if ($triggerAutoMapping === true) {
      // Trigger the automapping
      autoMapPage()
      $triggerAutoMapping = false
    }
  }

  $: {
    if ($page.url.searchParams.get('fileName') !== fileName) {
      // When the fileName changes
      if ($implementation == 'firebase') {
        fileName = $page.url.searchParams.get('fileName')
        readFileFirstTime()

        // Watch the version & author of the current file
        watchValueDatabase(`/files/${fileName?.substring(0, fileName.indexOf('.'))}`, snapshot => {
          if (snapshot.val()) {
            // If the last version is not created by us, update the dbVersion which triggers the sync
            if (snapshot.val().lastAuthor !== $userSessionStore.name && dbVersion !== snapshot.val().version) {
              if (dev) console.log('watchValueDatabase: The version of the file has changed')
              dbVersion = snapshot.val().version
            }
          }
        })
        // Watch the version & author of the custom concepts
        watchValueDatabase('/files/customConcepts', snapshot => {
          if (snapshot.val()) {
            // If the last version is not created by us, update the customDBVersion which triggers the sync
            if (snapshot.val().lastAuthor !== $userSessionStore.name && customDBVersion !== snapshot.val().version) {
              if (dev) console.log('watchValueDatabase: The version of the custom concepts file has changed')
              customDBVersion = snapshot.val().version
            }
          }
        })
      } else {
        fileName = $page.url.searchParams.get('fileName')
        const url = $page.url.searchParams.get('file')
        if (url && fileName) getFileFromUrl(url)
        else goto('/')
      }
    }
  }

  $: {
    dbVersion
    // When a new dbVersion is found, renew the file
    if ($implementation == 'firebase') if (tableFullOptions.dataTypeImpl) renewFile()
  }

  $: {
    customDBVersion
    // When a new customDBVersion is found, renew the file
    if ($implementation == 'firebase') if (customTableOptions.dataTypeImpl) renewCustomFile()
  }

  $: {
    if ($implementation == 'firebase' && $userSessionStore?.uid) {
      // When the user changes, read the user his settings from Firebase
      syncSettings('read')
    }
  }

  onMount(async () => {
    // Check if the file contains the file query parameter
    if (!$page.url.searchParams.get('fileName')) goto('/')
  })

  onDestroy(() => {
    if ($implementation == 'firebase') {
      // Watch the value in Firebase but instantly destroy the current & previous event listener
      watchValueDatabase(
        `/files/${fileName?.substring(0, fileName.indexOf('.'))}`,
        snapshot => {
          if (dev) console.log('watchValueDatabase: The version of the file has changed')
          if (snapshot.val()) {
            if (snapshot.val().lastAuthor !== $userSessionStore.name) dbVersion = snapshot.val().version
          }
        },
        true
      )
      // Watch the value for custom concepts in Firebase but instantly destroy the current & previous event listener
      watchValueDatabase(
        '/files/customConcepts',
        snapshot => {
          if (dev) console.log('watchValueDatabase: The version of the custom concepts file has changed')
          if (snapshot.val()) {
            if (snapshot.val().lastAuthor !== $userSessionStore.name) customDBVersion = snapshot.val().version
          }
        },
        true
      )
    }
  })
</script>

<svelte:head>
  <title>Keun</title>
  <meta
    name="description"
    content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi."
  />
</svelte:head>

{#if file}
  <DataTable
    data={file}
    bind:this={dataTableFile}
    options={tableFullOptions}
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

  {#if $settings}
    <AthenaLayout
      bind:equivalenceMapping
      {selectedRow}
      {selectedRowIndex}
      mainTable={dataTableFile}
      fetchData={fetchDataFunc}
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

  <div data-name="custom-concepts">
    <DataTable
      data={customConceptsFile}
      options={customTableOptions}
      bind:this={dataTableCustomConcepts}
      modifyColumnMetadata={modifyCustomConceptsColumnMetadata}
    />
  </div>

  {#if tableInit == true}
    <button on:click={approvePage}>Approve page</button>
  {/if}
{/if}

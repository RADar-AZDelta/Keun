<script lang="ts">
  //////////////////////////////////////////////// Framework imports
  import { onDestroy, onMount } from 'svelte'
  import { page } from '$app/stores'
  import { base } from '$app/paths'
  import { beforeNavigate, goto } from '$app/navigation'
  import { browser, dev } from '$app/environment'
  //////////////////////////////////////////////// Packages imports
  import { query } from 'arquero'
  import type Query from 'arquero/dist/types/query/query'
  import {
    abortAutoMapping,
    fileName,
    implementation,
    implementationClass,
    settings,
    translator,
    triggerAutoMapping,
  } from '$lib/store'
  import type {
    IColumnMetaData,
    IPagination,
    ITableOptions,
    SortDirection,
    TFilter,
  } from '@radar-azdelta/svelte-datatable'
  import DataTable from '@radar-azdelta/svelte-datatable'
  // @ts-ignore
  import { LatencyOptimisedTranslator } from '@browsermt/bergamot-translator/translator.js'
  //////////////////////////////////////////////// Component & type imports
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
    ITablePagination,
  } from '$lib/components/Types'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import UsagiRow from '$lib/components/Mapping/UsagiRow.svelte'

  // General variables
  let file: File | undefined = undefined,
    customConceptsFile: File | undefined = undefined,
    navTriggered: boolean = true,
    tableOptions: ITableOptions = {
      id: $fileName,
      rowsPerPage: 15,
      rowsPerPageOptions: [5, 10, 15, 20, 50, 100],
      actionColumn: true,
      paginationOnTop: true,
    },
    customTableOptions: ITableOptions = {
      id: 'customConceptsTable',
      saveOptions: false,
    },
    disableInteraction: boolean = false

  setupDataTable()

  // Athena related variables
  let mappingVisibility: boolean = false,
    mappingUrl: string = import.meta.env.VITE_MAPPINGDATA_PATH,
    lastTypedFilter: string,
    apiFilters: string[] = ['&standardConcept=Standard'],
    equivalenceMapping: string = 'EQUAL',
    globalAthenaFilter: { column: string; filter: string | undefined } = { column: 'all', filter: undefined },
    athenaFacets: Record<string, any> | undefined = undefined

  // Table related variables
  let tableInit: boolean = false,
    currentVisibleRows: Map<number, Record<string, any>> = new Map<number, Record<string, any>>(),
    selectedRow: Record<string, any>,
    selectedRowIndex: number,
    previousAthenaFilter: string,
    previousPage: number

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////

  let dataTableMapping: DataTable,
    dataTableCustomConcepts: DataTable,
    importantAthenaColumns = new Map<string, string>([
      ['id', 'conceptId'],
      ['name', 'conceptName'],
      ['domain', 'domainId'],
    ]),
    additionalFields: Record<string, any> = additionalColumns,
    autoMappingAbortController: AbortController,
    autoMappingPromise: Promise<void> | undefined

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // When the visibility of the mapping pop-up changes
  async function mappingVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>): Promise<void> {
    if (dev)
      console.log('mappingVisibilityChanged: Visibility of the mapping pop-up changed to ', event.detail.visibility)
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()
    // Change the visiblity and update the selected row and index if there is a new row selected
    mappingVisibility = event.detail.visibility
    if (!event.detail.visibility || !event.detail.data) return
    selectedRow = event.detail.data.row
    selectedRowIndex = event.detail.data.index
    const translation = await translate(event.detail.data.row.sourceName)
    globalAthenaFilter.filter = typeof translation == 'string' ? translation : event.detail.data.row.sourceName
  }

  // When the filters in the Athena pop-up change (filters on the left-side for the query)
  function filterOptionsChanged(event: CustomEvent<FilterOptionsChangedEventDetail>): void {
    if (dev) console.log('filterOptionsChanged: Filters in the Athena pop-up changed to ', event.detail.filters)
    if (!event.detail.filters) return
    apiFilters = []
    // Transform the filters to a string that can be used in the query for Athena
    for (let [filter, options] of event.detail.filters) {
      const substring = options.map(option => `&${filter}=${option}`).join()
      if (!apiFilters.includes(substring)) apiFilters.push(substring.replaceAll(',', '&'))
    }
    // Update the update fetch function so the table will be initialized again
    fetchDataFunc = fetchData
  }

  // When the mapping button in the Athena pop-up is clicked and the settins "Map to multiple concepts" is disabled
  async function singleMapping(event: CustomEvent<MappingEventDetail>): Promise<void> {
    if (dev) console.log('singleMapping: Single mapping for the row with sourceCode ', selectedRow.sourceCode)
    // Map the selected row with the selected concept
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow!, event.detail.row)
    // Add extra information like the number of concepts mapped for this row, and the last typed filter to the row
    if (!mappedRow['ADD_INFO:numberOfConcepts']) mappedRow['ADD_INFO:numberOfConcepts'] = 1
    mappedRow['ADD_INFO:lastAthenaFilter'] = lastTypedFilter
    mappedRow['comment'] = event.detail.extra.comment
    mappedRow['assignedReviewer'] = event.detail.extra.reviewer
    // Update the selected row to the updated row
    await dataTableMapping.updateRows(new Map([[mappedIndex, mappedRow]]))
  }

  async function removeFirstRow(): Promise<void> {
    const firstRow = await dataTableCustomConcepts.getFullRow(0)
    // The domain_id can't ever be test so this means it's the placeholder first row
    if (firstRow.domain_id == 'test') await dataTableCustomConcepts.deleteRows([0])
  }

  // When the user custom maps a concept to a row
  async function customMapping(event: CustomEvent<CustomMappingEventDetail>): Promise<void> {
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
    const checkExistanceQuery = (<Query>query().params({
      concept_name: customConcept.concept_name,
      domain_id: customConcept.domain_id,
      vocabulary_id: customConcept.vocabulary_id,
      concept_class_id: customConcept.concept_class_id,
    }))
      .filter(
        (r: any, params: any) =>
          r.concept_name == params.concept_name &&
          r.domain_id == params.domain_id &&
          r.vocabulary_id == params.vocabulary_id &&
          r.concept_class_id == params.concept_class_id
      )
      .toObject()
    const customConceptExists = await dataTableCustomConcepts.executeQueryAndReturnResults(checkExistanceQuery)
    // If there are no duplicates, add the row to the custom concepts DataTable
    if (customConceptExists.queriedData.length === 0) {
      await removeFirstRow()
      await dataTableCustomConcepts.insertRows([customConcept])
    } else {
      if (dev) console.log('customMapping: The custom concept already exists in the custom concepts DataTable')
    }

    // Map the selected row with the custom concept
    const { mappedIndex, mappedRow } = await customRowMapping(selectedRow, customConcept)
    if (!mappedRow['ADD_INFO:numberOfConcepts']) mappedRow['ADD_INFO:numberOfConcepts'] = 1
    mappedRow['comment'] = event.detail.extra.comment
    mappedRow['assignedReviewer'] = event.detail.extra.reviewer
    // If it is single mapping (not to multiple concepts), update the row
    if (!$settings || !$settings.mapToMultipleConcepts || !$fileName)
      return await dataTableMapping.updateRows(new Map([[mappedIndex, mappedRow]]))

    // Get previous mapped concepts
    const prevQuery = (<Query>query().params({ sourceCode: mappedRow.sourceCode }))
      .filter((r: any, params: any) => r.sourceCode == params.sourceCode)
      .toObject()
    const res = await dataTableMapping.executeQueryAndReturnResults(prevQuery)
    // If the sourceCode was found, but the conceptId was undefined, update the row
    if (res.queriedData.length === 1 && !res.queriedData[0].conceptId)
      return await dataTableMapping.updateRows(new Map([[mappedIndex, mappedRow]]))

    if (customConceptExists.queriedData.length > 0) return
    mappedRow['ADD_INFO:numberOfConcepts'] = res.queriedData.length + 1
    const rowsToUpdate = new Map()
    // Update the number of concepts in the already mapped rows
    for (let index of res.indices) {
      rowsToUpdate.set(index, { 'ADD_INFO:numberOfConcepts': res.queriedData.length + 1 })
    }
    await dataTableMapping.updateRows(rowsToUpdate)
    await dataTableMapping.insertRows([mappedRow])
  }

  // When the mapping button in the Athena pop-up is clicked and the settins "Map to multiple concepts" is enabled
  async function multipleMapping(event: CustomEvent<MappingEventDetail>): Promise<void> {
    if (dev) console.log('multipleMapping: Multiple mapping for the row with sourceCode ', selectedRow.sourceCode)
    // Map the selected row with the selected concept
    const { mappedRow } = await rowMapping(event.detail.originalRow!, event.detail.row)

    // Create a query and execute it to get all the rows that are already mapped and got the same sourceCode
    const alreadyMappedRowsQuery = (<Query>query().params({ value: mappedRow.sourceCode }))
      .filter((r: any, params: any) => r.sourceCode == params.value)
      .toObject()
    const alreadyMapped = await dataTableMapping.executeQueryAndReturnResults(alreadyMappedRowsQuery)

    // Add extra information like the number of concepts mapped for this row, comments & the assigned reviewer to the row
    mappedRow.mappingStatus = 'SEMI-APPROVED'
    mappedRow.statusSetBy = author
    mappedRow['ADD_INFO:lastAthenaFilter'] = lastTypedFilter
    mappedRow['ADD_INFO:numberOfConcepts'] = 1
    mappedRow['comment'] = event.detail.extra.comment
    mappedRow['assignedReviewer'] = event.detail.extra.reviewer

    // Check if it's the first concept that will be mapped to this row
    if (alreadyMapped.queriedData.length === 1 && !alreadyMapped.queriedData[0].conceptId) {
      // This is the first concepts mapped to the row and the current row wil be updated
      await dataTableMapping.updateRows(new Map([[alreadyMapped.indices[0], mappedRow]]))
    } else {
      // This is not the first concept mapped to the row and the current row will be added to the table and the others will be updated
      mappedRow['ADD_INFO:numberOfConcepts'] = alreadyMapped.queriedData.length + 1
      const rowsToUpdate = new Map()
      // Update the number of concepts in the already mapped rows
      for (let index of alreadyMapped.indices) {
        rowsToUpdate.set(index, { 'ADD_INFO:numberOfConcepts': alreadyMapped.queriedData.length + 1 })
      }
      await dataTableMapping.updateRows(rowsToUpdate)
      await dataTableMapping.insertRows([mappedRow])
    }
  }

  // When the comments or assingedReviewer are filled in, update these fields in a row
  async function updateDetailsRow(event: CustomEvent<UpdateDetailsEventDetail>): Promise<void> {
    if (dev) console.log(`updateDetailsRow: Update details for the row on index ${event.detail.index}`)
    await dataTableMapping.updateRows(
      new Map([
        [event.detail.index, { comment: event.detail.comment, assignedReviewer: event.detail.assignedReviewer }],
      ])
    )
  }

  async function removeAction(row: Record<string, any>): Promise<Record<string, any>> {
    // Reset previous action
    row.mappingStatus = null
    row['ADD_INFO:approvedBy'] = null
    row['ADD_INFO:approvedOn'] = 0
    row.statusSetBy = null
    row.statusSetOn = 0
    return row
  }

  async function setNormalAction(row: Record<string, any>, action: string): Promise<Record<string, any>> {
    // If the action clicked is UNAPPROVED or FLAGGED
    row.statusSetBy = author
    row.statusSetOn = Date.now()
    row.mappingStatus = action
    return row
  }

  async function setSemi(row: Record<string, any>, id: number | undefined, auto: number): Promise<Record<string, any>> {
    // Set the row to semi approved
    row.statusSetBy = author
    row.statusSetOn = Date.now()
    row.mappingStatus = 'SEMI-APPROVED'
    if (!id) row.conceptId = auto
    else row.conceptId = id
    return row
  }

  async function setApproved(row: Record<string, any>): Promise<Record<string, any>> {
    // StatusSetBy is not empty and it's not the current author so it means it's the second reviewer
    row['ADD_INFO:approvedBy'] = author
    row['ADD_INFO:approvedOn'] = Date.now()
    row.mappingStatus = 'APPROVED'
    return row
  }

  // When a action (approve, flag, unapprove) button is clicked (left-side of the table in the action column)
  async function actionPerformed(event: CustomEvent<ActionPerformedEventDetail>): Promise<void> {
    if (dev)
      console.log(
        `actionPerformed: Action performed (${event.detail.action}) for the row with sourceCode ${event.detail.row.sourceCode}`
      )
    const action = event.detail.action
    const row = event.detail.row
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()
    let updatingObj: { [key: string]: any } = {}

    console.log(row, action)

    if (action === row.mappingStatus && action !== 'APPROVED') updatingObj = await removeAction(updatingObj)
    else if (action !== 'APPROVED' && row.mappingStatus !== action)
      updatingObj = await setNormalAction(updatingObj, event.detail.action)
    else if ((action == 'APPROVED' && !row.statusSetBy) || row.statusSetBy == author)
      updatingObj = await setSemi(updatingObj, row.conceptId, row.sourceAutoAssignedConceptIds)
    else if (
      action == 'APPROVED' &&
      row.statusSetBy &&
      row.statusSetBy !== author &&
      row.mappingStatus == 'SEMI-APPROVED'
    )
      updatingObj = await setApproved(updatingObj)
    else if (
      action == 'APPROVED' &&
      row.statusSetBy &&
      row.statusSetBy != author &&
      row.mappingStatus !== 'SEMI-APPROVED' &&
      row.mappingStatus !== 'APPROVED'
    )
      updatingObj = await setSemi(updatingObj, row.conceptId, row.sourceAutoAssignedConceptIds)
    else {
      if (dev) console.log('actionPerformed: Something went wrong while performing an action on a row.')
    }
    await dataTableMapping.updateRows(new Map([[event.detail.index, updatingObj]]))
  }

  async function resetRow() {
    const reset = additionalFields
    reset.conceptId = null
    reset.domainId = null
    reset.conceptName = null
    delete reset.sourceAutoAssignedConceptIds
    return reset
  }

  // When the delete button is clicked (left-side of the table in the action column)
  async function deleteRow(event: CustomEvent<DeleteRowEventDetail>): Promise<void> {
    if (dev) console.log(`deleteRow: Delete row with sourceCode ${event.detail.sourceCode}`)
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()

    // If it not the only concept that is mapped for that row (multiple mapping), erase the row
    if (event.detail.erase) {
      // Create a query to get all the rows that has the same sourceCode (row mapped to multiple concepts)
      const existanceQuery = (<Query>query().params({ source: event.detail.sourceCode }))
        .filter((r: any, params: any) => r.sourceCode == params.source)
        .toObject()
      const existance = await dataTableMapping.executeQueryAndReturnResults(existanceQuery)
      if (existance.queriedData.length) {
        const rowsToUpdate = new Map()
        // Update the all the rows and set the number of concepts - 1
        for (let index of existance.indices) {
          rowsToUpdate.set(index, { 'ADD_INFO:numberOfConcepts': existance.queriedData.length - 1 })
        }
        await dataTableMapping.updateRows(rowsToUpdate)
      }
      await dataTableMapping.deleteRows(event.detail.indexes)
    } else await dataTableMapping.updateRows(new Map([[event.detail.indexes[0], await resetRow()]]))
  }

  // When the delete button in the table of mapped concepts is clicked, delete the row
  async function deleteRowInnerMapping(event: CustomEvent<DeleteRowInnerMappingEventDetail>): Promise<void> {
    if (dev) console.log('deleteRowInnerMapping: Delete mapping with conceptId ', event.detail.conceptId)
    // If the row is a custom concept, delete it from the custom concepts table
    if (event.detail.custom) {
      // Find a row with the same concept_id & concept_name
      const existanceQuery = (<Query>(
        query().params({ concept_id: event.detail.conceptId, concept_name: event.detail.conceptName })
      ))
        .filter((r: any, params: any) => r.concept_id == params.concept_id && r.concept_name == params.concept_name)
        .toObject()
      const existance = await dataTableCustomConcepts.executeQueryAndReturnResults(existanceQuery)
      // If a row exists with the same concept_id & concept_name, delete it
      if (existance.indices.length) await dataTableCustomConcepts.deleteRows(existance.indices)
    }

    // Create a query to find the index of the row that needs to be removed, can be an index that is not visualised and therefor we use the query
    const existanceQuery = (<Query>query().params({
      conceptId: event.detail.conceptId,
      sourceCode: selectedRow.sourceCode,
      conceptName: event.detail.conceptName,
    }))
      .filter(
        (r: any, params: any) =>
          r.conceptId == params.conceptId && r.sourceCode == params.sourceCode && r.conceptName == params.conceptName
      )
      .toObject()
    const existance = await dataTableMapping.executeQueryAndReturnResults(existanceQuery)

    // If the row needs to be erased, in the case of multiple mapping
    if (event.detail.erase) {
      // A query to find all the rows that are multiple mapped with the same sourceCode
      const allIndexesQuery = (<Query>query().params({ sourceCode: selectedRow.sourceCode }))
        .filter((r: any, params: any) => r.sourceCode == params.sourceCode)
        .toObject()
      const allIndexes = await dataTableMapping.executeQueryAndReturnResults(allIndexesQuery)
      const updatedRows = new Map<number, Record<string, any>>()
      // Update the number of concepts of all the found rows
      allIndexes.indices.forEach((index: number) => {
        updatedRows.set(index, { 'ADD_INFO:numberOfConcepts': allIndexes.indices.length - 1 })
      })
      await dataTableMapping.updateRows(updatedRows)
      await dataTableMapping.deleteRows(existance.indices)
    } else {
      // Reset the row with the original values
      const reset = await resetRow()
      reset['ADD_INFO:numberOfConcepts'] = 1
      await dataTableMapping.updateRows(new Map([[existance.indices[0], reset]]))
    }
  }

  // When the arrow button in the Athena pop-up is clicked to navigate to a different row
  async function selectRow(event: CustomEvent<RowChangeEventDetail>): Promise<void> {
    let pag: ITablePagination = await dataTableMapping.getTablePagination()
    if (!pag.currentPage || !pag.rowsPerPage) return
    new Promise(async (resolve, reject) => {
      const currentRow = event.detail.currentRow
      const indexQuery = (<Query>query().params({
        sourceCode: currentRow.sourceCode,
        sourceName: currentRow.sourceName,
        conceptName: currentRow.conceptName == 'Unmapped' ? undefined : currentRow.conceptName,
      }))
        .filter(
          (r: any, p: any) => r.sourceCode == p.sourceCode && r.sourceName == p.sourceName && r.conceptName == p.conceptName
        )
        .toObject()
      const indexRes = await dataTableMapping.executeQueryAndReturnResults(indexQuery)
      const currentIndex = indexRes.indices[0]

      // TODO: optimize this, with big files this could slow the application down
      const q = query().toObject()
      const res = await dataTableMapping.executeQueryAndReturnResults(q)
      if (res.indices.length == 0) {
        console.error('selectRow: The query to get all the rows did not work!')
        resolve(null)
      }
      const i = res.indices.indexOf(currentIndex)
      if (event.detail.up && i + 1 < pag.totalRows!)
        selectedRowIndex = i == res.indices.length - 1 ? res.indices[i] : res.indices[i + 1]
      else if (!event.detail.up && i - 1 >= 0) selectedRowIndex = i == 0 ? res.indices[0] : res.indices[i - 1]

      // Set the new filter with the translated source name
      selectedRow = await dataTableMapping.getFullRow(selectedRowIndex)
      const translation = await translate(selectedRow.sourceName)
      globalAthenaFilter.filter = typeof translation == 'string' ? translation : selectedRow.sourceName
      resolve(null)
    }).then(() => {
      // Check if the pagination needs to change, and do so if needed
      changePagination(event.detail.up, selectedRowIndex, pag)
    })
  }

  // When the button to automap a single row is clicked, automap the row
  async function autoMapSingleRow(event: CustomEvent<AutoMapRowEventDetail>): Promise<void> {
    if (dev) console.log('autoMapSingleRow: automap the row with index ', event.detail.index)
    // Automap a row manually
    if (autoMappingPromise) autoMappingAbortController.abort()
    // Create a abortcontroller to abort the auto mapping in the future if needed
    autoMappingAbortController = new AbortController()
    const signal = autoMappingAbortController.signal
    autoMappingPromise = new Promise(async (resolve, reject): Promise<void> => {
      const row = await dataTableMapping.getFullRow(event.detail.index)
      await autoMapRow(signal, row, event.detail.index)
    })
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // A method to set the saveImpl & dataTypeImpl of the general DataTable & the DataTable for custom concepts
  async function setupDataTable(): Promise<void> {
    if ($implementation !== 'firebase') return
    await import('$lib/utilClasses/FirebaseSaveImpl').then(({ default: FirebaseStore }) => {
      tableOptions.saveImpl = new FirebaseStore()
    })
    await import('$lib/utilClasses/FileDataTypeImpl').then(({ default: FirebaseDataType }) => {
      tableOptions.dataTypeImpl = new FirebaseDataType()
      customTableOptions.dataTypeImpl = new FirebaseDataType()
    })
  }

  // A method to check if the translator exists, and if it doesn't exists, create one
  function createTranslator(): Promise<LatencyOptimisedTranslator> {
    return new Promise((resolve, reject) => {
      // Recreate a translator if it's a browser because the previous instance is still pending and can't be used
      if ($translator) return resolve($translator)
      $translator = new LatencyOptimisedTranslator(
        {
          workers: 1,
          batchSize: 1,
          registryUrl: 'bergamot/registry.json',
          html: true,
        },
        undefined
      )
      resolve($translator)
    })
  }

  // A method to translate text
  async function translate(text: string): Promise<string | undefined> {
    if (!browser) return undefined
    // Check the settings and if the language set is not english, translate the text
    if (!$settings || !$settings.language || $settings.language === 'en') return text
    const translator = await createTranslator()
    console.log($settings?.language, " AND ", text)
    let translation = await translator.translate({
      from: $settings!.language,
      to: 'en',
      text: text,
      html: true,
    })
    return translation.target.text
  }

  // A method to change the pagination of the table based on the index and the rows per page
  async function changePagination(up: boolean, index: number, pagination: ITablePagination): Promise<void> {
    // When the index exceeds the number of rows per page, go to the next page or go to the previous page
    if (!index || !pagination.currentPage || !pagination.rowsPerPage) return
    if (up) {
      // If the selected row index divided is an even number & the direction is up, change pagination up
      if (index % pagination.rowsPerPage !== 0) return
      if (dev) console.log('changePagination: change pagination to ', pagination.currentPage! + 1)
      dataTableMapping.changePagination({ currentPage: pagination.currentPage! + 1 })
      previousPage = pagination.currentPage
    } else {
      // If the selected row index + 1 divided is an even number & the direction is down, change pagination down
      if ((index + 1) % pagination.rowsPerPage !== 0) return
      if (dev) console.log('changePagination: change pagination to ', pagination.currentPage! - 1)
      dataTableMapping.changePagination({ currentPage: pagination.currentPage! - 1 })
      previousPage = pagination.currentPage
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
    const conceptsResult = await fetch(url)
    const conceptsData = await conceptsResult.json()
    if (!conceptsData.content || !conceptsData.content.length)
      return console.error('autoMapRow: Could not get the concepts from the API')
    // Map the row with the first result
    const numberOfConcepts = row['ADD_INFO:numberOfConcepts']
    const { mappedIndex, mappedRow } = await rowMapping(row, conceptsData.content[0], true, index)
    mappedRow['ADD_INFO:numberOfConcepts'] = numberOfConcepts
    mappedRow['ADD_INFO:lastAthenaFilter'] = filter
    if (signal.aborted) return
    await dataTableMapping.updateRows(new Map([[mappedIndex, mappedRow]]))
    if (dev) {
      end = performance.now()
      console.log('autoMapRow: Finished automapping row with index ', index, ' in ', Math.round(end - start!), ' ms')
    }
  }

  // A method to create the Athena URL
  const assembleAthenaURL = async (flt?: string, srt?: string[], pg?: IPagination, auto?: boolean): Promise<string> => {
    if (dev) console.log('assembleAthenaURL: Assemble Athena URL')
    let assembledAthenaUrl = mappingUrl
    // Apply the api filters
    if (apiFilters) {
      for (let filter of apiFilters) {
        assembledAthenaUrl += filter
      }
    }
    // Add sorting to URL if there is sorting
    if (srt) {
      const sortingName = columnNamesAthena[srt[0] as keyof Object]
      assembledAthenaUrl += `&sort=${sortingName}&order=${srt[1]}`
    }
    // Add filter to URL if there is a filter
    if (flt) {
      lastTypedFilter = flt
      assembledAthenaUrl += `&query=${flt}`
    }
    // Add pagination to URL if there is pagination
    if (auto) {
      assembledAthenaUrl += `&page=1`
      assembledAthenaUrl += `&pageSize=1`
    } else if (pg && !auto) {
      assembledAthenaUrl += `&page=${pg.currentPage}`
      assembledAthenaUrl += `&pageSize=${pg.rowsPerPage}`
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
    const athenaFilter = globalAthenaFilter.filter
    // Check if there is a filter filled in
    if (athenaFilter && athenaFilter !== previousAthenaFilter && athenaFilter !== filter)
      previousAthenaFilter = filter = athenaFilter
    else if (!athenaFilter && selectedRow) filter = await translate(selectedRow.sourceName)
    else if (athenaFilter && !filter) filter = athenaFilter
    else if (athenaFilter == previousAthenaFilter) filter = athenaFilter

    const url = await assembleAthenaURL(filter, sortedColumns.entries().next().value, pagination, false)
    const response = await fetch(url)
    const apiData = await response.json()
    // Save the facets to exclude filters later
    saveFacets(apiData.facets)
    if (globalAthenaFilter.filter) previousAthenaFilter = globalAthenaFilter.filter
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
          row.statusSetBy = author
          row.statusSetOn = Date.now()
          break

        case 'createdBy':
        case 'createdOn':
          // If createdBy is not filled in or someone else
          if (!usagiRow.createdBy && usagiRow.createdBy != author) {
            row.createdBy = author
            row.createdOn = Date.now()
          }
          break

        case 'mappingStatus':
          // If the statusSetBy is not filled in or it is our name that is filled in & when not automapping
          if ((!usagiRow.statusSetBy || usagiRow.statusSetBy == author) && !autoMap) {
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
    if (!mappedUsagiRow) return { mappedIndex: rowIndex, mappedRow: mappedUsagiRow }
    // Map the import columns that are given from Athena
    for (let [name, alt] of importantAthenaColumns) {
      if (name === 'id' && autoMap) mappedUsagiRow['sourceAutoAssignedConceptIds'] = athenaRow[name]
      else mappedUsagiRow[alt] = athenaRow[name]
    }
    // Map the extra columns that are not from Athena
    mappedUsagiRow = await fillInAdditionalFields(mappedUsagiRow, usagiRow, autoMap)

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
    dataTableMapping.setDisabled(false)
    if (autoMappingPromise) autoMappingAbortController.abort()
    $abortAutoMapping = false
    // Check previous page and current page
    const pag = dataTableMapping.getTablePagination()
    if (previousPage !== pag.currentPage) currentVisibleRows = new Map<number, Record<string, any>>()
  }

  // A method to start the auto mapping
  async function autoMapPage(): Promise<void> {
    let start: number, end: number
    if (!$settings?.autoMap) return
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
      const pag = dataTableMapping.getTablePagination()
      if (!pag.currentPage) return
      // Get the rows that are visible for the user
      previousPage = pag.currentPage
      const q = query()
        .slice(pag.rowsPerPage! * (pag.currentPage! - 1), pag.rowsPerPage! * pag.currentPage!)
        .toObject()
      const res = await dataTableMapping.executeQueryAndReturnResults(q)
      if (res.queriedData.length > 0) {
        disableInteraction = true
        dataTableMapping.setDisabled(true)
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
      dataTableMapping.setDisabled(false)
    })
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
  async function approvePage(): Promise<void> {
    if (dev) console.log('approvePage: Approving page')
    let approveRows = new Map<number, Record<string, any>>()
    for (let [index, row] of currentVisibleRows) {
      // If the conceptId is not filled in, fill in the sourceAutoAssignedConceptIds
      if (!row.conceptId) row.conceptId = row.sourceAutoAssignedConceptIds
      if (row.statusSetBy) {
        // If the statusSetBy is not the current user, this means the user is the second authorv (4-eyes principal)
        if (row.statusSetBy != author) {
          row['ADD_INFO:approvedBy'] = author
          row['ADD_INFO:approvedOn'] = Date.now()
          row.mappingStatus = 'APPROVED'
        } else {
          // The user is the first author
          row.statusSetBy = author
          row.statusSetOn = Date.now()
          row.mappingStatus = 'SEMI-APPROVED'
        }
      } else {
        // The user is the first author
        row.statusSetBy = author
        row.statusSetOn = Date.now()
        row.mappingStatus = 'SEMI-APPROVED'
      }
      approveRows.set(index, row)
    }
    await dataTableMapping.updateRows(approveRows)
  }

  async function downloadPage(): Promise<void> {
    await $implementationClass.downloadFile(file!.name, true, false)
    await $implementationClass.downloadFile(`${file!.name.split('.csv')[0]}_concept.csv`, false, true)
    goto('/')
  }

  // A method to save the facets
  function saveFacets(facets: Record<string, any>): void {
    athenaFacets = facets
  }

  // A method to get the file from the Firebase file storage when loading the page
  async function readFileFirstTime(): Promise<void> {
    if (!$fileName) return
    const res = await $implementationClass.readFileFirstTime($fileName)
    if (res && res?.file) file = res.file
    if (res && res?.customConceptsFile) customConceptsFile = res.customConceptsFile
  }

  // A method to sync the file from the DataTable with the file storage & IndexedDB
  async function renewFile(): Promise<void> {
    const resFile = await $implementationClass.syncFile({ fileName: $fileName })
    if (resFile) file = resFile
  }

  // A method to sync the file from the DataTable with the file storage & IndexedDB
  async function renewCustomFile(): Promise<void> {
    const resFile = await $implementationClass.syncFile({ fileName: $fileName })
    if (resFile) customConceptsFile = resFile
  }

  async function setupWatch(onlyCustom: boolean = false): Promise<void> {
    if (onlyCustom == false)
      await $implementationClass.watchValueFromDatabase(
        `/files/${$fileName?.substring(0, $fileName.indexOf('.'))}`,
        () => {
          renewFile()
        }
      )

    // Watch the version & author of the custom concepts
    await $implementationClass.watchValueFromDatabase('/files/customConcepts', () => {
      renewCustomFile()
    })
  }

  async function readFileLocally(): Promise<void> {
    if (!$fileName) return goto(`${base}/`)
    const storedFile = await $implementationClass.readFileFirstTime($fileName)
    if (!storedFile?.file) return goto(`${base}/`)
    file = storedFile.file
    customConceptsFile = storedFile.customConceptsFile
  }

  async function load(): Promise<void> {
    if (!$settings?.author?.name) return
    if ($implementation == 'firebase') {
      const querystringFile = $page.url.searchParams.get('fileName')
      if (querystringFile) $fileName = querystringFile
      readFileFirstTime()
      setupWatch(false)
    } else {
      readFileLocally()
      setupWatch(true)
    }
  }

  $: {
    if ($triggerAutoMapping === true) {
      // Trigger the automapping
      autoMapPage()
      $triggerAutoMapping = false
    }
  }

  $: {
    $fileName
    load()
  }

  $: {
    if ($abortAutoMapping == true) abortAutoMap()
  }

  $: author = $settings?.author?.name

  onMount(async () => {
    // Check if the file contains the file query parameter
    navTriggered = false
    if (!$page.url.searchParams.get('fileName') && !$fileName) goto(`${base}/`)
    if ($implementationClass) await $implementationClass.checkCustomConcepts($fileName)
  })

  onDestroy(() => {
    console.log($implementationClass)
    if (!$implementationClass) return
    $implementationClass.watchValueFromDatabase(
      `/files/${$fileName?.substring(0, $fileName.indexOf('.'))}`,
      () => {
        renewFile()
      },
      true
    )
    $implementationClass.watchValueFromDatabase(
      '/files/customConcepts',
      () => {
        renewCustomFile()
      },
      true
    )
  })

  beforeNavigate(async ({ from, to, cancel }) => {
    if (!from?.url.href.includes('/mapping')) return
    // When reloading or navigating in the window tab in the browser, save the file to cache
    if (dev) console.log('beforeNavigate: Sync the file to IndexedDB')
    // If downloaded, set the downloaded hex in IndexedDB & when leaving the application, compare the downloaded hex and the current hex to check if there were any changes
    if (navTriggered) return
    cancel()
    if (dataTableMapping) {
      const blob = await dataTableMapping.getBlob()
      await $implementationClass?.syncFile({ fileName: $fileName, blob, action: 'update' })
    }
    if (dataTableCustomConcepts) {
      const blob = await dataTableCustomConcepts.getBlob()
      await $implementationClass?.syncFile({
        fileName: `${$fileName.split('.csv')[0]}_concept.csv`,
        blob,
        action: 'update',
      })
    }
    navTriggered = true
    goto(to?.url!)
  })

  let fetchDataFunc = fetchData
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
    bind:this={dataTableMapping}
    options={tableOptions}
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
      mainTable={dataTableMapping}
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
    <!-- TODO: double click on button to approve page -> show some sort of pop-up or something else to say that you need to confirm by clicking again -->
    <button data-name="approve-page" on:click={approvePage}>Approve page</button>
    <button data-name="approve-page" on:click={downloadPage}>Download</button>
  {/if}
{/if}

<script lang="ts">
  import DataTable from 'svelte-radar-datatable'
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
  } from '$lib/components/Types'
  import type { IColumnMetaData, IPagination, SortDirection, TFilter } from 'svelte-radar-datatable'
  import { localStorageGetter } from '$lib/utils'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import UsagiRow from '$lib/components/Mapping/UsagiRow.svelte'
  import { onMount, tick } from 'svelte'
  import { desc, query } from 'arquero'
  import Download from '$lib/components/Extra/Download.svelte'
  import Settings from '$lib/components/Extra/Settings.svelte'
  import { LatencyOptimisedTranslator } from '@browsermt/bergamot-translator/translator.js'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'

  let file: File | undefined

  let settings: Record<string, any> | undefined = undefined
  let translator: LatencyOptimisedTranslator

  let mappingVisibility: boolean = false

  let apiFilters: string[] = ['&standardConcept=Standard']
  let equivalenceMapping: string = 'EQUAL'
  let athenaFilteredColumn: string = 'sourceName'
  let selectedRow: Record<string, any>
  let selectedRowIndex: number
  let rowsMapping = new Map<number, Record<string, any>>()

  let mappingUrl: string = 'https://athena.ohdsi.org/api/v1/concepts?'
  let athenaFiltering: string
  let athenaFilters: Map<string, string[]>

  let tableInit: boolean = false
  let currentRows: Map<number, Record<string, any>> = new Map<number, Record<string, any>>()

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////

  let dataTableFile: DataTable

  let columns: IColumnMetaData[] | undefined = undefined // dataTableColumns

  let importantAthenaColumns = new Map<string, string>([
    ['id', 'conceptId'],
    ['name', 'conceptName'],
    ['domain', 'domainId'],
  ])
  let additionalFields: Record<string, any> = {
    mappingStatus: '',
    matchScore: '',
    statusSetBy: '',
    statusSetOn: '',
    mappingType: '',
    comment: '',
    createdBy: '',
    createdOn: '',
    assignedReviewer: '',
    equivalence: '',
    sourceAutoAssignedConceptIds: '',
    'ADD_INFO:approvedBy': '',
    'ADD_INFO:approvedOn': '',
    'ADD_INFO:additionalInfo': '',
    'ADD_INFO:prescriptionID': '',
    'ADD_INFO:ATC': '',
  }

  let autoMappingAbortController: AbortController
  let autoMappingPromise: Promise<void> | undefined

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // When there is a new file uploaded
  async function onFileInputChange(e: Event) {
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
        break
      }
    }
  }

  // When the visibility of the mapping pop-up changes
  function mappingVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()

    // Change the visiblity and update the selected row and index if there is a new row selected
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
    if (event.detail.filters) {
      athenaFilters = event.detail.filters
      apiFilters = []
      // Transform the filters to a string that can be used in the query for Athena
      for (let [filter, options] of athenaFilters) {
        const substring = options.map(option => `&${filter}=${option}`).join()
        apiFilters.push(substring)
      }
      apiFilters = apiFilters
      // Update the update fetch function so the table will be initialized again
      fetchDataFunc = fetchData
    }
  }

  // When the mapping button in the Athena pop-up is clicked and the settins "Map to multiple concepts" is disabled
  async function singleMapping(event: CustomEvent<SingleMappingEventDetail>) {
    // Map the selected row with the selected concept
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow!, event.detail.row)
    // Add extra information like the number of concepts mapped for this row, comments & the assigned reviewer to the row
    if (!mappedRow['ADD_INFO:numberOfConcepts']) mappedRow['ADD_INFO:numberOfConcepts'] = 1
    if (event.detail.extra) {
      mappedRow.comment = event.detail.extra.comment
      mappedRow.assignedReviewer = event.detail.extra.assignedReviewer
    }
    // Update the selected row to the updated row
    await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
  }

  // When the mapping button in the Athena pop-up is clicked and the settins "Map to multiple concepts" is enabled
  async function multipleMapping(event: CustomEvent<MultipleMappingEventDetail>) {
    // Map the selected row with the selected concept
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow!, event.detail.row)

    // Create a query and execute it to get all the rows that are already mapped and got the same sourceCode
    const q = query()
      .params({ value: mappedRow.sourceCode })
      .filter((r: any, params: any) => r.sourceCode == params.value)
      .toObject()
    const res = await dataTableFile.executeQueryAndReturnResults(q, ['sourceCode'])

    // Add extra information like the number of concepts mapped for this row, comments & the assigned reviewer to the row
    mappedRow.mappingStatus = 'APPROVED'
    mappedRow.statusSetBy = settings!.author
    mappedRow.comment = event.detail.extra!.comment
    mappedRow.assignedReviewer = event.detail.extra!.assignedReviewer

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
      await insertRows(dataTableFile, [mappedRow])
    }
  }

  // When a action (approve, flag, unapprove) button is clicked (left-side of the table in the action column)
  async function actionPerformed(event: CustomEvent<ActionPerformedEventDetail>) {
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()
    const updatingObj: { [key: string]: any } = {}

    // Check if there is a conceptId or a sourceAutoAssignedConceptIds (this is the conceptId that is assigned by the automapping proces)
    if (event.detail.row.conceptId || event.detail.row.sourceAutoAssignedConceptIds) {
      if (event.detail.action == 'APPROVED') {
        if (event.detail.row.statusSetBy == undefined || event.detail.row.statusSetBy == settings!.author) {
          // If statusSetBy is empty, it means the author is the first reviewer of this row
          updatingObj.statusSetBy = settings!.author
          updatingObj.statusSetOn = Date.now()
          updatingObj.mappingStatus = 'APPROVED'
          if (!event.detail.row.conceptId) updatingObj.conceptId = event.detail.row.sourceAutoAssignedConceptIds
          else updatingObj.conceptId = event.detail.row.conceptId
        } else if (event.detail.row.statusSetBy != settings!.author) {
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
  }

  // When the delete button is clicked (left-side of the table in the action column)
  async function deleteRow(event: CustomEvent<DeleteRowEventDetail>) {
    // Check if the automapping proces is running and if this is happening, abort the promise because it could give unexpected results.
    if (autoMappingPromise) autoMappingAbortController.abort()

    // If it not the only concept that is mapped for that row (multiple mapping), erase the row
    if (event.detail.erase == true) {
      // Create a query to get all the rows that has the same sourceCode (row mapped to multiple concepts)
      const q = query()
        .params({ source: event.detail.sourceCode })
        .filter((r: any, params: any) => r.sourceCode == params.source)
        .toObject()
      const res = await dataTableFile.executeQueryAndReturnResults(q, ['sourceCode'])
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
      updatedFields.conceptId = ''
      updatedFields.domainId = ''
      updatedFields.conceptName = ''
      delete updatedFields.sourceAutoAssignedConceptIds
      await dataTableFile.updateRows(new Map([[event.detail.indexes[0], updatedFields]]))
    }
  }

  async function deleteRowInnerMapping(event: CustomEvent<DeleteRowInnerMappingEventDetail>) {
    const q = query()
      .params({ conceptId: event.detail.conceptId, sourceCode: selectedRow.sourceCode })
      .filter((r: any, params: any) => r.conceptId == params.conceptId && r.sourceCode == params.sourceCode)
      .toObject()
    const res = await dataTableFile.executeQueryAndReturnResults(q, ['sourceCode', 'conceptId'])
    if (event.detail.erase) {
      const q = query().params({ sourceCode: selectedRow.sourceCode }).filter((r: any, params: any) => r.sourceCode == params.sourceCode).toObject()
      const res2 = await dataTableFile.executeQueryAndReturnResults(q, ['sourceCode'])
      const updatedRows = new Map<number, Record<string, any>>()
      res2.indices.forEach((index: number) => {
        updatedRows.set(index, { 'ADD_INFO:numberOfConcepts': res2.indices.length - 1 })
      })
      await dataTableFile.updateRows(updatedRows)
      await dataTableFile.deleteRows(res.indices)
    } else {
      const updatedFields = additionalFields
      updatedFields.conceptId = ''
      updatedFields.domainId = ''
      updatedFields.conceptName = ''
      updatedFields['ADD_INFO:numberOfConcepts'] = 1
      delete updatedFields.sourceAutoAssignedConceptIds
      await dataTableFile.updateRows(new Map([[res.indices[0], updatedFields]]))
    }
  }

  // When the arrow button in the Athena pop-up is clicked to navigate to a different row
  async function selectRow(event: CustomEvent<RowChangeEventDetail>) {
    const tablePagination = await dataTableFile.getTablePagination()
    if (event.detail.up && selectedRowIndex + 1 < tablePagination.totalRows!) selectedRowIndex += 1
    if (!event.detail.up && selectedRowIndex - 1 >= 0) selectedRowIndex -= 1

    // When the index exceeds the number of rows per page, go to the next page
    if (event.detail.up && selectedRowIndex !== 0) {
      if (selectedRowIndex % tablePagination.rowsPerPage! === 0) {
        await changePagination({ currentPage: tablePagination.currentPage! + 1 })
      }
    }

    selectedRow = await dataTableFile.getFullRow(selectedRowIndex)
    athenaFiltering = selectedRow[athenaFilteredColumn]
    fetchDataFunc = fetchData
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // A method to automatically map a given row
  async function autoMapRow(signal: AbortSignal, row: Record<string, any>, index: number) {
    // When the signal is aborted quit the method
    if (signal.aborted) return
    let filter = row[athenaFilteredColumn]
    // Check the language set in the settings and translate the filter to English if it's not English
    if (settings) {
      if (!settings.language) settings.language = 'en'
      if (settings.language) {
        if (settings.language != 'en') {
          let translation = await translator.translate({
            from: settings.language,
            to: 'en',
            text: filter,
            html: true,
          })
          filter = translation.target.text
        }
      }
    }
    if (signal.aborted) return
    // Assembe the Athena URL
    const url = await assembleAthenaURL(row[athenaFilteredColumn])
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
  }

  // A method to create the Athena URL
  const assembleAthenaURL = async (filter?: string, sorting?: string[], pagination?: IPagination) => {
    if (filter == undefined) {
      if (athenaFiltering == undefined || athenaFiltering == '') {
        if (selectedRow == undefined) {
          athenaFiltering = ''
        } else {
          athenaFiltering = String(selectedRow[athenaFilteredColumn])
        }
      }
    } else {
      athenaFiltering = filter
    }

    let url = mappingUrl

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
    if (athenaFiltering) url += `&query=${athenaFiltering}`

    // Add pagination to URL if there is pagination
    if (pagination) {
      url += `&page=${pagination.currentPage}`
      url += `&pageSize=${pagination.rowsPerPage}`
    }

    return encodeURI(url)
  }

  // A method to fetch the data from the Athena API, this method is used for the DataTable in the Athena pop-up
  async function fetchData(
    filteredColumns: Map<String, TFilter>,
    sortedColumns: Map<string, SortDirection>,
    pagination: IPagination
  ) {
    const url = await assembleAthenaURL(
      filteredColumns.entries().next().value,
      sortedColumns.entries().next().value,
      pagination
    )
    const response = await fetch(url)
    const apiData = await response.json()
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
    let rowIndex: number = i !== undefined ? i : selectedRowIndex
    const mappedUsagiRow: Record<string, any> = usagiRow

    if (mappedUsagiRow != undefined) {
      // Map the import columns that are given from Athena
      for (let [name, alt] of importantAthenaColumns) {
        if (name === 'id' && autoMap) mappedUsagiRow['sourceAutoAssignedConceptIds'] = athenaRow[name]
        else mappedUsagiRow[alt] = athenaRow[name]
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
              (String(mappedUsagiRow.statusSetBy).replaceAll(' ', '') == '' ||
                mappedUsagiRow.statusSetBy == undefined) &&
              !autoMap
            ) {
              mappedUsagiRow.statusSetBy = settings!.author
              mappedUsagiRow.statusSetOn = Date.now()
            }
            break

          case 'createdBy':
          case 'createdOn':
            if (!mappedUsagiRow.createdBy && mappedUsagiRow.createdBy != settings!.author) {
              mappedUsagiRow.createdBy = settings!.author
              mappedUsagiRow.createdOn = Date.now()
            }
            break

          case 'mappingStatus':
            if (
              mappedUsagiRow.statusSetBy == settings!.author ||
              mappedUsagiRow.statusSetBy == '' ||
              mappedUsagiRow.statusSetBy == undefined
            )
              mappedUsagiRow.mappingStatus == 'APPROVED'
            break
        }
      }
    }
    return {
      mappedIndex: rowIndex,
      mappedRow: mappedUsagiRow,
    }
  }

  // A method to insert a row
  async function insertRows(dataTable: DataTable, rows: any[]) {
    await dataTable.insertRows(rows)
  }

  // A method to change the pagination
  async function changePagination(pagination: { currentPage?: number; rowsPerPage?: number }) {
    const pag: Record<string, any> = {}
    if (pagination.currentPage) pag['currentPage'] = pagination.currentPage
    if (pagination.rowsPerPage) pag['rowsPerPage'] = pagination.rowsPerPage
    await dataTableFile.changePagination(pag)
  }

  function dataTableInitialized() {
    tableInit = true
  }

  // A method to abort the auto mapping
  function abortAutoMap() {
    if (autoMappingPromise) autoMappingAbortController.abort()
    currentRows = new Map<number, Record<string, any>>()
  }

  // A method to start the auto mapping
  function autoMapPage() {
    if (settings!.autoMap) {
      // Abort any automapping that is happening at the moment
      if (autoMappingPromise) autoMappingAbortController.abort()
      // Create a abortcontroller to abort the auto mapping in the future if needed
      autoMappingAbortController = new AbortController()
      const signal = autoMappingAbortController.signal

      autoMappingPromise = new Promise(async (resolve, reject) => {
        const pag = dataTableFile.getTablePagination()
        const columns = dataTableFile.getColumns()
        let sorting: Record<string, any> = {}
        for (let sortedCol of columns!) {
          sorting[sortedCol.id] = sortedCol.sortDirection == 'desc' ? desc(sortedCol.id) : sortedCol.id
        }
        const q = query()
          .orderby(sorting)
          .slice(pag.rowsPerPage! * (pag.currentPage! - 1), pag.rowsPerPage! * pag.currentPage!)
          .toObject()
        const res = await dataTableFile.executeQueryAndReturnResults(q, ['sourceCode'])
        for (let i = 0; i < res.queriedData.length; i++) {
          if (signal.aborted) return Promise.resolve()
          const row = res.queriedData[i]
          const index = res.indices[i]
          if (row.conceptId == undefined) await autoMapRow(signal, row, index)
        }
      })
    }
  }

  // A method to create the meta data per column
  function modifyUsagiColumnMetadata(columns: IColumnMetaData[]): IColumnMetaData[] {
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
    let approvedRows = new Map<number, Record<string, any>>()
    for (let [index, row] of currentRows) {
      if (row.conceptId || row.sourceAutoAssignedConceptIds) {
        if (!row.conceptId) row.conceptId = row.sourceAutoAssignedConceptIds
        if (row.statusSetBy) {
          if (row.statusSetBy != settings!.author) {
            row['ADD_INFO:approvedBy'] = settings!.author
          }
        } else {
          row.statusSetBy = settings!.author
        }
        row.mappingStatus = 'APPROVED'
      }
      approvedRows.set(index, row)
    }
    await dataTableFile.updateRows(approvedRows)
  }

  let fetchDataFunc = fetchData

  onMount(async () => {
    // Get the settings from the local storage
    const storedSettings = localStorageGetter('settings')
    if (storedSettings) settings = storedSettings
    else
      settings = {
        mapToMultipleConcepts: false,
        autoMap: false,
        language: 'nl',
        author: undefined,
        savedAuthors: [],
      }
    // Create a translator object to translate the concepts in the future
    translator = new LatencyOptimisedTranslator(
      {
        workers: 1,
        batchSize: 1,
        registryUrl: 'bergamot/registry.json',
      },
      undefined
    )
  })
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
    <label title="Upload" for="file-upload" data-name="file-upload"
      ><SvgIcon href="icons.svg" id="upload" width="16px" height="16px" /></label
    >
    <input id="file-upload" type="file" accept=".csv, .json" on:change={onFileInputChange} />
    <Download dataTable={dataTableFile} />
  </div>

  <div data-name="header-buttons-container" id="settings">
    <Settings {settings} />
    <User {settings} />
  </div>
</section>

<AthenaLayout
  bind:urlFilters={apiFilters}
  bind:equivalenceMapping
  bind:athenaFilteredColumn
  {selectedRow}
  {selectedRowIndex}
  mainTable={dataTableFile}
  fetchData={fetchDataFunc}
  {settings}
  showModal={mappingVisibility}
  on:rowChange={selectRow}
  on:singleMapping={singleMapping}
  on:multipleMapping={multipleMapping}
  on:deleteRowInnerMapping={deleteRowInnerMapping}
  on:filterOptionsChanged={filterOptionsChanged}
  on:generalVisibilityChanged={mappingVisibilityChanged}
/>

<DataTable
  data={file}
  {columns}
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
    {renderedRow}
    {columns}
    index={originalIndex}
    bind:currentRows
  />
</DataTable>

{#if tableInit == true}
  <button on:click={approvePage}>Approve page</button>
{/if}

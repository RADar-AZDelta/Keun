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
    ColumnFilterChangedEventDetail,
  } from '$lib/components/Types'
  import type { IColumnMetaData, IPagination, SortDirection, TFilter } from 'svelte-radar-datatable'
  import { localStorageGetter } from '$lib/utils'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import UsagiRow from '$lib/components/Mapping/UsagiRow.svelte'
  import { onMount, tick } from 'svelte'
  import { query } from 'arquero'
  import Download from '$lib/components/Extra/Download.svelte'
  import Settings from '$lib/components/Extra/Settings.svelte'
  import { LatencyOptimisedTranslator } from '@browsermt/bergamot-translator/translator.js'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'

  let file: File | undefined

  let settings: Record<string, any> | undefined = undefined
  let translator: LatencyOptimisedTranslator

  let mappingVisibility: boolean = false

  let apiFilters: string[]
  let equivalenceMapping: string = 'EQUAL'
  let athenaFilteredColumn: string = 'sourceName'
  let selectedRow: Record<string, any>
  let selectedRowIndex: number
  let rowsMapping = new Map<number, Record<string, any>>()

  let mappingUrl: string = 'https://athena.ohdsi.org/api/v1/concepts?'
  let athenaFiltering: string
  let athenaFilters: Map<string, string[]>

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
    matchScore: 1,
    statusSetBy: '',
    statusSetOn: new Date().getTime(),
    mappingType: 'MAPS_TO',
    comment: 'AUTO MAPPED',
    createdBy: 'ctl',
    createdOn: new Date().getTime(),
    assignedReviewer: '',
    equivalence: 'EQUAL',
    sourceAutoAssignedConceptIds: '',
    'ADD_INFO:approvedBy': '',
    'ADD_INFO:approvedOn': new Date().getTime(),
    'ADD_INFO:additionalInfo': '',
    'ADD_INFO:prescriptionID': '',
    'ADD_INFO:ATC': '',
  }

  let dataTableInit: boolean = false

  let autoMappingAbortController: AbortController
  let autoMappingPromise: Promise<void> | undefined

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  async function onFileInputChange(e: Event) {
    if (autoMappingPromise) autoMappingAbortController.abort()
    columns = undefined
    file = undefined
    await tick()

    const allowedExtensions = ['csv', 'json']
    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return

    for (const f of inputFiles) {
      const extension = f.name.split('.').pop()
      if (extension && allowedExtensions.includes(extension)) {
        file = f
        break
      }
    }
  }

  function mappingVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    if (autoMappingPromise) autoMappingAbortController.abort()
    mappingVisibility = event.detail.visibility
    if (event.detail.data) {
      selectedRow = event.detail.data.row
      selectedRowIndex = event.detail.data.index
    }
    athenaFiltering = ''
  }

  function filterOptionsChanged(event: CustomEvent<FilterOptionsChangedEventDetail>) {
    if (event.detail.filters) {
      athenaFilters = event.detail.filters
      apiFilters = []
      for (let [filter, options] of athenaFilters) {
        const substring = options.map(option => `&${filter}=${option}`).join()
        apiFilters.push(substring)
      }
      apiFilters = apiFilters
      fetchDataFunc = fetchData
    }
  }

  async function autoMapRow(signal: AbortSignal, row: Record<string, any>, index: number) {
    if (signal.aborted) return
    let filter = row[athenaFilteredColumn]
    if (settings)
      if (settings.language != 'en') {
        let translation = await translator.translate({
          from: settings.language,
          to: 'en',
          text: filter,
          html: true,
        })
        filter = translation.target.text
      }
    if (signal.aborted) return
    const url = await assembleAthenaURL(row[athenaFilteredColumn])
    if (signal.aborted) return
    const res = await fetch(url)
    const resData = await res.json()
    if (resData.content && resData.content.length !== 0) {
      const { mappedIndex, mappedRow } = await rowMapping(row, resData.content[0], true, index)
      rowsMapping.set(mappedIndex, mappedRow)
      mappedRow['ADD_INFO:numberOfConcepts'] = 1
      if (signal.aborted) return
      console.log('UPDATEROWS IN AUTOMAPROW ', new Map([[mappedIndex, mappedRow]]))
      await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
    }
  }

  async function singleMapping(event: CustomEvent<SingleMappingEventDetail>) {
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow!, event.detail.row)
    mappedRow.comment = event.detail.extra.comment
    mappedRow.assignedReviewer = event.detail.extra.assignedReviewer
    await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
  }

  async function multipleMapping(event: CustomEvent<MultipleMappingEventDetail>) {
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow!, event.detail.row)
    const q = query()
      .params({ value: mappedRow.sourceCode })
      .filter((r: any, params: any) => r.sourceCode == params.value)
      .toObject()
    const res = await dataTableFile.executeQueryAndReturnResults(q)
    mappedRow['ADD_INFO:numberOfConcepts'] = res.queriedData.length + 1
    mappedRow.mappingStatus = 'UNAPPROVED'
    mappedRow.statusSetBy = settings!.author
    mappedRow.comment = event.detail.extra.comment
    mappedRow.assignedReviewer = event.detail.extra.assignedReviewer
    const rowsToUpdate = new Map()
    for (let index of res.indices) {
      rowsToUpdate.set(index, { 'ADD_INFO:numberOfConcepts': res.queriedData.length + 1 })
    }
    console.log('UPDATEROWS IN MULTIPLEMAPPING ', rowsToUpdate)
    await dataTableFile.updateRows(rowsToUpdate)
    await insertRows(dataTableFile, [mappedRow])
  }

  async function actionPerformed(event: CustomEvent<ActionPerformedEventDetail>) {
    if (autoMappingPromise) autoMappingAbortController.abort()
    const updatingObj: { [key: string]: any } = {}

    if (event.detail.row.conceptId || event.detail.row.sourceAutoAssignedConceptIds) {
      if (event.detail.action == 'APPROVED') {
        if (event.detail.row.statusSetBy == undefined || event.detail.row.statusSetBy == settings!.author) {
          updatingObj.statusSetBy = settings!.author
          updatingObj.statusSetOn = Date.now()
          updatingObj.mappingStatus = 'UNAPPROVED'
          updatingObj.conceptId = event.detail.row.sourceAutoAssignedConceptIds
        } else if (event.detail.row.statusSetBy != settings!.author) {
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
    console.log('UPDATEROWS IN ACTION PERFORMED ', new Map([[event.detail.index, updatingObj]]))
    await dataTableFile.updateRows(new Map([[event.detail.index, updatingObj]]))
  }

  async function deleteRow(event: CustomEvent<DeleteRowEventDetail>) {
    if (autoMappingPromise) autoMappingAbortController.abort()
    await dataTableFile.deleteRows(event.detail.indexes)
  }

  async function selectRow(event: CustomEvent<RowChangeEventDetail>) {
    const tablePagination = await dataTableFile.getTablePagination()
    if (event.detail.up && selectedRowIndex + 1 < tablePagination.totalRows!) selectedRowIndex += 1
    if (!event.detail.up && selectedRowIndex - 1 >= 0) selectedRowIndex -= 1

    if (event.detail.up && selectedRowIndex !== 0) {
      if (selectedRowIndex % tablePagination.rowsPerPage! === 0) {
        await changePagination({ currentPage: tablePagination.currentPage! + 1 })
      }
    }

    selectedRow = await dataTableFile.getFullRow(selectedRowIndex)
    athenaFiltering = selectedRow[athenaFilteredColumn]
    fetchDataFunc = fetchData
  }

  function columnFilterChanged(event: CustomEvent<ColumnFilterChangedEventDetail>) {
    athenaFiltering = selectedRow[event.detail.filter as keyof Object]
    fetchDataFunc = fetchData
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

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
    if (pagination) url += `&page=${pagination.currentPage}`

    return encodeURI(url)
  }

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

  async function rowMapping(
    usagiRow: Record<string, any>,
    athenaRow: Record<string, any>,
    autoMap = false,
    i?: number
  ) {
    let rowIndex: number = i !== undefined ? i : selectedRowIndex
    const mappedUsagiRow: Record<string, any> = usagiRow

    if (mappedUsagiRow != undefined) {
      for (let [name, alt] of importantAthenaColumns) {
        if (name === 'id' && autoMap) mappedUsagiRow['sourceAutoAssignedConceptIds'] = athenaRow[name]
        else mappedUsagiRow[alt] = athenaRow[name]
      }
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
              mappedUsagiRow.mappingStatus == 'UNAPPROVED'
            break
        }
      }
    }
    return {
      mappedIndex: rowIndex,
      mappedRow: mappedUsagiRow,
    }
  }

  async function insertRows(dataTable: DataTable, rows: any[]) {
    await dataTable.insertRows(rows)
  }

  async function changePagination(pagination: { currentPage?: number; rowsPerPage?: number }) {
    const pag: Record<string, any> = {}
    if (pagination.currentPage) pag['currentPage'] = pagination.currentPage
    if (pagination.rowsPerPage) pag['rowsPerPage'] = pagination.rowsPerPage
    await dataTableFile.changePagination(pag)
  }

  function dataTableInitialized() {
    dataTableInit = true
  }

  function abortAutoMap() {
    if (autoMappingPromise) autoMappingAbortController.abort()
  }

  function autoMapPage() {
    if (settings!.autoMap) {
      if (autoMappingPromise) autoMappingAbortController.abort()

      autoMappingAbortController = new AbortController()
      const signal = autoMappingAbortController.signal

      autoMappingPromise = new Promise(async (resolve, reject) => {
        const pag = dataTableFile.getTablePagination()
        // TODO: when a column is sorted and a row is multiple mapped --> the next row is duplicated and updates every other row on the page
        // await dataTableFile.getFullRow(index) returns that next row always
        console.log('PAGINATION ', pag.rowsPerPage)
        for (let index of Array(pag.rowsPerPage!).keys()) {
          if (signal.aborted) return Promise.resolve()
          const row = await dataTableFile.getFullRow(index)
          console.log('ROW ', row, ' WITH INDEX ', index)
          if (row.conceptId == undefined) await autoMapRow(signal, row, index)
        }
      })
    }
  }

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

  let fetchDataFunc = fetchData

  onMount(async () => {
    const storedSettings = localStorageGetter('settings')
    if (storedSettings) settings = storedSettings
    else
      settings = {
        mapToMultipleConcepts: false,
        autoMap: false,
        language: 'nl',
        author: undefined,
        savedAuthors: []
      }
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
  <title>POC-Keun</title>
  <meta
    name="description"
    content="POC-Keun is a mapping tool to map concepts to OMOP concepts. It's the replacement of Usagi."
  />
</svelte:head>

<section data-name="header">
  <Header />

  <div data-name="table-options">
    <label for="file-upload" data-name="file-upload"
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
  on:filterOptionsChanged={filterOptionsChanged}
  on:columnFilterChanged={columnFilterChanged}
  on:generalVisibilityChanged={mappingVisibilityChanged}
/>

<DataTable
  data={file}
  {columns}
  bind:this={dataTableFile}
  options={{ id: 'usagi', rowsPerPage: 15, rowsPerPageOptions: [5, 10, 15, 20, 50, 100], actionColumn: true }}
  on:rendering={abortAutoMap}
  on:renderingComplete={autoMapPage}
  on:initialized={dataTableInitialized}
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
  />
</DataTable>

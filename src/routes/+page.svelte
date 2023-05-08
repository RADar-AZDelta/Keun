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
    ILogger,
    MultipleMappingEventDetail,
    SingleMappingEventDetail,
    SingleSorting,
    VisibilityChangedEventDetail,
    ColumnFilterChangedEventDetail,
    UniqueConceptIdsChangedEventDetail,
  } from '$lib/components/Types'
  import type { IColumnMetaData, IPagination, SortDirection, TFilter } from 'svelte-radar-datatable'
  import Modal from '$lib/components/Extra/Modal.svelte'
  import { localStorageGetter } from '$lib/utils'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import UsagiRow from '$lib/components/Mapping/UsagiRow.svelte'
  import { onMount, tick } from 'svelte'
  import AthenaRow from '$lib/components/Mapping/AthenaRow.svelte'
  import { op, query } from 'arquero'
  import Download from '$lib/components/Extra/Download.svelte'
  import ErrorLogging from '$lib/components/Extra/ErrorLogging.svelte'
  import Settings from '$lib/components/Extra/Settings.svelte'

  let file: File | undefined

  let settings: Record<string, any> = {
    mapToMultipleConcepts: false,
    language: 'nl',
    author: undefined,
  }

  // let mounted: boolean = false
  let settingsVisibility: boolean = false

  let authorVisibility: boolean = false
  let authorInput: string = ''
  let author: string = ''
  let mappingVisibility: boolean = false
  let errorVisibility: boolean = false
  let errorLog: ILogger = { message: undefined, title: undefined, type: undefined }

  let apiFilters: string[]
  let equivalenceMapping: string = 'EQUAL'
  let athenaFilteredColumn: string = 'sourceName'
  let athenaFilters = new Map<string, string[]>()
  let selectedRow: Record<string, any>
  let selectedRowIndex: number
  let lastRow: boolean = false
  let rowsMapping = new Map<number, Record<string, any>>()

  let mappingUrl: string = 'https://athena.ohdsi.org/api/v1/concepts?'
  let athenaSorting: SingleSorting
  let athenaFiltering: string
  let athenaNames: Object = columnsAthena

  let uniqueConceptIds: string[]

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////

  let dataTableFile: DataTable

  let columns: IColumnMetaData[] | undefined = undefined // dataTableColumns

  let dataTableAthena: DataTable

  const athenaColumns: IColumnMetaData[] = [
    {
      id: 'id',
    },
    {
      id: 'code',
    },
    {
      id: 'name',
    },
    {
      id: 'className',
    },
    {
      id: 'standardConcept',
    },
    {
      id: 'invalidReason',
    },
    {
      id: 'domain',
    },
    {
      id: 'vocabulary',
    },
    {
      id: 'score',
    },
  ]

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
      } else {
        errorLog = {
          title: 'File format',
          message: "You inserted a file format that is not supported. The accepted format is '.csv'.",
          type: 'error',
        }
      }
    }
  }

  function mappingVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    mappingVisibility = event.detail.visibility
    if (event.detail.data) {
      selectedRow = event.detail.data.row
      selectedRowIndex = event.detail.data.index
    }
    athenaFiltering = ''
    const tablePagination = dataTableFile.getTablePagination()
    lastRow = selectedRowIndex == tablePagination.totalRows! - 1
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
    const url = assembleAthenaURL(row[athenaFilteredColumn])
    if (signal.aborted) return
    const res = await fetch(url)
    const resData = await res.json()
    if (resData.content && resData.content.length !== 0) {
      const { mappedIndex, mappedRow } = await rowMapping(row, resData.content[0], true, index)
      rowsMapping.set(mappedIndex, mappedRow)
      mappedRow['ADD_INFO:numberOfConcepts'] = 1
      if (signal.aborted) return
      await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
    }
  }

  async function singleRowMapping(event: CustomEvent<SingleMappingEventDetail>) {
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow, event.detail.row)
    await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
  }

  async function multipleRowMapping(event: CustomEvent<MultipleMappingEventDetail>) {
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow, event.detail.row)
    const q = query()
      .params({ value: mappedRow.sourceCode })
      .filter((r: any, params: any) => r.sourceCode == params.value)
      .toObject()
    const res = await dataTableFile.executeQueryAndReturnResults(q)
    mappedRow['ADD_INFO:numberOfConcepts'] = res.queriedData.length + 1
    const rowsToUpdate = new Map()
    for (let index of res.indices) {
      rowsToUpdate.set(index, { 'ADD_INFO:numberOfConcepts': res.queriedData.length + 1 })
    }
    await dataTableFile.updateRows(rowsToUpdate)
    await insertRows(dataTableFile, [mappedRow])
  }

  async function actionPerformed(event: CustomEvent<ActionPerformedEventDetail>) {
    const updatingRow: Record<string, any> = {}

    if (event.detail.row['statusSetBy'] === author && event.detail.action === 'APPROVED') {
      errorLog = {
        title: 'Invalid action',
        message:
          "You cannot approve a row where you edited the row. Only a reviewer that hasn't edited the row can approve this row.",
        type: 'warning',
      }
    } else {
      if (event.detail.row['statusSetBy'] === author) {
        updatingRow.statusSetBy = author
        updatingRow.statusSetOn = Date.now()
        updatingRow.mappingStatus = event.detail.action
      } else {
        if (event.detail.action === 'APPROVED') {
          updatingRow['ADD_INFO:approvedBy'] = author
          updatingRow['ADD_INFO:approvedOn'] = Date.now()
          updatingRow.mappingStatus = event.detail.action
        } else {
          updatingRow.statusSetBy = author
          updatingRow.statusSetOn = Date.now()
          updatingRow['ADD_INFO:approvedBy'] = undefined
          updatingRow['ADD_INFO:approvedOn'] = undefined
          updatingRow.mappingStatus = event.detail.action
        }
      }
    }

    await dataTableFile.updateRows(new Map([[event.detail.index, updatingRow]]))
  }

  async function deleteRow(event: CustomEvent<DeleteRowEventDetail>) {
    await dataTableFile.deleteRows(event.detail.indexes)
  }

  function columnFilterChanged(event: CustomEvent<ColumnFilterChangedEventDetail>) {
    athenaFiltering = selectedRow[event.detail.filter]
    fetchDataFunc = fetchData
  }

  function uniqueConceptIdsChanged(event: CustomEvent<UniqueConceptIdsChangedEventDetail>) {
    uniqueConceptIds = event.detail.uniqueConceptIds
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  function assembleAthenaURL(filter?: string, pagination?: IPagination) {
    if (!filter) {
      if (!athenaFiltering || athenaFiltering.length === 0) {
        if (!selectedRow) athenaFiltering = ''
        else athenaFiltering = selectedRow[athenaFilteredColumn].toString()
      }
    } else athenaFiltering = filter

    const athenaPagination: IPagination = pagination
      ? pagination
      : {
          currentPage: 0,
          rowsPerPage: 1,
        }

    let url = mappingUrl
    url += `pageSize=${athenaPagination.rowsPerPage}`
    if (athenaPagination.currentPage) {
      if (athenaPagination.currentPage == 0) {
        url += `&page=1`
      } else {
        url += `&page=${athenaPagination.currentPage}`
      }
    } else url += `&page=1`

    // Add filter to URL if it exists
    if (athenaFiltering) url += `&query=${athenaFiltering}`

    apiFilters = [...new Set(apiFilters)] //remove duplicates
    if (apiFilters) {
      for (let filter of apiFilters) {
        url += filter
      }
    }

    // Add sorting to URL if there is sorting
    if (athenaSorting && athenaNames[athenaSorting.column as keyof Object]) {
      url += `&sort=${athenaNames[athenaSorting.column as keyof Object]}`
      if (athenaSorting.sortDirection) url += `&order=${athenaSorting.sortDirection}`
    }

    return encodeURI(url)
  }

  async function fetchData(
    filteredColumns: Map<String, TFilter>,
    sortedColumns1: Map<string, SortDirection>,
    pagination: IPagination
  ) {
    const url = assembleAthenaURL(undefined, pagination)
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
    //dataTable: DataTable,
    autoMap = false,
    i?: number
  ) {
    let rowIndex: number = i !== undefined ? i : selectedRowIndex
    const mappedUsagiRow: Record<string, any> = usagiRow

    if (!athenaRow)
      return {
        mappedIndex: rowIndex,
        mappedRow: mappedUsagiRow,
      }

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
          mappedUsagiRow[col] = author
          break

        case 'createdBy':
        case 'createdOn':
          if (!usagiRow.createdBy || usagiRow.createdBy.length === 0) {
            mappedUsagiRow.createdBy = author
            mappedUsagiRow.createdOn = Date.now()
          }
          break

        case 'ADD_INFO:approvedBy':
        case 'ADD_INFO:approvedOn':
          mappedUsagiRow[col] = undefined
          break

        case 'mappingStatus':
          if (usagiRow.statusSetBy == author || !usagiRow.statusSetBy || usagiRow.statusSetBy.length === 0)
            mappedUsagiRow['mappingStatus'] = 'UNAPPROVED'
          break
      }
    }
    return {
      mappedIndex: rowIndex,
      mappedRow: mappedUsagiRow,
    }
  }

  async function selectRow(positionUp: boolean) {
    const tablePagination = await dataTableFile.getTablePagination()
    if (positionUp && selectedRowIndex + 1 < tablePagination.totalRows!) selectedRowIndex += 1
    if (!positionUp && selectedRowIndex - 1 >= 0) selectedRowIndex -= 1
    lastRow = positionUp && selectedRowIndex === tablePagination.totalRows! - 1

    if (positionUp && selectedRowIndex !== 0) {
      if (selectedRowIndex % tablePagination.rowsPerPage! === 0) {
        await changePagination({ currentPage: tablePagination.currentPage! + 1 })
      }
    }

    const selectedRowObj = await dataTableFile.getFullRow(selectedRowIndex)
    selectedRow = selectedRowObj.row
    const selectedRowValues = Object.values(selectedRow)
    athenaFiltering = String(
      selectedRowValues[columns!.indexOf(columns!.find(column => column.id === athenaFilteredColumn)!) as keyof object]
    )
    fetchDataFunc = fetchData
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
    if (autoMappingPromise) autoMappingAbortController.abort()

    autoMappingAbortController = new AbortController()
    const signal = autoMappingAbortController.signal

    autoMappingPromise = new Promise(async (resolve, reject) => {
      const pag = dataTableFile.getTablePagination()
      for (let index of Array(pag.rowsPerPage!).keys()) {
        if (signal.aborted) return Promise.resolve()
        const row = await dataTableFile.getFullRow(index)
        if (
          row &&
          (!row.conceptId || row.conceptId.length === 0) &&
          (!row.sourceAutoAssignedConceptIds || row.sourceAutoAssignedConceptIds.length === 0)
        ) {
          await autoMapRow(signal, row, index)
        }
      }
      resolve()
    })
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

  // $: {
  //   if (mounted && (!author || author.length === 0)) authorVisibility = true
  // }

  onMount(async () => {
    // const storedAuthor = localStorageGetter('author')
    // if (storedAuthor) {
    //   author = storedAuthor.replaceAll('"', '')
    //   authorInput = author
    // }
    // if (!author || author.length === 0) authorVisibility = true

    const storedSettings = localStorageGetter('settings')
    if (storedSettings) settings = storedSettings
  })
</script>

<section data-name="header">
  <Header />

  <div data-name="table-options">
    <input type="file" accept=".csv, .json" on:change={onFileInputChange} />
    <Download dataTable={dataTableFile} />
  </div>

  <div data-name="header-buttons-container" id="settings">
    <Settings {settings} />
    <User {settings} />
  </div>
</section>

<div data-name="logger-seperate">
  <ErrorLogging visibility={errorVisibility} log={errorLog} />
</div>

<!-- MODALS -->
<Modal on:generalVisibilityChanged={mappingVisibilityChanged} show={mappingVisibility} size="large">
  <AthenaLayout
    on:filterOptionsChanged={filterOptionsChanged}
    on:columnFilterChanged={columnFilterChanged}
    on:uniqueConceptIdsChanged={uniqueConceptIdsChanged}
    bind:urlFilters={apiFilters}
    bind:equivalenceMapping
    bind:athenaFilteredColumn
    filterColumns={['sourceName', 'sourceCode']}
    {selectedRow}
    mainTable={dataTableFile}
  >
    <div slot="currentRow" data-name="currentRow">
      <button id="left" on:click={() => selectRow(false)} disabled={selectedRowIndex == 0 ? true : false}>
        <SvgIcon href="icons.svg" id="arrow-left" width="16px" height="16px" />
      </button>
      <table class="table">
        <tr>
          <th>sourceCode</th>
          <th>sourceName</th>
          <th>sourceFrequency</th>
        </tr>
        <tr>
          {#if selectedRow}
            <td>{selectedRow[0]}</td>
            <td>{selectedRow[1]}</td>
            <td>{selectedRow[2]}</td>
          {/if}
        </tr>
      </table>
      <button id="right" on:click={() => selectRow(true)} disabled={lastRow}>
        <SvgIcon href="icons.svg" id="arrow-right" width="16px" height="16px" />
      </button>
    </div>
    <div slot="table">
      <DataTable
        data={fetchDataFunc}
        columns={athenaColumns}
        options={{ id: 'Athena', actionColumn: true }}
        bind:this={dataTableAthena}
      >
        <AthenaRow
          slot="default"
          let:renderedRow
          on:singleMapping={singleRowMapping}
          on:multipleMapping={multipleRowMapping}
          {renderedRow}
          columns={athenaColumns}
          {settings}
          mainTable={dataTableFile}
          mainTableColumns={columns ?? []}
          {selectedRowIndex}
          {uniqueConceptIds}
        />
      </DataTable>
    </div>
    <div slot="mappedRows" data-name="mappedRows" let:mapped>
      <table>
        {#if mapped.length != 0}
          {#if mapped.length == 1 && mapped[0].conceptId == undefined && mapped[0].conceptName == undefined}
            <div />
          {:else}
            <tr>
              <th>conceptId</th>
              <th>conceptName</th>
            </tr>
            {#each mapped as row}
              <tr>
                <td>{row.conceptId}</td>
                <td>{row.conceptName}</td>
              </tr>
            {/each}
          {/if}
        {/if}
      </table>
    </div>
  </AthenaLayout>
</Modal>

<!-- DATATABLE -->
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
    let:index
    on:generalVisibilityChanged={mappingVisibilityChanged}
    on:actionPerformed={actionPerformed}
    on:deleteRow={deleteRow}
    {renderedRow}
    {columns}
    {index}
    showMappingPopUp={mappingVisibility}
    {author}
  />
</DataTable>

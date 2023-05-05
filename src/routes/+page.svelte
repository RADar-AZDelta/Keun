<script lang="ts">
  import DataTable from 'svelte-radar-datatable'
  import dataTableColumns from '$lib/data/columns.json'
  import rowStatuses from '$lib/data/statuses.json'
  import athenaNamesJSON from '$lib/data/columnsAthena.json'
  import Header from '$lib/components/Extra/Header.svelte'
  import User from '$lib/components/Extra/User.svelte'
  import type {
    ActionPerformedEventDetail,
    AutoMappingEventDetail,
    DeleteRowEventDetail,
    FilterOptionsChangedEventDetail,
    ILogger,
    IStatus,
    MultipleMappingEventDetail,
    SingleMappingEventDetail,
    SingleSorting,
    VisibilityChangedEventDetail,
    CellEditedEventDetail,
    ColumnFilterChangedEventDetail,
    UniqueConceptIdsChangedEventDetail,
  } from '$lib/components/Types'
  import Settings from '$lib/components/Extra/Settings.svelte'
  import type { IColumnMetaData, IPagination, SortDirection, TFilter } from 'svelte-radar-datatable'
  import Modal from '$lib/components/Extra/Modal.svelte'
  import { assembleURL, localStorageGetter, localStorageSetter, updateSettings } from '$lib/utils'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import Row from '$lib/components/Mapping/Row.svelte'
  import { onMount } from 'svelte/internal'
  import AthenaRow from '$lib/components/Mapping/AthenaRow.svelte'
  import { op, query } from 'arquero'
  import Download from '$lib/components/Extra/Download.svelte'
  import ErrorLogging from '$lib/components/Extra/ErrorLogging.svelte'

  let file: File
  let mounted: boolean = false
  let settingsVisibility: boolean = false
  let settings = new Map<string, boolean | string | number>([
    ['Map to multiple concepts', false],
    ['Language', 'en'],
  ])
  let languages: Record<string, string> = {
    bg: 'Bulgarian',
    ca: 'Catalan',
    cs: 'Czech',
    nl: 'Dutch',
    en: 'English',
    et: 'Estonian',
    de: 'German',
    fr: 'French',
    is: 'Icelandic',
    it: 'Italian',
    nb: 'Norwegian Bokmål',
    nn: 'Norwegian Nynorsk',
    fa: 'Persian',
    pl: 'Polish',
    pt: 'Portuguese',
    ru: 'Russian',
    es: 'Spanish',
    uk: 'Ukrainian',
  }
  let authorVisibility: boolean = false
  let authorInput: string = ''
  let author: string = ''
  let mappingVisibility: boolean = false
  let errorVisibility: boolean = false
  let errorLog: ILogger = { message: undefined, title: undefined, type: undefined }

  let APIFilters: string[]
  let APICall: string
  let equivalenceMapping: string = 'EQUAL'
  let athenaFilteredColumn: string = 'sourceName'
  let athenaFilters = new Map<string, string[]>()
  let selectedRow: Record<string, any>
  let selectedRowIndex: number
  let lastRow: boolean = false
  let rowsMapping = new Map<number, Record<string, any>>()

  let mappingURL: string = 'https://athena.ohdsi.org/api/v1/concepts?'
  let athenaPagination: IPagination = {
    currentPage: 0,
    rowsPerPage: 1,
  }
  let athenaSorting: SingleSorting
  let athenaFiltering: string
  let athenaNames: Object = athenaNamesJSON

  let uniqueConceptIds: string[]

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////

  let dataTableFile: DataTable

  let columns: IColumnMetaData[] = dataTableColumns

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
  let additionalFields: { [key: string]: any } = {
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

  let statuses: IStatus[] = rowStatuses

  let dataTableInit: boolean = false

  const controller = new AbortController()
  const signal = controller.signal

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  function onFileInputChange(e: Event) {
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

  function authorVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    authorInput = author
    authorVisibility = event.detail.visibility
  }

  function settingsVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    settingsVisibility = event.detail.visibility
  }

  function mappingVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    mappingVisibility = event.detail.visibility
    event.detail.data != undefined
      ? ((selectedRow = event.detail.data.row), (selectedRowIndex = event.detail.data.index))
      : null
    athenaFiltering = ''
    const tablePagination = dataTableFile.getTablePagination()
    selectedRowIndex == tablePagination.totalRows! - 1 ? (lastRow = true) : (lastRow = false)
  }

  function filterOptionsChanged(event: CustomEvent<FilterOptionsChangedEventDetail>) {
    if (event.detail.filters) {
      athenaFilters = event.detail.filters
      APIFilters = []
      for (let [filter, options] of athenaFilters) {
        let substring: string = ''
        for (let option of options) {
          substring += `&${filter}=${option}`
        }
        APIFilters.push(substring)
      }
      APIFilters = APIFilters
      fetchDataURL = fetchData
    }
  }

  async function autoMapping(event: CustomEvent<AutoMappingEventDetail>) {
    if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
    return new Promise(async (resolve, reject) => {
      signal.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'))
      })
      const rowObj: { [key: string]: any } = {}
      for (let i = 0; i < event.detail.row.length; i++) {
        rowObj[columns[i].id as keyof object] = event.detail.row[i]
      }
      const URL = await assembleAthenaURL(rowObj[athenaFilteredColumn])
      const res = await fetch(URL)
      const resData = await res.json()
      if (resData.content[0]) {
        const { mappedIndex, mappedRow } = await rowMapping(
          rowObj,
          resData.content[0],
          dataTableFile,
          event.detail.index
        )
        rowsMapping.set(mappedIndex, mappedRow)
        mappedRow['ADD_INFO:numberOfConcepts'] = 1
        await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
      }
      athenaFiltering = ''
    })
  }

  async function singleRowMapping(event: CustomEvent<SingleMappingEventDetail>) {
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow, event.detail.row, dataTableFile)
    await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
  }

  async function multipleRowMapping(event: CustomEvent<MultipleMappingEventDetail>) {
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow, event.detail.row, dataTableFile)
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
    columns.find(column => column.id == 'mappingStatus') == undefined ? columns.push({ id: 'mappingStatus' }) : null
    const cols = await dataTableFile.getColumns()
    const statusSetByIndex = cols!.findIndex(col => col.id == 'statusSetBy')
    const updatingObj: { [key: string]: any } = {}

    if (event.detail.row[statusSetByIndex] == author && event.detail.action == 'APPROVED') {
      errorLog = {
        title: 'Invalid action',
        message:
          "You cannot approve a row where you edited the row. Only a reviewer that hasn't edited the row can approve this row.",
        type: 'warning',
      }
    } else {
      if (event.detail.row[statusSetByIndex] == author) {
        updatingObj.statusSetBy = author
        updatingObj.statusSetOn = Date.now()
        updatingObj.mappingStatus = event.detail.action
      } else {
        if (event.detail.action == 'APPROVED') {
          updatingObj['ADD_INFO:approvedBy'] = author
          updatingObj['ADD_INFO:approvedOn'] = Date.now()
          updatingObj.mappingStatus = event.detail.action
        } else {
          updatingObj.statusSetBy = author
          updatingObj.statusSetOn = Date.now()
          updatingObj['ADD_INFO:approvedBy'] = null
          updatingObj['ADD_INFO:approvedOn'] = null
          updatingObj.mappingStatus = event.detail.action
        }
      }
    }

    await dataTableFile.updateRows(new Map([[event.detail.index, updatingObj]]))
  }

  async function cellEdited(event: CustomEvent<CellEditedEventDetail>) {
    const updatingObj: { [key: string]: any } = {}
    updatingObj[Object.keys(event.detail.update)[0]] = Object.values(event.detail.update)[0]
    updatingObj.statusSetBy = author
    updatingObj.statusSetOn = Date.now()
    updatingObj['ADD_INFO:approvedBy'] = null
    updatingObj['ADD_INFO:approvedOn'] = null
    await dataTableFile.updateRows(new Map([[event.detail.index, updatingObj]]))
  }

  async function deleteRow(event: CustomEvent<DeleteRowEventDetail>) {
    await dataTableFile.deleteRows(event.detail.indexes)
  }

  function columnFilterChanged(event: CustomEvent<ColumnFilterChangedEventDetail>) {
    athenaFiltering = selectedRow[event.detail.filter]
    fetchDataURL = fetchData
  }

  function uniqueConceptIdsChanged(event: CustomEvent<UniqueConceptIdsChangedEventDetail>) {
    uniqueConceptIds = event.detail.uniqueConceptIds
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  const assembleAthenaURL = async (filter?: string) => {
    if (filter == undefined) {
      if (athenaFiltering == undefined || athenaFiltering == '') {
        if (selectedRow == undefined) {
          athenaFiltering = ''
        } else {
          athenaFiltering = String(
            selectedRow[columns.indexOf(columns.find(column => column.id == athenaFilteredColumn)!) as keyof object]
          )
        }
      }
    } else {
      athenaFiltering = filter
    }
    const URL = assembleURL(mappingURL, APIFilters, athenaPagination, athenaFiltering, athenaSorting, athenaNames)
    APICall = URL
    return URL
  }

  const fetchData = async (
    filteredColumns: Map<String, TFilter>,
    sortedColumns1: Map<string, SortDirection>,
    pagination: IPagination
  ) => {
    athenaPagination = pagination
    await assembleAthenaURL()
    const response = await fetch(APICall)
    const APIData = await response.json()
    return {
      data: APIData.content,
      totalRows: APIData.totalElements,
    }
  }

  const rowMapping = async (
    originalRow: Record<string, any>,
    row: { [key: string]: any },
    dataTable: DataTable,
    i?: number
  ) => {
    let rowIndex: number
    i == undefined ? (rowIndex = selectedRowIndex) : (rowIndex = i)
    const rowObj: { [key: string]: any } = originalRow

    let fullRow = await dataTable.getFullRow(rowIndex)
    let currentRow = fullRow.row
    const cols = await dataTable.getColumns()
    const createdBy = currentRow[cols!.findIndex(col => col.id == 'createdBy')]
    const statusSetBy = currentRow[cols!.findIndex(col => col.id == 'statusSetBy')]

    if (row != undefined) {
      for (let [name, alt] of importantAthenaColumns) {
        const index = athenaColumns.findIndex(column => column.id === name)
        if (row instanceof Array === false) rowObj[alt] = row[name as keyof object]
        else rowObj[columns.findIndex(col => col.id == alt)] = row[index]
      }
      for (let col of Object.keys(additionalFields)) {
        switch (col) {
          case 'equivalence':
            rowObj.equivalence = equivalenceMapping
            break

          case 'statusSetBy':
          case 'statusSetOn':
            rowObj[col] = author
            break

          case 'createdBy':
          case 'createdOn':
            createdBy == '' || createdBy == undefined
              ? ((rowObj.createdBy = author), (rowObj.createdOn = Date.now()))
              : ((rowObj.createdBy = createdBy),
                (rowObj.createdOn = currentRow[cols!.findIndex(col => col.id == 'createdOn')]))
            break

          case 'ADD_INFO:approvedBy':
          case 'ADD_INFO:approvedOn':
            rowObj[col] = null
            break

          case 'mappingStatus':
            statusSetBy == author || statusSetBy == '' || statusSetBy == undefined
              ? (rowObj['mappingStatus'] = 'UNAPPROVED')
              : null
            break
        }
      }
    }
    return {
      mappedIndex: rowIndex,
      mappedRow: rowObj,
    }
  }

  const cancelAuthorUpdate = async () => {
    authorInput = author
    authorVisibility = false
  }

  const saveAuthorUpdate = async () => {
    authorVisibility = false
    author = authorInput
    localStorageSetter('author', author)
  }

  const selectRow = async (positionUp: boolean) => {
    const tablePagination = await dataTableFile.getTablePagination()
    positionUp == true && selectedRowIndex + 1 < tablePagination.totalRows! ? (selectedRowIndex += 1) : null
    positionUp == false && selectedRowIndex - 1 >= 0 ? (selectedRowIndex -= 1) : null
    positionUp == true && selectedRowIndex == tablePagination.totalRows! - 1 ? (lastRow = true) : (lastRow = false)

    if (positionUp == true && selectedRowIndex != 0) {
      if (selectedRowIndex % tablePagination.rowsPerPage! == 0) {
        await changePagination({ currentPage: tablePagination.currentPage! + 1 })
      }
    }

    const selectedRowObj = await dataTableFile.getFullRow(selectedRowIndex)
    selectedRow = selectedRowObj.row
    const selectedRowValues = Object.values(selectedRow)
    athenaFiltering = String(
      selectedRowValues[columns.indexOf(columns.find(column => column.id == athenaFilteredColumn)!) as keyof object]
    )
    fetchDataURL = fetchData
  }

  const insertRows = async (dataTable: DataTable, rows: any[]) => {
    await dataTable.insertRows(rows)
  }

  const changePagination = async (pagination: { currentPage?: number; rowsPerPage?: number }) => {
    const pag: { [key: string]: number } = {}
    pagination.currentPage != undefined ? (pag['currentPage'] = pagination.currentPage) : null
    pagination.rowsPerPage != undefined ? (pag['rowsPerPage'] = pagination.rowsPerPage) : null
    await dataTableFile.changePagination(pag)
  }

  async function saveSettings(e: Event) {
    const element = e.target as HTMLSelectElement | HTMLInputElement
    const value = element.checked != undefined ? !element.checked : element.value
    const name = element.id
    settings = await updateSettings(settings, name, value)
  }

  function dataTableInitialized() {
    dataTableInit = true
  }

  function abortAllPromises() {
    if (dataTableInit == true) controller.abort()
  }

  let fetchDataURL = fetchData

  $: {
    if (mounted == true && (author == '' || author == undefined || author == null)) authorVisibility = true
  }

  onMount(async () => {
    localStorageGetter('author', false, false) !== null
      ? ((author = localStorageGetter('author', false, false).replaceAll('"', '')), (authorInput = author))
      : null
    if (author == '' || author == undefined || author == null) authorVisibility = true

    localStorageGetter('options', true, true) !== null ? (settings = localStorageGetter('options', true, true)) : null

    mounted = true
  })
</script>

<section data-name="header">
  <Header />
  <ErrorLogging visibility={errorVisibility} log={errorLog} />
  <div data-name="header-buttons-container" id="settings">
    <Settings showSettingsPopUp={settingsVisibility} on:generalVisibilityChanged={settingsVisibilityChanged} />
    <User showAuthorPopUp={authorVisibility} {author} on:generalVisibilityChanged={authorVisibilityChanged} />
  </div>
</section>

<section data-name="header-small">
  <Header />
  <div data-name="header-buttons-container" id="settings">
    <Settings showSettingsPopUp={settingsVisibility} on:generalVisibilityChanged={settingsVisibilityChanged} />
    <User showAuthorPopUp={authorVisibility} {author} on:generalVisibilityChanged={authorVisibilityChanged} />
  </div>
</section>

<div data-name="logger-seperate">
  <ErrorLogging visibility={errorVisibility} log={errorLog} />
</div>

<!-- MODALS -->

<Modal on:generalVisibilityChanged={settingsVisibilityChanged} show={settingsVisibility} size="medium">
  <section data-name="settings">
    <h2 class="pop-up-title">Settings</h2>
    <div data-name="options">
      {#each [...settings] as [name, value]}
        <div data-name="option">
          <p>{name}</p>
          {#if typeof value == 'boolean'}
            <div data-name="switch">
              <input id={name} type="checkbox" bind:checked={value} on:change={saveSettings} />
              <label for={name}>Test</label>
            </div>
          {:else if typeof value == 'string'}
            {#if name == 'Language'}
              <select id={name} {value} on:change={saveSettings}>
                {#each Object.keys(languages) as lang}
                  <option
                    value={languages[lang]}
                    on:click={async () => {
                      // settings = await updateSettings(settings, name, value)
                    }}>{lang}</option
                  >
                {/each}
              </select>
            {/if}
          {:else if typeof value == 'number'}
            <input
              type="number"
              bind:value
              on:change={async () => {
                settings = await updateSettings(settings, name, value)
              }}
            />
          {/if}
        </div>
      {/each}
    </div>
  </section>
</Modal>

<Modal on:generalVisibilityChanged={authorVisibilityChanged} show={authorVisibility} size="small">
  <section data-name="author">
    <h2>Who is the author?</h2>
    <input id="author" type="text" placeholder="John Wick" class="author-input" bind:value={authorInput} />
    <div data-name="buttons-container">
      <button data-name="cancel" on:click={cancelAuthorUpdate}>Cancel</button>
      <button data-name="save" on:click={saveAuthorUpdate}>Save</button>
    </div>
  </section>
</Modal>

<Modal on:generalVisibilityChanged={mappingVisibilityChanged} show={mappingVisibility} size="large">
  <AthenaLayout
    on:filterOptionsChanged={filterOptionsChanged}
    on:columnFilterChanged={columnFilterChanged}
    on:uniqueConceptIdsChanged={uniqueConceptIdsChanged}
    bind:urlFilters={APIFilters}
    bind:equivalenceMapping
    bind:athenaFilteredColumn
    filterColumns={['sourceName', 'sourceCode']}
    {selectedRow}
    mainTable={dataTableFile}
  >
    <div slot="currentRow" data-name="currentRow">
      <button id="left" on:click={() => selectRow(false)} disabled={selectedRowIndex == 0 ? true : false}
        ><SvgIcon href="icons.svg" id="arrow-left" width="16px" height="16px" />
      </button>
      <table class="table">
        <tr>
          <th>sourceCode</th>
          <th>sourceName</th>
          <th>sourceFrequency</th>
        </tr>
        <tr>
          {#if selectedRow != undefined}
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
      {#if APICall != ''}
        <DataTable
          data={fetchDataURL}
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
            mainTableColumns={columns}
            {selectedRowIndex}
            {uniqueConceptIds}
          />
        </DataTable>
      {/if}
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
<div data-name="table-options">
  <input type="file" accept=".csv, .json" on:change={onFileInputChange} />
  <Download dataTable={dataTableFile} />
</div>
<DataTable
  data={file}
  {columns}
  bind:this={dataTableFile}
  options={{ actionColumn: true }}
  on:rendering={abortAllPromises}
  on:initialized={dataTableInitialized}
>
  <Row
    slot="default"
    let:renderedRow
    let:columns
    let:index
    on:generalVisibilityChanged={mappingVisibilityChanged}
    on:actionPerformed={actionPerformed}
    on:autoMapping={autoMapping}
    on:deleteRow={deleteRow}
    on:cellEdited={cellEdited}
    {renderedRow}
    {columns}
    {index}
    editable={true}
    showMappingPopUp={mappingVisibility}
    {statuses}
    bind:dataTable={dataTableFile}
  />
</DataTable>

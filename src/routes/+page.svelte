<script lang="ts">
  import DataTable from '../../lib/RADar-DataTable/src/lib/components/DataTable.svelte'
  import '$lib/styles/table.scss'
  import dataTableColumns from '$lib/data/columns.json'
  import rowStatuses from '$lib/data/statuses.json'
  import athenaNamesJSON from '$lib/data/columnsAthena.json'
  import Header from '$lib/components/Extra/Header.svelte'
  import User from '$lib/components/Extra/User.svelte'
  import type {
    ActionPerformedEventDetail,
    AutoMappingEventDetail,
    ColumnVisibilityChangedEventDetail,
    DeleteRegisteredMappingEventDetail,
    DeleteRowEventDetail,
    FilterOptionsChangedEventDetail,
    IStatus,
    MultipleMappingEventDetail,
    RegisterMappingEventDetail,
    RemoveMappingEventDetail,
    SingleMappingEventDetail,
    SingleSorting,
    VisibilityChangedEventDetail,
  } from '$lib/components/Types'
  import Settings from '$lib/components/Extra/Settings.svelte'
  import type {
    IColumnMetaData,
    IPagination,
    SortDirection,
    TFilter,
  } from '../../lib/RADar-DataTable/src/lib/components/DataTable'
  import Modal from '$lib/components/Extra/Modal.svelte'
  import { assembleURL, checkForAuthor, localStorageGetter, localStorageSetter, updateSettings } from '$lib/utils'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import Row from '$lib/components/Mapping/Row.svelte'
  import { onMount } from 'svelte/internal'
  import ShowColumns from '$lib/components/Extra/ShowColumns.svelte'
  import AthenaRow from '$lib/components/Mapping/AthenaRow.svelte'

  let file: File
  let mounted: boolean = false
  let settingsVisibility: boolean = false
  let settings = new Map<string, boolean>([['Map to multiple concepts', false]])
  let authorVisibility: boolean = false
  let authorInput: string = ''
  let author: string = ''
  let mappingVisibility: boolean = false
  let registeredMapping = new Map<string, any[]>()

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
    rowsPerPage: 10,
  }
  let athenaSorting: SingleSorting
  let athenaFiltering: string
  let athenaNames: Object = athenaNamesJSON

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
    'ADD_INFO:author1': '',
    'ADD_INFO:author2': '',
    'ADD_INFO:lastEditor': '',
    sourceAutoAssignedConceptIds: '',
    'ADD_INFO:additionalInfo': '',
    'ADD_INFO:prescriptionID': '',
    'ADD_INFO:ATC': '',
    matchScore: 1,
    mappingStatus: '',
    equivalence: 'EQUAL',
    statusSetBy: '',
    statusSetOn: new Date().getTime(),
    mappingType: 'MAPS_TO',
    comment: 'AUTO MAPPED',
    createdBy: 'ctl',
    createdOn: new Date().getTime(),
    assignedReviewer: '',
  }

  let statuses: IStatus[] = rowStatuses

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
      }
    }
  }

  function authorVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    authorVisibility = event.detail.visibility
  }

  function settingsVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    settingsVisibility = event.detail.visibility
  }

  async function columnVisibilityChanged(event: CustomEvent<ColumnVisibilityChangedEventDetail>) {
    await dataTableFile.updateColumns([{ id: event.detail.column.id, visible: event.detail.visible }])
  }

  function mappingVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    mappingVisibility = event.detail.visibility
    event.detail.data != undefined
      ? ((selectedRow = event.detail.data.row), (selectedRowIndex = event.detail.data.index))
      : null
    athenaFiltering = ''
  }

  function filterOptionsChanged(event: CustomEvent<FilterOptionsChangedEventDetail>) {
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

  async function autoMapping(event: CustomEvent<AutoMappingEventDetail>) {
    const rowObj: { [key: string]: any } = {}
    for (let i = 0; i < event.detail.row.length; i++) {
      rowObj[columns[i].id as keyof object] = event.detail.row[i]
    }
    const URL = await assembleAthenaURL(rowObj[athenaFilteredColumn])
    const res = await fetch(URL)
    const resData = await res.json()
    if (resData.content[0]) {
      const { mappedIndex, mappedRow } = await rowMapping(rowObj, resData.content[0], dataTableFile, event.detail.index)
      rowsMapping.set(mappedIndex, mappedRow)
      await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
    }
    athenaFiltering = ''
  }

  async function singleRowMapping(event: CustomEvent<SingleMappingEventDetail>) {
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow, event.detail.row, dataTableFile)
    await dataTableFile.updateRows(new Map([[mappedIndex, mappedRow]]))
  }

  async function multipleRowMapping(event: CustomEvent<MultipleMappingEventDetail>) {
    const { mappedIndex, mappedRow } = await rowMapping(event.detail.originalRow, event.detail.row, dataTableFile)
    await insertRows(dataTableFile, [mappedRow])
  }

  async function removeMapping(event: CustomEvent<RemoveMappingEventDetail>) {
    const { mappedIndex, mappedRow } = await multipleMapRow(event.detail.row, selectedRowIndex, true)
    await dataTableFile.updateRows(new Map([[mappedIndex, { ...mappedRow }]]))
  }

  async function actionPerformed(event: CustomEvent<ActionPerformedEventDetail>) {
    columns.find(column => column.id == 'mappingStatus') == undefined ? columns.push({ id: 'mappingStatus' }) : null
    await dataTableFile.updateRows(new Map([[event.detail.index, { mappingStatus: event.detail.action }]]))
  }

  async function deleteRow(event: CustomEvent<DeleteRowEventDetail>) {
    const mapped = registeredMapping.get(String(event.detail.sourceCode))
    mapped?.splice(mapped.indexOf(event.detail.conceptId), 1)
    if((mapped!.length == 1 && mapped![0] == undefined) || (mapped!.length == 0)) registeredMapping.delete(String(event.detail.sourceCode))
    else registeredMapping.set(String(event.detail.sourceCode), mapped!)
    await dataTableFile.deleteRows(event.detail.indexes)
  }

  async function registerMapping(event: CustomEvent<RegisterMappingEventDetail>) {
    let mapped = registeredMapping.get(String(event.detail.sourceCode))
    mapped == undefined ? mapped = [event.detail.conceptId] : mapped?.includes(event.detail.conceptId) ? null : mapped?.push(event.detail.conceptId)
    registeredMapping.set(String(event.detail.sourceCode), mapped!)
  }

  async function deleteRegisteredMapping(event: CustomEvent<DeleteRegisteredMappingEventDetail>) {
    let mapped = registeredMapping.get(String(event.detail.sourceCode))
    mapped?.splice(mapped.indexOf(event.detail.oldConceptId), 1)
    registeredMapping.set(String(event.detail.sourceCode), mapped!)
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
    let rowIndex,
      authorFilledIn = false,
      uniqueColumns = []
    i == undefined ? (rowIndex = selectedRowIndex) : (rowIndex = i)
    const rowObj = originalRow

    if (row != undefined) {
      let columnPosition = columns.length - 1
      for (let [name, alt] of importantAthenaColumns) {
        if (columns!.find(column => column.id == alt) == undefined) {
          columnPosition += 1
          uniqueColumns.push({ id: alt, position: columnPosition })
          columns!.push({ id: alt })
        }
        const index = athenaColumns.findIndex(column => column.id === name)
        if (row instanceof Array === false) rowObj[alt] = row[name as keyof object]
        else rowObj[columns.findIndex(col => col.id == alt)] = row[index]
      }
      for (let col of Object.keys(additionalFields)) {
        if (columns!.find(column => column.id == col) == undefined) {
          columnPosition += 1
          uniqueColumns.push({ id: col, position: columnPosition })
          columns!.push({ id: col })
        }
        switch (col) {
          case 'equivalence':
            rowObj[col] = equivalenceMapping
            break
          case 'ADD_INFO:author1':
          case 'ADD_INFO:author2':
            if (authorFilledIn == false) {
              const { first, second } = await checkForAuthor(rowObj, columns!, author)
              rowObj['ADD_INFO:author1'] = first
              rowObj['ADD_INFO:author2'] = second
              authorFilledIn = true
            }
            break
          default:
            rowObj[col] = additionalFields[col]
            break
        }
      }
      if (uniqueColumns.length > 0) {
        await dataTable.insertColumns(uniqueColumns)
      }
    }
    return {
      mappedIndex: rowIndex,
      mappedRow: rowObj,
    }
  }

  const multipleMapRow = async (row: any[], i?: number, deletion: boolean = false) => {
    let rowIndex
    if (i == undefined) rowIndex = selectedRowIndex
    else rowIndex = i
    let rowData = selectedRow

    for (let [name, alt] of importantAthenaColumns) {
      columns.find(column => column.id == alt) == undefined ? columns.push({ id: alt }) : null
      const index = athenaColumns.indexOf(athenaColumns.find(column => column.id == name)!)
      if (row instanceof Array == false) {
        if (deletion == false)
          // @ts-ignore
          rowData[alt as keyof Object] = `${rowData[alt as keyof Object]}
        ${row[name as keyof object]}`
        else {
          // @ts-ignore
          rowData[alt as keyof Object] = rowData[alt as keyof Object].replace(row[name as keyof object], '')
        }
      } else {
        if (deletion == false) {
          // @ts-ignore
          rowData[alt as keyof Object] = `${rowData[alt as keyof Object]}
      ${row[index]}`
        } else {
          // @ts-ignore
          rowData[alt as keyof Object] = rowData[alt as keyof Object].replace(row[index], '')
        }
      }
    }

    return {
      mappedIndex: rowIndex,
      mappedRow: rowData,
    }
  }

  const cancelAuthorUpdate = async () => {
    authorVisibility = false
  }

  const saveAuthorUpdate = async () => {
    authorVisibility = false
    author = authorInput
    localStorageSetter('author', author)
  }

  const selectNextRow = async () => {
    if ((await dataTableFile.getFullRow(selectedRowIndex + 1)) != undefined) selectedRowIndex += 1
    const selectedRowObj = await dataTableFile.getFullRow(selectedRowIndex)
    selectedRow = selectedRowObj.row
    const selectedRowValues = Object.values(selectedRow)
    athenaFiltering = String(
      selectedRowValues[columns.indexOf(columns.find(column => column.id == athenaFilteredColumn)!) as keyof object]
    )
    fetchDataURL = fetchData
    if ((await dataTableFile.getFullRow(selectedRowIndex + 1)) == undefined) lastRow = true
    else lastRow = false
  }

  const selectPreviousRow = async () => {
    if (selectedRowIndex - 1 >= 0) selectedRowIndex -= 1
    const selectedRow = await dataTableFile.getFullRow(selectedRowIndex)
    const selectedRowValues = Object.values(selectedRow)
    athenaFiltering = String(
      selectedRowValues[columns.indexOf(columns.find(column => column.id == athenaFilteredColumn)!) as keyof object]
    )
    fetchDataURL = fetchData
  }

  const insertRows = async (dataTable: DataTable, rows: any[]) => {
    await dataTable.insertRows(rows)
  }

  let fetchDataURL = fetchData

  $: {
    if (mounted == true && (author == '' || author == undefined || author == null)) authorVisibility = true
  }

  onMount(async () => {
    localStorageGetter('author', false, false) !== null ? (author = localStorageGetter('author', false, false)) : null
    if (author != '' || author != undefined || author != null) authorVisibility = false
    else authorVisibility = true

    localStorageGetter('options', true, true) !== null ? (settings = localStorageGetter('options', true, true)) : null

    mounted = true
  })
</script>

<Header />

<div class="buttons is-right" id="settings">
  <Settings showSettingsPopUp={settingsVisibility} on:generalVisibilityChanged={settingsVisibilityChanged} />
  <User showAuthorPopUp={authorVisibility} {author} on:generalVisibilityChanged={authorVisibilityChanged} />
</div>

<!-- MODALS -->

<Modal on:generalVisibilityChanged={settingsVisibilityChanged} show={settingsVisibility} size="medium">
  <h2 class="pop-up-title">Settings</h2>
  <div class="pop-up-container">
    {#each [...settings] as [name, value]}
      <div class="option">
        <p>{name}</p>
        <label class="switch">
          <input
            type="checkbox"
            bind:checked={value}
            on:change={async () => {
              settings = await updateSettings(settings, name, value)
            }}
          />
          <span class="slider round" />
        </label>
      </div>
    {/each}
    <ShowColumns on:columnVisibilityChanged={columnVisibilityChanged} {columns} />
  </div>
</Modal>

<Modal on:generalVisibilityChanged={authorVisibilityChanged} show={authorVisibility} size="small">
  <div class="pop-up-container-center">
    <h2 class="title is-5">Who is the author?</h2>
    <input id="author" type="text" placeholder="John Wick" class="author-input" bind:value={authorInput} />
    <div class="buttons-container">
      <button class="button is-danger" on:click={cancelAuthorUpdate}>Cancel</button>
      <button class="button is-success" on:click={saveAuthorUpdate}>Save</button>
    </div>
  </div>
</Modal>

<Modal on:generalVisibilityChanged={mappingVisibilityChanged} show={mappingVisibility} size="large">
  <AthenaLayout
    on:filterOptionsChanged={filterOptionsChanged}
    bind:urlFilters={APIFilters}
    bind:equivalenceMapping
    bind:athenaFilteredColumn
    filterColumns={['sourceName', 'sourceCode']}
    {selectedRow}
    mainTable={dataTableFile}
  >
    <div slot="currentRow" class="currentRow">
      <button id="left" on:click={selectPreviousRow} disabled={selectedRowIndex == 0 ? true : false}
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
      <button id="right" on:click={selectNextRow} disabled={lastRow}>
        <SvgIcon href="icons.svg" id="arrow-right" width="16px" height="16px" />
      </button>
    </div>
    <div slot="table">
      {#if APICall != ''}
        <DataTable
          data={fetchDataURL}
          columns={athenaColumns}
          options={{ actionColumn: true }}
          bind:this={dataTableAthena}
        >
          <AthenaRow
            slot="row"
            let:renderedRow
            let:index
            on:singleMapping={singleRowMapping}
            on:multipleMapping={multipleRowMapping}
            on:removeMapping={removeMapping}
            on:deleteRegisteredMapping={deleteRegisteredMapping}
            {renderedRow}
            columns={athenaColumns}
            {settings}
            mainTable={dataTableFile}
            mainTableColumns={columns}
            {selectedRowIndex}
            {selectedRow}
            bind:mappedRows={registeredMapping}
          />
        </DataTable>
      {/if}
    </div>
    <div slot="extra">
      {#if settings.get('Map to multiple concepts') == true}
        <button> Map multiple </button>
      {/if}
    </div>
    <div slot="mappedRows" let:mapped>
      {#if mapped.length != 0}
        {#each mapped as row}
          <tr>
            <td>{row.conceptId}</td>
            <td>{row.conceptName}</td>
          </tr>
        {/each}
      {/if}
    </div>
  </AthenaLayout>
</Modal>

<!-- DATATABLE -->
<input type="file" accept=".csv, .json" on:change={onFileInputChange} />
<DataTable data={file} {columns} bind:this={dataTableFile} options={{ actionColumn: true }}>
  <Row
    slot="row"
    let:renderedRow
    let:index
    on:generalVisibilityChanged={mappingVisibilityChanged}
    on:actionPerformed={actionPerformed}
    on:autoMapping={autoMapping}
    on:deleteRow={deleteRow}
    on:registerMapping={registerMapping}
    {renderedRow}
    {columns}
    {index}
    editable={true}
    showMappingPopUp={mappingVisibility}
    {statuses}
    {author}
    bind:dataTable={dataTableFile}
  />
</DataTable>

<style>
  .currentRow {
    display: flex;
  }
</style>

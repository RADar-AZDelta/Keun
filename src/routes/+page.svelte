<script lang="ts">
  import DataTable from '../../lib/RADar-DataTable/src/lib/components/DataTable.svelte'
  import '$lib/styles/table.scss'
  import dummyData from '$lib/data/dummyData.json'
  import rowStatuses from '$lib/data/statuses.json'
  import athenaNamesJSON from '$lib/columnsAthena.json'
  import Header from '$lib/components/Extra/Header.svelte'
  import User from '$lib/components/Extra/User.svelte'
  import type {
    ActionPerformedEventDetail,
    AutoMappingEventDetail,
    ColumnVisibilityChangedEventDetail,
    FilterOptionsChangedEventDetail,
    IStatus,
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
  import { assembleURL, checkForAuthor, mapReviver, updateSettings } from '$lib/utils'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import Row from '$lib/components/Mapping/Row.svelte'
  import { onMount } from 'svelte/internal'
  import ShowColumns from '$lib/components/Extra/ShowColumns.svelte'

  let mounted: boolean = false
  let settingsVisibility: boolean = false
  let settings = new Map<string, boolean>([['Map to multiple concepts', false]])
  let authorVisibility: boolean = false
  let authorInput: string = ''
  let author: string = ''
  let mappingVisibility: boolean = false

  let APIFilters: string[]
  let APICall: string
  let equivalenceMapping: string = 'EQUAL'
  let athenaFilteredColumn: string = 'name'
  let athenaFilter: string
  let selectedRow: any[]
  let selectedRowIndex: number

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

  let data = dummyData

  let matrix = data.map(obj => Object.values(obj))

  let columns: IColumnMetaData[] = [
    {
      id: 'name',
    },
    {
      id: 'age',
    },
    {
      id: 'country',
    },
    {
      id: 'telephone',
    },
    {
      id: 'address',
    },
  ]

  let dataTableMatrix: DataTable

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
  let additionalFields: object = {
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
  let hiddenColumns = [
    'sourceAutoAssignedConceptIds',
    'ADD_INFO:additionalInfo',
    'ADD_INFO:prescriptionID',
    'ADD_INFO:ATC',
    'matchScore',
    'matchScore',
    'statusSetBy',
    'statusSetOn',
    'comment',
    'createdBy',
    'createdOn',
    'domainId',
  ]

  let statuses: IStatus[] = rowStatuses

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  function authorVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    authorVisibility = event.detail.visibility
  }

  function settingsVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    settingsVisibility = event.detail.visibility
  }

  function columnVisibilityChanged(event: CustomEvent<ColumnVisibilityChangedEventDetail>) {
    const columnIndex = columns.indexOf(event.detail.column)
    columns[columnIndex].visible = event.detail.visible
    columns = columns
  }

  function mappingVisibilityChanged(event: CustomEvent<VisibilityChangedEventDetail>) {
    mappingVisibility = event.detail.visibility
    event.detail.data != undefined
      ? ((selectedRow = event.detail.data.row), (selectedRowIndex = event.detail.data.index))
      : null
  }

  function filterOptionsChanged(event: CustomEvent<FilterOptionsChangedEventDetail>) {
    assembleAthenaURL()
    fetchDataURL = fetchData
  }

  async function autoMapping(event: CustomEvent<AutoMappingEventDetail>) {
    const row = event.detail.row
    const index = columns.indexOf(columns.find(column => column.id == athenaFilteredColumn)! as keyof object)
    await assembleAthenaURL(row[index])
      .then(async (URL: string) => await fetch(URL))
      .then(async (response: Response) => await response.json())
      .then((res: any) => {
        const firstRow = res.content[0]
        mapRow(firstRow, event.detail.index)
      })
    columns = columns
    matrix = data.map(obj => Object.values(obj))
    matrix = matrix
    athenaFiltering = ''
    hideCertainColumns()
  }

  async function singleRowMapping(event: CustomEvent<SingleMappingEventDetail>) {
    await mapRow(event.detail.row)
    columns = columns
    matrix = data.map(obj => Object.values(obj))
    matrix = matrix
  }

  function actionPerformed(event: CustomEvent<ActionPerformedEventDetail>) {
    columns.find(column => column.id == 'mappingStatus') == undefined ? columns.push({ id: 'mappingStatus' }) : null
    // @ts-ignore
    data[event.detail.index]['mappingStatus'] = event.detail.action
    columns = columns
    matrix = data.map(obj => Object.values(obj))
    matrix = matrix
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
    const data = await response.json()
    return {
      data: data.content,
      totalRows: data.totalElements,
    }
  }

  const mapRow = async (row: any[], i?: number) => {
    let authorFilled = false
    let rowIndex
    if (i == undefined) rowIndex = selectedRowIndex
    else rowIndex = i

    for (let [name, alt] of importantAthenaColumns) {
      columns.find(column => column.id == alt) == undefined ? columns.push({ id: alt }) : null
      const index = athenaColumns.indexOf(athenaColumns.find(column => column.id == name)!)
      if (row instanceof Array == false) data[rowIndex][alt as keyof Object] = row[name as keyof object]
      else data[rowIndex][alt as keyof Object] = row[index]
    }
    for (let col of Object.keys(additionalFields)) {
      columns.find(column => column.id == col) == undefined ? columns.push({ id: col }) : null
      // @ts-ignore
      if (col == 'equivalence') data[rowIndex][col] = equivalenceMapping
      else if ((col == 'ADD_INFO:author1' || col == 'ADD_INFO:author2') && authorFilled == false) {
        const { first, second } = await checkForAuthor(data, columns, author)
        // @ts-ignore
        data[rowIndex]['ADD_INFO:author1'] = first
        // @ts-ignore
        data[rowIndex]['ADD_INFO:author2'] = second
        authorFilled = true
      }
      // @ts-ignore
      else data[rowIndex][col] = additionalFields[col]
    }
  }

  const cancelAuthorUpdate = async () => {
    authorVisibility = false
  }

  const saveAuthorUpdate = async () => {
    authorVisibility = false
    author = authorInput
    localStorage.setItem('author', author)
  }

  const hideCertainColumns = async () => {
    for (let col of columns) {
      if (hiddenColumns.includes(col.id)) col.visible = false
      else col.visible = true
    }
    columns = columns
  }

  let fetchDataURL = fetchData

  $: {
    if (mounted == true && (author == '' || author == undefined || author == null)) authorVisibility = true
  }

  onMount(() => {
    localStorage.getItem('author') != undefined ? (author = localStorage.getItem('author')!) : null
    if (author != '' || author != undefined || author != null) authorVisibility = false
    else authorVisibility = true

    localStorage.getItem('options') != undefined
      ? (settings = JSON.parse(localStorage.getItem('options')!, mapReviver))
      : null

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
          <span class="slider round" /></label
        >
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
  >
    <div slot="currentRow" class="currentRow">
      <button id="left" on:click={() => assembleAthenaURL}
        ><SvgIcon href="icons.svg" id="arrow-left" width="16px" height="16px" />
      </button>
      <table class="table">
        <tr>
          <th>sourceCode</th>
          <th>sourceName</th>
          <th>sourceFrequency</th>
        </tr>
        <tr>
          {#if data[0] != undefined}
            <td>{data[0].name}</td>
            <td>{data[0].address}</td>
            <td>{data[0].country}</td>
          {/if}
        </tr>
      </table>
      <button id="right" on:click={() => assembleAthenaURL}>
        <SvgIcon href="icons.svg" id="arrow-right" width="16px" height="16px" />
      </button>
    </div>
    <div slot="table">
      {#if APICall != ''}
        <DataTable data={fetchDataURL} columns={athenaColumns} bind:this={dataTableAthena}>
          <Row
            slot="row"
            let:renderedRow
            let:index
            on:generalVisibilityChanged={mappingVisibilityChanged}
            on:singleMapping={singleRowMapping}
            {renderedRow}
            columns={athenaColumns}
            {index}
            editable={false}
            actions={true}
            {settings}
            {author}
            table="Athena"
            showMappingPopUp={mappingVisibility}
            bind:dataTable={dataTableAthena}
          />
        </DataTable>
      {/if}
    </div>
    <div slot="extra">
      {#if settings.get('Map to multiple concepts') == true}
        <button> Map multiple </button>
      {/if}
    </div>
  </AthenaLayout>
</Modal>

<!-- DATATABLE -->
<DataTable data={matrix} {columns} options={{ actionColumn: true }} bind:this={dataTableMatrix}>
  <Row
    slot="row"
    let:renderedRow
    let:index
    on:generalVisibilityChanged={mappingVisibilityChanged}
    on:actionPerformed={actionPerformed}
    on:autoMapping={autoMapping}
    {renderedRow}
    {columns}
    {index}
    editable={true}
    actions={true}
    {settings}
    showMappingPopUp={mappingVisibility}
    {statuses}
    {author}
    bind:dataTable={dataTableMatrix}
  />
</DataTable>

<script lang="ts">
  import { writable, type Writable } from 'svelte/store'
  import { showPopup, showAuthor } from '$lib/store'
  import filtersJSON from '$lib/filters.json'
  import type IScheme from '../../lib/RADar-DataTable/src/lib/interfaces/IScheme'
  import type IStatus from '../../lib/RADar-DataTable/src/lib/interfaces/IStatus'
  import athenaNamesJSON from '$lib/columnsAthena.json'
  import Modal from '$lib/components/Extra/Modal.svelte'
  import type IQueryFilter from '$lib/interfaces/IQueryFilter'
  import DataTableRendererCSR from '../../lib/RADar-DataTable/src/lib/components/DataTable/DataTableRendererCSR.svelte'
  import DataTableRendererSSR from '../../lib/RADar-DataTable/src/lib/components/DataTable/DataTableRendererSSR.svelte'
  import DragAndDrop from '../../lib/RADar-DataTable/src/lib/components/Extra/DragAndDrop.svelte'
  import type IPaginated from '../../lib/RADar-DataTable/src/lib/interfaces/IPaginated'
  import type ISort from '../../lib/RADar-DataTable/src/lib/interfaces/ISort'
  import type IMapping from '$lib/interfaces/IMapping'
  import type IColumnName from '../../lib/RADar-DataTable/src/lib/interfaces/IColumnName'

  import SmallModal from '$lib/components/Extra/SmallModal.svelte'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import { onMount } from 'svelte'
  import Sorting from '../../lib/RADar-DataTable/src/lib/components/DataTableBasics/Sorting.svelte'
  import Filtering from '../../lib/RADar-DataTable/src/lib/components/DataTableBasics/Filtering.svelte'
  import type IFilter from '../../lib/RADar-DataTable/src/lib/interfaces/IFilter'
  import Editor from '$lib/components/Extra/Editor.svelte'
  import type IMapper from '../../lib/RADar-DataTable/src/lib/interfaces/IMapper'
  import { browser } from '$app/environment'
  import ActionPage from '$lib/components/Extra/ActionPage.svelte'
  import Action from '$lib/components/Extra/Action.svelte'
  import ShowColumns from '$lib/components/Extra/ShowColumns.svelte'

  const author = writable<string>()
  let activatedFilters = writable<IQueryFilter[]>([])
  let athenaData = writable<any>()
  let athenaColumns = writable<IScheme[]>()
  const chosenRowMapping = writable<number>()
  const map = writable<boolean>()
  let athenaPagination = writable<IPaginated>({
    currentPage: 0,
    rowsPerPage: 10,
    totalRows: 20,
    totalPages: 2,
  })
  let athenaFilter = writable<string>()
  let athenaSorting = writable<ISort>()
  let selectedRow = writable<string>()
  let selectedRowPage = writable<number>()
  let equivalenceMapping = writable<string>()
  const athenaNames = writable<Object>(athenaNamesJSON)
  let APICall = writable<string>()
  let APIFilters = writable<string[]>()

  let previousPagination: IPaginated
  let mapping: IMapping

  let columns = writable<Array<IScheme>>([])
  let data = writable<any>()

  let statuses: IStatus[] = [
    {
      column: 'mappingStatus',
      status: 'APPROVED',
      color: 'hsl(120, 100%, 75%)',
      priority: 1,
    },
    {
      column: 'mappingStatus',
      status: 'FLAGGED',
      color: 'hsl(38, 94%, 66%)',
      priority: 1,
    },
    {
      column: 'mappingStatus',
      status: '',
      color: 'hsl(0, 0, 0)',
      priority: 1,
    },
    {
      column: 'statusSetBy',
      status: 'Dupulthys Stijn',
      color: 'hsl(16, 100%, 75%)',
      priority: 0,
    },
    {
      column: 'statusSetBy',
      status: 'Kim Denturck',
      color: 'hsl(240, 100%, 75%)',
      priority: 0,
    },
  ]

  /*
    Slot stuff
  */

  let filters: Writable<Array<IFilter>> = writable([])
  let sorting: Writable<Array<ISort>> = writable([])
  let pagination: Writable<IPaginated> = writable({
    currentPage: 1,
    rowsPerPage: 10,
    totalRows: 20,
    totalPages: 2,
  })

  // let worker: Worker | undefined

  let editClick = writable<boolean>(false)
  let editorUpdating = writable<boolean>(false)
  let updated = writable<boolean>(false)
  let parentChange = writable<boolean>(false)

  const ownEditorMethods = undefined
  const ownEditorVisuals = undefined

  const getAuthorEvent = async () => {
    // TODO: place pop-up for author
  }

  const getAuthor = () => {
    let auth
    if (browser == true) {
      if (localStorage.getItem('author') !== null) {
        auth = localStorage.getItem('author')
      } else {
        if (getAuthorEvent != null) getAuthorEvent()
        else console.warn('No author found')
      }
    } else auth = 'SSR author'

    return auth
  }

  function checkStatuses(scheme: IScheme[], row: number) {
    const allStatuses = statuses.filter(obj => {
      if (scheme.indexOf(scheme.filter(col => col.column.toLowerCase() == obj.column.toLowerCase())[0]) != -1) {
        if (
          obj.status.toLowerCase() ==
          $data[row][
            scheme.indexOf(scheme.filter(col => col.column.toLowerCase() == obj.column.toLowerCase())[0])
          ].toLowerCase()
        ) {
          return obj
        }
      }
    })
    if (allStatuses.length > 0) {
      return true
    } else {
      return false
    }
  }

  function getColorFromStatus(scheme: IScheme[], row: number) {
    const allStatuses = statuses.filter(obj => {
      if (
        obj.status.toLowerCase() ==
        $data[row][
          scheme.indexOf(scheme.filter(col => col.column.toLowerCase() == obj.column.toLowerCase())[0])
        ].toLowerCase()
      ) {
        return obj
      }
    })
    const priority = Math.max(...allStatuses.map(status => status.priority))
    const status = allStatuses.filter(status => status.priority == priority)[0]
    return status.color
  }

  let mappingURL: string = 'https://athena.ohdsi.org/api/v1/concepts?'
  let mappingFetchOptions: object = {}
  let mappingFileType: string = 'json'
  let mappingDelimiter: string = ','
  let expectedColumns: Array<IColumnName> = [
    {
      name: 'id',
      altName: 'conceptId',
    },
    {
      name: 'name',
      altName: 'conceptName',
    },
    {
      name: 'domain',
      altName: 'domainId',
    },
  ]
  let additionalFields: object = {
    sourceAutoAssignedConceptIds: '',
    'ADD_INFO:additionalInfo': '',
    'ADD_INFO:prescriptionID': '',
    'ADD_INFO:ATC': '',
    matchScore: 1,
    mappingStatus: '',
    equivalence: 'EQUAL',
    statusSetBy: 'USER',
    statusSetOn: new Date().getTime(),
    mappingType: 'MAPS_TO',
    comment: 'AUTO MAPPED',
    createdBy: 'ctl',
    createdOn: new Date().getTime(),
    assignedReviewer: '',
  }

  let mapper = writable<IMapper>({
    mappingURL: mappingURL,
    mappingFetchOptions: mappingFetchOptions,
    mappingFileType: mappingFileType,
    mappingDelimiter: mappingDelimiter,
    contentPath: ['content'],
    expectedColumns: expectedColumns,
    additionalFields: additionalFields,
  })

  const nextRow = async () => {}

  const updateData = async (worker: Worker, index: string, value: string): Promise<void> => {
    worker?.postMessage({
      editData: {
        index: index,
        value: value,
      },
      filter: $filters,
      order: $sorting,
      pagination: $pagination,
      columns: $columns,
      mapper: $mapper,
    })
  }

  const modalAuthor = async (value: boolean): Promise<void> => {
    $showAuthor = value
    localStorage.setItem('author', $author)
  }

  const updatePopup = async (event: any, value: boolean = false): Promise<void> => {
    if (event != null) {
      let id: string
      if (event.srcElement.id == '') {
        if (event.srcElement.firstChild.id == '') {
          if (event.srcElement.firstChild.firstChild.id == '') {
            id = event.srcElement.firstChild.firstChild.firstChild.id
          } else {
            id = event.srcElement.firstChild.firstChild.id
          }
        } else {
          id = event.srcElement.firstChild.id
        }
      } else {
        id = event.srcElement.id
      }
      const indexes = id.split('-')
      $chosenRowMapping = Number(indexes[1])
    }
    $showPopup = value
    fetchAPI($APICall, $APIFilters)
  }

  const fetchAPI = (URL: string, filters: string[]) => {
    URL = 'https://athena.ohdsi.org/api/v1/concepts'

    URL += `?pageSize=${$athenaPagination.rowsPerPage}`
    if ($athenaPagination.currentPage != undefined) {
      if ($athenaPagination.currentPage == 0) {
        URL += `&page=1`
      } else {
        URL += `&page=${$athenaPagination.currentPage}`
      }
    } else URL += `$page=1`

    // Add filter to URL if it exists
    if ($athenaFilter != 'undefined' && $athenaFilter != undefined && !$athenaFilter.includes('undefined')) {
      URL += `&query=${$athenaFilter}`
    } else if ($selectedRow != undefined) {
      let columnIndex = 0
      for (let col of $columns) {
        if (col.column == 'sourceName') {
          const sourceCol = col
          columnIndex = $columns.indexOf(sourceCol)
        }
      }
      const sourceName = $data[$selectedRowPage][columnIndex]
      URL += `&query=${sourceName}`
    } else {
      URL += `&query=`
    }

    filters = Array.from(new Set(filters))
    if (filters != undefined) {
      for (let filter of filters) {
        URL += filter
      }
    }

    // Add sorting to URL if there is sorting
    if ($athenaSorting) {
      if ($athenaNames[$athenaSorting.column as keyof Object]) {
        URL += `&sort=${$athenaNames[$athenaSorting.column as keyof Object]}&order=${
          $athenaSorting.direction == 2 ? 'desc' : 'asc'
        }`
      }
    }

    $APICall = encodeURI(URL)
  }

  const transpileDataAPI = async (data: Array<Object>): Promise<object> => {
    let columns: IScheme[] = []
    let filteredData: [string, any][][] = []
    if (data.length > 0) {
      for (let item of Object.keys(data[0])) {
        if (item == 'id') {
          columns.push({
            column: item,
            type: 1,
            editable: false,
            visible: true,
          })
        } else {
          columns.push({
            column: item,
            type: 0,
            editable: false,
            visible: true,
          })
        }
      }
    }
    for (let item of data) {
      let row: [string, any][] = []
      for (let col of Object.keys(item)) {
        row.push(item[col as keyof object])
      }
      filteredData.push(row)
    }
    $athenaData = data
    $athenaColumns = columns
    const dataObj = {
      data: filteredData,
      scheme: columns,
    }
    return dataObj
  }

  const mapped = async (event: Event): Promise<void> => {
    let id: string
    const element = event.srcElement as HTMLElement
    const firstChild = element.firstChild as HTMLElement
    const secondChild = firstChild.firstChild as HTMLElement
    const thirdChild = secondChild.firstChild as HTMLElement
    if (element.id == '') {
      if (firstChild.id == '') {
        if (secondChild.id == '') {
          id = thirdChild.id
        } else {
          id = secondChild.id
        }
      } else {
        id = firstChild.id
      }
    } else {
      id = element.id
    }
    const indexes = id.split('-')
    const row = Number(indexes[0]) - $athenaPagination.rowsPerPage * ($athenaPagination.currentPage - 1)
    const rowValues = $athenaData[row]
    rowValues.equivalence = $equivalenceMapping
    rowValues.author = $author
    mapping = {
      row: Number($selectedRow),
      columns: $athenaColumns,
      data: rowValues,
    }
    $map = true
  }

  $: {
    $athenaFilter, $athenaSorting
    fetchAPI($APICall, $APIFilters)
  }

  $: {
    $athenaPagination
    if (previousPagination != undefined) {
      if (
        $athenaPagination.currentPage != previousPagination.currentPage ||
        $athenaPagination.rowsPerPage != previousPagination.rowsPerPage
      ) {
        fetchAPI($APICall, $APIFilters)
      }
    } else {
      previousPagination = $athenaPagination
      fetchAPI($APICall, $APIFilters)
    }
  }

  const fetchOptionsCSV = {
    method: 'GET',
    header: {
      'Content-Type': 'text/csv;charset=UTF-8',
    },
  }

  const urlCSV =
    'https://raw.githubusercontent.com/RADar-AZDelta/AZDelta-OMOP-CDM/main/location/country_concept_id/countries.csv'

  const file = writable<File | null>(null)
  const delimiter: string = ','

  onMount(() => {
    if ($showAuthor == false && localStorage.getItem('author') == null) showAuthor.set(true)
    else if (localStorage.getItem('author') != null) $author = localStorage.getItem('author')!
  })

  $: {
    $APICall
    console.log('CHANGE OF ROW ', $APICall)
  }
</script>

<SmallModal bind:show={$showAuthor} saveFunction={modalAuthor}>
  <label for="author">Who is the author?</label>
  <input id="author" type="text" placeholder="John Wick" bind:value={$author} />
</SmallModal>

<img src="/Keun.png" alt="The logo of POC-Keun" height="113" width="332" data-component="title-image" />

<!-- <DragAndDrop {file} fileExtension="csv" text={`DROP YOUR CSV FILE HERE`} />
{#if $file != null}
  <DataTableRendererCSR
    statusScheme={statuses}
    file={$file}
    dataType="csv"
    {delimiter}
    rowEvent={updatePopup}
    {mapping}
    bind:map={$map}
    bind:selectedRow
    bind:selectedRowPage
    downloadable={true}
    bind:columns
    bind:data
    autoMapping={false}
  />
{/if} -->

<ShowColumns {columns} bind:parentChange />

<DataTableRendererCSR
  url={urlCSV}
  fetchOptions={fetchOptionsCSV}
  dataType="CSV"
  {delimiter}
  {mapping}
  bind:map={$map}
  bind:selectedRow
  bind:selectedRowPage
  downloadable={true}
  bind:columns
  bind:data
  autoMapping={true}
  bind:filters
  bind:sorting
  bind:pagination
  bind:mapper
  bind:updated
  bind:parentChange
>
  <tr slot="columns" let:columns let:worker let:updateSorting let:deleteFilter let:updateFiltering>
    <th>
      <div>
        <div class="control">
          <p data-component="column-name">Actions</p>
        </div>
      </div>
    </th>
    {#each columns as column}
      {#if column.visible == true}
        <th>
          <div>
            <div class="control">
              <Sorting
                col={column.column}
                direction={$sorting.filter(obj => obj.column == column.column)[0] != undefined
                  ? $sorting.filter(obj => obj.column == column.column)[0].direction
                  : 0}
                {updateSorting}
              />
            </div>
            <div class="control">
              <Filtering col={column.column} type={column.type} {deleteFilter} {updateFiltering} bind:filters />
            </div>
          </div>
        </th>
      {/if}
    {/each}
  </tr>
  <tr
    slot="row"
    let:row
    let:scheme
    let:id
    let:number
    let:worker
    {id}
    on:click={function () {
      if ($selectedRow != String(number + $pagination.rowsPerPage * ($pagination.currentPage - 1))) {
        $selectedRow = String(number + $pagination.rowsPerPage * ($pagination.currentPage - 1))
      } else {
        if (updatePopup != undefined && $editorUpdating == false && $editClick == false) updatePopup(event, true)
        editClick.set(false)
      }
    }}
    style={`${checkStatuses(scheme, number) ? `background-color: ${getColorFromStatus(scheme, number)};` : ''}`}
    class={`${
      $selectedRow == String(number + $pagination.rowsPerPage * ($pagination.currentPage - 1)) ? 'selected-row' : ''
    }`}
  >
    <td class="cell">
      <div class="field has-addons" style="height: 20px;">
        <Action
          name="&#10003"
          bind:selectedRow
          {worker}
          bind:parentChange
          row={number + $pagination.rowsPerPage * ($pagination.currentPage - 1)}
          updateColumns={[
            {
              name: 'mappingStatus',
              altName: 'mappingStatus',
              data: 'APPROVED',
            },
            {
              name: 'assignedReviewer',
              altName: 'assignedReviewer',
              data: getAuthor(),
            },
          ]}
        />
        <Action
          name="&#127988"
          bind:selectedRow
          {worker}
          bind:parentChange
          row={number + $pagination.rowsPerPage * ($pagination.currentPage - 1)}
          updateColumns={[
            {
              name: 'mappingStatus',
              altName: 'mappingStatus',
              data: 'FLAGGED',
            },
            {
              name: 'assignedReviewer',
              altName: 'assignedReviewer',
              data: getAuthor(),
            },
          ]}
        />
      </div>
    </td>
    {#each row as cell, i}
      {#if scheme[i] != undefined}
        {#if scheme[i].visible == true}
          <td class="cell">
            <div class="field has-addons" data-component="cell-container">
              <p id={`${i}-${number + $pagination.rowsPerPage * ($pagination.currentPage - 1)}`}>
                {cell}
              </p>
              {#if scheme[i].editable == true}
                <Editor
                  col={number}
                  row={i}
                  {updateData}
                  bind:updated
                  bind:editClick
                  bind:editorUpdating
                  {ownEditorMethods}
                  {ownEditorVisuals}
                  {worker}
                />
              {/if}
            </div>
          </td>
        {/if}
      {/if}
    {/each}
  </tr>
  <div slot="extra" let:worker>
    <ActionPage
      name="Approve page"
      firstRow={($pagination.currentPage - 1) * $pagination.rowsPerPage}
      lastRow={$pagination.currentPage * $pagination.rowsPerPage - 1}
      updateColumns={[
        {
          name: 'mappingStatus',
          altName: 'mappingStatus',
          data: 'APPROVED',
        },
        {
          name: 'assignedReviewer',
          altName: 'assignedReviewer',
          data: getAuthor(),
        },
      ]}
      {worker}
      bind:parentChange
    />
    <ActionPage
      name="Flag page"
      firstRow={($pagination.currentPage - 1) * $pagination.rowsPerPage}
      lastRow={$pagination.currentPage * $pagination.rowsPerPage - 1}
      updateColumns={[
        {
          name: 'mappingStatus',
          altName: 'mappingStatus',
          data: 'FLAGGED',
        },
        {
          name: 'assignedReviewer',
          altName: 'assignedReviewer',
          data: getAuthor(),
        },
      ]}
      {worker}
      bind:parentChange
    />
  </div>
</DataTableRendererCSR>

<Modal {updatePopup} show={$showPopup}>
  <AthenaLayout filters={filtersJSON} bind:urlFilters={APIFilters} bind:equivalenceMapping bind:activatedFilters>
    <div slot="currentRow" class="currentRow">
      <button
        on:click={() => {
          if ($selectedRow != '0') {
            $selectedRow = String(Number($selectedRow) - 1)
            $athenaFilter = $data[$selectedRow][1]
            fetchAPI($APICall, $APIFilters)
          }
        }}
      >
        <img src="/arrow-left.svg" alt="Close button" />
      </button>
      <table class="table">
        <tr>
          <th>sourceCode</th>
          <th>sourceName</th>
          <th>sourceFrequency</th>
        </tr>
        <tr>
          <td>{$data[$selectedRow][0]}</td>
          <td>{$data[$selectedRow][1]}</td>
          <td>{$data[$selectedRow][2]}</td>
        </tr>
      </table>
      <button
        on:click={() => {
          if ($selectedRow != String($pagination.totalRows)) {
            $selectedRow = String(Number($selectedRow) + 1)
            $athenaFilter = $data[$selectedRow][1]
            fetchAPI($APICall, $APIFilters)
          }
        }}
      >
        <img src="/arrow-right.svg" alt="Close button" />
      </button>
    </div>
    <div slot="table">
      {#if $APICall != ''}
        <DataTableRendererSSR
          bind:url={APICall}
          fetchOptions={{}}
          dataPath={['content']}
          currentPagePath={['pageable', 'pageNumber']}
          totalPagesPath={['totalPages']}
          rowsPerPagePath={['pageable', 'pageSize']}
          totalRowsPath={['totalElements']}
          bind:singleFilter={athenaFilter}
          bind:singleSorting={athenaSorting}
          bind:pagination={athenaPagination}
          bind:columns={athenaColumns}
          transpileData={transpileDataAPI}
          special={true}
          downloadable={false}
        >
          <tr slot="columns" let:columns let:updateSorting>
            {#each columns as column}
              {#if column.visible == true}
                <th>
                  <div class="control">
                    <Sorting
                      col={column.column}
                      direction={$athenaSorting == undefined
                        ? 0
                        : $athenaSorting.column == column.column
                        ? $athenaSorting.direction
                        : 0}
                      {updateSorting}
                    />
                  </div>
                </th>
              {/if}
            {/each}
          </tr>
          <!-- updatePopup -->
          <tr slot="row" let:row let:scheme let:id let:number {id} on:click={mapped}>
            {#each row as cell, j}
              {#if scheme[j] != undefined}
                {#if scheme[j].visible == true}
                  <td class="cell">
                    <div class="cell-container">
                      <p class="content" id="{number + $pagination.rowsPerPage * ($pagination.currentPage - 1)}-{j}">
                        {cell}
                      </p>
                    </div>
                  </td>
                {/if}
              {/if}
            {/each}
          </tr>
        </DataTableRendererSSR>
      {/if}
    </div>
  </AthenaLayout>
</Modal>

<style>
  .currentRow {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
</style>

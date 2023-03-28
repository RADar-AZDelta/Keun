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
  let map = writable<boolean>()
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
  let mapping: IMapping | Array<IMapping>
  let multipleMapping: Array<IMapping> = []

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
      status: 'UNAPPROVED',
      color: 'hsl(0, 100%, 77%)',
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

  let athenaColumn = writable<string>('sourceName')
  let athenaRows = writable<Array<number>>([])

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
    {
      name: 'ADD_INFO:author1',
      altName: 'ADD_INFO:author1',
    },
    {
      name: 'ADD_INFO:author2',
      altName: 'ADD_INFO:author2',
    },
  ]
  let additionalFields: object = {
    'ADD_INFO:author1': '',
    'ADD_INFO:author2': '',
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

  let mapper = writable<IMapper>({
    mappingURL: mappingURL,
    mappingFetchOptions: mappingFetchOptions,
    mappingFileType: mappingFileType,
    mappingDelimiter: mappingDelimiter,
    contentPath: ['content'],
    expectedColumns: expectedColumns,
    additionalFields: additionalFields,
  })

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
      extraChanges: [
        {
          column: 'createdBy',
          value: getAuthor(),
        },
      ],
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

  const fetchAPI = (URL: string, filters: string[], columnChange: boolean = false) => {
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
    if (columnChange == false) {
      if ($athenaFilter != 'undefined' && $athenaFilter != undefined && !$athenaFilter.includes('undefined')) {
        URL += `&query=${$athenaFilter}`
      } else if ($selectedRow != undefined) {
        const index = $columns.indexOf($columns.filter(col => col.column == $athenaColumn)[0])
        const sourceName = $data[$selectedRowPage][index]
        $athenaFilter = sourceName
        URL += `&query=${sourceName}`
      } else {
        URL += `&query=`
      }
    } else {
      if ($columns.length > 0) {
        const index = $columns.indexOf(
          $columns.filter(col => col.column.toLowerCase() == $athenaColumn.toLowerCase())[0]
        )
        const sourceName = $data[$selectedRowPage][index]
        $athenaFilter = sourceName
        URL += `&query=${sourceName}`
      }
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

  const checkForAuthor = (newData: any, oldData: any, oldColumns: IScheme[], row: any) => {
    // Fill in old data to find authors
    const author1Index = oldColumns.findIndex(col => col.column == 'ADD_INFO:author1')
    const author2Index = oldColumns.findIndex(col => col.column == 'ADD_INFO:author2')
    if (oldData[author1Index] != '' && oldData[author1Index] != undefined && oldData[author1Index] != getAuthor()) {
      newData['ADD_INFO:author1'] = getAuthor()
      newData['ADD_INFO:author2'] = oldData[author1Index]
    } else if (
      oldData[author1Index] != '' &&
      oldData[author1Index] != undefined &&
      oldData[author2Index] != '' &&
      oldData[author2Index] != undefined
    ) {
      const previousAuthor = oldData[author1Index]
      newData['ADD_INFO:author1'] = getAuthor()
      newData['ADD_INFO:author2'] = previousAuthor
    } else {
      newData['ADD_INFO:author1'] = getAuthor()
      oldData[author1Index] = getAuthor()
      newData['ADD_INFO:author2'] = ''
    }
    return newData
  }

  const mapped = async (event: Event): Promise<void> => {
    // @ts-ignore
    let id: string = event.target.id
    const row = Number(id) - $athenaPagination.rowsPerPage * ($athenaPagination.currentPage - 1)
    let rowValues = $athenaData[row]
    rowValues.equivalence = $equivalenceMapping
    rowValues.author = $author
    rowValues = await checkForAuthor(rowValues, $data[Number($selectedRow)], $columns, Number($selectedRow))
    mapping = {
      row: Number($selectedRow),
      columns: $athenaColumns,
      data: rowValues,
    }
    $map = true
  }

  const mappingMultiple = async () => {
    let count = 0
    for (let athenaRow of $athenaRows) {
      const row = Number(athenaRow) - $athenaPagination.rowsPerPage * ($athenaPagination.currentPage - 1)
      let rowValues = $athenaData[row]
      rowValues.equivalence = $equivalenceMapping
      rowValues.author = $author
      rowValues = await checkForAuthor(rowValues, $data[Number($selectedRow)], $columns, Number($selectedRow))
      multipleMapping.push({
        row: Number($selectedRow) + count,
        columns: $athenaColumns,
        data: $athenaData[row],
      })
      count += 1
    }
    mapping = multipleMapping
    $map = true
  }

  $: {
    $athenaFilter, $athenaSorting
    fetchAPI($APICall, $APIFilters)
  }

  $: {
    $athenaColumn
    fetchAPI($APICall, $APIFilters, true)
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
  bind:mapping
  bind:map
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
              name: 'statusSetBy',
              altName: 'statusSetBy',
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
              name: 'statusSetBy',
              altName: 'statusSetBy',
              data: getAuthor(),
            },
          ]}
        />
        <Action
          name="X"
          bind:selectedRow
          {worker}
          bind:parentChange
          row={number + $pagination.rowsPerPage * ($pagination.currentPage - 1)}
          updateColumns={[
            {
              name: 'mappingStatus',
              altName: 'mappingStatus',
              data: 'UNAPPROVED',
            },
            {
              name: 'statusSetBy',
              altName: 'statusSetBy',
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
          name: 'statusSetBy',
          altName: 'statusSetBy',
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
          name: 'statusSetBy',
          altName: 'statusSetBy',
          data: getAuthor(),
        },
      ]}
      {worker}
      bind:parentChange
    />
  </div>
</DataTableRendererCSR>

<Modal {updatePopup} show={$showPopup}>
  <h1>{$athenaFilter}</h1>
  <AthenaLayout
    filters={filtersJSON}
    bind:urlFilters={APIFilters}
    bind:equivalenceMapping
    bind:activatedFilters
    bind:athenaColumn
    filterColumns={['sourceName', 'sourceCode']}
  >
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
          {#if $data[$selectedRow] != undefined}
            <td>{$data[$selectedRow][0]}</td>
            <td>{$data[$selectedRow][1]}</td>
            <td>{$data[$selectedRow][2]}</td>
          {/if}
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
          <tr slot="row" let:row let:scheme let:id let:number {id}>
            <td class="actions">
              <input
                type="checkbox"
                class="custom-checkbox"
                on:change={e => {
                  // @ts-ignore
                  if (e.target.checked == true) {
                    athenaRows.update(values => (values = [...values, Number(id)]))
                  } else {
                    $athenaRows = $athenaRows.filter(row => row != Number(id))
                  }
                }}
              />
              <button {id} on:click={mapped} class="check-button"><img src="/check.svg" alt="check icon" /></button>
            </td>
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
    <div slot="extra">
      <button on:click={mappingMultiple}>Map multiple</button>
    </div>
  </AthenaLayout>
</Modal>

<style>
  .currentRow {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    border: none;
  }

  .custom-checkbox {
    appearance: none;
    width: 1.5rem;
    height: 1.5rem;
    /* background-color: lightgray; */
    padding: 0;
    margin: 0;
    border-radius: 5px;
    background-image: url('/plus.svg');
    filter: invert(54%) sepia(3%) saturate(8%) hue-rotate(336deg) brightness(93%) contrast(86%);
  }

  .custom-checkbox:checked,
  .custom-checkbox:hover,
  .custom-checkbox:active {
    background-image: url('/plus.svg');
    filter: invert(12%) sepia(87%) saturate(4289%) hue-rotate(238deg) brightness(67%) contrast(126%);
  }

  .check-button {
    border: none;
    height: 1.5rem;
    width: 1.5rem;
    margin: 0;
    padding: 0;
    border-radius: 5px;
    background-color: inherit;
    filter: invert(54%) sepia(3%) saturate(8%) hue-rotate(336deg) brightness(93%) contrast(86%);
  }

  .check-button:hover,
  .custom-checkbox:active {
    filter: invert(12%) sepia(87%) saturate(4289%) hue-rotate(238deg) brightness(67%) contrast(126%);
  }
</style>

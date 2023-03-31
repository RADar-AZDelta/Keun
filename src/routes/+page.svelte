<script lang="ts">
  import { writable, type Writable } from 'svelte/store'
  import filtersJSON from '$lib/filters.json'
  import type IScheme from '../../lib/RADar-DataTable/src/lib/interfaces/IScheme'
  import type IStatus from '../../lib/RADar-DataTable/src/lib/interfaces/IStatus'
  import athenaNamesJSON from '$lib/columnsAthena.json'
  import Modal from '$lib/components/Extra/Modal.svelte'
  import type IQueryFilter from '$lib/interfaces/IQueryFilter'
  import DataTableRendererCSR from '../../lib/RADar-DataTable/src/lib/components/DataTable/DataTableRendererCSR.svelte'
  import DataTableRendererSSR from '../../lib/RADar-DataTable/src/lib/components/DataTable/DataTableRendererSSR.svelte'
  import type IPaginated from '../../lib/RADar-DataTable/src/lib/interfaces/IPaginated'
  import type ISort from '../../lib/RADar-DataTable/src/lib/interfaces/ISort'
  import type IMapping from '$lib/interfaces/IMapping'
  import type IColumnName from '../../lib/RADar-DataTable/src/lib/interfaces/IColumnName'

  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import { onMount } from 'svelte'
  import Sorting from '../../lib/RADar-DataTable/src/lib/components/DataTableBasics/Sorting.svelte'
  import Filtering from '../../lib/RADar-DataTable/src/lib/components/DataTableBasics/Filtering.svelte'
  import type IFilter from '../../lib/RADar-DataTable/src/lib/interfaces/IFilter'
  import Editor from '$lib/components/Extra/Editor.svelte'
  import type IMapper from '../../lib/RADar-DataTable/src/lib/interfaces/IMapper'
  import ActionPage from '$lib/components/Extra/ActionPage.svelte'
  import Action from '$lib/components/Extra/Action.svelte'
  import ShowColumns from '$lib/components/Extra/ShowColumns.svelte'
  import type ISettings from '$lib/interfaces/ISettings'
  import {
    getAuthor,
    getColorFromStatus,
    checkStatuses,
    assembleURL,
    createMapping,
    createMappingMultiple,
    updateSettings,
  } from '$lib/utils'
  import Row from '$lib/components/Mapping/Row.svelte'
  import Column from '$lib/components/Mapping/Column.svelte'

  const author = writable<string>()
  let settings = writable<ISettings>({
    visible: false,
    options: [
      {
        name: 'Map to multiple concepts',
      },
    ],
  })
  const hiddenColumns = [
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
  let initialLoading: boolean = false

  /*
    Data Athena related
  */
  const athenaNames = writable<Object>(athenaNamesJSON)
  let activatedAthenaFilters = writable<IQueryFilter[]>([])
  let athenaData = writable<any>()
  let athenaColumns = writable<IScheme[]>()
  let athenaPagination = writable<IPaginated>({
    currentPage: 0,
    rowsPerPage: 10,
    totalRows: 20,
    totalPages: 2,
  })
  let athenaFilteredColumn = writable<string>('sourceName')
  let athenaFilter = writable<string>()
  let athenaSorting = writable<ISort>()
  let athenaPreviousFilteredColumn: string = 'sourceName'
  let athenaRows = writable<any[]>([])
  // URI for the API call
  let APICall = writable<string>()
  // Filters set in the athena layout
  let APIFilters = writable<string[]>()

  /*
    Data mapping related
  */
  let map = writable<boolean>()
  let selectedRow = writable<number>()
  let selectedRowPage = writable<number>(0)
  let equivalenceMapping = writable<string>()
  let mapping: IMapping | Array<IMapping>
  let mappingURL: string = 'https://athena.ohdsi.org/api/v1/concepts?'
  let mappingFetchOptions: object = {}
  let mappingFileType: string = 'json'
  let mappingDelimiter: string = ','
  // Expected columns returned from the mapping table
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
  // Additional fields that need to be added when mapped
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
  // Mapping information for the worker
  let mapper = writable<IMapper>({
    mappingURL: mappingURL,
    mappingFetchOptions: mappingFetchOptions,
    mappingFileType: mappingFileType,
    mappingDelimiter: mappingDelimiter,
    contentPath: ['content'],
    expectedColumns: expectedColumns,
    additionalFields: additionalFields,
  })
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

  /*
    General data
  */
  let columns = writable<Array<IScheme>>([])
  let data = writable<Array<Array<any>>>()
  let filters: Writable<Array<IFilter>> = writable<IFilter[]>([])
  let sorting: Writable<Array<ISort>> = writable([])
  let pagination: Writable<IPaginated> = writable({
    currentPage: 1,
    rowsPerPage: 10,
    totalRows: 20,
    totalPages: 2,
  })
  let previousPagination: IPaginated

  /*
    Editor related
  */
  let editClick = writable<boolean>(false)
  let editorUpdating = writable<boolean>(false)
  const ownEditorMethods = undefined
  const ownEditorVisuals = undefined

  /*
    Pop-ups related
  */

  let showMappingPopUp = writable<boolean>(false)
  let showAuthorPopUp = writable<boolean>(false)

  const updatePopupAuthor = async (value: boolean): Promise<void> => {
    $showAuthorPopUp = value
    localStorage.setItem('author', $author)
  }

  const updatePopupMapping = async (value: boolean = false): Promise<void> => {
    $showMappingPopUp = value
    const { URL, filter } = assembleURL(
      mappingURL,
      $APIFilters,
      $athenaPagination,
      $athenaFilter,
      $athenaSorting,
      $athenaFilteredColumn,
      $athenaNames,
      $selectedRow,
      $selectedRowPage,
      $columns,
      $data
    )
    APICall.set(URL)
    filter != undefined ? athenaFilter.set(filter) : null
  }

  const updatePopupSettings = async (value: boolean) => {
    $settings.visible = value
  }

  /*
    Data transpiler
  */

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

  const columnsVisibilityCheck = async (hiddenColumns: string[]) => {
    for (let column of $columns) {
      if (hiddenColumns.includes(column.column)) {
        if (column.forceVisibility == true) column.visible = true
        else column.visible = false
      }
    }
    columns.update(() => $columns)
  }

  /*
    Reactivity
  */

  $: {
    $athenaFilteredColumn
    if ($athenaFilteredColumn.trim().toLowerCase() != athenaPreviousFilteredColumn.trim().toLowerCase()) {
      athenaPreviousFilteredColumn = $athenaFilteredColumn
      const { URL, filter } = assembleURL(
        mappingURL,
        $APIFilters,
        $athenaPagination,
        $athenaFilter,
        $athenaSorting,
        $athenaFilteredColumn,
        $athenaNames,
        $selectedRow,
        $selectedRowPage,
        $columns,
        $data,
        true
      )
      APICall.set(URL)
      filter != undefined ? athenaFilter.set(filter) : null
    }
  }

  $: {
    $athenaPagination
    if (previousPagination != undefined) {
      if (
        $athenaPagination.currentPage != previousPagination.currentPage ||
        $athenaPagination.rowsPerPage != previousPagination.rowsPerPage
      ) {
        const { URL, filter } = assembleURL(
          mappingURL,
          $APIFilters,
          $athenaPagination,
          $athenaFilter,
          $athenaSorting,
          $athenaFilteredColumn,
          $athenaNames,
          $selectedRow,
          $selectedRowPage,
          $columns,
          $data
        )
        APICall.set(URL)
        filter != undefined ? athenaFilter.set(filter) : null
      }
    } else {
      previousPagination = $athenaPagination
      const { URL, filter } = assembleURL(
        mappingURL,
        $APIFilters,
        $athenaPagination,
        $athenaFilter,
        $athenaSorting,
        $athenaFilteredColumn,
        $athenaNames,
        $selectedRow,
        $selectedRowPage,
        $columns,
        $data
      )
      APICall.set(URL)
      filter != undefined ? athenaFilter.set(filter) : null
    }
  }

  $: {
    $athenaFilter, $athenaSorting
    const { URL, filter } = assembleURL(
      mappingURL,
      $APIFilters,
      $athenaPagination,
      $athenaFilter,
      $athenaSorting,
      $athenaFilteredColumn,
      $athenaNames,
      $selectedRow,
      $selectedRowPage,
      $columns,
      $data
    )
    APICall.set(URL)
    filter != undefined ? athenaFilter.set(filter) : null
  }

  /*
    Configuration for initial table
  */

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

  /*
    Get information out of localStorage when the component has been mounted to the DOM
  */

  onMount(() => {
    if ($showAuthorPopUp == false && localStorage.getItem('author') == null) showAuthorPopUp.set(true)
    else if (localStorage.getItem('author') != null) $author = localStorage.getItem('author')!

    if (localStorage.getItem('options') != null) {
      $settings.options = JSON.parse(localStorage.getItem('options')!)
    }
  })

  const checkIfChecked = (data: Array<Array<any>>, columns: IScheme[], scheme: IScheme[], row: Array<any>): boolean => {
    const dataIndex = $columns.indexOf($columns.filter(col => col.column == 'conceptId')[0])
    const athenaIndex = scheme.indexOf(scheme.filter(col => col.column == 'id')[0])
    const filteredData = data.filter(dataRow => dataRow[dataIndex] == row[athenaIndex])
    if (filteredData.length > 0){
      $athenaRows.push(row[athenaIndex])
      return true
    }
    else return false
  }

  const updateSelected = (e: Event, scheme: IScheme[], row: Array<any>) => {
    const element = e.target as HTMLInputElement
    const checked = element.checked
    const indexAthena = scheme.indexOf(scheme.filter(obj => obj.column == 'id')[0])
    if (checked == true) {
      athenaRows.update(values => (values = Array.from(new Set([...values, row[indexAthena]]))))
    } else {
      const index = $athenaRows.indexOf(row[indexAthena])
      $athenaRows.splice(index, 1)
    }
    return null
  }

  const rowSelection = (row: number) => {
    if ($selectedRow == undefined || $selectedRow != row + $pagination.rowsPerPage * ($pagination.currentPage - 1)) {
      $selectedRow = row + $pagination.rowsPerPage * ($pagination.currentPage - 1)
      const index = $columns.indexOf(
        $columns.filter(col => col.column.toLowerCase().trim() == $athenaFilteredColumn.toLowerCase().trim())[0]
      )
      $data[row][index] != undefined
        ? ($athenaFilter = String($data[row][index]))
        : ($athenaFilter = '')
    } else {
      if (updatePopupMapping != undefined && $editorUpdating == false && $editClick == false) updatePopupMapping(true)
      editClick.set(false)
    }
    return null
  }

  $: {
    if($columns != undefined && $data != undefined && initialLoading == false) initialLoading = true
  }

  $: {
    if(initialLoading == true) columnsVisibilityCheck(hiddenColumns)
  }

  $: {
    $selectedRow
    $selectedRowPage = $selectedRow - ($pagination.rowsPerPage * ($pagination.currentPage - 1))
  }
</script>

<img src="/Keun.png" alt="The logo of POC-Keun" height="113" width="332" data-component="title-image" />

<!-- Extra's -->

<div class="options">
  <button
    on:click={() => {
      $settings.visible = true
    }}
  >
    <img src="/settings.svg" alt="Settings" />
  </button>
</div>

<!-- Table -->

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
        <Column {column} {sorting} {updateSorting} {deleteFilter} {updateFiltering} {filters} />
      {/if}
    {/each}
  </tr>
  <Row
    slot="row"
    let:row
    let:scheme
    let:id
    let:number
    let:worker
    {row}
    {scheme}
    {id}
    {number}
    {pagination}
    rowClickMethod={rowSelection}
    checkStatusRow={checkStatuses}
    {getColorFromStatus}
    {statuses}
    bind:data
    bind:selectedRow
  >
    <td slot="actions" class="cell">
      <div class="field has-addons" style="height: 20px;">
        <Action
          name="&#10003"
          bind:selectedRow
          {worker}
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
            {
              name: 'ADD_INFO:author1',
              altName: 'ADD_INFO:author1',
              data: getAuthor(),
            },
          ]}
        />
        <Action
          name="&#127988"
          bind:selectedRow
          {worker}
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
            {
              name: 'ADD_INFO:author1',
              altName: 'ADD_INFO:author1',
              data: getAuthor(),
            },
          ]}
        />
        <Action
          name="X"
          bind:selectedRow
          {worker}
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
            {
              name: 'ADD_INFO:author1',
              altName: 'ADD_INFO:author1',
              data: getAuthor(),
            },
          ]}
        />
      </div>
    </td>
    <Editor
      let:cellNumber
      slot="editor"
      col={number}
      row={cellNumber}
      bind:editClick
      bind:editorUpdating
      {ownEditorMethods}
      {ownEditorVisuals}
      {worker}
      filters={$filters}
      sorting={$sorting}
      pagination={$pagination}
      columns={$columns}
      mapper={$mapper}
    />
  </Row>
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
        {
          name: 'ADD_INFO:author1',
          altName: 'ADD_INFO:author1',
          data: getAuthor(),
        },
      ]}
      {worker}
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
        {
          name: 'ADD_INFO:author1',
          altName: 'ADD_INFO:author1',
          data: getAuthor(),
        },
      ]}
      {worker}
    />
  </div>
</DataTableRendererCSR>

<!-- Modals -->

<Modal updatePopup={updatePopupAuthor} bind:show={$showAuthorPopUp} size="small">
  <div class="pop-up-container-center">
    <h2 class="title-md">Who is the author?</h2>
    <input id="author" type="text" placeholder="John Wick" class="author-input" bind:value={$author} />
    <div class="buttons-container">
      <button class="button-cancel" on:click={() => ($showAuthorPopUp = false)}>Cancel</button>
      <button
        class="button-save"
        on:click={() => {
          updatePopupAuthor(false)
          $showAuthorPopUp = false
        }}>Save</button
      >
    </div>
  </div>
</Modal>

<Modal updatePopup={updatePopupSettings} show={$settings.visible} size="medium">
  <h2 class="pop-up-title">Settings</h2>
  <div class="pop-up-container">
    {#each $settings.options as option}
      <div class="option">
        <p>{option.name}</p>
        <label class="switch">
          <input type="checkbox" bind:checked={option.value} on:change={() => updateSettings(option)} />
          <span class="slider round" />
        </label>
      </div>
    {/each}
  </div>
  <ShowColumns bind:columns visibilityCheck={columnsVisibilityCheck} {hiddenColumns}/>
</Modal>

<Modal updatePopup={updatePopupMapping} show={$showMappingPopUp} size="large">
  <AthenaLayout
    filters={filtersJSON}
    bind:urlFilters={APIFilters}
    bind:equivalenceMapping
    bind:activatedAthenaFilters
    bind:athenaFilteredColumn
    filterColumns={['sourceName', 'sourceCode']}
  >
    <div slot="currentRow" class="currentRow">
      <button
        on:click={() => {
          if ($selectedRow != 0) {
            $selectedRow -= 1
            $data[$selectedRow] != undefined ? ($athenaFilter = String($data[$selectedRow][1])) : ($athenaFilter = '')
            const { URL, filter } = assembleURL(
              mappingURL,
              $APIFilters,
              $athenaPagination,
              $athenaFilter,
              $athenaSorting,
              $athenaFilteredColumn,
              $athenaNames,
              $selectedRow,
              $selectedRowPage,
              $columns,
              $data
            )
            APICall.set(URL)
            filter != undefined ? athenaFilter.set(filter) : null
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
          if ($selectedRow != $pagination.totalRows) {
            $selectedRow += 1
            $data[$selectedRow] != undefined ? ($athenaFilter = String($data[$selectedRow][1])) : ($athenaFilter = '')
            const { URL, filter } = assembleURL(
              mappingURL,
              $APIFilters,
              $athenaPagination,
              $athenaFilter,
              $athenaSorting,
              $athenaFilteredColumn,
              $athenaNames,
              $selectedRow,
              $selectedRowPage,
              $columns,
              $data
            )
            APICall.set(URL)
            filter != undefined ? athenaFilter.set(filter) : null
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
              {#if $settings.options.find(option => option.name == 'Map to multiple concepts') != undefined}
                {#if $settings.options.filter(option => option.name == 'Map to multiple concepts')[0].value == true}
                  <input
                    type="checkbox"
                    class="custom-checkbox"
                    checked={checkIfChecked($data, $columns, scheme, row)}
                    on:change={e => updateSelected(e, scheme, row)}
                  />
                {/if}
              {/if}
              <button
                {id}
                on:click={async () => {
                  // @ts-ignore
                  const id = event?.target?.id
                  mapping = await createMapping(
                    id,
                    $athenaPagination,
                    $athenaColumns,
                    $athenaData,
                    $equivalenceMapping,
                    $selectedRow,
                    $columns,
                    $data
                  )
                  $map = true
                }}
                class="check-button"><img src="/check.svg" alt="check icon" {id} /></button
              >
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
      {#if $settings.options.filter(option => option.name == 'Map to multiple concepts')[0].value == true}
        <button
          on:click={async () => {
            mapping = await createMappingMultiple(
              $athenaColumns,
              $athenaData,
              $athenaRows,
              $equivalenceMapping,
              $selectedRow,
              $columns,
              $data
            )
            $map = true
          }}>Map multiple</button
        >
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

  .options {
    display: flex;
    align-items: center;
    gap: 5rem;
  }

  .switch {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    -webkit-transition: 0.4s;
    transition: 0.4s;
  }

  .slider:before {
    position: absolute;
    content: '';
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    -webkit-transition: 0.4s;
    transition: 0.4s;
  }

  input:checked + .slider {
    background-color: #2196f3;
  }

  input:focus + .slider {
    box-shadow: 0 0 1px #2196f3;
  }

  input:checked + .slider:before {
    -webkit-transform: translateX(26px);
    -ms-transform: translateX(26px);
    transform: translateX(26px);
  }

  /* Rounded sliders */
  .slider.round {
    border-radius: 34px;
  }

  .slider.round:before {
    border-radius: 50%;
  }

  .option {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .pop-up-title {
    font-size: 2rem;
    font-weight: 700;
    padding: 1rem 0 0 2rem;
  }

  .pop-up-container {
    padding: 0 1rem;
  }

  .pop-up-container-center {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    gap: 1rem;
    height: 100%;
  }

  .title-md {
    font-size: 1.5rem;
    text-align: center;
  }

  .author-input {
    padding: 0.5rem 1rem;
    border-radius: 5px;
    border: 1px solid #ccc;
  }

  .author-input:focus {
    outline: none;
    border: 1px solid #2196f3;
  }

  .buttons-container {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  .button-save {
    padding: 0.5rem 1rem;
    border-radius: 5px;
    background-color: lightgreen;
    border: 1px solid green;
    cursor: pointer;
  }

  .button-cancel {
    padding: 0.5rem 1rem;
    border-radius: 5px;
    background-color: lightcoral;
    border: 1px solid red;
    cursor: pointer;
  }
</style>

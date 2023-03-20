<script lang="ts">
  import { writable } from 'svelte/store'
  import { showPopup, showAuthor } from '$lib/store'
  import filtersJSON from '$lib/filters.json'
  import type IScheme from '../../libs/RADar-DataTable/src/lib/interfaces/IScheme'
  import athenaNamesJSON from '$lib/columnsAthena.json'
  import Modal from '$lib/components/Extra/Modal.svelte'
  import type IQueryFilter from '$lib/interfaces/IQueryFilter'
  import DataTableRendererCSR from '../../libs/RADar-DataTable/src/lib/components/DataTable/DataTableRendererCSR.svelte'
  import DataTableRendererSSR from '../../libs/RADar-DataTable/src/lib/components/DataTable/DataTableRendererSSR.svelte'
  import DragAndDrop from '../../libs/RADar-DataTable/src/lib/components/Extra/DragAndDrop.svelte'
  import type IPaginated from '../../libs/RADar-DataTable/src/lib/interfaces/IPaginated'
  import type ISort from '../../libs/RADar-DataTable/src/lib/interfaces/ISort'
  import '$lib/styles/table.scss'
  import type IMapping from '$lib/interfaces/IMapping'
  import SmallModal from '$lib/components/Extra/SmallModal.svelte'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'
  import { onMount } from 'svelte'

  const author = writable<string>()
  let activatedFilters = writable<IQueryFilter[]>([])
  let athenaData = writable<[string, any][][]>()
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
  let equivalenceMapping = writable<string>()
  const athenaNames = writable<Object>(athenaNamesJSON)
  let APICall = writable<string>()
  let APIFilters = writable<string[]>()

  let previousPagination: IPaginated
  let mapping: IMapping

  let columns = writable<Array<IScheme>>([])
  let data = writable<any>()

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
      $chosenRowMapping = Number(indexes[0])
    }
    $showPopup = value
    fetchAPI($APICall, $APIFilters)
  }

  const fetchAPI = async (URL: string, filters: string[]): Promise<void> => {
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
      const sourceName = $data[$selectedRow][columnIndex]
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

    APICall.set(encodeURI(URL))
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
          })
        } else {
          columns.push({
            column: item,
            type: 0,
            editable: false,
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
    $athenaData = filteredData
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
    mapping = {
      row: $chosenRowMapping,
      columns: $athenaColumns,
      data: rowValues,
      equivalence: $equivalenceMapping,
      author: $author,
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
    file={$file}
    dataType="csv"
    {delimiter}
    rowEvent={updatePopup}
    {mapping}
    bind:map={$map}
    bind:selectedRow
  />
{/if} -->

<DataTableRendererCSR
  url={urlCSV}
  fetchOptions={fetchOptionsCSV}
  dataType="CSV"
  {delimiter}
  rowEvent={updatePopup}
  {mapping}
  bind:map={$map}
  bind:selectedRow
  downloadable={true}
  bind:columns
  bind:data
/>

<Modal {updatePopup} show={$showPopup}>
  <AthenaLayout filters={filtersJSON} bind:urlFilters={APIFilters} bind:equivalenceMapping bind:activatedFilters>
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
        rowEvent={mapped}
        downloadable={false}
      />
    {/if}
  </AthenaLayout>
</Modal>

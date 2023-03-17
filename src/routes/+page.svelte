<script lang="ts">
  import { writable } from 'svelte/store'
  import { showPopup, showAuthor } from '$lib/store'
  import filtersJSON from '$lib/filters.json'
  import type IScheme from '../../libs/RADar-DataTable/src/lib/interfaces/IScheme'
  import athenaNamesJSON from '$lib/columnsAthena.json'
  import Modal from '$lib/components/Extra/Modal.svelte'
  import type IQueryFilter from '$lib/interfaces/IQueryFilter'
  import DataTableRendererCSR from '../../libs/RADar-DataTable/src/lib/components/DataTable/DataTableRendererCSR.svelte'
  import DataTableRendererAthena from '../../libs/RADar-DataTable/src/lib/components/DataTable/DataTableRendererAthena.svelte'
  import DragAndDrop from '../../libs/RADar-DataTable/src/lib/components/Extra/DragAndDrop.svelte'
  import type IPaginated from '../../libs/RADar-DataTable/src/lib/interfaces/IPaginated'
  import type ISort from '../../libs/RADar-DataTable/src/lib/interfaces/ISort'
  import '$lib/styles/table.scss'
  import type IMapping from '$lib/interfaces/IMapping'
  import SmallModal from '$lib/components/Extra/SmallModal.svelte'
  import AthenaLayout from '$lib/components/Extra/AthenaLayout.svelte'

  const author = writable<string>()
  let activatedFilters = writable<IQueryFilter[]>([])
  let athenaData = writable<[string, any][][]>()
  const athenaColumns = writable<IScheme[]>()
  const chosenRowMapping = writable<number>()
  const map = writable<boolean>()
  let athenaPagination = writable<IPaginated>({
    currentPage: 1,
    rowsPerPage: 10,
    totalRows: 10,
    totalPages: 1,
  })
  let athenaFilter = writable<string>()
  let athenaSorting = writable<ISort>()
  let selectedRow = writable<string>()
  let equivalenceMapping = writable<string>()
  const athenaNames = writable<Object>(athenaNamesJSON)

  let previousPagination: IPaginated
  let mapping: IMapping

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
    fetchAPI()
  }

  const fetchAPI = async (): Promise<void> => {
    let URL = `https://athena.ohdsi.org/api/v1/concepts?pageSize=${$athenaPagination.rowsPerPage}`

    // Add all filters of categories to URL
    for (let filter of $activatedFilters) {
      let substring: string = ''
      for (let option of filter.values) {
        substring += `&${filter.name}=${option}`
      }
      URL += substring
    }

    // Add pagination to URL
    URL += `&page=${$athenaPagination.currentPage}`

    // Add filter to URL if it exists
    if ($athenaFilter) {
      URL += `&query=${$athenaFilter}`
    } else {
      URL += `&query=`
    }

    // Add sorting to URL if there is sorting
    if ($athenaSorting) {
      if ($athenaNames[$athenaSorting.column as keyof Object]) {
        URL += `&sort=${$athenaNames[$athenaSorting.column as keyof Object]}&order=${
          $athenaSorting.direction == 2 ? 'desc' : 'asc'
        }`
      }
    }

    let res = await fetch(encodeURI(URL))
    let data = await res.json()
    $athenaPagination = {
      currentPage: data.pageable.pageNumber,
      totalPages: data.totalPages,
      rowsPerPage: data.pageable.pageSize,
      totalRows: data.totalElements,
    }
    previousPagination = $athenaPagination
    transpileDataAPI(data.content)
  }

  const transpileDataAPI = async (data: Array<Object>): Promise<void> => {
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
        row.push([col, item[col as keyof Object]])
      }
      filteredData.push(row)
    }
    $athenaData = filteredData
    $athenaColumns = columns
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
    fetchAPI()
  }

  $: {
    $athenaPagination
    if (previousPagination != undefined) {
      if (
        $athenaPagination.currentPage != previousPagination.currentPage ||
        $athenaPagination.rowsPerPage != previousPagination.rowsPerPage
      ) {
        fetchAPI()
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
/>

<Modal {updatePopup} show={$showPopup}>
  <AthenaLayout filters={filtersJSON} {fetchAPI} bind:equivalenceMapping bind:activatedFilters>
    {#if $athenaData != undefined && $athenaColumns != undefined}
      <DataTableRendererAthena
        bind:data={athenaData}
        bind:filter={athenaFilter}
        columns={$athenaColumns}
        rowEvent={mapped}
        bind:pagination={athenaPagination}
        bind:sorting={athenaSorting}
      />
    {/if}
  </AthenaLayout>
</Modal>

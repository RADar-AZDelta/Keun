<script lang="ts">
  import { writable } from 'svelte/store'
  import { showPopup } from '$lib/store'
  import filtersJSON from '$lib/filters.json'
  import Modal from '$lib/components/Extra/Modal.svelte'
  import type IQueryFilter from '$lib/interfaces/IQueryFilter'
  import type ICategories from '$lib/interfaces/ICategories'
  import DataTableRendererCSR from '../../libs/RADar-DataTable/src/lib/components/DataTable/DataTableRendererCSR.svelte'
  import DataTableRendererJS from '../../libs/RADar-DataTable/src/lib/components/DataTable/DataTableRendererJS.svelte'
  import DragAndDrop from '../../libs/RADar-DataTable/src/lib/components/Extra/DragAndDrop.svelte'
  import '$lib/styles/table.scss'
  import Equivalence from '$lib/components/Mapping/Equivalence.svelte'
  import type IMapping from '$lib/interfaces/IMapping'
  import { onMount } from 'svelte'

  const show = writable<string>()
  const activatedFilters = writable<IQueryFilter[]>([])
  const categoriesFilter = writable<ICategories[]>([])
  const categoriesInput = writable<any>({})
  const originalFilterStore = writable<ICategories[]>(filtersJSON)
  const athenaData = writable<any>()
  const athenaColumns = writable<any>()
  const chosenRowMapping = writable<number>()

  let update = 0

  const updateTable = async () => {
    update = update + 1
  }

  const updatePopup = async (event: any, value: boolean = false) => {
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

  const showCategories = async (name: string) => {
    $show == name ? ($show = '') : ($show = name)
  }

  const filterCategories = async (event: any, filter: any) => {
    categoriesFilter.update((oldFilters): ICategories[] => {
      if (oldFilters.filter(f => f.name == filter).length > 0) {
        const chosenFilter = oldFilters.filter(f => f.name == filter)[0]
        const options = $originalFilterStore
          .filter(f => f.name == filter)[0]
          .options.filter(option => {
            if (option.toLowerCase().includes(event.target.value.toLowerCase())) return option
          })
        chosenFilter.options = options
        oldFilters.push(chosenFilter)
      } else {
        const options = $originalFilterStore
          .filter(f => f.name == filter)[0]
          .options.filter(option => {
            if (option.toLowerCase().includes(event.target.value.toLowerCase())) return option
          })
        const chosenFilter = {
          name: filter,
          options: options,
        }
        oldFilters.push(chosenFilter)
      }
      return oldFilters
    })
    $categoriesInput[filter]
  }

  const removeFilterCategorie = async (filter: any) => {
    categoriesFilter.update((oldFilters): any => {
      for (let f of oldFilters) {
        if (f.name == filter) {
          f.options = $originalFilterStore.filter(obj => obj.name == filter)[0].options
        }
      }
      return oldFilters
    })
    $categoriesInput[filter] = ''
  }

  const updateAPIFilters = async (event: Event, filter: string, option: string) => {
    let chosenFilter = $activatedFilters.filter(f => f.name.toLowerCase() == filter.toLowerCase())[0]
    if (chosenFilter != undefined) {
      // @ts-ignore
      if (event.target?.checked == true) chosenFilter.values.push(option)
      else {
        if (chosenFilter.values.length == 1) $activatedFilters.splice($activatedFilters.indexOf(chosenFilter), 1)
        else chosenFilter.values.splice(chosenFilter.values.indexOf(option), 1)
      }

      $activatedFilters.filter(f => f.name == option)[0] = chosenFilter
    } else {
      $activatedFilters.push({
        name: filter,
        values: [option],
      })
    }
    if (localStorage.getItem('AthenaFilters') == null || localStorage.getItem('AthenaFilters') == undefined) {
      let filters = []
      filters.push({
        name: filter,
        values: [option],
      })
      localStorage.setItem('AthenaFilters', JSON.stringify(filters))
    } else {
      let filters = JSON.parse(localStorage.getItem('AthenaFilters')!)
      let existingFilter = filters.filter((f: any) => f.name == filter)[0]
      if (existingFilter) {
        // @ts-ignore
        if (event.target.checked == false) {
          existingFilter.values.splice(existingFilter.values.indexOf(option), 1)
          if (existingFilter.values.length == 0) filters.splice(filters.indexOf(existingFilter), 1)
        } else {
          filters.splice(filters.indexOf(existingFilter), 1)
          existingFilter.values.push(option)
          filters.push(existingFilter)
        }
      } else {
        filters.push({
          name: filter,
          values: [option],
        })
      }
      localStorage.setItem('AthenaFilters', JSON.stringify(filters))
    }
    fetchAPI()
  }

  const fetchAPI = async () => {
    let URL = `https://athena.ohdsi.org/api/v1/concepts?pageSize=15`
    for (let filter of $activatedFilters) {
      let substring: string = ''
      for (let option of filter.values) {
        substring += `&${filter.name.toLowerCase()}=${option}`
      }
      URL += substring
    }
    URL += '&page=1&query='
    let res = await fetch(encodeURI(URL))
    let data = await res.json()
    transpileDataAPI(data.content)
  }

  const transpileDataAPI = async (data: any) => {
    let columns = []
    let filteredData = []
    for (let item of Object.keys(data[0])) {
      if (item == 'id') {
        columns.push({
          column: item,
          type: 1,
        })
      } else {
        columns.push({
          column: item,
          type: 0,
        })
      }
    }
    for (let item of data) {
      let row = []
      for (let col of Object.keys(item)) {
        row.push([col, item[col]])
      }
      filteredData.push(row)
    }
    $athenaData = filteredData
    $athenaColumns = columns
    updateTable()
  }

  const fetchOptionsCSV = {
    method: 'GET',
    header: {
      'Content-Type': 'text/csv;charset=UTF-8',
    },
  }

  const urlCSV =
    'https://raw.githubusercontent.com/RADar-AZDelta/AZDelta-OMOP-CDM/main/observation/observation_concept_id/mzg_usagi.csv'

  // const urlCSV =
  ;('https://raw.githubusercontent.com/RADar-AZDelta/AZDelta-OMOP-CDM/main/location/country_concept_id/countries.csv')

  const file = writable<File | null>(null)
  const delimiter: string = ','

  let equivalence: string = 'EQUAL'

  let mapping: IMapping

  const mapped = async (event: any) => {
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
    const row = Number(indexes[0])
    const rowValues = $athenaData[row]
    mapping = {
      row: $chosenRowMapping, //get the row that was clicked
      columns: $athenaColumns,
      data: rowValues,
      equivalence: equivalence,
    }
  }

  onMount(() => {
    const filters =
      localStorage.getItem('AthenaFilters') == null ? '' : JSON.parse(localStorage.getItem('AthenaFilters')!)
    for (let filter of filters) {
      $activatedFilters.push({
        name: filter.name,
        values: filter.values,
      })
    }
  })
</script>

<img src="/Keun.png" alt="The logo of POC-Keun" height="113" width="332" data-component="title-image" />

<DragAndDrop {file} fileExtension="csv" text={`DROP YOUR CSV FILE HERE`} />
{#if $file != null}
  <DataTableRendererCSR file={$file} dataType="csv" {delimiter} />
{/if}

<!-- <DataTableRendererCSR
  url={urlCSV}
  fetchOptions={fetchOptionsCSV}
  dataType="CSV"
  {delimiter}
  rowEvent={updatePopup}
  editable={true}
  {mapping}
/> -->

<Modal {updatePopup} show={$showPopup}>
  <div data-component="pop-up-container">
    <section data-component="filters-container">
      <h2>Filters</h2>
      <div data-component="filters">
        {#each $originalFilterStore as filter}
          <button
            on:click={() => showCategories(filter.name)}
            class={`${$show == filter.name ? 'border-radius-top' : null}`}
          >
            <p>{filter.name}</p>
            <img src="/chevron-down.svg" alt="Arrow down icon" />
          </button>
          {#if $show == filter.name}
            <div
              data-component="filter-item"
              class={`${
                $categoriesFilter.length > 0
                  ? $categoriesFilter.filter(f => f.name == filter.name).length == 0
                    ? null
                    : $categoriesFilter.filter(f => f.name == filter.name)[0].options.length > 7
                    ? 'scroll'
                    : filter.options.length > 7
                    ? 'scroll'
                    : null
                  : filter.options.length > 7
                  ? 'scroll'
                  : null
              }`}
            >
              <div data-component="filter-input">
                <input
                  type="text"
                  placeholder="filter"
                  data-component={filter.name}
                  bind:value={$categoriesInput[filter.name]}
                  on:change={event => {
                    filterCategories(event, filter.name)
                  }}
                />
                <button on:click={() => removeFilterCategorie(filter.name)}>
                  <img src="/x.svg" alt="Remove filter button" />
                </button>
              </div>
              {#if $categoriesFilter.length > 0 && $categoriesFilter.filter(f => f.name == filter.name).length > 0}
                {#each $categoriesFilter.filter(f => f.name == filter.name)[0].options as option}
                  <div data-component="filter-option">
                    <input
                      type="checkbox"
                      checked={localStorage.getItem('AthenaFilters') == null
                        ? false
                        : JSON.parse(String(localStorage.getItem('AthenaFilters'))).filter(
                            obj => obj.name == filter.name
                          ).length == 0
                        ? false
                        : JSON.parse(String(localStorage.getItem('AthenaFilters')))
                            .filter(obj => obj.name == filter.name)[0]
                            .values.includes(option)
                        ? true
                        : false}
                      on:change={() => (event != undefined ? updateAPIFilters(event, filter.name, option) : null)}
                    />
                    <p>{option}</p>
                  </div>
                {/each}
              {:else}
                {#each filter.options as option}
                  <div data-component="filter-option">
                    <input
                      type="checkbox"
                      checked={localStorage.getItem('AthenaFilters') == null
                        ? false
                        : JSON.parse(String(localStorage.getItem('AthenaFilters'))).filter(
                            obj => obj.name == filter.name
                          ).length == 0
                        ? false
                        : JSON.parse(String(localStorage.getItem('AthenaFilters')))
                            .filter(obj => obj.name == filter.name)[0]
                            .values.includes(option)
                        ? true
                        : false}
                      on:change={() => (event != undefined ? updateAPIFilters(event, filter.name, option) : null)}
                    />
                    <p>{option}</p>
                  </div>
                {/each}
              {/if}
            </div>
          {:else}
            <div />
          {/if}
        {/each}
      </div>
    </section>
    <section data-component="table-pop-up">
      <div data-component="table-head">
        <h2>Athena data</h2>
        <Equivalence bind:Eq={equivalence} />
      </div>
      <div data-component="table">
        {#if $athenaData != null && $athenaColumns != null}
          {#key update}
            <DataTableRendererJS data={$athenaData} columns={$athenaColumns} rowEvent={mapped} />
          {/key}
        {/if}
      </div>
    </section>
  </div>
</Modal>

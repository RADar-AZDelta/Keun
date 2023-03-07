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

  const show = writable<string>()
  const activatedFilters = writable<IQueryFilter[]>([])
  const categoriesFilter = writable<ICategories[]>([])
  const categoriesInput = writable<any>({})
  const originalFilterStore = writable<ICategories[]>(filtersJSON)
  const athenaData = writable<any>()
  const athenaColumns = writable<any>()

  let update = 0

  const updateTable = async () => {
    update = update + 1
  }

  const updatePopup = async (value: boolean) => {
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
        console.log(chosenFilter)
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
    console.log($categoriesFilter)
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
    // console.log("URL ", URL, "and data ", data.content)
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

  const file = writable<File | null>(null)
  const delimiter: string = ','

</script>

<h1>Keun</h1>

<!-- <DragAndDrop {file} fileExtension="csv" />
{#if $file != null}
  <DataTableRendererCSR file={$file} dataType="csv" {delimiter} />
{/if} -->

<DataTableRendererCSR url={urlCSV} fetchOptions={fetchOptionsCSV} dataType="CSV" {delimiter} rowEvent={updatePopup} />

<Modal {updatePopup} show={$showPopup}>
  <h1>Mapping data</h1>
  <div data-component="pop-up-container">
    <section data-component="filters-container">
      <h2>Filters</h2>
      <div data-component="filters">
        {#each $originalFilterStore as filter}
          <button on:click={() => showCategories(filter.name)}>
            <p>{filter.name}</p>
            <img src="/descending-sort.svg" alt="Arrow down icon" />
          </button>
          {#if $show == filter.name}
            <div
              data-component="filter-item"
              class={`${
                $categoriesFilter.length > 0
                  ? $categoriesFilter.filter(f => f.name == filter.name)[0].options.length > 7
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
              {#if $categoriesFilter.length > 0 && $categoriesFilter.filter(f => f.name == filter.name)[0].options.length > 0}
                {#each $categoriesFilter.filter(f => f.name == filter.name)[0].options as option}
                  <div data-component="filter-option">
                    <input
                      type="checkbox"
                      on:change={event => {
                        console.log(event)
                      }}
                    />
                    <p>{option}</p>
                  </div>
                {/each}
              {:else}
                {#each filter.options as option}
                  <div data-component="filter-option">
                    <input
                      type="checkbox"
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
      {#if $athenaData != null && $athenaColumns != null}
        <key update>
          <DataTableRendererJS data={$athenaData} columns={$athenaColumns} />
        </key>
      {/if}
    </section>
  </div>
</Modal>
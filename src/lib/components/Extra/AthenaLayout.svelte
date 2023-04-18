<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import Equivalence from '../Mapping/Equivalence.svelte'
  import AthenaFilter from './AthenaFilter.svelte'
  import filtersJSON from '$lib/filters.json'
  import { jsonMapReplacer, mapReviver } from '$lib/utils'
  import type { CustomOptionsEvents, ICategories } from '../Types'

  export let urlFilters: string[], equivalenceMapping: string, athenaFilteredColumn: string, filterColumns: string[]

  let JSONFilters = new Map<string, ICategories>([])
  let activatedAthenaFilters = new Map<string, string[]>()

  let openedFilter: string
  let savedFilters: Map<string, string[]>

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  for (let filter of filtersJSON) {
    JSONFilters.set(filter.name, { altName: filter.altName, options: filter.options })
  }

  const updateAPIFilters = async (event: Event, filter: string, option: string): Promise<void> => {
    let chosenFilter = activatedAthenaFilters.get(filter)
    const inputElement = event.target as HTMLInputElement
    const inputValue = inputElement.checked
    if (chosenFilter != undefined && inputValue == true) chosenFilter.push(option)
    else if (chosenFilter != undefined && inputValue == false) {
      if (chosenFilter.includes(option) == true) activatedAthenaFilters.delete(filter)
      else chosenFilter.splice(chosenFilter.indexOf(option), 1)
    } else {
      activatedAthenaFilters.set(filter, [option])
    }

    localStorage.setItem('AthenaFilters', JSON.stringify(activatedAthenaFilters, jsonMapReplacer))

    let URLFilters: string[] = []

    for (let [filter, options] of activatedAthenaFilters) {
      let substring: string = ''
      for (let option of options) {
        substring += `&${filter}=${option}`
      }
      URLFilters.push(substring)
    }

    urlFilters = URLFilters
    dispatch('filterOptionsChanged', { filter: filter, option: option })
  }

  const checkIfFilterExists = (filter: string, option: string): boolean => {
    if (localStorage.getItem('AthenaFilters') == null || localStorage.getItem('AthenaFilters') == 'undefined') {
      return false
    } else {
      let allFilters: Map<string, string[]> = JSON.parse(localStorage.getItem('AthenaFilters')!, mapReviver)
      const chosenFilter = allFilters.get(filter.toLowerCase())
      if (chosenFilter == undefined || chosenFilter.length == 0) {
        return false
      } else {
        if (chosenFilter.includes(option)) {
          return true
        } else {
          return false
        }
      }
    }
  }

  function changeFilteredColumnAthena(e: Event) {
    const inputElement = e.target as HTMLInputElement
    const inputValue = inputElement.value
    athenaFilteredColumn = inputValue
  }

  onMount(() => {
    savedFilters =
      localStorage.getItem('AthenaFilters') == null || localStorage.getItem('AthenaFilters') == 'undefined'
        ? new Map<string, string[]>()
        : JSON.parse(localStorage.getItem('AthenaFilters')!, mapReviver)
    activatedAthenaFilters = savedFilters
  })
</script>

<div data-component="pop-up-container">
  <section data-component="filters-container">
    <h2>Filters</h2>
    <div class="filters-buttons">
      <div data-component="filters">
        {#each [...JSONFilters] as [key, options]}
          <AthenaFilter filterName={key} filterOptions={options} bind:openedFilter allowInput={true}>
            <div slot="option" data-component="filter-option" let:option>
              <input
                type="checkbox"
                checked={checkIfFilterExists(key, option)}
                on:change={() =>
                  event != undefined
                    ? updateAPIFilters(event, options.altName != undefined ? options.altName : 'sourceName', option)
                    : null}
              />
              <p>{option}</p>
            </div>
          </AthenaFilter>
        {/each}
      </div>
    </div>
  </section>
  <section data-component="table-pop-up">
    <div data-component="table-head">
      <h2>Athena data</h2>
      <slot name="currentRow" />
      <div class="options">
        <Equivalence bind:Eq={equivalenceMapping} />
        <div class="columnFilter">
          <p>Filter on column:</p>
          <select class="columnSelect" name="columns" id="columns" on:change={changeFilteredColumnAthena}>
            {#each filterColumns as column}
              <option value={column}>{column}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>
    <div data-component="table">
      <slot name="table" {urlFilters} />
    </div>
    <slot name="extra" />
  </section>
</div>

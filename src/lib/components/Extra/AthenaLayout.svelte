<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import Equivalence from '../Mapping/Equivalence.svelte'
  import AthenaFilter from './AthenaFilter.svelte'
  import filtersJSON from '$lib/data/filters.json'
  import { localStorageGetter, localStorageSetter } from '$lib/utils'
  import type { CustomOptionsEvents, ICategories } from '../Types'
  import SvgIcon from './SvgIcon.svelte'
  import AthenaActivatedFilter from './AthenaActivatedFilter.svelte'
  import type DataTable from 'svelte-radar-datatable'
  import { query } from 'arquero'

  export let urlFilters: string[],
    equivalenceMapping: string,
    athenaFilteredColumn: string,
    filterColumns: string[],
    selectedRow: any,
    mainTable: DataTable

  let JSONFilters = new Map<string, ICategories>([])
  let activatedAthenaFilters = new Map<string, string[]>()
  let openedFilter: string
  let savedFilters: Map<string, string[]>

  let alreadyMapped: Record<string, any>[] = []

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

    localStorageSetter('AthenaFilters', activatedAthenaFilters, true)

    let URLFilters: string[] = []

    for (let [filter, options] of activatedAthenaFilters) {
      let substring: string = ''
      for (let option of options) {
        substring += `&${filter}=${option}`
      }
      URLFilters.push(substring)
    }

    urlFilters = URLFilters
    dispatch('filterOptionsChanged', { filters: activatedAthenaFilters })
  }

  const checkIfFilterExists = (filter: string, altName: string | undefined, option: string): boolean => {
    let allFilters: Map<string, string[]> = activatedAthenaFilters
    const chosenFilter =
      allFilters.get(filter) == undefined
        ? altName != undefined
          ? allFilters.get(altName)
          : undefined
        : allFilters.get(filter)

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

  function changeFilteredColumnAthena(e: Event) {
    const inputElement = e.target as HTMLInputElement
    const inputValue = inputElement.value
    athenaFilteredColumn = inputValue
  }

  function removeFilter(filter: string, option: string) {
    activatedAthenaFilters.get(filter)!.splice(activatedAthenaFilters.get(filter)!.indexOf(option), 1)
    localStorageSetter('AthenaFilters', activatedAthenaFilters, true)
    dispatch('filterOptionsChanged', { filters: activatedAthenaFilters })
  }

  onMount(async () => {
    const q = query()
      .params({ value: selectedRow[0] })
      .filter((d: any, params: any) => d.sourceCode == params.value)
      .toObject()
    const res = await mainTable.executeQueryAndReturnResults(q)
    for (let row of res.queriedData) {
      alreadyMapped.push(row)
    }
    savedFilters =
      localStorageGetter('AthenaFilters') !== null
        ? new Map<string, string[]>()
        : localStorageGetter('AthenaFilters', true)
    activatedAthenaFilters = savedFilters
    dispatch('filterOptionsChanged', { filters: activatedAthenaFilters })
  })
</script>

<div data-component="pop-up-container">
  <section data-component="filters-container">
    <h2>Filters</h2>
    <div class="filters-buttons">
      <div data-component="filters">
        {#each [...JSONFilters] as [key, options]}
          <AthenaFilter filter={{ name: key, categories: options }} bind:openedFilter allowInput={true}>
            <div slot="option" data-component="filter-option" let:option>
              <input
                type="checkbox"
                checked={checkIfFilterExists(key, options.altName, option)}
                on:change={() =>
                  event != undefined
                    ? updateAPIFilters(event, options.altName != undefined ? options.altName : 'sourceName', option)
                    : null}
              />
              <p>{option}</p>
            </div>
          </AthenaFilter>
        {/each}
        <AthenaActivatedFilter filters={activatedAthenaFilters} bind:openedFilter filterName="Activated filters">
          <div slot="option" data-component="filter-option" let:filter let:option>
            <p>{option}</p>
            <button on:click={() => removeFilter(filter, option)}
              ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
            >
          </div>
        </AthenaActivatedFilter>
      </div>
    </div>
  </section>
  <section data-component="table-pop-up">
    <div data-component="table-head">
      <div class="table-head-top-half">
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
      <div class="table-head-bottom-half">
        <table>
          <thead>
            <tr>
              <th>Id</th>
              <th>Name</th>
            </tr>
          </thead>
          <slot name="mappedRows" mapped={alreadyMapped} />
        </table>
      </div>
    </div>
    <div data-component="table">
      <slot name="table" {urlFilters} />
    </div>
    <slot name="extra" />
  </section>
</div>

<style>
  .table-head-top-half {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  .table-head-bottom-half {
    display: flex;
    width: 100%;
  }
</style>

<script lang="ts">
  import type ICategories from '$lib/interfaces/ICategories'
  import type IQueryFilter from '$lib/interfaces/IQueryFilter'
  import { writable, type Writable } from 'svelte/store'
  import Equivalence from '../Mapping/Equivalence.svelte'
  import { onMount } from 'svelte'
  import AthenaFilter from './AthenaFilter.svelte'

  export let filters: Array<ICategories>,
    urlFilters: Writable<string[]>,
    equivalenceMapping: Writable<string>,
    activatedAthenaFilters: Writable<IQueryFilter[]>,
    athenaFilteredColumn: Writable<string>,
    filterColumns: Array<string>

  const JSONFilters = writable<ICategories[]>(filters)
  let filterOpen = writable<string>()
  const optionsPerFilter = writable<ICategories[]>([])
  let filterInputField = writable<any>({})
  let activatedAthenaFiltersValues = writable<string[]>([])

  const showCategories = async (name: string): Promise<void> => {
    $filterOpen == name ? ($filterOpen = '') : ($filterOpen = name)
  }

  const filterCategories = async (
    event: Event & {
      currentTarget: EventTarget & HTMLInputElement
    },
    filter: string
  ): Promise<void> => {
    const inputElement = event.target as HTMLInputElement
    const inputValue = inputElement.value
    optionsPerFilter.update((existingFilters): ICategories[] => {
      if (existingFilters.filter(f => f.name == filter).length > 0) {
        // If filter already exists, update the old one
        const chosenFilter = existingFilters.filter(f => f.name == filter)[0]
        const options = $JSONFilters
          .filter(f => f.name == filter)[0]
          .options.filter(option => {
            if (option.toLowerCase().includes(inputValue.toLowerCase())) return option
          })
        chosenFilter.options = options
        existingFilters.push(chosenFilter)
      } else {
        // If the filter did not exists already create a new one
        const options = $JSONFilters
          .filter(f => f.name == filter)[0]
          .options.filter(option => {
            if (option.toLowerCase().includes(inputValue.toLowerCase())) return option
          })
        const chosenFilter = {
          name: filter,
          options: options,
        }
        existingFilters.push(chosenFilter)
      }
      return existingFilters
    })
  }

  const removeFilterCategorie = async (filter: string): Promise<void> => {
    // Restore all options and remove filter from input field
    optionsPerFilter.update((ExistingFilters): ICategories[] => {
      for (let f of ExistingFilters) {
        if (f.name == filter) {
          f.options = $JSONFilters.filter(obj => obj.name == filter)[0].options
        }
      }
      return ExistingFilters
    })
    $filterInputField[filter] = ''
  }

  const updateAPIFilters = async (event: Event, filter: string, option: string): Promise<void> => {
    let chosenFilter = $activatedAthenaFilters.filter(f => f.name.toLowerCase() == filter.toLowerCase())[0]
    const inputElement = event.target as HTMLInputElement
    const inputValue = inputElement.checked
    if (chosenFilter != undefined) {
      // If there is a filter in that categorie
      // If the filter was activated push it in the options
      // If the filter was deactivated remove it from the options
      if (inputValue == true) chosenFilter.values.push(option)
      else {
        if (chosenFilter.values.length == 1)
          $activatedAthenaFilters.splice($activatedAthenaFilters.indexOf(chosenFilter), 1)
        else chosenFilter.values.splice(chosenFilter.values.indexOf(option), 1)
      }

      $activatedAthenaFilters.filter(f => f.name == option)[0] = chosenFilter
    } else {
      // If there is no filter in that categorie
      $activatedAthenaFilters.push({
        name: filter,
        values: [option],
      })
    }

    if (localStorage.getItem('AthenaFilters') == null) {
      // If there are no filters yet in local storage --> push the new filter to local storage
      let filters = []
      filters.push({
        name: filter,
        values: [option],
      })
      localStorage.setItem('AthenaFilters', JSON.stringify(filters))
    } else {
      // If there are filters in local storage --> update them
      let filters: Array<IQueryFilter> = JSON.parse(localStorage.getItem('AthenaFilters')!)
      let existingFilter = filters.filter((f: IQueryFilter) => f.name == filter)[0]
      if (existingFilter) {
        if (inputValue == false) {
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

    for (let filter of $activatedAthenaFilters.map(obj => obj.values)) {
      for (let option of filter) {
        if (!$activatedAthenaFiltersValues.includes(option)) $activatedAthenaFiltersValues.push(option)
      }
    }

    let URLFilters: string[] = []

    // Add all filters of categories to URL
    for (let filter of $activatedAthenaFilters) {
      let substring: string = ''
      for (let option of filter.values) {
        substring += `&${filter.name}=${option}`
      }
      URLFilters.push(substring)
    }

    urlFilters.set(URLFilters)
  }

  const checkIfFilterExists = (filter: string, option: string): boolean => {
    if (localStorage.getItem('AthenaFilters') == null) {
      return false
    } else {
      const allFilters: Array<IQueryFilter> = JSON.parse(String(localStorage.getItem('AthenaFilters')))
      const chosenFilter = allFilters.filter((obj: IQueryFilter) => obj.name.toLowerCase() == filter.toLowerCase())
      if (chosenFilter.length == 0) {
        return false
      } else {
        const values = chosenFilter[0].values
        if (values.includes(option)) {
          return true
        } else {
          return false
        }
      }
    }
  }

  const removeFilter = (removingFilter: string) => {
    $activatedAthenaFiltersValues.splice($activatedAthenaFiltersValues.indexOf(removingFilter), 1)
    activatedAthenaFiltersValues.update(() => $activatedAthenaFiltersValues)
    for (let filter of $activatedAthenaFilters) {
      if (filter.values.includes(removingFilter)) {
        let updatedFilter = []
        const desiredFilterIndex = $activatedAthenaFilters.indexOf(
          $activatedAthenaFilters.filter((obj: IQueryFilter) => obj.name == filter.name)[0]
        )
        if (filter.values.length == 1) {
          $activatedAthenaFilters[desiredFilterIndex].values = []
        } else {
          updatedFilter = []
          for (let value of filter.values) {
            if (value != removingFilter) updatedFilter.push(value)
          }
          $activatedAthenaFilters[desiredFilterIndex].values = updatedFilter
        }
      }
    }
    activatedAthenaFilters.update(() => $activatedAthenaFilters)
    localStorage.setItem('AthenaFilters', JSON.stringify($activatedAthenaFilters))
    let URLFilters: string[] = []
    for (let filter of $activatedAthenaFilters) {
      let substring: string = ''
      for (let option of filter.values) {
        substring += `&${filter.name}=${option}`
      }
      URLFilters.push(substring)
    }

    urlFilters.set(URLFilters)
  }

  const checkForScroll = (filter: string): 'scroll' | null | undefined => {
    if ($optionsPerFilter.length > 0) {
      const currentOption = $optionsPerFilter.filter((obj: ICategories) => obj.name == filter)
      if (currentOption.length == 0) {
        return null
      } else {
        if (currentOption[0].options.length > 7) {
          return 'scroll'
        }
      }
    } else {
      return null
    }
  }

  const checkForScrollActivated = (): 'scroll' | null | undefined => {
    if ($activatedAthenaFiltersValues.length > 3) {
      return 'scroll'
    } else {
      return null
    }
  }

  onMount(() => {
    const filters =
      localStorage.getItem('AthenaFilters') == null ? '' : JSON.parse(localStorage.getItem('AthenaFilters')!)
    for (let filter of filters) {
      $activatedAthenaFilters.push({
        name: filter.name,
        values: filter.values,
      })
      $activatedAthenaFiltersValues.push(...filter.values)
    }
  })
</script>

<div data-component="pop-up-container">
  <section data-component="filters-container">
    <h2>Filters</h2>
    <div class="filters-buttons">
      <div data-component="filters">
        {#each $JSONFilters as filter}
          <AthenaFilter
            {filter}
            bind:filterOpen
            bind:filterInputField
            {showCategories}
            {checkForScroll}
            {filterCategories}
            {removeFilterCategorie}
          >
            <div slot="option" data-component="filter-option" let:option>
              <input
                type="checkbox"
                checked={checkIfFilterExists(filter.name, option)}
                on:change={() =>
                  event != undefined
                    ? updateAPIFilters(event, filter.altName != undefined ? filter.altName : filter.name, option)
                    : null}
              />
              <p>{option}</p>
            </div>
          </AthenaFilter>
        {/each}
        <AthenaFilter
          bind:filterOpen
          bind:filterInputField
          {showCategories}
          checkForScroll={checkForScrollActivated}
          bind:explicitOptions={activatedAthenaFiltersValues}
          explicitName="filtersActivated"
          filterInput={false}
        >
          <div slot="option" data-component="activated-filter" let:option>
            <p>{option}</p>
            <button on:click={() => removeFilter(option)}>
              <img src="/x.svg" alt="Remove filter button" />
            </button>
          </div>
        </AthenaFilter>
      </div>
    </div>
  </section>
  <section data-component="table-pop-up">
    <div data-component="table-head">
      <h2>Athena data</h2>
      <slot name="currentRow" />
      <div class="options">
        <Equivalence bind:Eq={$equivalenceMapping} />
        <div class="columnFilter">
          <p>Filter on column:</p>
          <select
            class="columnSelect"
            name="columns"
            id="columns"
            on:change={e => {
              // @ts-ignore
              athenaFilteredColumn.set(e.target.value)
            }}
          >
            {#each filterColumns as column}
              <option value={column}>{column}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>
    <div data-component="table">
      <slot name="table" />
    </div>
    <slot name="extra" />
  </section>
</div>

<style>
  .options {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .columnFilter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .columnSelect {
    padding: 0.5rem 1rem;
    border-radius: 5px;
  }
</style>

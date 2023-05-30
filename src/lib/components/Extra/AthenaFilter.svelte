<script lang="ts">
  import type { ICategories } from '../Types'
  import SvgIcon from './SvgIcon.svelte'

  export let filter: {
      name: string
      categories: ICategories
    },
    openedFilter: string,
    allowInput: boolean = true,
    color: string

  let filterInput: string
  let filteredFilterOptions: ICategories = filter.categories

  // A method for when the input (search for a filter) has changed
  function onChange(
    event: Event & {
      currentTarget: EventTarget & HTMLInputElement
    }
  ) {
    const inputElement = event.target as HTMLInputElement
    const inputValue = inputElement.value
    updateOptionsFromFilter(inputValue)
  }

  // A method to change the section that needs to be opened
  const showCategories = async (): Promise<void> => {
    if (openedFilter == filter.name) openedFilter = ''
    else openedFilter = filter.name
  }

  // A method to remove the criteria from the input field to search for a filter
  const removeInputFromFilter = async (): Promise<void> => {
    filterInput = ''
    filteredFilterOptions = filter.categories
  }

  // A method to update the filters with a certain criteria
  const updateOptionsFromFilter = async (input: string): Promise<void> => {
    const options = filter.categories.options.filter(op => op.toLowerCase().includes(input.toLowerCase()))
    filteredFilterOptions = { options: options }
  }
</script>

<div data-name="filter">
  <button title="Open filter {filter.name}" data-name="filter-button" on:click={showCategories}>
    <div data-name="filter-name">
      <span data-name="filter-color" style={`background-color: ${color};`} />
      {#if filter.name !== 'Vocab'}
        <p>{filter.name}</p>
      {:else}
        <p>{filter.categories.altName}</p>
      {/if}
    </div>
    <SvgIcon href="icons.svg" id="updown" width="16px" height="16px" />
  </button>
  {#if openedFilter == filter.name}
    <div data-name="filter-item">
      {#if allowInput == true}
        <div data-name="filter-input">
          <input
            type="text"
            title="Search for filter"
            placeholder="Filter"
            data-name={filter.name}
            bind:value={filterInput}
            on:change={onChange}
          />
          <button title="Remove input filter" on:click={removeInputFromFilter}>
            <SvgIcon href="icons.svg" id="x" height="16px" width="16px" />
          </button>
        </div>
      {/if}
      {#each filteredFilterOptions.options as option}
        <slot name="option" {option} />
      {/each}
    </div>
  {/if}
</div>

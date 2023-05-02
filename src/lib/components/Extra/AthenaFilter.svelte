<script lang="ts">
  import { checkForScroll } from '$lib/utils'
  import type { ICategories } from '../Types'
  import SvgIcon from './SvgIcon.svelte'

  export let filter: {
      name: string
      categories: ICategories
    },
    openedFilter: string,
    allowInput: boolean = true

  let filterInput: string
  let filteredFilterOptions: ICategories = filter.categories

  function onChange(
    event: Event & {
      currentTarget: EventTarget & HTMLInputElement
    }
  ) {
    const inputElement = event.target as HTMLInputElement
    const inputValue = inputElement.value
    updateOptionsFromFilter(inputValue)
  }

  const showCategories = async (): Promise<void> => {
    openedFilter == filter.name ? (openedFilter = '') : (openedFilter = filter.name)
  }

  const removeInputFromFilter = async (): Promise<void> => {
    filterInput = ''
    filteredFilterOptions = filter.categories
  }

  const updateOptionsFromFilter = async (input: string): Promise<void> => {
    const options = filter.categories.options.filter(op => op.toLowerCase().includes(input.toLowerCase()))
    filteredFilterOptions = { options: options }
  }
</script>

<div data-name="filter">
  <button
    data-component="filter-button"
    on:click={showCategories}
    class={`${openedFilter == filter.name ? 'border-radius-top' : null}`}
  >
    <p>{filter.name}</p>
    <SvgIcon href="icons.svg" id="updown" width="16px" height="16px" />
  </button>
  {#if openedFilter == filter.name}
    <div data-component="filter-item" class={checkForScroll(filter.categories.options, 3)}>
      {#if allowInput == true}
        <div data-component="filter-input">
          <input
            type="text"
            placeholder="Filter"
            data-component={filter.name}
            bind:value={filterInput}
            on:change={onChange}
          />
          <button on:click={removeInputFromFilter}>
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

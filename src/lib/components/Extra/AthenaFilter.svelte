<script lang="ts">
    import type { ICategories } from '../Types'
  import SvgIcon from './SvgIcon.svelte'

  export let filterName: string,
    filterOptions: ICategories,
    openedFilter: string,
    allowInput: boolean = true

  let filterInput: string
  let filteredFilterOptions: ICategories = filterOptions

  function onChange(
    event: Event & {
      currentTarget: EventTarget & HTMLInputElement
    }
  ) {
    const inputElement = event.target as HTMLInputElement
    const inputValue = inputElement.value
    updateOptionsFromFilter(inputValue)
  }

  const checkForScroll = (): 'scroll' | null | undefined => {
    if (filterOptions.options.length > 3) return 'scroll'
    else return null
  }

  const showCategories = async (): Promise<void> => {
    openedFilter == filterName ? (openedFilter = '') : (openedFilter = filterName)
  }

  const removeInputFromFilter = async (): Promise<void> => {
    filterInput = ''
    filteredFilterOptions = filterOptions
  }

  const updateOptionsFromFilter = async (input: string): Promise<void> => {
    const options = filterOptions.options.filter(op => op.toLowerCase().includes(input.toLowerCase()))
    filteredFilterOptions = { options: options }
  }
</script>

<button on:click={showCategories} class={`${openedFilter == filterName ? 'border-radius-top' : null}`}>
  <p>{filterName}</p>
  <SvgIcon href="icons.svg" id="updown" width="16px" height="16px" />
</button>
{#if openedFilter == filterName}
  <div data-component="filter-item" class={checkForScroll()}>
    {#if allowInput == true}
      <div data-component="filter-input">
        <input
          type="text"
          placeholder="filter"
          data-component={filterName}
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

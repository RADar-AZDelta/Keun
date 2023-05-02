<script lang="ts">
  import { checkForScroll } from '$lib/utils'
  import SvgIcon from './SvgIcon.svelte'

  export let filters: Map<string, string[]>, openedFilter: string, filterName: string

  const showCategories = async (): Promise<void> => {
    openedFilter == filterName ? (openedFilter = '') : (openedFilter = filterName)
  }
</script>

<div data-name="filter">
  <button
    data-component="filter-button"
    on:click={showCategories}
    class={`${openedFilter == filterName ? 'border-radius-top' : null}`}
  >
    <p>{filterName}</p>
    <SvgIcon href="icons.svg" id="updown" width="16px" height="16px" />
  </button>
  {#if openedFilter == filterName}
    <div data-component="filter-item" class={checkForScroll(Array.from(filters.values()), 3)}>
      {#each [...filters] as [filter, options]}
        {#each options as option}
          <slot name="option" {filter} {option} />
        {/each}
      {/each}
    </div>
  {/if}
</div>

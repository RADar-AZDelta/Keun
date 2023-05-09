<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'

  export let filters: Map<string, string[]>, openedFilter: string, filterName: string

  const showCategories = async (): Promise<void> => {
    openedFilter == filterName ? (openedFilter = '') : (openedFilter = filterName)
  }
</script>

<div data-name="activated-filter">
  <button data-name="filter-button" on:click={showCategories}>
    <p>{filterName}</p>
    <SvgIcon href="icons.svg" id="updown" width="16px" height="16px" />
  </button>
  {#if openedFilter == filterName}
    <div data-name="filter-item">
      {#each [...filters] as [filter, options]}
        {#each options as option}
          <slot name="option" {filter} {option} />
        {/each}
      {/each}
    </div>
  {/if}
</div>

<script lang="ts">
  import SvgIcon from './SvgIcon.svelte'
  import { debounce, range } from '$lib/helpers/utils'
  import type { IPaginationIntegratedProps } from '$lib/interfaces/Types'

  let { perPage = 5, currentPage = 1, perPageOptions = [5, 10, 15, 20], total, child }: IPaginationIntegratedProps = $props()

  let fromRow = $derived(total === 0 ? 0 : (currentPage - 1) * perPage + 1)
  let toRow = $derived(fromRow + perPage > total ? total : fromRow + perPage - 1)
  let totalPages = $derived(Math.ceil(total / perPage))
  let pages = $derived(calculatePages(currentPage, totalPages))

  function calculatePages(currentPage: number, totalPages: number): (number | null)[] {
    if (totalPages < 7) return range(1, totalPages, 1)
    if (currentPage < 5) return [1, 2, 3, 4, 5, null, totalPages]
    else if (currentPage > totalPages - 4) return [1, null, ...range(totalPages - 4, totalPages, 1)]
    else return [1, null, currentPage - 1, currentPage, currentPage + 1, null, totalPages]
  }

  function onChangeperPage(e: Event) {
    const value = parseInt((e!.target as HTMLSelectElement)!.value)
    currentPage = value
  }

  function onChangePage(newPage: number | null) {
    if (!newPage) return
    currentPage = newPage
  }

  const onChangeInputPage = debounce(e => onChangePage(e.target.value), 500)

  $effect(() => {
    if (currentPage > totalPages) onChangePage(1)
  })
</script>

{@render child(fromRow - 1, toRow)}

<div class="container">
  <div class="pagination-container">
    <p class="pagination-text">Rows:</p>
    <select class="pagination-select" bind:value={perPage} onchange={onChangeperPage}>
      {#each perPageOptions ?? [] as value}
        <option {value}>{value}</option>
      {/each}
    </select>
    <p>
      {fromRow}-{toRow} of {total}
    </p>
  </div>
  <div class="pagination-container-pages">
    <button disabled={!total || currentPage === 1} onclick={() => onChangePage(currentPage - 1)} id="Previous page {Math.random()}" aria-label="Previous page">
      <SvgIcon id="arrow-left" />
    </button>
    {#each pages as page, i}
      {#if page}
        <button data-active={currentPage === page} disabled={!page || currentPage === page} onclick={() => onChangePage(page)}>
          {page}
        </button>
      {:else if pages[0] && pages[2] && pages[2] - pages[0] > 2 && i == 1}
        <p>...</p>
      {:else}
        <input type="number" data-name="pagination-input" oninput={onChangeInputPage} />
      {/if}
    {/each}
    <button disabled={!total || currentPage === totalPages} onclick={() => onChangePage(currentPage + 1)} id="Next page {Math.random()}" aria-label="Next page">
      <SvgIcon id="arrow-right" />
    </button>
  </div>
</div>

<style>
  .container {
    display: flex;
    align-items: center;
  }

  .pagination-container {
    width: 100%;
    margin-left: 5px;
    display: flex;
    align-items: center;
  }

  .pagination-text {
    padding-right: 5px;
    padding-left: 5px;
  }

  .pagination-select {
    cursor: pointer;
    display: inline-block;
    font-size: 0.8rem;
    max-width: 100%;
    outline: 0;
    align-self: center;
    border-radius: 5px;
    border: solid 1px lightgray;
    margin: 0 0.2rem;
  }

  .pagination-container-pages {
    display: flex;
    align-items: center;
    margin-left: auto;
    text-align: right;
    float: right;
    height: 30px;
    margin-top: 5px;
    padding: 0;
  }

  button {
    border: none;
    border-radius: 5px;
    background-color: inherit;
  }

  button:not([data-active='true']):hover:enabled {
    background-color: #333;
    color: #fff;
    border: none;
  }

  button[data-active='true'] {
    color: #333;
    font-weight: bolder;
    padding-bottom: 2.8px;
  }

  p {
    margin: 0;
  }
</style>

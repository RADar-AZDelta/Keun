<script lang="ts">
  import type ICategories from '$lib/interfaces/ICategories'
  import type { Writable } from 'svelte/store'

  export let filterOpen: Writable<string>,
    filterInputField: Writable<any>,
    showCategories: any,
    checkForScroll: any,
    filterCategories: any | undefined = undefined,
    removeFilterCategorie: any | undefined = undefined,
    filterInput: boolean = true,
    filter: ICategories | undefined = undefined
  export let explicitOptions: Writable<string[]> | undefined = undefined,
    explicitName: string | undefined = undefined

  let allOptions = $explicitOptions != undefined ? $explicitOptions : filter!.options
  let name = explicitName != undefined ? explicitName : filter!.name
</script>

<button on:click={() => showCategories(name)} class={`${$filterOpen == name ? 'border-radius-top' : null}`}>
  <p>{name}</p>
  <img src="/chevron-down.svg" alt="Arrow down icon" />
</button>
{#if $filterOpen == name}
  <div data-component="filter-item" class={checkForScroll(name)}>
    {#if filterInput == true}
      <div data-component="filter-input">
        <input
          type="text"
          placeholder="filter"
          data-component={name}
          bind:value={$filterInputField[name]}
          on:change={event => {
            filterCategories(event, name)
          }}
        />
        <button on:click={() => removeFilterCategorie(name)}>
          <img src="/x.svg" alt="Remove filter button" />
        </button>
      </div>
    {/if}
    {#each allOptions as option}
      <slot name="option" {option} />
    {/each}
  </div>
{:else}
  <div />
{/if}

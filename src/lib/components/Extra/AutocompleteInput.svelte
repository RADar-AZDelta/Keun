<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import { clickOutside } from '$lib/actions/clickOutside'

  export let id: string, list: Record<string, any>

  let inputValue: string,
    value: string,
    filteredValues: Map<string, any> = new Map(),
    filters: number = 0

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  // A method for when the input needs to be saved
  function save() {
    value = inputValue
    dispatch('autoComplete', { id, value })
  }

  // A method to apply a suggestion to the input field
  function onClickAutoComplete(e: Event) {
    inputValue = (e.target as HTMLLIElement).id
    save()

    filter()
  }

  // A method to search for suggestions to apply to the input field
  function filter() {
    filteredValues = new Map<string, any>()
    filters = 0
    if (inputValue) {
      for (let key of Object.keys(list)) {
        if (
          key.toLowerCase().includes(inputValue.toLowerCase()) ||
          list[key].toLowerCase().includes(inputValue.toLowerCase())
        ) {
          if (key !== inputValue || list[key] !== inputValue) {
            filters += 1
            filteredValues.set(key, list[key])
          }
        }
      }
    }
  }

  $: {
    inputValue
    filter()
  }
</script>

<div data-name="autocomplete-input">
  <input title="Assigned Reviewer" type="text" bind:value={inputValue} use:clickOutside on:outClick={save} />
  {#if filters > 0}
    <ul>
      {#each [...filteredValues] as [key, value], i}
        {#if i < 7}
          <li id={key} on:click={onClickAutoComplete} on:keydown={onClickAutoComplete}>{value}</li>
        {/if}
      {/each}
    </ul>
  {/if}
</div>

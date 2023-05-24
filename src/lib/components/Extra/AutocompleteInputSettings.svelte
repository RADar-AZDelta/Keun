<script lang="ts">
  import { localStorageSetter } from '$lib/utils'
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import { clickOutside } from '$lib/actions/clickOutside'

  export let settings: Record<string, any>

  let inputValue: string,
    value: string,
    filteredValues: string[] = []

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  // A method for when the input needs to be saved
  function onSave() {
    value = inputValue
    if (!settings.savedAuthors) {
      settings.savedAuthors = []
    }
    if (!settings.savedAuthors.includes(inputValue)) {
      settings.savedAuthors.push(inputValue)
      saveSettings()
    }
    dispatch('reviewerChanged', { reviewer: value })
  }

  // A method to apply a suggestion to the input field
  function onClickAutoComplete(e: Event) {
    inputValue = (e.target as HTMLLIElement).id
    value = inputValue
    if (!settings.savedAuthors) {
      settings.savedAuthors = []
    }
    if (!settings.savedAuthors.includes(inputValue)) {
      settings.savedAuthors.push(inputValue)
      saveSettings()
    }
    filterNames()
    dispatch('reviewerChanged', { reviewer: value })
  }

  // A method to save the settings to the localstorage
  async function saveSettings() {
    localStorageSetter('settings', settings)
  }

  // A method to search for suggestions to apply to the input field
  function filterNames() {
    let filteredNames = []
    if (inputValue) {
      if (settings.savedAuthors) {
        for (let name of settings.savedAuthors) {
          if (name) {
            if (name.toLowerCase().startsWith(inputValue.toLowerCase())) {
              if (name.toLowerCase() != inputValue.toLowerCase()) filteredNames.push(name)
            }
          }
        }
      }
    }
    filteredValues = filteredNames
  }

  $: {
    inputValue
    filterNames()
  }
</script>

<div data-name="autocomplete-input">
  <input title="Assigned Reviewer" type="text" bind:value={inputValue} use:clickOutside on:outClick={onSave} />
  {#if filteredValues.length > 0}
    <ul>
      {#each filteredValues as name, i}
        {#if i < 7}
          <li id={name} on:click={onClickAutoComplete} on:keydown={onClickAutoComplete}>{name}</li>
        {/if}
      {/each}
    </ul>
  {/if}
</div>

<script lang="ts">
  import { localStorageSetter } from '$lib/utils'
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'

  export let settings: Record<string, any>

  let inputValue: string,
    value: string,
    filteredValues: string[] = []

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  function onClickSave() {
    value = inputValue
    if (!settings.savedAuthors.includes(inputValue)) {
      settings.savedAuthors.push(inputValue)
      saveSettings()
    }
    dispatch('reviewerChanged', { reviewer: value })
  }

  function onClickAutoComplete(e: Event) {
    inputValue = (e.target as HTMLLIElement).id
    value = inputValue
    if (!settings.savedAuthors.includes(inputValue)) {
      settings.savedAuthors.push(inputValue)
      saveSettings()
    }
    dispatch('reviewerChanged', { reviewer: value })
  }

  async function saveSettings() {
    localStorageSetter('settings', settings)
  }

  function onKeydownInput(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      onClickSave()
    }
  }

  function filterNames() {
    let filteredNames = []
    if (inputValue) {
      for (let name of settings.savedAuthors) {
        if (name.toLowerCase().startsWith(inputValue.toLowerCase())) {
          filteredNames.push(name)
        }
      }
    }
    filteredValues = filteredNames
  }
</script>

<div data-name="autocomplete-input">
  <input type="text" bind:value={inputValue} on:input={filterNames} on:keydown={onKeydownInput} />
  {#if filteredValues.length > 0}
    <ul>
      {#each filteredValues as name}
        <li id={name} on:click={onClickAutoComplete} on:keydown={onClickAutoComplete}>{name}</li>
      {/each}
    </ul>
  {/if}
  <button on:click={onClickSave}>Save</button>
</div>

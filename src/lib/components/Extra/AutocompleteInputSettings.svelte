<script lang="ts">
  import { localStorageSetter } from '$lib/utils'
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import debounce from 'lodash.debounce'
  import { settings } from '$lib/store'

  let inputValue: string,
    value: string,
    filteredValues: string[] = [],
    autoCompleted: boolean = false

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  // A method for when the input needs to be saved
  function save(): void {
    value = inputValue
    if (!$settings.savedAuthors) $settings.savedAuthors = []
    if (!$settings.savedAuthors.includes(inputValue)) {
      $settings.savedAuthors.push(inputValue)
      localStorageSetter('settings', $settings)
    }
    dispatch('reviewerChanged', { reviewer: value })
  }

  // A method to apply a suggestion to the input field
  function onClickAutoComplete(e: Event): void {
    inputValue = (e.target as HTMLLIElement).id
    save()
    filterNames()
    autoCompleted = true
  }

  // A method to search for suggestions to apply to the input field
  function filterNames(): void | string[] {
    let filteredNames: string[] = []
    if (!inputValue || !$settings.savedAuthors) return (filteredValues = filteredNames)
    filteredNames = [...filteredNames, ...$settings.savedAuthors.filter(name => name.toLowerCase().startsWith(inputValue.toLowerCase()) && name.toLowerCase() !== inputValue.toLowerCase())]
    filteredValues = filteredNames
  }

  // A method to save the input value to the settings and apply as assigned reviewer
  const onInput = debounce(async (e: any): Promise<void> => {
    autoCompleted = false
    save()
  }, 500)

  $: {
    inputValue
    filterNames()
  }
</script>

<div data-name="autocomplete-input">
  <input title="Assigned Reviewer" type="text" bind:value={inputValue} on:input={onInput} />
  {#if filteredValues.length > 0}
    <ul>
      {#each filteredValues as name, i}
        {#if i < 7 && !autoCompleted}
          <li id={name} on:click={onClickAutoComplete} on:keydown={onClickAutoComplete}>{name}</li>
        {/if}
      {/each}
    </ul>
  {/if}
</div>

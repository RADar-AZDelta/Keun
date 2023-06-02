<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import debounce from 'lodash.debounce'

  export let id: string, list: Record<string, any>

  let inputValue: string | null,
    value: any,
    key: string,
    filteredValues: Map<string, any> = new Map(),
    autoCompleted: boolean = false

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  // A method for when the input needs to be saved, don't show an error because the user can be typing and can get frustrated with the error
  function save(): void {
    value = inputValue
    // The input value must be chosen from the list of values suggested
    if (Object.values(list).includes(value)) dispatch('autoComplete', { id, value, key })
  }

  // A method to apply a suggestion to the input field
  function onClickAutoComplete(e: Event): void {
    const element = e.target as HTMLLIElement
    inputValue = element.textContent
    key = element.id
    save()
    autoCompleted = true
  }

  // A method to search for suggestions to apply to the input field
  function filter(): void {
    filteredValues = new Map<string, any>()
    if (inputValue) {
      for (let key of Object.keys(list)) {
        if (
          key.toLowerCase().includes(inputValue.toLowerCase()) ||
          list[key].toLowerCase().includes(inputValue.toLowerCase())
        ) {
          if (key !== inputValue || list[key] !== inputValue) filteredValues.set(key, list[key])
        }
      }
    }
  }

  const onInput = debounce(async (e: any): Promise<void> => {
    autoCompleted = false
    save()
  }, 1000)

  $: {
    inputValue
    filter()
  }
</script>

<div data-name="autocomplete-input">
  <input title="Assigned Reviewer" type="text" bind:value={inputValue} on:input={onInput} />
  {#if filteredValues.size > 0}
    <ul>
      {#each [...filteredValues] as [key, value], i}
        {#if i < 7 && !autoCompleted}
          <li id={key} on:click={onClickAutoComplete} on:keydown={onClickAutoComplete}>{value}</li>
        {/if}
      {/each}
    </ul>
  {/if}
</div>

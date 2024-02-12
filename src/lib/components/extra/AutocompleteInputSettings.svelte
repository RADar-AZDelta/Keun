<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { settings } from '$lib/store'
  import { localStorageSetter } from '@radar-azdelta/radar-utils'
  import debounce from 'lodash.debounce'
  import type { ICustomEvents } from '$lib/components/Types'

  let inputValue: string,
    value: string,
    filteredValues: string[] = [],
    autoCompleted: boolean = false

  const dispatch = createEventDispatcher<ICustomEvents>()

  // A method for when the input needs to be saved
  function save(): void {
    value = inputValue
    if (!$settings.savedAuthors) $settings.savedAuthors = []
    if (!$settings.savedAuthors.includes(inputValue)) {
      $settings.savedAuthors.push(inputValue)
      localStorageSetter('settings', $settings)
    }
    dispatch('autoCompleteShort', { value })
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
    filteredNames = [
      ...filteredNames,
      ...$settings.savedAuthors.filter(
        name =>
          name.toLowerCase().startsWith(inputValue.toLowerCase()) && name.toLowerCase() !== inputValue.toLowerCase(),
      ),
    ]
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

<div>
  <input title="Assigned Reviewer" type="text" bind:value={inputValue} on:input={onInput} />
  {#if filteredValues.length > 0}
    <ul>
      {#each filteredValues as name, i}
        {#if i < 7 && !autoCompleted}
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <li id={name} on:click={onClickAutoComplete} on:keydown={onClickAutoComplete}>{name}</li>
        {/if}
      {/each}
    </ul>
  {/if}
</div>

<style>
  input {
    border: 1px solid #e2e2e2;
    font-size: 1rem;
    padding: 0.5rem 1rem;
    width: 90%;
  }

  input:hover {
    border: 1px solid #bbbbbb;
  }

  input:focus {
    outline: none;
    box-shadow: 0 0 0 2px #c5c5c5;
  }

  ul {
    list-style-type: none;
    padding: 0.5rem 0 2rem 0;
    margin: 0;
    position: absolute;
  }

  li {
    border-top: 1px solid #cecece;
    border-left: 1px solid #cecece;
    border-right: 1px solid #cecece;
    padding: 0.5rem 1rem;
    background-color: white;
    cursor: pointer;
  }

  li:last-child {
    border: 1px solid #cecece;
  }

  li:hover {
    background-color: #d8d8d8;
  }

  li:focus {
    outline: none;
    box-shadow: 0 0 0 2px #c5c5c5;
  }
</style>

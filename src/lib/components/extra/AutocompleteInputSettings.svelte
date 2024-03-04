<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { settings, settingsImpl } from '$lib/store'
  import debounce from 'lodash.debounce'
  import type { ICustomEvents } from '$lib/components/Types'
  import { loadImpSettings } from '$lib/implementations/implementation'

  let inputValue: string, value: string
  let filteredValues: string[] = []
  let autoCompleted: boolean = false

  const dispatch = createEventDispatcher<ICustomEvents>()

  async function updateSettings() {
    if (!$settingsImpl) await loadImpSettings()
    $settingsImpl?.updateSettings($settings)
  }

  function save(): void {
    value = inputValue
    if (!$settings.savedAuthors) $settings.savedAuthors = []
    if (!$settings.savedAuthors.includes(inputValue)) {
      $settings.savedAuthors.push(inputValue)
      updateSettings()
    }
    dispatch('autoCompleteShort', { value })
  }

  function onClickAutoComplete(e: Event): void {
    inputValue = (e.target as HTMLLIElement).id
    save()
    filterNames()
    autoCompleted = true
  }

  function filterNames(): void | string[] {
    let filteredNames: string[] = []
    if (!inputValue || !$settings.savedAuthors) return (filteredValues = filteredNames)
    const filteredAuthors = $settings.savedAuthors.filter(filterForAuthors)
    filteredNames = [...filteredNames, ...filteredAuthors]
    filteredValues = filteredNames
  }

  function filterForAuthors(name: string) {
    const lName = name.toLowerCase()
    const lInput = inputValue.toLowerCase()
    const notEqual = lName !== lInput
    const including = lName.startsWith(lInput)
    if (notEqual && including) return name
  }

  const onInput = debounce(async (e: any) => {
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
  {#if filteredValues.length}
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

<script lang="ts">
  import Settings from '$lib/helpers/Settings'
  import { createSettings } from '$lib/stores/runes.svelte'
  import { debounce } from '$lib/helpers/utils'
  import type { IAutoCompleteSettingsProps } from '$lib/interfaces/Types'

  let { autoComplete }: IAutoCompleteSettingsProps = $props()

  let settings = createSettings()
  let inputValue: string = $state('')
  let value: string = $state('')
  let filteredValues: string[] = $state([])
  let autoCompleted: boolean = $state(false)

  const updateSettings = async () => await Settings.updateSettings(settings.value)

  function save(): void {
    value = inputValue
    if (!settings.value.savedAuthors) settings.updateProp('savedAuthors', [])
    if (!settings.value.savedAuthors.includes(inputValue)) {
      settings.updateProp('savedAuthors', [...settings.value.savedAuthors, inputValue])
      updateSettings()
    }
    autoComplete(value)
  }

  function onClickAutoComplete(e: Event): void {
    inputValue = (e.target as HTMLLIElement).id
    save()
    filterNames(inputValue)
    autoCompleted = true
  }

  function filterNames(inputValue: string): void | string[] {
    let filteredNames: string[] = []
    if (!inputValue || !settings.value.savedAuthors) return (filteredValues = filteredNames)
    const filteredAuthors = settings.value.savedAuthors.filter(filterForAuthors)
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

  $effect(() => {
    filterNames(inputValue)
  })
</script>

<div>
  <input title="Assigned Reviewer" type="text" bind:value={inputValue} oninput={onInput} />
  {#if filteredValues.length}
    <ul>
      {#each filteredValues as name, i}
        {#if i < 7 && !autoCompleted}
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <li id={name} onclick={onClickAutoComplete} onkeydown={onClickAutoComplete}>{name}</li>
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

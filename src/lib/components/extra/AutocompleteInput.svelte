<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import debounce from 'lodash.debounce'
  import clickOutside from '$lib/obsolete/clickOutside'
  import type { ICustomEvents } from '$lib/components/Types'

  export let id: string,
    list: Record<string, any>,
    initial: string | undefined = undefined

  let inputValue: string | null,
    value: string,
    key: string,
    filteredValues: Map<string, any> = new Map(),
    autoCompleted: boolean = false,
    focus: boolean = false,
    suggestionsFocus: boolean = false

  if (initial) inputValue = initial
  const dispatch = createEventDispatcher<ICustomEvents>()

  // A method for when the input needs to be saved, don't show an error because the user can be typing and can get frustrated with the error
  function save(): void {
    if (!inputValue) return
    value = list[inputValue] ? list[inputValue] : inputValue
    // The input value must be chosen from the list of values suggested
    if (Object.keys(list).includes(value) || Object.values(list).includes(value))
      dispatch('autoComplete', { id, value, key })
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
    if (!inputValue) return
    const pairs = Object.entries(list).filter(
      ([key, value]) =>
        (key.toLowerCase().includes(inputValue!.toLowerCase()) ||
          value.toLowerCase().includes(inputValue!.toLowerCase())) &&
        key.toLowerCase() !== inputValue?.toLowerCase() &&
        value.toLowerCase() !== inputValue?.toLowerCase(),
    )
    if (!pairs.length) return
    for (let [key, value] of pairs) filteredValues.set(key, value)
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

<div class="input-container">
  <input
    title={id}
    type="text"
    bind:value={inputValue}
    on:input={onInput}
    on:focus={() => {
      focus = true
      suggestionsFocus = true
    }}
    on:focusout={() => {
      focus = false
    }}
  />
  {#if filteredValues.size > 0 && (focus || suggestionsFocus)}
    <ul use:clickOutside on:outClick={() => (suggestionsFocus = false)}>
      {#each [...filteredValues] as [key, value], i}
        {#if i < 7 && !autoCompleted}
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <li id={key} on:click={onClickAutoComplete} on:keydown={onClickAutoComplete}>{key}</li>
        {/if}
      {/each}
    </ul>
  {/if}
</div>

<style>
  .input-container {
    position: relative;
  }

  input {
    min-width: 140px;
    width: 140px;
    padding: 0;
    border: 1px solid #d8d8d8;
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
    background-color: #e2e2e2;
  }

  li:focus {
    outline: none;
    box-shadow: 0 0 0 2px #c5c5c5;
  }
</style>

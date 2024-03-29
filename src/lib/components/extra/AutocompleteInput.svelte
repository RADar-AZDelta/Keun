<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import debounce from 'lodash.debounce'
  import clickOutside from '$lib/actions/clickOutside'
  import type { ICustomEvents } from '$lib/Types'

  export let id: string, list: string[]
  export let inputValue: string | null = null

  let value: string, key: string

  let filteredValues: string[] = []
  let autoCompleted: boolean = false
  let focus: boolean = false
  let suggestionsFocus: boolean = false

  const dispatch = createEventDispatcher<ICustomEvents>()

  function save(): void {
    if (!inputValue) return
    value = inputValue
    if (!list.includes(value)) return
    dispatch('autoComplete', { id, value, key })
  }

  function onClickAutoComplete(e: Event): void {
    const element = e.target as HTMLLIElement
    ;({ textContent: inputValue, id: key } = element)
    save()
    autoCompleted = true
  }

  // A method to search for suggestions to apply to the input field
  function filter(): void {
    filteredValues = []
    if (!inputValue) return
    const pairs = list.filter(findPossibleSuggestions)
    for (let value of pairs) filteredValues.push(value)
  }

  function findPossibleSuggestions(value: string) {
    if (!inputValue) return
    const lValue = value.toLowerCase()
    const lInput = inputValue?.toLowerCase()
    const notEqual = lValue !== lInput
    const including = lValue.includes(lInput)
    if (notEqual && including) return value
  }

  const onInput = debounce(async (e: any) => {
    autoCompleted = false
    save()
  }, 1000)

  const focussing = () => (focus = suggestionsFocus = true)
  const nonFocussing = () => (focus = false)
  const outClick = () => (suggestionsFocus = false)

  $: {
    inputValue
    filter()
  }
</script>

<div class="input-container">
  <input title={id} bind:value={inputValue} on:input={onInput} on:focus={focussing} on:focusout={nonFocussing} />
  {#if filteredValues.length && (focus || suggestionsFocus)}
    <ul use:clickOutside on:outClick={outClick}>
      {#each filteredValues as suggestion, i}
        {#if i < 7 && !autoCompleted}
          <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
          <li id={suggestion} on:click={onClickAutoComplete} on:keydown={onClickAutoComplete}>{suggestion}</li>
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

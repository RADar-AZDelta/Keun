<script lang="ts">
  import { debounce } from '$lib/helpers/utils'
  import type { IAutocompleteProps } from '$lib/interfaces/Types'

  let { id, list, update }: IAutocompleteProps = $props()

  let input = $state<string>()
  let suggestions = $state<string[]>([])

  function autoComplete(e: Event) {
    const element = e.target as HTMLLIElement
    if (!element.textContent) return
    input = element.textContent.toString()
    update(id, input)
    suggestions = []
  }

  const setSuggestions = debounce((input: string) => {
    suggestions.splice(0, suggestions.length)
    if (!input) return
    const newSuggestions = list.filter(item => item.toLowerCase().includes(input.toLowerCase()) && item.toLowerCase() !== input.toLowerCase())
    suggestions = [...newSuggestions]
  }, 300)

  async function updateInput(e: Event) {
    input = (e.target as any).value
    if (!input) return
    setSuggestions(input)
    update(id, input)
  }
</script>

<div class="input-container">
  <input title={id} oninput={updateInput} bind:value={input} />
  <ul class="list-container">
    {#each suggestions as suggestion, _}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <li id={suggestion} onclick={autoComplete} onkeydown={autoComplete}>{suggestion}</li>
    {/each}
  </ul>
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

  /* .list-container {
      height: 100px;
      width: 200px;
      border: 1px solid black;
      z-index: 100;
      background-color: white;
    } */
</style>

<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { MappingEvents } from '$lib/Types'
  import { Config } from '$lib/helperClasses/Config'

  const dispatch = createEventDispatcher<MappingEvents>()

  const equivalenceChange = (e: Event) => dispatch('equivalenceChange', { equivalence: (<any>e.target).value })
</script>

<div class="equivalence">
  <select title="Equivalence" name="equivalence" id="equivalence" on:change={equivalenceChange}>
    {#each Config.equivalenceOptions as option, _}
      <option value={option}>{option}</option>
    {/each}
  </select>
</div>

<style>
  .equivalence {
    margin-bottom: 1rem;
  }

  select {
    border-radius: 5px;
    border: 1px solid #cecece;
    padding: 0.5rem 1rem;
  }

  select:hover {
    border: 1px solid #bbbbbb;
  }

  select:focus {
    outline: none;
    box-shadow: 0 0 0 2px #c5c5c5;
  }
</style>

<script lang="ts">
  import Config from '$lib/helpers/Config'
  import type { IEquivalenceProps } from '$lib/interfaces/Types'

  let { equivalenceUpdate }: IEquivalenceProps = $props()
  const change = (e: any) => {
    const value = e.target.value
    equivalenceUpdate(value)
  }
</script>

<div class="equivalence">
  <select title="Equivalence" name="equivalence" id="equivalence" onchange={change}>
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

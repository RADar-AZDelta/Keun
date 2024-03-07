<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { Dialog } from '@radar-azdelta-int/radar-svelte-components'
  import type { ICustomEvents } from '$lib/Types'

  export let dialog: HTMLDialogElement, columns: string[], shownColumns: string[]

  const dispatch = createEventDispatcher<ICustomEvents>()

  function showColumns(e: Event, column: string) {
    const show = (<any>e.target).checked
    const columnAlreadyShown = shownColumns.includes(column)
    if (show && !columnAlreadyShown) shownColumns.push(column)
    else shownColumns = shownColumns.filter(col => col !== column)
    dispatch('showColumns', { columns: shownColumns })
  }
</script>

<Dialog bind:dialog width="40%" height="40%" title="Show/hide columns">
  <div class="container">
    {#each columns as column}
      {@const checked = shownColumns.includes(column)}
      <div class="column">
        <input type="checkbox" name="columns" id={column} {checked} on:change={e => showColumns(e, column)} />
        <label for={column}>{column}</label>
      </div>
    {/each}
  </div>
</Dialog>

<style>
  .container {
    padding: 1rem;
  }

  .column {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
</style>

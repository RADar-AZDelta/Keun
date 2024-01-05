<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import Dialog from '$lib/obsolete/Dialog.svelte'
  import type { ICustomEvents } from '$lib/components/Types'

  export let dialog: HTMLDialogElement, columns: string[], shownColumns: string[]

  const dispatch = createEventDispatcher<ICustomEvents>()

  function showColumns(e: Event, column: string) {
    const show = (<any>e.target).checked
    if (show && !shownColumns.includes(column)) shownColumns.push(column)
    else shownColumns = shownColumns.filter(col => col !== column)
    dispatch('showColumns', { columns: shownColumns })
  }
</script>

<Dialog bind:dialog width="40%" height="40%" title="Show/hide columns">
  <div class="container">
    {#each columns as column}
      <div class="column">
        <input
          type="checkbox"
          name="columns"
          id={column}
          checked={shownColumns.includes(column)}
          on:change={e => showColumns(e, column)}
        />
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

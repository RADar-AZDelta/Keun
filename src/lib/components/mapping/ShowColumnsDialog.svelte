<script lang="ts">
  import Dialog from '$lib/components/extra/Dialog.svelte'
  import type { IShowColumnsDialogProps } from '$lib/interfaces/Types'

  let { dialog = $bindable(), columns, shownColumns, showColumns }: IShowColumnsDialogProps = $props()

  function show(e: any, column: string) {
    const show = e.target.checked
    const columnAlreadyShown = shownColumns.includes(column)
    if (show && !columnAlreadyShown) shownColumns.push(column)
    else shownColumns = shownColumns.filter(col => col !== column)
    showColumns(shownColumns)
  }
</script>

<Dialog bind:dialog width="40%" height="40%" title="Show/hide columns">
  <div class="container">
    {#each columns as column}
      {@const checked = shownColumns.includes(column)}
      <div class="column">
        <input type="checkbox" name="columns" id={column} {checked} onchange={e => show(e, column)} />
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

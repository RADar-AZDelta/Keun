<script lang="ts">
  import type { Writable } from 'svelte/store'
  import type IColumnName from '../../../../lib/RADar-DataTable/src/lib/interfaces/IColumnName'
  import type IPaginated from '../../../../lib/RADar-DataTable/src/lib/interfaces/IPaginated'

  export let name: string,
    updateColumns: Array<IColumnName>,
    worker: Worker | undefined,
    selectedRow: Writable<number>,
    pagination: IPaginated,
    row: number | undefined = undefined

  const loadWorker = async (e: Event) => {
    if (e && e.stopPropagation) e.stopPropagation()
    if (worker != undefined) {
      let currentRow = 0
      if (row != undefined) currentRow = row
      else currentRow = $selectedRow
      const action = {
        row: currentRow,
        expectedColumns: updateColumns,
      }
      worker.postMessage({
        action: action,
        pagination: pagination,
      })
    } else {
      console.warn('Provide a worker to use actions')
    }
  }
</script>

<button class="button is-small" on:click={loadWorker}>{name}</button>

<style>
  .button {
    border: 0;
    height: 100%;
    background-color: inherit;
    padding-left: 2px;
    padding-right: 2px;
  }
</style>

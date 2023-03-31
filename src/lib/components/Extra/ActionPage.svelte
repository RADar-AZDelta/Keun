<script lang="ts">
  import type IColumnName from '../../../../lib/RADar-DataTable/src/lib/interfaces/IColumnName'

  export let name: string,
    firstRow: number,
    lastRow: number,
    updateColumns: Array<IColumnName>,
    worker: Worker | undefined

  const loadWorker = async () => {
    if (worker != undefined) {
      const action = {
        startRow: firstRow,
        endRow: lastRow,
        expectedColumns: updateColumns,
      }
      worker.postMessage({
        actionPage: action,
      })
    } else {
      console.warn('Provide a worker to use actions')
    }
  }
</script>

<button class="button is-small" data-component="button-approve" on:click={loadWorker}>{name}</button>

<style>
</style>

<script lang="ts">
  import type IColumnName from '../../../../lib/RADar-DataTable/src/lib/interfaces/IColumnName'
  import type IPaginated from '../../../../lib/RADar-DataTable/src/lib/interfaces/IPaginated'

  export let name: string,
    pagination: IPaginated,
    firstRow: number,
    lastRow: number,
    updateColumns: Array<IColumnName>,
    worker: Worker | undefined

  const loadWorker = async () => {
    if (worker != undefined) {
      // TODO: We can't give a column like ADD_INFO:author1 here because in some rows it can be ADD_INFO:author1 and in others it can be ADD_INFO:author2 --> we need to look per row and this can be done in the worker 
      const action = {
        startRow: firstRow,
        endRow: lastRow,
        expectedColumns: updateColumns
      }
      worker.postMessage({
        actionPage: action,
        pagination: pagination
      })
    } else {
      console.warn('Provide a worker to use actions')
    }
  }
</script>

<button class="button is-small" data-component="button-approve" on:click={loadWorker}>{name}</button>

<style>
</style>

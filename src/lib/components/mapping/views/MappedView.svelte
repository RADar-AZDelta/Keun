<script lang="ts">
  import DataTable, { type ITableOptions } from '@radar-azdelta/svelte-datatable'
  import { mappedToConceptIds } from '$lib/store'
  import MappedRow from './MappedRow.svelte'
  import Table from '$lib/classes/tables/Table'
  import { Config } from '$lib/helperClasses/Config'
  import type { IMappedRow, IUsagiRow } from '$lib/Types'

  export let selectedRow: IUsagiRow

  let mappedData: (IMappedRow | object)[] = [{}]
  let options: ITableOptions = { actionColumn: true, id: 'mappedConcepts' }

  async function loadMappedConcepts() {
    if (!selectedRow.sourceCode) return
    mappedData = await Table.getAllMappedConcepts(selectedRow.sourceCode)
  }

  $: {
    $mappedToConceptIds, selectedRow
    loadMappedConcepts()
  }
</script>

<div class="table">
  <DataTable data={mappedData} columns={Config.columnsMapped} {options}>
    <MappedRow slot="default" let:renderedRow {renderedRow} usagiRow={selectedRow} />
  </DataTable>
</div>

<style>
  .table {
    padding: 0 1rem;
    flex: 1 1 auto;
    overflow: auto;
  }
</style>

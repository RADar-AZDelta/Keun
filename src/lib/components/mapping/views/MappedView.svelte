<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import DataTable, { type ITableOptions } from '@radar-azdelta/svelte-datatable'
  import type { IMappedRow, IUsagiRow, MappingEvents } from '$lib/components/Types'
  import { Config } from '$lib/helperClasses/Config'
  import MappedRow from './MappedRow.svelte'

  export let mappedData: (IMappedRow | object)[]
  export let selectedRow: IUsagiRow

  const dispatch = createEventDispatcher<MappingEvents>()

  let options: ITableOptions = { actionColumn: true, id: 'mappedConcepts' }

  async function removeMapping(row: IMappedRow) {
    if (!row.conceptName) return
    dispatch('removeMapping', { conceptId: row.conceptId, conceptName: row.conceptName })
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

<script lang="ts">
  import DataTable, { type ITableOptions } from '@radar-azdelta/svelte-datatable'
  import MappedRow from '$lib/components/mapping/views/MappedRow.svelte'
  import Table from '$lib/helpers/tables/Table'
  import Config from '$lib/helpers/Config'
  import { createMappedToConceptIds } from '$lib/stores/runes.svelte'
  import type { IMappedViewProps, IMappedRow } from '$lib/interfaces/Types'

  let { selectedRow }: IMappedViewProps = $props()

  let mappedToConceptIds = createMappedToConceptIds()
  let mappedData: (IMappedRow | object)[] = $state([{}])
  let options: ITableOptions = { actionColumn: true, id: 'mappedConcepts' }

  async function loadMappedConcepts() {
    if (!selectedRow.sourceCode) return
    const res = await Table.getAllMappedConcepts(selectedRow.sourceCode)
    // TODO: check to optimize this
    await pushRows(res)
  }

  async function pushRows(rows: (object | IMappedRow)[]) {
    mappedData.splice(0, mappedData.length)
    for (let row of rows) mappedData.push(row)
  }

  $effect(() => {
    mappedToConceptIds.value
    selectedRow
    loadMappedConcepts()
  })
</script>

<div class="table">
  <DataTable data={mappedData} columns={Config.columnsMapped} {options}>
    {#snippet rowChild(renderedRow: any)}
      <MappedRow {renderedRow} usagiRow={selectedRow} />
    {/snippet}
  </DataTable>
</div>

<style>
  .table {
    padding: 0 1rem;
    flex: 1 1 auto;
    overflow: auto;
  }
</style>

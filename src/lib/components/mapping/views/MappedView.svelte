<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import DataTable, { type ITableOptions } from '@radar-azdelta/svelte-datatable'
  import columns from '$lib/data/columnsMapped.json'
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'
  import type { IMappedRow, MappingEvents } from '$lib/components/Types'

  export let mappedData: (IMappedRow | object)[]

  const dispatch = createEventDispatcher<MappingEvents>()

  let options: ITableOptions = { actionColumn: true, id: 'mappedConcepts' }

  async function removeMapping(row: IMappedRow) {
    if (!row.conceptName) return
    dispatch('removeMapping', { conceptId: row.conceptId, conceptName: row.conceptName })
  }
</script>

<div class="table">
  <DataTable data={mappedData} {columns} {options} let:renderedRow>
    <td>
      {#if renderedRow.conceptName}
        <button on:click={() => removeMapping(renderedRow)}><SvgIcon id="x" /></button>
      {/if}
    </td>
    {#each columns as column}
      <td>
        <p>{renderedRow[column.id]}</p>
      </td>
    {/each}
  </DataTable>
</div>

<style>
  .table {
    padding: 0 1rem;
    flex: 1 1 auto;
    overflow: auto;
  }
</style>

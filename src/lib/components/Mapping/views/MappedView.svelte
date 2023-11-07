<script lang="ts">
  import DataTable, { type ITableOptions } from '@radar-azdelta/svelte-datatable'
  import columns from '$lib/data/columnsAlreadyMapped.json'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../../Types'

  export let mappedData: Record<string, any>[]

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  let options: ITableOptions = { actionColumn: true, id: 'mappedConcepts' }

  async function removeMapping(row: Record<string, string>) {
    if (!row.conceptId || !row.conceptName) return
    dispatch('removeMapping', { conceptId: row.conceptId, conceptName: row.conceptName })
  }
</script>

<div data-name="alreadymapped-table">
  <DataTable data={mappedData} {columns} {options} let:renderedRow>
    <td>
      {#if renderedRow.conceptId && renderedRow.conceptName}
        <button on:click={() => removeMapping(renderedRow)}><SvgIcon href="/icons.svg" id="x" /></button>
      {/if}
    </td>
    {#each Object.keys(renderedRow) as key}
      <td>
        <p>{renderedRow[key]}</p>
      </td>
    {/each}
  </DataTable>
</div>

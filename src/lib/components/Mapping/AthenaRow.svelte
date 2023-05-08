<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import type DataTable from 'svelte-radar-datatable'
  import type { IColumnMetaData } from 'svelte-radar-datatable'

  export let renderedRow: Record<string, any>,
    columns: IColumnMetaData[],
    settings: Record<string, any>,
    mainTable: DataTable,
    selectedRowIndex: number,
    uniqueConceptIds: string[] = []

  let alreadyMapped: boolean = false
  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  let multipleConcepts = settings.mapToMultipleConcepts

  async function onClickMapping() {
    let originalRow = await mainTable.getFullRow(selectedRowIndex)
    if (multipleConcepts == true) dispatch('multipleMapping', { originalRow, row: renderedRow })
    else dispatch('singleMapping', { originalRow, row: renderedRow })

    multipleConcepts == true ? (alreadyMapped = true) : null
  }

  $: {
    uniqueConceptIds.includes(renderedRow.id) ? (alreadyMapped = true) : (alreadyMapped = false)
  }
</script>

<td class="actions">
  {#if alreadyMapped == true}
    <button class="apply"><SvgIcon href="icons.svg" id="check" width="16px" height="16px" /></button>
  {:else}
    <button on:click={onClickMapping}><SvgIcon href="icons.svg" id="map" width="16px" height="16px" /></button>
  {/if}
</td>
{#each columns || [] as column (column.id)}
  <td>
    <div class="field has-addons" data-component="cell-container">
      <p>{renderedRow[column.id]}</p>
    </div>
  </td>
{/each}

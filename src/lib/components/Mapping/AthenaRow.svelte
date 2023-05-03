<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import type DataTable from 'svelte-radar-datatable'
  import type { IColumnMetaData } from 'svelte-radar-datatable'

  export let renderedRow: any[],
    columns: IColumnMetaData[],
    settings: Map<string, boolean | string | number>,
    mainTable: DataTable,
    mainTableColumns: IColumnMetaData[],
    selectedRowIndex: number,
    uniqueConceptIds: string[]

  let alreadyMapped: boolean = false
  let originalRow: Record<string, any>
  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  let multipleConcepts =
    settings.get('Map to multiple concepts') != undefined ? settings.get('Map to multiple concepts')! : false

  async function onClickMapping() {
    originalRow = await mainTable.getFullRow(selectedRowIndex)

    let rowObj: Record<string, any> = {}
    for (let i = 0; i < originalRow.row.length; i++) {
      rowObj[mainTableColumns![i].id] = originalRow.row[i]
    }
    let renderedObj: Record<string, any> = {}
    for (let i = 0; i < renderedRow.length; i++) {
      renderedObj[columns[i].id] = renderedRow[i]
    }
    if (multipleConcepts == true) dispatch('multipleMapping', { originalRow: rowObj, row: renderedObj })
    else dispatch('singleMapping', { originalRow: originalRow.row, row: renderedObj })

    multipleConcepts == true ? (alreadyMapped = true) : null
  }

  $: {
    uniqueConceptIds.includes(renderedRow[0]) ? (alreadyMapped = true) : (alreadyMapped = false)
  }
</script>

<td class="actions">
  {#if alreadyMapped == true}
    <button class="apply"><SvgIcon href="icons.svg" id="check" width="16px" height="16px" /></button>
  {:else}
    <button on:click={onClickMapping}><SvgIcon href="icons.svg" id="map" width="16px" height="16px" /></button>
  {/if}
</td>
{#each renderedRow as cell, i}
  <td>
    <div class="field has-addons" data-component="cell-container">
      <p>{cell}</p>
    </div>
  </td>
{/each}

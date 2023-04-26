<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import type DataTable from '../../../../lib/RADar-DataTable/src/lib/components/DataTable.svelte'

  export let renderedRow: any[],
    settings: Map<string, boolean>,
    mainTable: DataTable,
    selectedRowIndex: number,
    selectedRow: Record<string, any>,
    mappedRows: Map<string, any[]>

  let alreadyMapped: boolean = false
  let originalRow: Record<string, any>
  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  let multipleConcepts =
    settings.get('Map to multiple concepts') != undefined ? settings.get('Map to multiple concepts')! : false

  async function onClickMapping() {
    originalRow = await mainTable.getFullRow(selectedRowIndex)
    if (multipleConcepts == true) dispatch('multipleMapping', { originalRow, row: renderedRow })
    else dispatch('singleMapping', { originalRow, row: renderedRow })
  }

  const checkRow = () => {
    if (selectedRow) {
      const res = mappedRows.get(String(selectedRow[0]))
      res == undefined ? null : res.includes(renderedRow[0]) ? (alreadyMapped = true) : (alreadyMapped = false)
    }
  }

  $: {
    renderedRow
    checkRow()
  }
</script>

<tr>
  <td class="actions">
    {#if multipleConcepts}
      {#if alreadyMapped == true}
        <button class="apply"><SvgIcon href="icons.svg" id="check" width="16px" height="16px" /></button>
      {:else}
        <button on:click={onClickMapping}><SvgIcon href="icons.svg" id="map" width="16px" height="16px" /></button>
      {/if}
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
</tr>

<style>
  .actions {
    display: flex;
    align-items: center;
  }

  .apply {
    background-color: greenyellow;
  }
</style>

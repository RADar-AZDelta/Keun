<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import type { CustomOptionsEvents, IStatus } from '../Types'
  import type { IColumnMetaData } from '../../../../lib/RADar-DataTable/src/lib/components/DataTable.d'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import EditableCell from '../../../../lib/RADar-DataTable/src/lib/components/EditableCell.svelte'
  import type DataTable from '../../../../lib/RADar-DataTable/src/lib/components/DataTable.svelte'
  import { getColorFromStatus } from '$lib/utils'

  export let showMappingPopUp: boolean = false
  export let renderedRow: any[],
    columns: IColumnMetaData[],
    index: number,
    dataTable: DataTable,
    editable: boolean = false,
    statuses: IStatus[] = [],
    author: string

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  function onClickMapping() {
    const object = {
      visibility: !showMappingPopUp,
      data: {
        row: renderedRow,
        index: index,
      },
    }
    dispatch('generalVisibilityChanged', object)
  }

  function onClickApproving() {
    dispatch('actionPerformed', { action: 'APPROVED', index: index })
  }

  function onClickFlagging() {
    dispatch('actionPerformed', { action: 'FLAGGED', index: index })
  }

  function onClickUnapproving() {
    dispatch('actionPerformed', { action: 'UNAPPROVED', index: index })
  }

  async function valueUpdate(e: CustomEvent<any>, i: number) {
    await dataTable.updateRows(new Map([[index, Object.fromEntries([[columns[i].id, e.detail]])]]))
  }

  let fullRow: any

  $: dataTable != undefined ? dataTable.getFullRow(index).then(row => (fullRow = row)) : (fullRow = renderedRow)

  onMount(() => {
    dispatch('autoMapping', { row: renderedRow, index: index })
  })
</script>

<tr style={`background-color: ${getColorFromStatus(columns, fullRow, statuses, author)}`}>
  <td class="actions">
    <button on:click={onClickMapping}><SvgIcon href="icons.svg" id="map" width="16px" height="16px" /></button>
    <button on:click={onClickApproving}><SvgIcon href="icons.svg" id="check" width="16px" height="16px" /></button>
    <button on:click={onClickFlagging}><SvgIcon href="icons.svg" id="flag" width="16px" height="16px" /></button>
    <button on:click={onClickUnapproving}><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button>
  </td>
  {#each renderedRow as cell, i}
    <td>
      {#if editable == true}
        <EditableCell value={cell} on:valueChanged={event => valueUpdate(event, i)} />
      {:else}
        <div class="field has-addons" data-component="cell-container">
          {#if columns != undefined && $$slots.editor}
            <slot name="editor" />
          {:else}
            <div>
              <pre>{cell}</pre>
            </div>
          {/if}
        </div>
      {/if}
    </td>
  {/each}
</tr>

<style>
  .actions {
    display: flex;
    align-items: center;
  }
</style>

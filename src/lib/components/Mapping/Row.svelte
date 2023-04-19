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
    settings: Map<string, boolean>,
    editable: boolean = false,
    actions: boolean = false,
    table: string = 'Main',
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

  function onClickMappingAthena() {
    dispatch('singleMapping', { row: renderedRow })
  }

  function onClickMultipleMappingAthena() {
    // TODO: implement multiple mapping from Athena
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

  const getFullRow = async () => {
    if (dataTable) {
      const row = await dataTable.getFullRow(index)
      return row
    }
    return renderedRow
  }

  let fullRow: any

  $: dataTable != undefined ? dataTable.getFullRow(index).then((row) => fullRow = row) : fullRow = renderedRow

  onMount(() => {
    if (table == 'Main') dispatch('autoMapping', { row: renderedRow, index: index })
  })
</script>

<tr style={`background-color: ${getColorFromStatus(columns, fullRow, statuses, author)}`}>
  {#if actions == true && table == 'Main'}
    <td class="actions">
      <button on:click={getFullRow}><SvgIcon href="icons.svg" id="arrow-left" width="16px" height="16px" /></button>
      <button on:click={onClickMapping}><SvgIcon href="icons.svg" id="map" width="16px" height="16px" /></button>
      <button on:click={onClickApproving}><SvgIcon href="icons.svg" id="check" width="16px" height="16px" /></button>
      <button on:click={onClickFlagging}><SvgIcon href="icons.svg" id="flag" width="16px" height="16px" /></button>
      <button on:click={onClickUnapproving}><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button>
    </td>
  {:else if actions == true && table == 'Athena'}
    <td class="actions">
      <button on:click={onClickMappingAthena}><SvgIcon href="icons.svg" id="check" width="16px" height="16px" /></button
      >
      {#if settings.get('Map to multiple concepts') == true}
        <button on:click={onClickMultipleMappingAthena}
          ><SvgIcon href="icons.svg" id="plus" width="16px" height="16px" /></button
        >
      {/if}
    </td>
  {/if}
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
              <p>{cell}</p>
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

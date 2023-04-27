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

  let fullRow: any
  let state: string = ''
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

  async function onClickApproving() {
    await fetchRow()
    state = 'APPROVED'
    dispatch('actionPerformed', { action: 'APPROVED', index: index })
  }

  async function onClickFlagging() {
    await fetchRow()
    state = 'FLAGGED'
    dispatch('actionPerformed', { action: 'FLAGGED', index: index })
  }

  async function onClickUnapproving() {
    await fetchRow()
    state = 'UNAPPROVED'
    dispatch('actionPerformed', { action: 'UNAPPROVED', index: index })
  }

  function onClickDeletion() {
    const conceptIdIndex = columns.findIndex(column => column.id === 'conceptId')
    const conceptId = renderedRow[conceptIdIndex]
    const sourceCodeIndex = columns.findIndex(column => column.id === 'sourceCode')
    const sourceCode = renderedRow[sourceCodeIndex]
    dispatch('deleteRow', { indexes: [index], sourceCode: sourceCode , conceptId: conceptId })
  }

  async function fetchRow() {
    const row = await dataTable.getFullRow(index)
    fullRow = row.row
  }

  async function valueUpdate(e: CustomEvent<any>, i: number) {
    await dataTable.updateRows(new Map([[index, Object.fromEntries([[columns[i].id, e.detail]])]]))
  }

  onMount(async () => {
    const conceptIdIndex = columns.findIndex(column => column.id === 'conceptId')
    const conceptId = renderedRow[conceptIdIndex]
    conceptId == undefined ? dispatch('autoMapping', { row: renderedRow, index: index }) : null
    fullRow = await dataTable.getFullRow(index)
  })

  $: {
    renderedRow
    const conceptIdIndex = columns.findIndex(col => col.id == "conceptId")
    const sourceCodeIndex = columns.findIndex(col => col.id == "sourceCode")
    if(renderedRow[conceptIdIndex] != undefined) dispatch('registerMapping', { sourceCode: renderedRow[sourceCodeIndex], conceptId: renderedRow[conceptIdIndex]})
  }
</script>

<tr style={`background-color: ${getColorFromStatus(fullRow, columns, state, statuses, author)}`}>
  <td class="actions">
    <button on:click={onClickMapping}><SvgIcon href="icons.svg" id="map" width="16px" height="16px" /></button>
    <button on:click={onClickDeletion}><SvgIcon href="icons.svg" id="trash" width="16px" height="16px" /></button>
    <div />
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
    display: grid;
    grid-template-columns: repeat(3, min-content);
    grid-template-rows: repeat(2, min-content);
  }
</style>

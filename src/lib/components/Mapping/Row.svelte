<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import type { CustomOptionsEvents, IStatus } from '../Types'
  import type { IColumnMetaData } from 'svelte-radar-datatable'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import { EditableCell } from 'svelte-radar-datatable'
  import type DataTable from 'svelte-radar-datatable'
  import { getColorFromStatus } from '$lib/utils'

  export let showMappingPopUp: boolean = false
  export let renderedRow: any[],
    columns: IColumnMetaData[] | undefined,
    index: number,
    dataTable: DataTable,
    editable: boolean = false,
    statuses: IStatus[] = []

  let fullRow: any
  let fullColumns: IColumnMetaData[] | undefined
  let state: string | undefined = undefined
  let color: string = 'inherit'
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
    const row = await fetchRow()
    state = 'APPROVED'
    dispatch('actionPerformed', { action: 'APPROVED', index: index, row: fullRow })
  }

  async function onClickFlagging() {
    const row = await fetchRow()
    state = 'FLAGGED'
    dispatch('actionPerformed', { action: 'FLAGGED', index: index, row: fullRow })
  }

  async function onClickUnapproving() {
    const row = await fetchRow()
    state = 'UNAPPROVED'
    dispatch('actionPerformed', { action: 'UNAPPROVED', index: index, row: fullRow })
  }

  function onClickDeletion() {
    const conceptIdIndex = columns!.findIndex(column => column.id === 'conceptId')
    const conceptId = renderedRow[conceptIdIndex]
    const sourceCodeIndex = columns!.findIndex(column => column.id === 'sourceCode')
    const sourceCode = renderedRow[sourceCodeIndex]
    dispatch('deleteRow', { indexes: [index], sourceCode: sourceCode, conceptId: conceptId })
  }

  async function fetchRow() {
    const row = await dataTable.getFullRow(index)
    fullRow = row.row
    return fullRow
  }

  async function valueUpdate(e: CustomEvent<any>, i: number) {
    dispatch('cellEdited', { index: index, update: Object.fromEntries([[columns![i].id, e.detail]]) })
  }

  function getColors() {
    // TODO: fix the issue that the color won't update if the checked columns are not visible --> when getting fullRow & all the columns --> only the last row will execute the method
    color = getColorFromStatus(renderedRow, columns, state, statuses)
  }

  onMount(async () => {
    const conceptIdIndex = columns!.findIndex(column => column.id === 'conceptId')
    const conceptId = renderedRow[conceptIdIndex]
    conceptId == undefined ? dispatch('autoMapping', { row: renderedRow, index: index }) : null
    let fullR = await dataTable.getFullRow(index)
    fullRow = fullR.row
    fullColumns = await dataTable.getColumns()
  })

  $: {
    renderedRow, dataTable, index
    getColors()
  }
</script>

<td class="actions" style={`background-color: ${color}`}>
  <button on:click={onClickMapping}><SvgIcon href="icons.svg" id="map" width="16px" height="16px" /></button>
  <button on:click={onClickDeletion}><SvgIcon href="icons.svg" id="trash" width="16px" height="16px" /></button>
  <div />
  <button on:click={onClickApproving}><SvgIcon href="icons.svg" id="check" width="16px" height="16px" /></button>
  <button on:click={onClickFlagging}><SvgIcon href="icons.svg" id="flag" width="16px" height="16px" /></button>
  <button on:click={onClickUnapproving}><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button>
</td>
{#each renderedRow as cell, i}
  <td style={`background-color: ${color}`}>
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

<style>
  .actions {
    display: grid;
    grid-template-columns: repeat(3, min-content);
    grid-template-rows: repeat(2, min-content);
  }
</style>

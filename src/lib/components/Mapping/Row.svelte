<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents, IStatus } from '../Types'
  import type { IColumnMetaData } from 'svelte-radar-datatable'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import { EditableCell } from 'svelte-radar-datatable'
  import type DataTable from 'svelte-radar-datatable'
  import { getColorFromStatus } from '$lib/utils'

  export let showMappingPopUp: boolean = false
  export let renderedRow: Record<string, any>,
    columns: IColumnMetaData[] | undefined,
    index: number,
    dataTable: DataTable,
    editable: boolean = false,
    statuses: IStatus[] = []

  let fullRow: any
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
    state = 'APPROVED'
    dispatch('actionPerformed', { action: 'APPROVED', index: index, row: renderedRow })
  }

  async function onClickFlagging() {
    state = 'FLAGGED'
    dispatch('actionPerformed', { action: 'FLAGGED', index: index, row: renderedRow })
  }

  async function onClickUnapproving() {
    state = 'UNAPPROVED'
    dispatch('actionPerformed', { action: 'UNAPPROVED', index: index, row: renderedRow })
  }

  function onClickDeletion() {
    const conceptId = renderedRow['conceptId']
    const sourceCode = renderedRow['sourceCode']
    dispatch('deleteRow', { indexes: [index], sourceCode: sourceCode, conceptId: conceptId })
  }

  async function valueUpdate(e: CustomEvent<any>, i: number) {
    dispatch('cellEdited', { index: index, update: Object.fromEntries([[columns![i].id, e.detail]]) })
  }

  function getColors() {
    color = getColorFromStatus(renderedRow, state, statuses)
  }

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
{#each columns || [] as column, i (column.id)}
  <td style={`background-color: ${color}`}>
    {#if editable == true}
      <EditableCell value={renderedRow[column.id]} on:valueChanged={event => valueUpdate(event, i)} />
    {:else}
      <div class="field has-addons" data-component="cell-container">
        {#if columns != undefined && $$slots.editor}
          <slot name="editor" />
        {:else}
          <div>
            <pre>{renderedRow[column.id]}</pre>
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

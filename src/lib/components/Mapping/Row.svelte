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
    author: string,
    concept: string[] = [],
    conceptColumns: IColumnMetaData[] = []

  let rowConceptIdIndex = conceptColumns.findIndex(col => col.id == 'conceptId')
  let rowConcept = concept[rowConceptIdIndex]
  let conceptIdIndex = columns.findIndex(col => col.id == 'id')
  let newRowConcept = renderedRow[conceptIdIndex]

  let multipleConcepts =
    settings.get('Map to multiple concepts') != undefined ? settings.get('Map to multiple concepts')! : false

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

  // TODO: when first concept is mapped to a row --> update the row
  // TODO: when first concept is already mapped to the row --> insert new row

  function onClickMappingAthena() {
    if (multipleConcepts == true) {
      rowConcept == undefined
        ? dispatch('singleMapping', { row: renderedRow })
        : dispatch('multipleMapping', { row: renderedRow })
    } else dispatch('singleMapping', { row: renderedRow })
  }

  function removeMappingAthena() {
    // TODO: check if the mapped row is the original one or a duplicate
    dispatch('removeMapping', {
      index: index,
      multiple: multipleConcepts,
      row: renderedRow,
    })
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

  $: dataTable != undefined && table != 'Athena'
    ? dataTable.getFullRow(index).then(row => (fullRow = row))
    : (fullRow = renderedRow)

  onMount(() => {
    if (table == 'Main'){
      dispatch('autoMapping', { row: renderedRow, index: index })
    }
  })
</script>

<tr style={`background-color: ${getColorFromStatus(columns, fullRow, statuses, author)}`}>
  {#if actions == true && table == 'Main'}
    <td class="actions">
      <button on:click={onClickMapping}><SvgIcon href="icons.svg" id="map" width="16px" height="16px" /></button>
      <button on:click={onClickApproving}><SvgIcon href="icons.svg" id="check" width="16px" height="16px" /></button>
      <button on:click={onClickFlagging}><SvgIcon href="icons.svg" id="flag" width="16px" height="16px" /></button>
      <button on:click={onClickUnapproving}><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button>
    </td>
  {:else if actions == true && table == 'Athena'}
    <td class="actions">
      <!-- TODO: when multiple mapping is enabled -> when mapped, replace icon to an "x" to disable this mapping and in this way map multiple concepts to one row -->
      <!-- {#if concept[conceptIdIndex] != undefined}
        <button on:click={onClickMappingAthena}><SvgIcon href="icons.svg" id="map" width="16px" height="16px" /></button
        >
      {:else}
        <button on:click={removeMappingAthena}><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button>
      {/if} -->

      {#if multipleConcepts}
        {#if rowConcept != undefined}
          {#if rowConcept != newRowConcept}
            <button on:click={onClickMappingAthena}
              ><SvgIcon href="icons.svg" id="map" width="16px" height="16px" /></button
            >
          {:else}
            <button on:click={removeMappingAthena}
              ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
            >
          {/if}
        {:else}
          <button on:click={onClickMappingAthena}
            ><SvgIcon href="icons.svg" id="arrow-right" width="16px" height="16px" /></button
          >
        {/if}
      {:else}
        <button on:click={onClickMappingAthena}><SvgIcon href="icons.svg" id="map" width="16px" height="16px" /></button
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

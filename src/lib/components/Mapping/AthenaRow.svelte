<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import type { IColumnMetaData } from '../../../../lib/RADar-DataTable/src/lib/components/DataTable'
  import SvgIcon from '../Extra/SvgIcon.svelte'

  export let renderedRow: any[],
    columns: IColumnMetaData[],
    settings: Map<string, boolean>,
    selectedRow: any[],
    selectedRowColumns: IColumnMetaData[],
    selectedRowIndex: number,
    mappedConceptIds: Map<number, string[]> = new Map<number, string[]>()

  let alreadyMapped: boolean =
    mappedConceptIds.get(selectedRowIndex) != undefined
      ? mappedConceptIds.get(selectedRowIndex)!.includes(renderedRow[columns.findIndex(col => col.id == 'id')])
      : false

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  let multipleConcepts =
    settings.get('Map to multiple concepts') != undefined ? settings.get('Map to multiple concepts')! : false

  function onClickMapping() {
    if (multipleConcepts == true) {
      mappedConceptIds.get(selectedRowIndex) == undefined
        ? mappedConceptIds.set(selectedRowIndex, [
            selectedRow[selectedRowColumns.findIndex(col => col.id == 'conceptId')],
            renderedRow[columns.findIndex(col => col.id == 'id')],
          ])
        : mappedConceptIds.set(selectedRowIndex, [
            ...mappedConceptIds.get(selectedRowIndex)!,
            renderedRow[columns.findIndex(col => col.id == 'id')],
          ])
      mappedConceptIds = mappedConceptIds
      dispatch('multipleMapping', { row: renderedRow })
    } else dispatch('singleMapping', { row: renderedRow })
    isMapped()
  }

  function removeMapping() {
    const conceptIdToRemove = renderedRow[columns.findIndex(col => col.id == 'id')]
    const conceptIdRow = mappedConceptIds.get(selectedRowIndex)!.findIndex(id => id == conceptIdToRemove)
    const mapping = mappedConceptIds.get(selectedRowIndex)!
    mapping.splice(conceptIdRow, 1)
    mappedConceptIds.set(selectedRowIndex, mapping)
    dispatch('removeMapping', { row: renderedRow })
  }

  function isMapped() {
    const conceptIdRow = selectedRowColumns.findIndex(col => col.id == 'conceptId')
    const conceptId = columns.findIndex(col => col.id == 'id')
    if (selectedRow[conceptIdRow] != renderedRow[conceptId]) return false
    else return true
  }

  $: {
    mappedConceptIds
    mappedConceptIds.get(selectedRowIndex) == undefined
      ? mappedConceptIds.set(selectedRowIndex, [renderedRow[columns.findIndex(col => col.id == 'id')]])
      : null
    alreadyMapped =
      mappedConceptIds.get(selectedRowIndex) != undefined
        ? mappedConceptIds.get(selectedRowIndex)!.includes(renderedRow[columns.findIndex(col => col.id == 'id')])
        : false
  }
</script>

<tr>
  <td class="actions">
    {#if multipleConcepts}
      {#if alreadyMapped == true}
        <button on:click={removeMapping}><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button>
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
</style>

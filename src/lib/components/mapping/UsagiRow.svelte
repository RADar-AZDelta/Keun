<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { reformatDate } from '@radar-azdelta-int/radar-utils'
  import { EditableCell } from '@radar-azdelta/svelte-datatable'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import { Config } from '$lib/helperClasses/Config'
  import Usagi from '$lib/classes/usagi/Usagi'
  import type { IUsagiRow, MappingEvents } from '$lib/components/Types'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'

  export let renderedRow: Record<string, any>, columns: IColumnMetaData[] | undefined, index: number
  export let currentVisibleRows: Map<number, Record<string, any>> = new Map<number, Record<string, any>>([])
  export let disabled: boolean

  const dispatch = createEventDispatcher<MappingEvents>()
  let usagiRowLogic: Usagi
  let color: string = 'inherit'
  const width = '10px'
  const height = '10px'

  const mapRow = () => dispatch('rowSelection', { row: renderedRow as IUsagiRow, index })
  const approveRow = async () => await usagiRowLogic.approveRow()
  const flagRow = async () => await usagiRowLogic.flagRow()
  const unapproveRow = async () => await usagiRowLogic.unapproveRow()
  const deleteRow = async () => await usagiRowLogic.deleteRow()
  const updateValue = async (e: CustomEvent, column: string) =>
    await usagiRowLogic.updatePropertyValue(e.detail, column)
  const onClickAutoMap = async () => dispatch('autoMapRow', { index, sourceName: renderedRow.sourceName })

  async function getColors() {
    const color = (<Record<string, string>>Config.colors)[renderedRow.mappingStatus]
    if (!color) return 'inherit'
    return color
  }

  async function setPreset() {
    if (!renderedRow.matchScore) renderedRow.matchScore = 0
    if (!renderedRow.mappingStatus) renderedRow.mappingStatus = 'UNCHECKED'
    if (!renderedRow.conceptName) renderedRow.conceptName = 'Unmapped'
    if (!renderedRow.conceptId) renderedRow.conceptId = 0
    color = await getColors()
  }

  $: {
    renderedRow, index
    currentVisibleRows.set(index, renderedRow)
    setPreset()
  }

  onMount(() => {
    usagiRowLogic = new Usagi(<IUsagiRow>renderedRow, index)
  })
</script>

<td class="actions-cell" style={`background-color: ${color}`}>
  <div class="actions-grid">
    <button on:click={mapRow} title="Map" {disabled}><SvgIcon id="search" {width} {height} /></button>
    <button on:click={deleteRow} title="Delete" {disabled}><SvgIcon id="eraser" {width} {height} /></button>
    <button on:click={onClickAutoMap} title="Automap" {disabled}>AUTO</button>
    <p>{renderedRow['ADD_INFO:numberOfConcepts'] > 1 ? renderedRow['ADD_INFO:numberOfConcepts'] : ''}</p>
    <button on:click={approveRow} title="Approve" {disabled}><SvgIcon id="check" {width} {height} /></button>
    <button on:click={flagRow} title="Flag" {disabled}><SvgIcon id="flag" {width} {height} /></button>
    <button on:click={unapproveRow} title="Unapprove" {disabled}><SvgIcon id="x" {width} {height} /></button>
  </div>
</td>
{#each columns || [] as column (column.id)}
  {@const { id } = column}
  {@const value = renderedRow[id]}
  <td on:dblclick={mapRow} class="cell" style={`background-color: ${color}`} title={value}>
    {#if Config.usagiRowConfig.dateCells.includes(id)}
      <p>{reformatDate(value)}</p>
    {:else if Config.usagiRowConfig.editableCells.includes(id)}
      <EditableCell {value} on:valueChanged={e => updateValue(e, id)} />
    {:else}
      <p>{value ?? ''}</p>
    {/if}
  </td>
{/each}

<style>
  .cell {
    height: 25px;
  }

  .actions-cell {
    height: 100%;
  }

  .actions-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(2, 1fr);
    height: max-content;
    max-width: 100%;
  }

  button {
    padding: 0 5px;
    font-size: 10px;
  }

  p {
    white-space: normal;
    font-size: 10px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
</style>

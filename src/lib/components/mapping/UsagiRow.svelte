<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { query } from 'arquero'
  import { reformatDate } from '@radar-azdelta-int/radar-utils'
  import { resetRow } from '$lib/mappingUtils'
  import { EditableCell, type IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import type Query from 'arquero/dist/types/query/query'
  import type { IUsagiRow, MappingEvents } from '$lib/components/Types'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import UsagiActions from '$lib/classes/UsagiActions'
  import UsagiLogic from '$lib/classes/UsagiLogic'

  export let renderedRow: Record<string, any>, columns: IColumnMetaData[] | undefined, index: number
  export let currentVisibleRows: Map<number, Record<string, any>> = new Map<number, Record<string, any>>([])
  export let disabled: boolean, table: DataTable, customTable: DataTable

  const dispatch = createEventDispatcher<MappingEvents>()
  let rowActions: UsagiActions
  let rowLogic: UsagiLogic
  let color: string = 'inherit'
  const width = '10px'
  const height = '10px'
  const dateCells = ['statusSetOn', 'createdOn', 'ADD_INFO:approvedOn']
  const editableCells = ['comment']
  const colors: Record<string, string | undefined> = {
    APPROVED: 'hsl(156, 100%, 35%)',
    FLAGGED: 'hsl(54, 89%, 64%)',
    'SEMI-APPROVED': 'hsl(84, 100%, 70%)',
    UNAPPROVED: 'hsl(8, 100%, 59%)',
  }

  const mapRow = () => dispatch('rowSelection', { row: renderedRow as IUsagiRow, index })

  const approveRow = async () => await rowActions.approveRow()
  const flagRow = async () => await rowActions.flagRow()
  const unapproveRow = async () => await rowActions.unapproveRow()

  async function deleteRow(): Promise<void> {
    // If there are not multiple concepts mapped to this row, reset the row, otherwise you can delete the row
    const conceptsNumber = renderedRow['ADD_INFO:numberOfConcepts']
    // If it's a custom concept, delete it from that table
    if (renderedRow['ADD_INFO:customConcept']) {
      const customExistanceParams = <Query>(
        query().params({ name: renderedRow.conceptName, code: renderedRow.sourceCode })
      )
      const customExistanceQuery = customExistanceParams
        .filter((r: any, p: any) => r.concept_name === p.name && r.concept_code === p.code)
        .toObject()
      const customExistance = await customTable.executeQueryAndReturnResults(customExistanceQuery)
      if (customExistance.indices.length) await customTable.deleteRows([customExistance.indices[0]])
    }
    // if (!conceptsNumber || conceptsNumber < 2) return await table.updateRows(new Map([[index, await resetRow()]]))
    if (!conceptsNumber || conceptsNumber < 2) return await rowLogic.resetRow()
    const existanceQuery = (<Query>query().params({ source: renderedRow.sourceCode }))
      .filter((r: any, params: any) => r.sourceCode === params.source)
      .toObject()
    await table.deleteRows([index])
    const existance = await table.executeQueryAndReturnResults(existanceQuery)
    if (!existance.queriedData.length) return
    const rowsToUpdate = new Map()
    for (let i of existance.indices) rowsToUpdate.set(i, { 'ADD_INFO:numberOfConcepts': existance.queriedData.length })
    await table.updateRows(rowsToUpdate)
  }

  async function onClickAutoMap(): Promise<void> {
    const sourceName = renderedRow['sourceName']
    dispatch('autoMapRow', { index, sourceName })
  }

  async function getColors(): Promise<string> {
    const color = colors[renderedRow.mappingStatus]
    if (!color) return 'inherit'
    return color
  }

  async function setPreset(): Promise<void> {
    if (!renderedRow.matchScore) renderedRow.matchScore = 0
    if (!renderedRow.mappingStatus) renderedRow.mappingStatus = 'UNCHECKED'
    if (!renderedRow.conceptName) renderedRow.conceptName = 'Unmapped'
    if (!renderedRow.conceptId) renderedRow.conceptId = 0
    color = await getColors()
  }

  async function updateValue(e: CustomEvent, column: string) {
    renderedRow[column] = e.detail
    await table.updateRows(new Map([[index, renderedRow]]))
  }

  $: {
    renderedRow, index
    currentVisibleRows.set(index, renderedRow)
    setPreset()
  }

  onMount(() => {
    rowActions = new UsagiActions(<IUsagiRow>renderedRow, index)
    rowLogic = new UsagiLogic(<IUsagiRow>renderedRow, index)
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
    {#if dateCells.includes(id)}
      <p>{reformatDate(value)}</p>
    {:else if editableCells.includes(id)}
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

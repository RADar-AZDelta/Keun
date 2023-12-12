<script lang="ts">
  import { dev } from '$app/environment'
  import { createEventDispatcher } from 'svelte'
  import { query } from 'arquero'
  import SvgIcon from '$lib/obsolete/SvgIcon.svelte'
  import { user } from '$lib/store'
  import { reformatDate } from '$lib/obsolete/utils'
  import { resetRow } from '$lib/mappingUtils'
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import type Query from 'arquero/dist/types/query/query'
  import type { IUsagiRow, MappingEvents } from '$lib/components/Types'

  export let renderedRow: Record<string, any>,
    columns: IColumnMetaData[] | undefined,
    index: number,
    currentVisibleRows: Map<number, Record<string, any>> = new Map<number, Record<string, any>>([]),
    disabled: boolean,
    table: DataTable,
    customTable: DataTable

  const dispatch = createEventDispatcher<MappingEvents>()

  let color: string = 'inherit'

  currentVisibleRows.set(index, renderedRow)

  // Send a request to the parent that a row is selected to map
  async function mapRow(): Promise<void> {
    if (dev) console.log(`mapRow: ${index}`)
    dispatch('rowSelection', { row: renderedRow as IUsagiRow, index })
  }

  // A method to throw an event to the parent to approve a row
  async function approveRow(): Promise<void> {
    if (!$user) return
    const currentState = renderedRow.mappingStatus
    if ($user.name === renderedRow.statusSetBy && (currentState === 'SEMI-APPROVED' || currentState === 'APPROVED'))
      return
    let update = {}
    if (currentState === 'SEMI-APPROVED')
      update = { 'ADD_INFO:approvedBy': $user.name, 'ADD_INFO:approvedOn': Date.now(), mappingStatus: 'APPROVED' }
    else if (currentState !== 'SEMI-APPROVED' && currentState !== 'APPROVED')
      update = {
        statusSetBy: $user.name,
        statusSetOn: Date.now(),
        mappingStatus: 'SEMI-APPROVED',
        conceptId: renderedRow.conceptId ? renderedRow.conceptId : renderedRow.sourceAutoAssignedConceptIds,
      }
    await table.updateRows(new Map([[index, update]]))
  }

  // A method to throw an event to the parent to flag a row
  async function flagRow(): Promise<void> {
    if (renderedRow.mappingStatus === 'FLAGGED') return
    const update = {
      statusSetBy: $user.name,
      statusSetOn: new Date(),
      mappingStatus: 'FLAGGED',
    }
    await table.updateRows(new Map([[index, update]]))
  }

  // A method to throw an event to the parent to unapprove a row
  async function unapproveRow(): Promise<void> {
    if (renderedRow.mappingStatus === 'UNAPPROVED') return
    const update = {
      statusSetBy: $user.name,
      statusSetOn: new Date(),
      mappingStatus: 'UNAPPROVED',
    }
    await table.updateRows(new Map([[index, update]]))
  }

  // A method to throw an event to the parent to delete a row
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
    if (!conceptsNumber || conceptsNumber < 2) return await table.updateRows(new Map([[index, await resetRow()]]))
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
    switch (renderedRow['mappingStatus']) {
      case 'APPROVED':
        if (renderedRow['ADD_INFO:approvedBy']) return 'hsl(156, 100%, 35%)'
        else return 'hsl(112, 50%, 66%)'
      case 'FLAGGED':
        return 'hsl(54, 89%, 64%)'
      case 'SEMI-APPROVED':
        return 'hsl(84, 100%, 70%)'
      case 'UNAPPROVED':
        return 'hsl(8, 100%, 59%)'
      default:
        return 'inherit'
    }
  }

  async function setPreset(): Promise<void> {
    if (!renderedRow.matchScore) renderedRow.matchScore = 0
    if (!renderedRow.mappingStatus) renderedRow.mappingStatus = 'UNCHECKED'
    if (!renderedRow.conceptName) renderedRow.conceptName = 'Unmapped'
    if (!renderedRow.conceptId) renderedRow.conceptId = 0
    if (renderedRow.mappingStatus == 'APPROVED' && !renderedRow['ADD_INFO:approvedBy'])
      renderedRow.mappingStatus = 'SEMI-APPROVED'
    color = await getColors()
  }

  $: {
    renderedRow, index
    setPreset()
  }
</script>

<td class="actions-cell" style={`background-color: ${color}`}>
  <div class="actions-grid">
    <button on:click={mapRow} title="Map" {disabled}><SvgIcon id="search" width="10px" height="10px" /></button>
    <button on:click={deleteRow} title="Delete" {disabled}><SvgIcon id="eraser" width="10px" height="10px" /></button>
    <button on:click={onClickAutoMap} title="Automap" {disabled}>AUTO</button>
    <p>{renderedRow['ADD_INFO:numberOfConcepts'] > 1 ? renderedRow['ADD_INFO:numberOfConcepts'] : ''}</p>
    <button on:click={approveRow} title="Approve" {disabled}><SvgIcon id="check" width="10px" height="10px" /></button>
    <button on:click={flagRow} title="Flag" {disabled}><SvgIcon id="flag" width="10px" height="10px" /></button>
    <button on:click={unapproveRow} title="Unapprove" {disabled}><SvgIcon id="x" width="10px" height="10px" /></button>
  </div>
</td>
{#each columns || [] as column, _}
  <td on:dblclick={mapRow} style={`background-color: ${color}`} title={renderedRow[column.id]}>
    {#if ['statusSetOn', 'createdOn', 'ADD_INFO:approvedOn'].includes(column.id)}
      <p>{reformatDate(renderedRow[column.id])}</p>
    {:else}
      <p>{renderedRow[column.id] ?? ''}</p>
    {/if}
  </td>
{/each}

<style>
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

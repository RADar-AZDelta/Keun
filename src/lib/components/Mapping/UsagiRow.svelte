<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import { dev } from '$app/environment'

  export let renderedRow: Record<string, any>,
    columns: IColumnMetaData[] | undefined,
    index: number,
    settings: Record<string, any> | undefined,
    currentVisibleRows: Map<number, Record<string, any>> = new Map<number, Record<string, any>>([]),
    disable: boolean

  let color: string = 'inherit'
  let fontSize: string = '10px'
  currentVisibleRows.set(index, renderedRow)
  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  // A method to open the Athena pop-up to map a row
  function onClickMapping() {
    if (dev) console.log(`onClickMapping: ${index}`)
    dispatch('generalVisibilityChanged', { visibility: true, data: { row: renderedRow, index } })
  }

  // A method to throw an event to the parent to approve a row
  async function onClickApproving() {
    dispatch('actionPerformed', { action: 'APPROVED', index: index, row: renderedRow })
  }

  // A method to throw an event to the parent to flag a row
  async function onClickFlagging() {
    dispatch('actionPerformed', { action: 'FLAGGED', index: index, row: renderedRow })
  }

  // A method to throw an event to the parent to unapprove a row
  async function onClickUnapproving() {
    dispatch('actionPerformed', { action: 'UNAPPROVED', index: index, row: renderedRow })
  }

  // A method to throw an event to the parent to delete a row
  function onClickDeletion() {
    const conceptId = renderedRow['conceptId']
    const sourceCode = renderedRow['sourceCode']
    const multiple = renderedRow['ADD_INFO:numberOfConcepts'] > 1
    dispatch('deleteRow', { indexes: [index], sourceCode: sourceCode, conceptId: conceptId, erase: multiple })
  }

  function onClickAutoMap() {
    const sourceName = renderedRow['sourceName']
    dispatch('autoMapRow', { index, sourceName })
  }

  // A method to get the color for the cell depending on the status of the row
  function getColors() {
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

  $: {
    renderedRow, index
    if (!renderedRow.matchScore) renderedRow.matchScore = 0
    if (!renderedRow.mappingStatus) renderedRow.mappingStatus = 'UNCHECKED'
    if (!renderedRow.conceptName) renderedRow.conceptName = 'Unmapped'
    if (!renderedRow.conceptId) renderedRow.conceptId = 0
    if (renderedRow.mappingStatus == 'APPROVED' && !renderedRow['ADD_INFO:approvedBy'])
      renderedRow.mappingStatus = 'SEMI-APPROVED'
    color = getColors()
  }

  $: {
    settings
    if (settings)
      if (settings.fontsize) {
        fontSize = `${settings.fontsize}px`
      }
  }
</script>

<td data-name="actions-cell" style={`background-color: ${color}`}>
  <div data-name="actions-grid">
    <button on:click={onClickMapping} title="Map" disabled={disable}>
      <SvgIcon href="icons.svg" id="search" width={fontSize} height={fontSize} />
    </button>
    <button on:click={onClickDeletion} title="Delete" disabled={disable}>
      <SvgIcon href="icons.svg" id="eraser" width={fontSize} height={fontSize} />
    </button>
    <button on:click={onClickAutoMap} title="Automap" disabled={disable}>AUTO</button>
    {#if renderedRow['ADD_INFO:numberOfConcepts'] && renderedRow['ADD_INFO:numberOfConcepts'] > 1}
      <div data-name="numberOfConceptIds">
        <p>{renderedRow['ADD_INFO:numberOfConcepts']}</p>
      </div>
    {:else}
      <div />
    {/if}
    <button on:click={onClickApproving} title="Approve" disabled={disable}>
      <SvgIcon href="icons.svg" id="check" width={fontSize} height={fontSize} />
    </button>
    <button on:click={onClickFlagging} title="Flag" disabled={disable}>
      <SvgIcon href="icons.svg" id="flag" width={fontSize} height={fontSize} />
    </button>
    <button on:click={onClickUnapproving} title="Unapprove" disabled={disable}>
      <SvgIcon href="icons.svg" id="x" width={fontSize} height={fontSize} />
    </button>
  </div>
</td>
{#each columns || [] as column, i}
  <td
    on:dblclick={onClickMapping}
    style={`background-color: ${color}`}
    title={renderedRow[column.id]}
  >
    {#if ['statusSetOn', 'createdOn', 'ADD_INFO:approvedOn'].includes(column.id)}
      <p>{renderedRow[column.id] ? new Date(parseInt(renderedRow[column.id])).toLocaleString() : 0}</p>
    {:else}
      <p>{renderedRow[column.id] ?? ''}</p>
    {/if}
  </td>
{/each}

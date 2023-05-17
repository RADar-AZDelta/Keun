<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import type { IColumnMetaData } from 'svelte-radar-datatable'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import { doubleClick } from '$lib/actions/doubleClick'
  import { singleClick } from '$lib/actions/singleClick'

  export let renderedRow: Record<string, any>,
    columns: IColumnMetaData[] | undefined,
    index: number,
    currentRows: Map<number, Record<string, any>> = new Map<number, Record<string, any>>([])

  let color: string = 'inherit'
  currentRows.set(index, renderedRow)
  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  let clickedRowIndex: number

  // A method to open the Athena pop-up to map a row
  function onClickMapping(e: any) {
    if (clickedRowIndex == e.detail.index) {
      const object = {
        visibility: true,
        data: {
          row: e.detail.renderedRow,
          index: e.detail.index,
        },
      }
      console.log('HERE ', clickedRowIndex)
      dispatch('generalVisibilityChanged', object)
    }
  }

  function onSingleClickMapping(e: any) {
    clickedRowIndex = e.detail.index
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

  // A method to get the color for the cell depending on the status of the row
  function getColors() {
    switch (renderedRow['mappingStatus']) {
      case 'APPROVED':
        if (renderedRow['ADD_INFO:approvedBy']) return 'hsl(156, 100%, 35%)'
        else return 'hsl(112, 50%, 66%)'
      case 'FLAGGED':
        return 'hsl(54, 89%, 64%)'
      case 'UNAPPROVED':
        if (renderedRow['statusSetBy']) return 'hsl(84, 100%, 70%)'
    }
    return 'inherit'
  }

  $: {
    renderedRow, index
    color = getColors()
  }
</script>

<td data-name="actions-grid" style={`background-color: ${color}`}>
  <button on:click={onClickMapping} title="Map"><SvgIcon href="icons.svg" id="map" width="16px" height="16px" /></button
  >
  <button on:click={onClickDeletion} title="Delete"
    ><SvgIcon href="icons.svg" id="eraser" width="16px" height="16px" /></button
  >
  {#if renderedRow['ADD_INFO:numberOfConcepts'] && renderedRow['ADD_INFO:numberOfConcepts'] > 1}
    <div data-name="numberOfConceptIds">
      <p>{renderedRow['ADD_INFO:numberOfConcepts']}</p>
    </div>
  {:else}
    <div />
  {/if}
  <button on:click={onClickApproving} title="Approve"
    ><SvgIcon href="icons.svg" id="check" width="16px" height="16px" /></button
  >
  <button on:click={onClickFlagging} title="Flag"
    ><SvgIcon href="icons.svg" id="flag" width="16px" height="16px" /></button
  >
  <button on:click={onClickUnapproving} title="Unapprove"
    ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
  >
</td>
{#each columns || [] as column, i (column.id)}
  <td
    use:doubleClick={{ index, renderedRow }}
    use:singleClick={{ index }}
    on:doubleClick={onClickMapping}
    on:singleClick={onSingleClickMapping}
    style={`background-color: ${color}`}
  >
    {#if ['statusSetOn', 'createdOn', 'ADD_INFO:approvedOn'].includes(column.id)}
      <p>{new Date(parseInt(renderedRow[column.id])).toLocaleString()}</p>
    {:else}
      <p>{renderedRow[column.id] ?? ''}</p>
    {/if}
  </td>
{/each}

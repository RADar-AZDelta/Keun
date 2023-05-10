<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import type { IColumnMetaData } from 'svelte-radar-datatable'
  import SvgIcon from '../Extra/SvgIcon.svelte'

  export let renderedRow: Record<string, any>, columns: IColumnMetaData[] | undefined, index: number

  let color: string = 'inherit'
  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  function onClickMapping() {
    const object = {
      visibility: true,
      data: {
        row: renderedRow,
        index: index,
      },
    }
    dispatch('generalVisibilityChanged', object)
  }

  async function onClickApproving() {
    dispatch('actionPerformed', { action: 'APPROVED', index: index, row: renderedRow })
  }

  async function onClickFlagging() {
    dispatch('actionPerformed', { action: 'FLAGGED', index: index, row: renderedRow })
  }

  async function onClickUnapproving() {
    dispatch('actionPerformed', { action: 'UNAPPROVED', index: index, row: renderedRow })
  }

  function onClickDeletion() {
    const conceptId = renderedRow['conceptId']
    const sourceCode = renderedRow['sourceCode']
    dispatch('deleteRow', { indexes: [index], sourceCode: sourceCode, conceptId: conceptId })
  }

  function getColors() {
    switch (renderedRow['mappingStatus']) {
      case 'APPROVED':
        return 'hsl(156, 100%, 35%)'
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
    ><SvgIcon href="icons.svg" id="trash" width="16px" height="16px" /></button
  >
  {#if renderedRow['ADD_INFO:numberOfConcepts']}
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
  <td style={`background-color: ${color}`}>
    {#if ['statusSetOn', 'createdOn', 'ADD_INFO:approvedOn'].includes(column.id)}
      <p>{new Date(parseInt(renderedRow[column.id])).toLocaleString()}</p>
    {:else}
      <p>{renderedRow[column.id] ?? ''}</p>
    {/if}
  </td>
{/each}

<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'

  export let renderedRow: Record<string, any>,
    columns: IColumnMetaData[],
    settings: Record<string, any>,
    alreadyMapped: Record<string, any>

  let mapped: boolean = false
  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  let multipleConcepts: boolean
  if (!settings.mapToMultipleConcepts) multipleConcepts = false
  else multipleConcepts = settings.mapToMultipleConcepts

  // A method to map a certain concept to a certain row (can be single mapping or multiple mapping depending on the settings)
  async function onClickMapping() {
    if (multipleConcepts == true) {
      dispatch('multipleMapping', { row: renderedRow })
      dispatch('updateUniqueConceptIds', { conceptId: renderedRow.id, conceptName: renderedRow.name, multiple: true })
    } else {
      dispatch('singleMapping', { row: renderedRow })
      dispatch('updateUniqueConceptIds', { conceptId: renderedRow.id, conceptName: renderedRow.name, multiple: false })
    }
  }

  $: {
    if (Object.keys(alreadyMapped).length > 0) {
      if (alreadyMapped[Object.keys(alreadyMapped)[0]].conceptId.includes(renderedRow.id)) mapped = true
      else mapped = false
    } else mapped = false
  }
</script>

<td data-name="actions">
  {#if mapped == true}
    <button title="Map to row" style="background-color: greenyellow;"
      ><SvgIcon href="icons.svg" id="check" width="16px" height="16px" /></button
    >
  {:else}
    <button on:click={onClickMapping}><SvgIcon href="icons.svg" id="plus" width="16px" height="16px" /></button>
  {/if}
</td>
{#each columns || [] as column (column.id)}
  <td>
    <div data-name="cell-container">
      <p>{renderedRow[column.id]}</p>
    </div>
  </td>
{/each}

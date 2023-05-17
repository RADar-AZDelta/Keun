<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import type { IColumnMetaData } from 'svelte-radar-datatable'

  export let renderedRow: Record<string, any>,
    columns: IColumnMetaData[],
    settings: Record<string, any>,
    uniqueConceptIds: string[] = []

  let alreadyMapped: boolean = false
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

    multipleConcepts == true ? (alreadyMapped = true) : null
  }

  $: {
    // TODO: in single mapping --> when click for other mapping the color of the previous must be reset but that component does not come in this reactive statement
    uniqueConceptIds.includes(renderedRow.id) ? (alreadyMapped = true) : (alreadyMapped = false)
  }
</script>

<td data-name="actions">
  {#if alreadyMapped == true}
    <button title="Map to row" style="background-color: greenyellow;"
      ><SvgIcon href="icons.svg" id="plus" width="16px" height="16px" /></button
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

<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import { settings } from '$lib/store'
  import { base } from '$app/paths'

  export let renderedRow: Record<string, any>,
    columns: IColumnMetaData[] | undefined,
    alreadyMapped: Record<string, any>

  let mapped: boolean = false
  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  let multipleConcepts: boolean
  if (!$settings.mapToMultipleConcepts) multipleConcepts = false
  else multipleConcepts = $settings.mapToMultipleConcepts

  // A method to map a certain concept to a certain row (can be single mapping or multiple mapping depending on the settings)
  async function onClickMapping(): Promise<void> {
    if (multipleConcepts) {
      dispatch('multipleMapping', { row: renderedRow, extra: { comment: '', reviewer: '' } })
      dispatch('updateUniqueConceptIds', { conceptId: renderedRow.id, conceptName: renderedRow.name, multiple: true })
    } else {
      dispatch('singleMapping', { row: renderedRow, extra: { comment: '', reviewer: '' } })
      dispatch('updateUniqueConceptIds', { conceptId: renderedRow.id, conceptName: renderedRow.name, multiple: false })
    }
  }

  function referToAthena(): void {
    const referUrl = import.meta.env.VITE_ATHENA_DETAIL + renderedRow.id
    window.open(encodeURI(referUrl), '_blank')?.focus()
  }

  $: {
    if (
      Object.keys(alreadyMapped).length &&
      alreadyMapped[Object.keys(alreadyMapped)[0]].conceptId.includes(renderedRow.id)
    )
      mapped = true
    else mapped = false
  }
</script>

<td data-name="actions">
  {#if mapped == true}
    <button title="Map to row" style="background-color: greenyellow;"
      ><SvgIcon href="{base}/icons.svg" id="check" width="16px" height="16px" /></button
    >
  {:else}
    <button on:click={onClickMapping}><SvgIcon href="{base}/icons.svg" id="plus" width="16px" height="16px" /></button>
  {/if}
  <button on:click={referToAthena}><SvgIcon href="{base}/icons.svg" id="link" width="16px" height="16px" /></button>
</td>
{#if columns}
  {#each columns || [] as column (column.id)}
    <td on:dblclick={onClickMapping}>
      <div data-name="cell-container">
        <p title={renderedRow[column.id]}>{renderedRow[column.id]}</p>
      </div>
    </td>
  {/each}
{/if}

<script lang="ts">
  import { onMount } from 'svelte'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import type { IMappedRow, IUsagiRow } from '$lib/components/Types'
  import MappedRow from '$lib/classes/mappedRow/MappedRow'

  export let renderedRow: IMappedRow, usagiRow: IUsagiRow

  // TODO: check if the initialize of the class can be done on line 11 instead of in the onMount

  let row: MappedRow

  const removeMapping = async () => row.deleteRow()

  onMount(() => {
    row = new MappedRow(usagiRow, renderedRow)
  })
</script>

<td>
  {#if renderedRow.conceptName}
    <button on:click={removeMapping}><SvgIcon id="x" /></button>
  {/if}
</td>
{#each Object.keys(renderedRow) as key}
  <td>
    <p>{renderedRow[key]}</p>
  </td>
{/each}

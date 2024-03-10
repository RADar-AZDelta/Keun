<script lang="ts">
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import MappedRow from '$lib/classes/mappedRow/MappedRow'
  import type { IMappedRow, IUsagiRow } from '$lib/Types'

  export let renderedRow: IMappedRow, usagiRow: IUsagiRow

  let row: MappedRow

  const removeMapping = async () => row.deleteRow()

  $: {
    renderedRow, usagiRow
    row = new MappedRow(usagiRow, renderedRow)
  }
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

<script lang="ts">
  import { onMount } from 'svelte'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import MappedRowActions from '$lib/classes/MappedRowActions'
  import type { IMappedRow, IUsagiRow } from '$lib/components/Types'

  export let renderedRow: IMappedRow, usagiRow: IUsagiRow

  let row: MappedRowActions

  const removeMapping = async () => row.deleteRow()

  onMount(() => {
    row = new MappedRowActions(usagiRow, renderedRow)
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

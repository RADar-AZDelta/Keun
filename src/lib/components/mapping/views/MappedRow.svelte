<script lang="ts">
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'
  import MappedRow from '$lib/helpers/mappedRow/MappedRow'
  import type { IMappedRowProps } from '$lib/interfaces/Types'

  let { renderedRow, usagiRow }: IMappedRowProps = $props()

  let row: MappedRow

  const removeMapping = async () => row.deleteRow()

  $effect(() => {
    row = new MappedRow(usagiRow, renderedRow)
  })
</script>

<td>
  {#if renderedRow.conceptName}
    <button onclick={removeMapping}><SvgIcon id="x" /></button>
  {/if}
</td>
{#each Object.keys(renderedRow) as key}
  <td>
    <p>{renderedRow[key]}</p>
  </td>
{/each}

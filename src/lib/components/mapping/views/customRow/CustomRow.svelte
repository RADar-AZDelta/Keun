<script lang="ts">
  import Row from '$lib/components/mapping/views/customRow/Row.svelte'
  import AddRow from '$lib/components/mapping/views/customRow/AddRow.svelte'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import type { ICustomConceptCompact, IUsagiRow } from '$lib/Types'

  export let renderedRow: ICustomConceptCompact,
    columns: IColumnMetaData[] | undefined,
    originalIndex: number,
    usagiRow: IUsagiRow,
    usagiRowIndex: number,
    equivalence: string
</script>

{#if columns && !originalIndex}
  <AddRow {columns} {renderedRow} {originalIndex} on:updateError on:customConceptAdded />
{:else if columns}
  <Row {usagiRow} {usagiRowIndex} {renderedRow} {columns} {equivalence} on:updateError />
{/if}

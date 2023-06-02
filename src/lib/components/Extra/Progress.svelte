<script lang="ts">
  import type { ITableInformation } from '../Types'
  import Spinner from './Spinner.svelte'

  export let tableInformation: ITableInformation
</script>

<div data-name="progress">
  <div>
    <p>Total rows:</p>
    {#if tableInformation.totalRows === undefined}
      <Spinner />
    {:else}
      <p>{tableInformation.totalRows}</p>
    {/if}
  </div>
  <div>
    <p>Mapped rows:</p>
    {#if tableInformation.mappedRows === undefined}
      <Spinner />
    {:else}
      <p>{tableInformation.mappedRows}</p>
    {/if}
  </div>
  <div>
    <p>Approved rows:</p>
    {#if tableInformation.approvedRows === undefined}
      <Spinner />
    {:else}
      <p>{tableInformation.approvedRows}</p>
    {/if}
  </div>
</div>

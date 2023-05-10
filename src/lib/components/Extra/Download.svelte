<script lang="ts">
  import type DataTable from 'svelte-radar-datatable/components/DataTable.svelte'
  import SvgIcon from './SvgIcon.svelte'

  export let dataTable: DataTable

  async function onClick() {
    await dataTable.saveToFile()
  }
</script>

<button aria-label="Download button" on:click={onClick} data-name="header-button">
  <SvgIcon href="icons.svg" id="download" width="16px" height="16px" />
</button>

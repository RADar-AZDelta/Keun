<script lang="ts">
  import type DataTable from 'svelte-radar-datatable/components/DataTable.svelte'
  import SvgIcon from './SvgIcon.svelte'

  export let dataTable: DataTable

  // A method to save the file
  async function onClick() {
    await dataTable.replaceValuesOfColumn('SEMI-APPROVED', 'APPROVED', 'mappingStatus')
    await dataTable.saveToFile()
  }
</script>

<button title="Download" aria-label="Download button" on:click={onClick} data-name="header-button">
  <SvgIcon href="icons.svg" id="download" width="16px" height="16px" />
</button>

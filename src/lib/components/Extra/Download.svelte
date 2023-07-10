<script lang="ts">
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import SvgIcon from './SvgIcon.svelte'
  import { dev } from '$app/environment'

  export let dataTable: DataTable, title: string

  // A method to save the file
  async function onClick(): Promise<void> {
    if (dev) console.log("Download: Replace the 'SEMI-APPROVED' values with 'APPROVED' and save the file")
    // Replace the value "SEMI-APPROVED" with "APPROVED" for every row in the column "mappingStatus" before saving the file (compatibility with Usagi)
    await dataTable.replaceValuesOfColumn('SEMI-APPROVED', 'APPROVED', 'mappingStatus')
    await dataTable.saveToFile()
  }
</script>

<div data-name="download">
  <button {title} aria-label="Download button" on:click={onClick} data-name="header-button">
    <SvgIcon href="icons.svg" id="download" width="16px" height="16px" />
  </button>
  <p>{title}</p>
</div>

<script lang="ts">
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import SvgIcon from './SvgIcon.svelte'
  import { dev } from '$app/environment'
  import { fileName, implementationClass } from '$lib/store'

  export let dataTable: DataTable, title: string, downloaded: boolean, custom: boolean = false

  // A method to save the file
  async function onClick(): Promise<void> {
    if (dev) console.log("Download: Replace the 'SEMI-APPROVED' values with 'APPROVED' and save the file")
    downloaded = true
    // Replace the value "SEMI-APPROVED" with "APPROVED" for every row in the column "mappingStatus" before saving the file (compatibility with Usagi)
    await dataTable.replaceValuesOfColumn('SEMI-APPROVED', 'APPROVED', 'mappingStatus')
    if ($implementationClass) {
      const blob = await dataTable.getBlob()
      $implementationClass.cache({ blob, fileName: custom == true ? 'customConcepts' : $fileName, action: 'update' })
    }
    await dataTable.saveToFile()
  }
</script>

<div data-name="download">
  <button {title} aria-label="Download button" on:click={onClick} data-name="header-button">
    <SvgIcon href="icons.svg" id="download" width="16px" height="16px" />
  </button>
  <p>{title}</p>
</div>

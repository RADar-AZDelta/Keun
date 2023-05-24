<script lang="ts">
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import SvgIcon from './SvgIcon.svelte'

  export let dataTable: DataTable, title: string, svgId: string

  // A method to save the file
  async function onClick() {
    await dataTable.replaceValuesOfColumn('SEMI-APPROVED', 'APPROVED', 'mappingStatus')
    await dataTable.saveToFile()
  }
</script>

<button {title} aria-label="Download button" on:click={onClick} data-name="header-button">
  <SvgIcon href="icons.svg" id={svgId} width="16px" height="16px" />
</button>

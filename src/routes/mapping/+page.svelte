<script lang="ts">
  import { base } from '$app/paths'
  import { page } from '$app/stores'
  import { beforeNavigate, goto } from '$app/navigation'
  import DataTable from '@radar-azdelta/svelte-datatable'
  import { customTable, table, disableActions } from '$lib/store'
  import { BergamotTranslator } from '$lib/helperClasses/BergamotTranslator'
  import { selectedFileId, selectedCustomFileId, settings, triggerAutoMapping, user } from '$lib/store'
  import { abortAutoMapping, customFileTypeImpl, databaseImpl, fileTypeImpl, saveImpl } from '$lib/store'
  import { loadImplDB, loadImplDataType, loadImplSave } from '$lib/implementations/implementation'
  import UsagiRow from '$lib/components/mapping/UsagiRow.svelte'
  import AthenaSearch from '$lib/components/mapping/AthenaSearch.svelte'
  import AutoMapping from '$lib/classes/mapping/AutoMapping'
  import { Config } from '$lib/helperClasses/Config'
  import type { SvelteComponent } from 'svelte'
  import type { ITableOptions } from '@radar-azdelta/svelte-datatable'
  import type { IUsagiRow, AutoMapRowED, RowSelectionED, NavigateRowED } from '$lib/components/Types'
  import Usagi from '$lib/classes/usagi/Usagi'
  import CustomTable from '$lib/classes/tables/CustomTable'
  import Table from '$lib/classes/tables/Table'

  let file: File | undefined, customConceptsFile: File | undefined
  let customTableOptions: ITableOptions = Config.customTableOptions
  let tableRendered: boolean = false
  let customsExtracted: boolean = false
  let tableOptions: ITableOptions = { ...Config.tableOptions, id: $page.url.searchParams.get('id') ?? '' }
  let currentVisibleRows: Map<number, IUsagiRow> = new Map<number, IUsagiRow>()
  let selectedRow: IUsagiRow, selectedRowIndex: number
  let search: SvelteComponent
  let globalAthenaFilter: { column: string; filter: string | undefined } = { column: 'all', filter: undefined }

  async function navigateRow(e: CustomEvent<NavigateRowED>) {
    ;({ row: selectedRow, index: selectedRowIndex } = e.detail)
    globalAthenaFilter.filter = await translate(selectedRow.sourceName)
  }

  const autoMapSingleRow = async (e: CustomEvent<AutoMapRowED>) => await AutoMapping.startAutoMappingRow(e.detail.index)

  async function selectRow(e: CustomEvent<RowSelectionED>) {
    await navigateRow(e)
    search.showDialog()
  }

  async function setupDataTable() {
    if (!$saveImpl) await loadImplSave()
    if ($saveImpl) tableOptions.saveImpl = $saveImpl
    if (!$fileTypeImpl) await loadImplDataType()
    if ($fileTypeImpl) tableOptions.dataTypeImpl = $fileTypeImpl
    if ($customFileTypeImpl) customTableOptions.dataTypeImpl = $customFileTypeImpl
  }

  const translate = async (text: string) => await BergamotTranslator.translate(text, $settings.language)

  async function extractCustomConcepts() {
    await CustomTable.extractCustomConcepts()
    customsExtracted = true
  }

  async function abortAutoMap() {
    const rows = await AutoMapping.abortAutoMap()
    if (rows) currentVisibleRows = rows
  }

  async function autoMapPage() {
    if (!tableRendered) tableRendered = true
    if (!customsExtracted) await extractCustomConcepts()
    await AutoMapping.autoMapPage()
    $triggerAutoMapping = false
  }

  async function approvePage() {
    for (let [index, row] of currentVisibleRows) await approveRow(row, index)
  }

  async function approveRow(row: IUsagiRow, index: number) {
    const usagiRow = new Usagi(row, index)
    await usagiRow.approveRow()
  }

  async function downloadPage() {
    await syncFile()
    await $databaseImpl?.downloadFiles($selectedFileId)
    goto(`${base}/`)
  }

  async function readFile() {
    if (!$selectedFileId) return
    if (!$databaseImpl) await loadImplDB()
    const keunFile = await $databaseImpl!.getKeunFile($selectedFileId)
    const customKeunFile = await $databaseImpl?.getCustomKeunFile($selectedCustomFileId)
    if (keunFile && keunFile?.file) file = keunFile.file
    if (customKeunFile && customKeunFile?.file) customConceptsFile = customKeunFile.file
  }

  async function getCustomFileId() {
    if (!$databaseImpl) await loadImplDB()
    const cached = await $databaseImpl!.checkFileExistance($selectedFileId)
    if (!cached) return
    $selectedCustomFileId = cached.customId
  }

  async function load() {
    const urlId = $page.url.searchParams.get('id')
    if (!urlId) return goto(`${base}/`)
    $selectedFileId = urlId
    if (!$selectedCustomFileId) await getCustomFileId()
    await readFile()
  }

  async function syncFile() {
    if (!$table) return
    const blob = await $table.getBlob()
    if (!blob) return
    const customBlob = $customTable ? await $customTable.getBlob() : undefined
    if (!$databaseImpl) await loadImplDB()
    await $databaseImpl?.editKeunFile($selectedFileId, blob)
    if (customBlob) await $databaseImpl?.editCustomKeunFile($selectedCustomFileId, customBlob)
  }

  $: {
    if ($abortAutoMapping) abortAutoMap()
  }

  $: {
    if ($triggerAutoMapping) autoMapPage()
  }

  $: {
    if ($selectedFileId) load()
  }

  // TODO: fix the auto save when leaving
  beforeNavigate(async () => await syncFile())

  setupDataTable()
</script>

<svelte:head>
  <title>Keun</title>
  <meta
    name="description"
    content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi."
  />
</svelte:head>

{#if file}
  <button on:click={syncFile}>Save</button>
  <button on:click={downloadPage}>Download</button>
  <button on:click={approvePage}>Approve page</button>
  <DataTable
    data={file}
    bind:this={$table}
    options={tableOptions}
    on:rendering={abortAutoMap}
    on:renderingComplete={autoMapPage}
    modifyColumnMetadata={Table.modifyColumnMetadata}
  >
    <UsagiRow
      slot="default"
      let:renderedRow
      let:columns
      let:originalIndex
      {renderedRow}
      {columns}
      index={originalIndex}
      disabled={$disableActions}
      bind:currentVisibleRows
      on:rowSelection={selectRow}
      on:autoMapRow={autoMapSingleRow}
    />
  </DataTable>

  {#if $settings}
    <AthenaSearch
      {selectedRow}
      {selectedRowIndex}
      bind:globalAthenaFilter
      on:navigateRow={navigateRow}
      bind:this={search}
    />
  {/if}

  <div class="custom-concepts">
    <DataTable
      data={customConceptsFile}
      options={customTableOptions}
      modifyColumnMetadata={CustomTable.modifyColumnMetadata}
      bind:this={$customTable}
    />
  </div>
{/if}

<style>
  button {
    margin-top: 1rem;
  }

  .custom-concepts {
    display: none;
  }
</style>

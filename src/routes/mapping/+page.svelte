<script lang="ts">
  import { base } from '$app/paths'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'
  import { beforeNavigate, goto } from '$app/navigation'
  import DataTable from '@radar-azdelta/svelte-datatable'
  import { disableActions } from '$lib/store'
  import { BergamotTranslator } from '$lib/helperClasses/BergamotTranslator'
  import { settings, triggerAutoMapping } from '$lib/store'
  import { abortAutoMapping } from '$lib/store'
  import UsagiRow from '$lib/components/mapping/UsagiRow.svelte'
  import AthenaSearch from '$lib/components/mapping/AthenaSearch.svelte'
  import AutoMapping from '$lib/classes/mapping/AutoMapping'
  import { Config } from '$lib/helperClasses/Config'
  import Usagi from '$lib/classes/usagi/Usagi'
  import CustomTable from '$lib/classes/tables/CustomTable'
  import Table from '$lib/classes/tables/Table'
  import FlaggedTable from '$lib/classes/tables/FlaggedTable'
  import type { SvelteComponent } from 'svelte'
  import type { ITableOptions } from '@radar-azdelta/svelte-datatable'
  import type { IUsagiRow, AutoMapRowED, RowSelectionED, NavigateRowED } from '$lib/Types'
  import DatabaseImpl from '$lib/classes/implementation/DatabaseImpl'

  let file: File | undefined, customConceptsFile: File | undefined, flaggedConceptsFile: File | undefined
  let tableRendered: boolean = false
  let customsExtracted: boolean = false
  let tableOptions: ITableOptions = { ...Config.tableOptions, id: $page.url.searchParams.get('id') ?? '' }
  let currentVisibleRows: Map<number, IUsagiRow> = new Map<number, IUsagiRow>()
  let selectedRow: IUsagiRow, selectedRowIndex: number
  let search: SvelteComponent
  let globalAthenaFilter: { column: string; filter: string | undefined } = { column: 'all', filter: undefined }
  let filesLoaded: boolean = false
  let syncingComplete: boolean = false

  let customFileId: string | undefined = undefined
  let flaggedFileId: string | undefined = undefined
  let selectedFileId: string

  async function navigateRow(e: CustomEvent<NavigateRowED>) {
    ;({ row: selectedRow, index: selectedRowIndex } = e.detail)
    globalAthenaFilter.filter = await translate(selectedRow.sourceName)
  }

  const autoMapSingleRow = async (e: CustomEvent<AutoMapRowED>) => await AutoMapping.startAutoMappingRow(e.detail.index)

  async function selectRow(e: CustomEvent<RowSelectionED>) {
    await navigateRow(e)
    search.showDialog()
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
    if (tableRendered) {
      if (!customsExtracted) await extractCustomConcepts()
      await AutoMapping.autoMapPage()
      $triggerAutoMapping = false
    } else tableRendered = true
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
    await DatabaseImpl.downloadFiles(selectedFileId)
    goto(`${base}/`)
  }

  async function readFile() {
    if (!selectedFileId) return
    const keunFile = await DatabaseImpl.getKeunFile(selectedFileId)
    const customKeunFile = await DatabaseImpl.getCustomKeunFile(customFileId ?? '')
    const flaggedFile = await DatabaseImpl.getFlaggedFile(flaggedFileId ?? '')
    if (keunFile && keunFile?.file) file = keunFile.file
    if (customKeunFile && customKeunFile?.file) customConceptsFile = customKeunFile.file
    if (flaggedFile && flaggedFile?.file) flaggedConceptsFile = flaggedFile.file
  }

  async function getCustomFileId() {
    const cached = await DatabaseImpl.checkFileExistance(selectedFileId)
    if (!cached) return
    customFileId = cached.customId
    flaggedFileId = cached.flaggedId
  }

  async function load() {
    if (filesLoaded) return
    const urlId = $page.url.searchParams.get('id')
    if (!urlId) return goto(`${base}/`)
    selectedFileId = urlId
    if (!customFileId) await getCustomFileId()
    await readFile()
    filesLoaded = true
  }

  async function syncFile() {
    const blob = await Table.getBlob()
    if (!blob) return
    await insertFlaggedRows()
    const customBlob = await CustomTable.getBlob()
    const flaggedBlob = await FlaggedTable.getBlob()
    await DatabaseImpl.editKeunFile(selectedFileId, blob)
    if (customBlob) await DatabaseImpl.editCustomKeunFile(selectedFileId, customBlob)
    if (flaggedBlob) await DatabaseImpl.editFlaggedFile(selectedFileId, flaggedBlob)
  }

  async function insertFlaggedRows() {
    const concepts = await extractFlaggedConcepts()
    if (!concepts.length) return
    await FlaggedTable.removeAllTableRows()
    await FlaggedTable.insertTableRows(concepts)
  }

  const extractFlaggedConcepts = async () => await Table.extractFlaggedConcepts()

  async function checkIfTableIsRenderedBeforeAutomapping() {
    if (!tableRendered) return
    await autoMapPage()
  }

  $: {
    if ($abortAutoMapping) abortAutoMap()
  }

  $: {
    if ($triggerAutoMapping) checkIfTableIsRenderedBeforeAutomapping()
  }

  beforeNavigate(async ({ to, cancel, type }) => {
    if (!syncingComplete) cancel()
    await syncFile()
    syncingComplete = true
    if (to?.url) goto(to.url)
  })

  onMount(() => load())
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
    bind:this={Table.table}
    options={tableOptions}
    on:rendering={abortAutoMap}
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

  <div class="hidden">
    <DataTable
      data={customConceptsFile}
      options={Config.customTableOptions}
      modifyColumnMetadata={CustomTable.modifyColumnMetadata}
      bind:this={CustomTable.table}
    />
  </div>

  <div class="hidden">
    <DataTable
      data={flaggedConceptsFile}
      options={Config.flaggedTableOptions}
      modifyColumnMetadata={FlaggedTable.modifyColumnMetadata}
      bind:this={FlaggedTable.table}
    />
  </div>
{/if}

<style>
  button {
    margin-top: 1rem;
  }

  .hidden {
    display: none;
  }
</style>

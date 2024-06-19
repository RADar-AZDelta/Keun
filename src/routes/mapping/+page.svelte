<script lang="ts">
  import { base } from '$app/paths'
  import { page } from '$app/stores'
  import { beforeNavigate, goto } from '$app/navigation'
  import DataTable from '@radar-azdelta/svelte-datatable'
  import BergamotTranslator from '$lib/helpers/BergamotTranslator'
  import UsagiRow from '$lib/components/mapping/UsagiRow.svelte'
  import AthenaSearch from '$lib/components/mapping/AthenaSearch.svelte'
  import AutoMapping from '$lib/helpers/mapping/AutoMapping'
  import Config from '$lib/helpers/Config'
  import Usagi from '$lib/helpers/usagi/Usagi'
  import CustomTable from '$lib/helpers/tables/CustomTable'
  import Table from '$lib/helpers/tables/Table'
  import FlaggedTable from '$lib/helpers/tables/FlaggedTable'
  import MappedConcepts from '$lib/helpers/general/MappedConcepts'
  import type { SvelteComponent } from 'svelte'
  import type { ITableOptions } from '@radar-azdelta/svelte-datatable'
  import type { IUsagiRow } from '$lib/interfaces/Types'
  import Database from '$lib/helpers/Database'
  import { createAbortAutoMapping, createDisableActions, createSettings, createTriggerAutoMapping } from '$lib/stores/runes.svelte'

  let settings = createSettings()
  let file: File | undefined = $state()
  let selectedDomain: string | null = $state(null)
  let tableRendered: boolean = $state(false)
  let tablePrepared: boolean = $state(false)
  let tableOptions: ITableOptions = { ...Config.tableOptions, id: $page.url.searchParams.get('id') ?? '' }
  let currentVisibleRows: Map<number, IUsagiRow> = $state(new Map<number, IUsagiRow>())
  let selectedRow: IUsagiRow | undefined = $state()
  let selectedRowIndex: number = $state(0)
  let search: SvelteComponent | undefined = $state()
  let globalAthenaFilter: { column: string; filter: string | undefined } = $state({ column: 'all', filter: undefined })
  let filesLoaded: boolean = $state(false)
  let syncingComplete: boolean = $state(false)
  let disableActions = createDisableActions()
  let abortAutoMapping = createAbortAutoMapping()
  let triggerAutoMapping = createTriggerAutoMapping()
  let selectedFileId: string

  async function navigateRow(row: IUsagiRow, index: number) {
    selectedRow = row
    selectedRowIndex = index
    globalAthenaFilter.filter = await translate(selectedRow.sourceName)
  }

  async function updateCurrentVisibleRows() {
    currentVisibleRows.clear()
  }

  async function autoMapSingleRow(index: number, sourceName: string) {
    await AutoMapping.startAutoMappingRow(index, selectedDomain)
  }

  async function selectRow(row: IUsagiRow, index: number) {
    await navigateRow(row, index)
    search?.showDialog()
  }

  const translate = async (text: string) => await BergamotTranslator.translate(text, settings.value.language)

  async function abortAutoMap() {
    if (!tableRendered) return
    const rows = await AutoMapping.abortAutoMap()
    if (rows) currentVisibleRows = rows
  }

  async function prepareFile() {
    await Table.prepareFile()
    tablePrepared = true
  }

  async function autoMapPage(rendered: boolean = false) {
    if (!tableRendered && !rendered) return
    tableRendered = true
    if (!tablePrepared) await prepareFile()
    await AutoMapping.autoMapPage(selectedDomain)
  }

  async function approvePage() {
    for (let [index, row] of currentVisibleRows) await approveRow(row, index)
  }

  async function approveRow(row: IUsagiRow, index: number) {
    const usagiRow = new Usagi(row, index)
    await usagiRow.approveRow()
  }

  async function downloadPage() {
    const { customBlob, flaggedBlob } = await syncFile()
    await Database.downloadFiles(selectedFileId, flaggedBlob, customBlob)
    await MappedConcepts.resetMappedConceptsBib()
    goto(`${base}/`)
  }

  async function readFile() {
    if (!selectedFileId) return
    const keunFile = await Database.getKeunFile(selectedFileId)
    if (keunFile && keunFile?.file) file = keunFile.file
  }

  async function load() {
    await reset()
    if (filesLoaded) return
    const urlId = $page.url.searchParams.get('id')
    if (!urlId) return goto(`${base}/`)
    selectedDomain = $page.url.searchParams.get('domain')
    selectedFileId = urlId
    await readFile()
    filesLoaded = true
  }

  async function reset() {
    selectedRow = undefined
    selectedRowIndex = 0
    await updateCurrentVisibleRows()
  }

  async function syncFile() {
    await Table.syncFile(selectedFileId)
    const customBlob = await CustomTable.syncFile()
    const flaggedBlob = await FlaggedTable.syncFile()
    return { customBlob, flaggedBlob }
  }

  $effect(() => {
    if (abortAutoMapping.value) abortAutoMap()
  })

  $effect(() => {
    if (triggerAutoMapping.value) {
      autoMapPage()
      triggerAutoMapping.update(false)
    }
  })

  beforeNavigate(async ({ to, cancel, type }) => {
    if (!syncingComplete) {
      cancel()
      await syncFile()
      syncingComplete = true
      await MappedConcepts.resetMappedConceptsBib()
      return goto(to!.url)
    }
  })

  $effect(() => {
    load()
  })
</script>

<svelte:head>
  <title>Keun</title>
  <meta name="description" content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi." />
</svelte:head>

{#if file}
  <button onclick={syncFile}>Save</button>
  <button onclick={downloadPage}>Download</button>
  <button onclick={approvePage}>Approve page</button>
  <DataTable
    data={file}
    bind:this={Table.table}
    options={tableOptions}
    rendering={abortAutoMap}
    rendered={() => autoMapPage(true)}
    modifyColumnMetadata={Table.modifyColumnMetadata}
    paginationChanged={updateCurrentVisibleRows}
  >
    {#snippet rowChild(renderedRow: any, originalIndex: any, index: any, columns: any, option: any)}
      <UsagiRow
        {renderedRow}
        {columns}
        index={originalIndex}
        disabled={disableActions.value}
        bind:currentVisibleRows
        rowSelection={selectRow}
        autoMapRow={autoMapSingleRow}
      />
    {/snippet}
  </DataTable>

  {#if settings.value}
    <AthenaSearch {selectedRow} {selectedRowIndex} bind:globalAthenaFilter {navigateRow} bind:this={search} />
  {/if}

  <div class="hidden">
    <DataTable data={Config.initialTable} columns={Config.columnsCustomConcept} options={Config.customTableOptions} bind:this={CustomTable.table} />
  </div>

  <div class="hidden">
    <DataTable data={Config.initialTable} columns={Config.columnsUsagi} options={Config.flaggedTableOptions} bind:this={FlaggedTable.table} />
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

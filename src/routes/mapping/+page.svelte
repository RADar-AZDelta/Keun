<script lang="ts">
  import type { SvelteComponent } from 'svelte'
  import '@radar-azdelta/svelte-datatable/style'
  import { base } from '$app/paths'
  import { page } from '$app/stores'
  import { beforeNavigate, goto } from '$app/navigation'
  import { dev } from '$app/environment'
  import type { IColumnMetaData, ITableOptions } from '@radar-azdelta/svelte-datatable'
  import DataTable from '@radar-azdelta/svelte-datatable'
  import { customTable, table, disableActions } from '$lib/store'
  import { BergamotTranslator } from '$lib/helperClasses/BergamotTranslator'
  import { abortAutoMapping, customFileTypeImpl, databaseImpl, fileTypeImpl, saveImpl } from '$lib/store'
  import { selectedFileId, selectedCustomFileId, settings, triggerAutoMapping, user } from '$lib/store'
  import {
    loadImplementationDB,
    loadImplementationDataType,
    loadImplementationSave,
  } from '$lib/implementations/implementation'
  import AthenaSearch from '$lib/components/mapping/AthenaSearch.svelte'
  import UsagiRow from '$lib/components/mapping/UsagiRow.svelte'
  import type { IUsagiRow, AutoMapRowED, RowSelectionED, NavigateRowED } from '$lib/components/Types'
  import { Config } from '$lib/helperClasses/Config'
  import Mapping from '$lib/classes/Mapping'
  import AutoMapping from '$lib/classes/AutoMapping'

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////
  // Files & generals
  let file: File | undefined, customConceptsFile: File | undefined
  let customTableOptions: ITableOptions = { id: 'customConceptsTable', saveOptions: false }
  let tableRendered: boolean = false
  let customsExtracted: boolean = false
  // Tables
  // let dataTableMapping: DataTable, dataTableCustomConcepts: DataTable
  let tableOptions: ITableOptions = { ...Config.tableOptions, id: $page.url.searchParams.get('id') ?? '' }
  // Table related variables
  let currentVisibleRows: Map<number, Record<string, any>> = new Map<number, Record<string, any>>()
  let selectedRow: IUsagiRow, selectedRowIndex: number
  // Athena related variables
  let search: SvelteComponent
  let globalAthenaFilter: { column: string; filter: string | undefined } = { column: 'all', filter: undefined }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  async function navigateRow(e: CustomEvent<NavigateRowED>) {
    const { row, index } = e.detail
    selectedRowIndex = index
    selectedRow = row
    const translation = await translate(selectedRow.sourceName)
    globalAthenaFilter.filter = typeof translation == 'string' ? translation : selectedRow.sourceName
  }

  // When the button to automap a single row is clicked, automap the row
  async function autoMapSingleRow(e: CustomEvent<AutoMapRowED>): Promise<void> {
    const { index } = e.detail
    await AutoMapping.startAutoMappingRow(index)
  }

  // Select the new navigated row to open in the search dialog
  async function selectRow(e: CustomEvent<RowSelectionED>) {
    await AutoMapping.abortAutoMap()
    const { row, index } = e.detail
    selectedRow = row
    selectedRowIndex = index
    globalAthenaFilter.filter = await translate(row.sourceName)
    search.showDialog()
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // A method to set the saveImpl & dataTypeImpl of the general DataTable & the DataTable for custom concepts
  async function setupDataTable(): Promise<void> {
    if (!$saveImpl) await loadImplementationSave()
    if ($saveImpl) tableOptions.saveImpl = $saveImpl
    if (!$fileTypeImpl) await loadImplementationDataType()
    if ($fileTypeImpl) tableOptions.dataTypeImpl = $fileTypeImpl
    if ($customFileTypeImpl) customTableOptions.dataTypeImpl = $customFileTypeImpl
  }

  const translate = async (text: string) => await BergamotTranslator.translate(text, $settings.language)

  async function extractCustomConcepts(): Promise<void | boolean> {
    await Mapping.extractCustomConcepts()
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
  }

  // Approve all the visible rows on a page
  async function approvePage(): Promise<void> {
    if (dev) console.log('approvePage: Approving page')
    let approveRows = new Map<number, Record<string, any>>()
    for (let [index, row] of currentVisibleRows) {
      const approvedRow = await approveRow(row)
      approveRows.set(index, approvedRow)
    }
    await $table.updateRows(approveRows)
  }

  // Approve a row depending on circumstances SEMI-APPROVED or APPROVED
  async function approveRow(row: Record<string, any>): Promise<Record<string, any>> {
    if (!row.conceptId) row.conceptId = row.sourceAutoAssignedConceptIds
    const currentStatus = row.statusSetBy
    let update = {}
    if (currentStatus !== author && (row.mappingStatus === 'SEMI-APPROVED' || row.mappingStatus === 'APPROVED'))
      update = { 'ADD_INFO:approvedBy': author, 'ADD_INFO:approvedOn': Date.now(), mappingStatus: 'APPROVED' }
    else update = { statusSetBy: author, statusSetOn: Date.now(), mappingStatus: 'SEMI-APPROVED' }
    return Object.assign(row, update)
  }

  // Sync the file with the database implementation & download it from the implementation
  async function downloadPage(): Promise<void> {
    const blob = await $table.getBlob()
    const customBlob = $customTable ? await $customTable.getBlob() : undefined
    if (!$databaseImpl) await loadImplementationDB()
    await $databaseImpl?.editKeunFile($selectedFileId, blob)
    if (customBlob) await $databaseImpl?.editCustomKeunFile($selectedCustomFileId, customBlob)
    await $databaseImpl?.downloadFiles($selectedFileId)
    goto(`${base}/`)
  }

  // A method to get the file from the database implementation
  async function readFile(): Promise<void> {
    if (dev) console.log(`readFile: reading the file with id: ${$selectedFileId}`)
    if (!$selectedFileId) return
    if (!$databaseImpl) await loadImplementationDB()
    const keunFile = await $databaseImpl!.getKeunFile($selectedFileId)
    const customKeunFile = await $databaseImpl?.getCustomKeunFile($selectedCustomFileId)
    if (keunFile && keunFile?.file) file = keunFile.file
    if (customKeunFile && customKeunFile?.file) customConceptsFile = customKeunFile.file
  }

  async function getCustomFileId() {
    if (!$databaseImpl) await loadImplementationDB()
    const cached = await $databaseImpl!.checkFileExistance($selectedFileId)
    if (!cached) return
    $selectedCustomFileId = cached.customId
  }

  // Load the file to start mapping
  async function load(): Promise<void> {
    const urlId = $page.url.searchParams.get('id')
    if (!urlId) return goto(`${base}/`)
    $selectedFileId = urlId
    if (!$selectedCustomFileId) await getCustomFileId()
    await readFile()
  }

  // Sync the file to the cloud implementation
  async function syncFile() {
    if (!$table) return
    const blob = await $table.getBlob()
    if (!blob) return
    const customBlob = $customTable ? await $customTable.getBlob() : undefined
    if (!$databaseImpl) await loadImplementationDB()
    await $databaseImpl?.editKeunFile($selectedFileId, blob)
    if (customBlob) await $databaseImpl?.editCustomKeunFile($selectedCustomFileId, customBlob)
  }

  // A method to create the meta data per column
  function modifyUsagiColumnMetadata(columns: IColumnMetaData[]): IColumnMetaData[] {
    const usagiColumnsMap = Config.columnsUsagi.reduce((acc, cur) => {
      acc.set(cur.id, cur)
      return acc
    }, new Map<string, IColumnMetaData>())
    const columnIds = columns.map(col => col.id)
    const modifiedColumns = columns.map(col => {
      const usagiColumn = usagiColumnsMap.get(col.id)
      if (usagiColumn) Object.assign(col, usagiColumn)
      else col.visible = false
      return col
    })
    const addedColumns = Config.columnsUsagi.reduce<IColumnMetaData[]>((acc, cur) => {
      if (!columnIds.includes(cur.id)) acc.push(cur)
      return acc
    }, [])
    return modifiedColumns.concat(addedColumns)
  }

  // A method to create the meta data per column for custom concepts
  function modifyCustomConceptsColumnMetadata(columns: IColumnMetaData[]): IColumnMetaData[] {
    const customConceptsColumnMap = Config.columnsCustomConcept.reduce((acc, cur) => {
      acc.set(cur.id, cur)
      return acc
    }, new Map<string, IColumnMetaData>())
    const columnIds = columns.map(col => col.id)
    const modifiedColumns = columns.map(col => {
      const customConceptColumn = customConceptsColumnMap.get(col.id)
      if (customConceptColumn) Object.assign(col, customConceptColumn)
      else col.visible = false
      return col
    })
    const addedColumns = Config.columnsCustomConcept.reduce<IColumnMetaData[]>((acc, cur) => {
      if (!columnIds.includes(cur.id)) acc.push(cur)
      return acc
    }, [])
    return modifiedColumns.concat(addedColumns)
  }

  $: {
    if ($abortAutoMapping == true) abortAutoMap()
  }

  $: {
    if ($triggerAutoMapping) {
      autoMapPage()
      $triggerAutoMapping = false
    }
  }

  $: {
    $selectedFileId
    load()
  }

  $: author = $user ? $user.name : null

  // Sync the file to the database implementation before leaving the page
  // Note: this does not always work so for that reason, there is a save button provided
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
    modifyColumnMetadata={modifyUsagiColumnMetadata}
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
      modifyColumnMetadata={modifyCustomConceptsColumnMetadata}
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

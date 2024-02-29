<script lang="ts">
  import type { SvelteComponent } from 'svelte'
  import '@radar-azdelta/svelte-datatable/style'
  import { base } from '$app/paths'
  import { page } from '$app/stores'
  import { beforeNavigate, goto } from '$app/navigation'
  import { dev } from '$app/environment'
  import { query } from 'arquero'
  import type Query from 'arquero/dist/types/query/query'
  import type { IColumnMetaData, ITableOptions } from '@radar-azdelta/svelte-datatable'
  import DataTable from '@radar-azdelta/svelte-datatable'
  import { reformatDate } from '@radar-azdelta-int/radar-utils'
  import { customTable, table } from '$lib/store'
  import { BergamotTranslator } from '$lib/helperClasses/BergamotTranslator'
  import { addExtraFields } from '$lib/mappingUtils'
  import { abortAutoMapping, customFileTypeImpl, databaseImpl, fileTypeImpl, saveImpl } from '$lib/store'
  import { selectedFileId, selectedCustomFileId, settings, triggerAutoMapping, user } from '$lib/store'
  import {
    loadImplementationDB,
    loadImplementationDataType,
    loadImplementationSave,
  } from '$lib/implementations/implementation'
  import AthenaSearch from '$lib/components/mapping/AthenaSearch.svelte'
  import UsagiRow from '$lib/components/mapping/UsagiRow.svelte'
  import type { IAthenaRow, ICustomConceptInput, IMapRow, IUsagiRow } from '$lib/components/Types'
  import type { MappingED, AutoMapRowED, RowSelectionED, NavigateRowED } from '$lib/components/Types'
  import { Config } from '$lib/helperClasses/Config'

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////
  // Files & generals
  let file: File | undefined, customConceptsFile: File | undefined
  let customTableOptions: ITableOptions = { id: 'customConceptsTable', saveOptions: false }
  let disabled: boolean = false
  let tableRendered: boolean = false
  let customsExtracted: boolean = false
  let translator: BergamotTranslator = new BergamotTranslator()
  // Tables
  // let dataTableMapping: DataTable, dataTableCustomConcepts: DataTable
  let tableOptions: ITableOptions = { ...Config.tableOptions, id: $page.url.searchParams.get('id') ?? '' }
  // Automapping
  let autoMappingAbortController: AbortController, autoMappingPromise: Promise<void> | undefined
  // Table related variables
  let currentVisibleRows: Map<number, Record<string, any>> = new Map<number, Record<string, any>>()
  let selectedRow: IUsagiRow, selectedRowIndex: number, previousPage: number
  // Athena related variables
  let search: SvelteComponent
  const mappingUrl: string = import.meta.env.VITE_MAPPINGDATA_PATH
  let lastTypedFilter: string
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
    if (dev) console.log('autoMapSingleRow: automap the row with index ', index)
    if (autoMappingPromise) autoMappingAbortController.abort()
    autoMappingAbortController = new AbortController()
    const signal = autoMappingAbortController.signal
    autoMappingPromise = new Promise(async (resolve, reject): Promise<void> => {
      const row = await $table.getFullRow(index)
      await autoMapRow(signal, row as IUsagiRow, index)
    })
  }

  // Select the new navigated row to open in the search dialog
  async function selectRow(e: CustomEvent<RowSelectionED>) {
    if (autoMappingPromise) autoMappingAbortController.abort()
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

  const translate = async (text: string) => await translator.translate(text, $settings.language)

  // A method to automatically map a given row
  async function autoMapRow(signal: AbortSignal, row: IUsagiRow, index: number): Promise<void> {
    if (dev) console.log('autoMapRow: Start automapping row with index ', index)
    if (signal.aborted) return
    let filter = row.sourceName
    if (!filter) return
    // Check the language set in the $settings and translate the filter to English if it's not English
    if ($settings) {
      if (!$settings.language) $settings.language = 'en'
      const translated = await translate(filter)
      if (translated) filter = translated
    }
    if (signal.aborted || !filter) return
    const url = encodeURI(mappingUrl + `&page=1&pageSize=1&standardConcept=Standard&query=${filter}`)
    // Get the first result of the Athena API call
    const conceptsResult = await fetch(url)
    const conceptsData = await conceptsResult.json()
    if (!conceptsData.content?.length) return console.error('autoMapRow: Could not get the concepts from the API')
    // Map the row with the first result
    const { mappedIndex, mappedRow } = await rowMapping(row, conceptsData.content[0], index)
    mappedRow['ADD_INFO:numberOfConcepts'] = row['ADD_INFO:numberOfConcepts']
    mappedRow['ADD_INFO:lastAthenaFilter'] = filter ? filter : null
    if (signal.aborted) return
    await $table.updateRows(new Map([[mappedIndex, mappedRow]]))
    if (dev) console.log('autoMapRow: Finished automapping row with index ', index)
  }

  // A method to map a certain row to a given Athena concept
  async function rowMapping(usagi: IUsagiRow, athena: IAthenaRow, index?: number): Promise<IMapRow> {
    // Check if index is undefined because if !index --> row with index 0 won't be automapped
    let rowIndex: number = index !== undefined ? index : selectedRowIndex
    const row = await $table.getFullRow(rowIndex)
    if (dev) console.log('rowMapping: Start mapping row with index ', rowIndex)
    let mappedUsagiRow: IUsagiRow = <IUsagiRow>row ?? usagi
    if (!mappedUsagiRow) return { mappedIndex: rowIndex, mappedRow: mappedUsagiRow }
    // Map the import columns that are given from Athena
    const { id, name, domain, vocabulary } = athena
    mappedUsagiRow.conceptId = id
    mappedUsagiRow.conceptName = name
    mappedUsagiRow.domainId = domain
    mappedUsagiRow.vocabularyId = vocabulary
    mappedUsagiRow = await addExtraFields(mappedUsagiRow)
    if (dev) console.log('rowMapping: Finished mapping row with index ', rowIndex)
    return { mappedIndex: rowIndex, mappedRow: mappedUsagiRow }
  }

  async function extractCustomConcepts(): Promise<void | boolean> {
    if (dev) console.log('exractCustomConcepts: start extracting the already mapped custom concepts from the table')
    const customQuery = query()
      .filter((r: any) => r['ADD_INFO:customConcept'] === true)
      .toObject()
    const concepts = await $table.executeQueryAndReturnResults(customQuery)
    if (!concepts?.indices?.length) return (customsExtracted = true)
    const testRow = await $customTable.getFullRow(0)
    if (testRow?.domain_id === 'test') await $customTable.deleteRows([0])
    for (let concept of concepts.queriedData) {
      const { conceptId, sourceName, conceptName, className, domainId, vocabularyId } = concept
      const custom: ICustomConceptInput = {
        concept_id: conceptId,
        concept_code: sourceName,
        concept_name: conceptName,
        concept_class_id: className,
        domain_id: domainId,
        vocabulary_id: vocabularyId,
        standard_concept: '',
        valid_start_date: reformatDate(),
        valid_end_date: '2099-12-31',
        invalid_reason: '',
      }
      await $customTable.insertRows([custom])
    }
    customsExtracted = true
  }

  // Abort the automapping that is happening
  async function abortAutoMap(): Promise<void> {
    if (dev) console.log('abortAutoMap: Aborting auto mapping')
    // Enable the interaction with the DataTable
    disabled = $table.setDisabled(false)
    if (autoMappingPromise) autoMappingAbortController.abort()
    $abortAutoMapping = false
    // Check previous page and current page
    const pag = $table.getTablePagination()
    if (previousPage !== pag.currentPage) currentVisibleRows = new Map<number, Record<string, any>>()
  }

  // Start the automapping of all the visible rows, but create an abortcontroller to be able to stop the automapping at any moment
  async function autoMapPage(): Promise<void> {
    if (!tableRendered) tableRendered = true
    if (!customsExtracted) await extractCustomConcepts()
    if (!$settings?.autoMap) return
    if (dev) console.log('autoMapPage: Starting auto mapping')
    // Abort any automapping that is happening at the moment
    if (autoMappingPromise) autoMappingAbortController.abort()
    // Create a abortcontroller to abort the auto mapping in the future if needed
    autoMappingAbortController = new AbortController()
    const signal = autoMappingAbortController.signal
    autoMappingPromise = autoMapPromise(signal).then(() => {
      disabled = $table.setDisabled(false)
    })
  }

  // Automap all the rows that are visible
  async function autoMapPromise(signal: AbortSignal) {
    const pag = $table.getTablePagination()
    const { currentPage, rowsPerPage } = pag
    if (!currentPage || !rowsPerPage) return
    // Get the rows that are visible for the user
    previousPage = currentPage
    const startIndex = rowsPerPage * (currentPage - 1)
    const endingIndex = rowsPerPage * currentPage
    const conceptsQuery = query().slice(startIndex, endingIndex).toObject()
    const concepts = await $table.executeQueryAndReturnResults(conceptsQuery)
    if (concepts.queriedData.length) disabled = $table.setDisabled(true)
    for (let i = 0; i < concepts.queriedData.length; i++) {
      if (signal.aborted) return Promise.resolve()
      const row = concepts.queriedData[i]
      const index = concepts.indices[i]
      // If the conceptId is empty & sourceAutoAssignedConceptIds is not filled in. The sourceAutoAssignedConceptIds is filled in by automapping so if it was already filled in, it was automapped already
      if (!row.conceptId && !row.sourceAutoAssignedConceptIds && !row.conceptName) await autoMapRow(signal, row, index)
    }
    if (dev) console.log('autoMapPage: Finished auto mapping')
    return null
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
      {disabled}
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

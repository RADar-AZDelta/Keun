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
  import { reformatDate } from '@radar-azdelta/radar-utils'
  import { BergamotTranslator } from '$lib/helperClasses/BergamotTranslator'
  import { addExtraFields } from '$lib/mappingUtils'
  import options from '$lib/data/tableOptions.json'
  import { abortAutoMapping, customFileTypeImpl, databaseImpl, fileTypeImpl, saveImpl } from '$lib/store'
  import { selectedFileId, selectedCustomFileId, settings, triggerAutoMapping, user } from '$lib/store'
  import {
    loadImplementationDB,
    loadImplementationDataType,
    loadImplementationSave,
  } from '$lib/implementations/implementation'
  import columnsUsagi from '$lib/data/columnsUsagi.json'
  import columnsCustomConcept from '$lib/data/columnsCustomConcept.json'
  import AthenaSearch from '$lib/components/mapping/AthenaSearch.svelte'
  import UsagiRow from '$lib/components/mapping/UsagiRow.svelte'
  import type { IAthenaRow, ICustomConceptInput, IMapRow, IUsagiRow } from '$lib/components/Types'
  import type {
    MappingEventDetail,
    AutoMapRowEventDetail,
    RowSelectionEventDetail,
    NavigateRowEventDetail,
  } from '$lib/components/Types'

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////
  // Files & generals
  let file: File | undefined, customConceptsFile: File | undefined
  let customTableOptions: ITableOptions = { id: 'customConceptsTable', saveOptions: false }
  let disabled: boolean = false
  let customsExtracted: boolean = false
  let translator: BergamotTranslator = new BergamotTranslator()
  // Tables
  let dataTableMapping: DataTable, dataTableCustomConcepts: DataTable
  let tableOptions: ITableOptions = { ...options, id: $page.url.searchParams.get('id') ?? '' }
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

  // When the mapping button in the Athena pop-up is clicked and the settins "Map to multiple concepts" is disabled
  async function singleMapping(e: CustomEvent<MappingEventDetail>): Promise<void> {
    if (dev) console.log('singleMapping: Single mapping for the row with sourceCode ', selectedRow.sourceCode)
    const { originalRow, row, extra, action } = e.detail
    // Map the selected row with the selected concept
    const { mappedIndex, mappedRow } = await rowMapping(originalRow, row)
    // Add extra information like the number of concepts mapped for this row, comments & the assigned reviewer to the row
    const update = {
      mappingStatus: action,
      statusSetBy: author,
      statusSetOn: Date.now(),
      'ADD_INFO:lastAthenaFilter': lastTypedFilter ? lastTypedFilter : null,
      'ADD_INFO:numberOfConcepts': 1,
      comment: extra.comment,
      assignedReviewer: extra.reviewer,
      vocabularyId: row.vocabulary,
    }
    Object.assign(mappedRow, update)
    // Update the selected row to the updated row
    await dataTableMapping.updateRows(new Map([[mappedIndex, mappedRow]]))
  }

  // When the mapping button in the Athena pop-up is clicked and the settins "Map to multiple concepts" is enabled
  async function multipleMapping(e: CustomEvent<MappingEventDetail>): Promise<void> {
    if (dev) console.log('multipleMapping: Multiple mapping for the row with sourceCode ', selectedRow.sourceCode)
    const { originalRow, row, extra, action } = e.detail
    const mappedParams = <Query>query().params({ code: originalRow.sourceCode })
    const mappedQuery = mappedParams.filter((r: any, p: any) => r.sourceCode === p.code).toObject()
    const mapped = await dataTableMapping.executeQueryAndReturnResults(mappedQuery)
    // Add extra information like the number of concepts mapped for this row, comments & the assigned reviewer to the row
    const update = {
      mappingStatus: action,
      statusSetBy: author,
      statusSetOn: Date.now(),
      'ADD_INFO:lastAthenaFilter': lastTypedFilter ? lastTypedFilter : null,
      'ADD_INFO:numberOfConcepts': 1,
      comment: extra.comment,
      assignedReviewer: extra.reviewer,
      vocabularyId: row.vocabulary,
    }
    // This is the first concepts mapped to the row and the current row wil be updated
    if (mapped.queriedData.length === 1 && !mapped.queriedData[0].conceptId) {
      const { mappedRow } = await rowMapping(originalRow!, row)
      Object.assign(mappedRow, update)
      await dataTableMapping.updateRows(new Map([[mapped.indices[0], mappedRow]]))
    } else {
      const existingRow = (<any[]>mapped.queriedData).findIndex((r: any) => r.conceptId === row.id)
      const { mappedRow } = await rowMapping(originalRow!, row, mapped.indices[existingRow])
      Object.assign(mappedRow, update)
      mappedRow['ADD_INFO:numberOfConcepts'] = mapped.queriedData.length
      if (existingRow >= 0)
        return await dataTableMapping.updateRows(new Map([[mapped.indices[existingRow], mappedRow]]))
      // This is not the first concept mapped to the row and the current row will be added to the table and the others will be updated
      mappedRow['ADD_INFO:numberOfConcepts'] = mapped.queriedData.length + 1
      const rowsToUpdate = new Map()
      // Update the number of concepts in the already mapped rows
      for (let index of mapped.indices)
        rowsToUpdate.set(index, { 'ADD_INFO:numberOfConcepts': mapped.queriedData.length + 1 })
      await dataTableMapping.updateRows(rowsToUpdate)
      await dataTableMapping.insertRows([mappedRow])
    }
  }

  async function navigateRow(e: CustomEvent<NavigateRowEventDetail>) {
    const { row, index } = e.detail
    selectedRowIndex = index
    selectedRow = row
    const translation = await translate(selectedRow.sourceName)
    globalAthenaFilter.filter = typeof translation == 'string' ? translation : selectedRow.sourceName
  }

  // When the button to automap a single row is clicked, automap the row
  async function autoMapSingleRow(e: CustomEvent<AutoMapRowEventDetail>): Promise<void> {
    const { index } = e.detail
    if (dev) console.log('autoMapSingleRow: automap the row with index ', index)
    if (autoMappingPromise) autoMappingAbortController.abort()
    autoMappingAbortController = new AbortController()
    const signal = autoMappingAbortController.signal
    autoMappingPromise = new Promise(async (resolve, reject): Promise<void> => {
      const row = await dataTableMapping.getFullRow(index)
      await autoMapRow(signal, row as IUsagiRow, index)
    })
  }

  // Select the new navigated row to open in the search dialog
  async function selectRow(e: CustomEvent<RowSelectionEventDetail>) {
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
    await dataTableMapping.updateRows(new Map([[mappedIndex, mappedRow]]))
    if (dev) console.log('autoMapRow: Finished automapping row with index ', index)
  }

  // A method to map a certain row to a given Athena concept
  async function rowMapping(usagi: IUsagiRow, athena: IAthenaRow, index?: number): Promise<IMapRow> {
    // Check if index is undefined because if !index --> row with index 0 won't be automapped
    let rowIndex: number = index !== undefined ? index : selectedRowIndex
    const row = await dataTableMapping.getFullRow(rowIndex)
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
      .filter((r: any) => r['ADD_INFO:customConcept'] === true && !r.conceptId)
      .toObject()
    const concepts = await dataTableMapping.executeQueryAndReturnResults(customQuery)
    if (!concepts?.indices?.length) return (customsExtracted = true)
    const testRow = await dataTableCustomConcepts.getFullRow(0)
    if (testRow?.domain_id === 'test') await dataTableCustomConcepts.deleteRows([0])
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
      await dataTableCustomConcepts.insertRows([custom])
    }
    customsExtracted = true
  }

  // Abort the automapping that is happening
  async function abortAutoMap(): Promise<void> {
    if (dev) console.log('abortAutoMap: Aborting auto mapping')
    // Enable the interaction with the DataTable
    disabled = dataTableMapping.setDisabled(false)
    if (autoMappingPromise) autoMappingAbortController.abort()
    $abortAutoMapping = false
    // Check previous page and current page
    const pag = dataTableMapping.getTablePagination()
    if (previousPage !== pag.currentPage) currentVisibleRows = new Map<number, Record<string, any>>()
  }

  // Start the automapping of all the visible rows, but create an abortcontroller to be able to stop the automapping at any moment
  async function autoMapPage(): Promise<void> {
    if (!customsExtracted) await extractCustomConcepts()
    if (!$settings?.autoMap) return
    if (dev) console.log('autoMapPage: Starting auto mapping')
    // Abort any automapping that is happening at the moment
    if (autoMappingPromise) autoMappingAbortController.abort()
    // Create a abortcontroller to abort the auto mapping in the future if needed
    autoMappingAbortController = new AbortController()
    const signal = autoMappingAbortController.signal
    autoMappingPromise = autoMapPromise(signal).then(() => {
      disabled = dataTableMapping.setDisabled(false)
    })
  }

  // Automap all the rows that are visible
  async function autoMapPromise(signal: AbortSignal) {
    const pag = dataTableMapping.getTablePagination()
    const { currentPage, rowsPerPage } = pag
    if (!currentPage || !rowsPerPage) return
    // Get the rows that are visible for the user
    previousPage = currentPage
    const startIndex = rowsPerPage * (currentPage - 1)
    const endingIndex = rowsPerPage * currentPage
    const conceptsQuery = query().slice(startIndex, endingIndex).toObject()
    const concepts = await dataTableMapping.executeQueryAndReturnResults(conceptsQuery)
    if (concepts.queriedData.length) disabled = dataTableMapping.setDisabled(true)
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
    await dataTableMapping.updateRows(approveRows)
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
    const blob = await dataTableMapping.getBlob()
    const customBlob = dataTableCustomConcepts ? await dataTableCustomConcepts.getBlob() : undefined
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

  // Load the file to start mapping
  async function load(): Promise<void> {
    const urlId = $page.url.searchParams.get('id')
    if (!urlId) return goto(`${base}/`)
    $selectedFileId = urlId
    readFile()
  }

  // Sync the file to the cloud implementation
  async function syncFile() {
    if (!dataTableMapping) return
    const blob = await dataTableMapping.getBlob()
    console.log("BLOB ", blob)
    console.log("CUSTOM ", customConceptsFile)
    if (!blob) return
    const customBlob = dataTableCustomConcepts ? await dataTableCustomConcepts.getBlob() : undefined
    if (!$databaseImpl) await loadImplementationDB()
    await $databaseImpl?.editKeunFile($selectedFileId, blob)
    if(customBlob) await $databaseImpl?.editCustomKeunFile($selectedCustomFileId, customBlob)
  }

  // A method to create the meta data per column
  function modifyUsagiColumnMetadata(columns: IColumnMetaData[]): IColumnMetaData[] {
    const usagiColumnsMap = columnsUsagi.reduce((acc, cur) => {
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
    const addedColumns = columnsUsagi.reduce<IColumnMetaData[]>((acc, cur) => {
      if (!columnIds.includes(cur.id)) acc.push(cur)
      return acc
    }, [])
    return modifiedColumns.concat(addedColumns)
  }

  // A method to create the meta data per column for custom concepts
  function modifyCustomConceptsColumnMetadata(columns: IColumnMetaData[]): IColumnMetaData[] {
    const customConceptsColumnMap = columnsCustomConcept.reduce((acc, cur) => {
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
    const addedColumns = columnsCustomConcept.reduce<IColumnMetaData[]>((acc, cur) => {
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

  $: {
    console.log("TESTING ", dataTableCustomConcepts, " AND ", customConceptsFile)
  }
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
    bind:this={dataTableMapping}
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
      table={dataTableMapping}
      customTable={dataTableCustomConcepts}
      bind:currentVisibleRows
      on:rowSelection={selectRow}
      on:autoMapRow={autoMapSingleRow}
    />
  </DataTable>

  {#if $settings}
    <AthenaSearch
      {selectedRow}
      {selectedRowIndex}
      mainTable={dataTableMapping}
      customTable={dataTableCustomConcepts}
      bind:globalAthenaFilter
      on:singleMapping={singleMapping}
      on:multipleMapping={multipleMapping}
      on:navigateRow={navigateRow}
      bind:this={search}
    />
  {/if}

  <div class="custom-concepts">
    <DataTable
      data={customConceptsFile}
      options={customTableOptions}
      modifyColumnMetadata={modifyCustomConceptsColumnMetadata}
      bind:this={dataTableCustomConcepts}
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

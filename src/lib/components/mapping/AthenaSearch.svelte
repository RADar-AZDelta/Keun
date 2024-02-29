<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { dev } from '$app/environment'
  import { query } from 'arquero'
  import { customTable, settings, table } from '$lib/store'
  import { localStorageGetter } from '@radar-azdelta-int/radar-utils'
  import type Query from 'arquero/dist/types/query/query'
  import { Search } from '@radar-azdelta/svelte-athena-search'
  import { addExtraFields, resetRow } from '$lib/mappingUtils'
  import SearchHead from '$lib/components/mapping/SearchHead.svelte'
  import CustomView from '$lib/components/mapping/views/CustomView.svelte'
  import Details from '$lib/components/mapping/details/Details.svelte'
  import MappedView from '$lib/components/mapping/views/MappedView.svelte'
  import type { IView } from '@radar-azdelta/svelte-athena-search'
  import type {
    IAthenaRow,
    IMappedRow,
    IMappedRows,
    IUsagiAllExtra,
    IUsagiRow,
    MappingEvents,
    NavigateRowED,
  } from '$lib/components/Types'
  import type {
    CustomMappingInputED,
    EquivalenceChangeED,
    RemoveMappingED,
    UpdateDetailsED,
  } from '$lib/components/Types'
  import { SvgIcon, clickOutside } from '@radar-azdelta-int/radar-svelte-components'
  import AthenaActions from './views/AthenaActions.svelte'

  export let selectedRow: IUsagiRow,
    selectedRowIndex: number,
    globalAthenaFilter: { column: string; filter: string | undefined }

  const dispatch = createEventDispatcher<MappingEvents>()
  const views: IView[] = [
    { name: 'custom concept', value: 'custom', viewSlot: 1 },
    { name: 'mapped concepts', value: 'mapped', viewSlot: 2 },
  ]

  let dialog: HTMLDialogElement
  let mappedData: (IMappedRow | object)[] = [{}]
  let reviewer: string = '',
    comment: string = '',
    equivalence: string = 'EQUAL'
  let activatedAthenaFilters = new Map<string, string[]>([['standardConcept', ['Standard']]])
  let mappedToConceptIds: IMappedRows = {}

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // Delete a custom concept from the custom concept table
  async function removeFromCustomTable(conceptId: number, conceptName: string) {
    const params = <Query>query().params({ id: conceptId, name: conceptName })
    const existanceQuery = params
      .filter((r: any, p: any) => r.concept_id === p.id && r.concept_name === p.name)
      .toObject()
    const concepts = await $customTable.executeQueryAndReturnResults(existanceQuery)
    if (concepts.indices.length) await $customTable.deleteRows(concepts.indices)
  }

  // Delete the mapping in the table & update the other rows if it has multiple concepts that are mapped to the row
  async function removeMapping(e: CustomEvent<RemoveMappingED>): Promise<void> {
    const { conceptId, conceptName } = e.detail
    if (conceptId === 0) removeFromCustomTable(conceptId, conceptName)
    const params = <Query>query().params({ code: selectedRow.sourceCode })
    const conceptsQuery = params.filter((r: any, p: any) => r.sourceCode === p.code).toObject()
    const concepts = await $table.executeQueryAndReturnResults(conceptsQuery)
    if (!concepts.indices.length) return
    if (concepts.indices.length > 1) {
      const rowListIndex = concepts.queriedData.findIndex(
        (r: any) => r.conceptId === conceptId && r.conceptName === conceptName,
      )
      const originalIndex = concepts.indices[rowListIndex]
      const extraIndices = concepts.indices.filter((i: number) => i !== originalIndex)
      const updatedRows = new Map<number, Record<string, any>>()
      extraIndices.forEach((i: number) => updatedRows.set(i, { 'ADD_INFO:numberOfConcepts': extraIndices.length }))
      await $table.updateRows(updatedRows)
      await $table.deleteRows([originalIndex])
    } else {
      const index = concepts.indices[0]
      const reset = await resetRow()
      await $table.updateRows(new Map([[index, reset]]))
    }
    fillMappedTable()
  }

  // Map a new custom concept to a row
  async function customMapping(e: CustomEvent<CustomMappingInputED>) {
    if (dev) console.log('mapCustmoRow: Map a row to a custom concept')
    const { row, action } = e.detail
    if ($settings.mapToMultipleConcepts) {
      mappedData = [...mappedData, row]
      Object.assign(mappedToConceptIds, { [row.conceptId]: 'SEMI-APPROVED' })
    } else {
      mappedData = [row]
      Object.assign(mappedToConceptIds, { [row.conceptId]: 'SEMI-APPROVED' })
    }
    const customConcept = e.detail.row
    let mappedRow = await addExtraFields(selectedRow)
    const update: IUsagiAllExtra = {
      conceptId: customConcept.conceptId,
      conceptName: customConcept.conceptName,
      domainId: customConcept.domainId,
      vocabularyId: customConcept.vocabularyId,
      comment,
      assignedReviewer: reviewer,
      mappingStatus: 'SEMI-APPROVED',
      'ADD_INFO:customConcept': true,
    }
    Object.assign(mappedRow, update)
    if (!$settings || !$settings.mapToMultipleConcepts)
      return await $table.updateRows(new Map([[selectedRowIndex, mappedRow]]))

    const conceptsParams = <Query>query().params({ code: mappedRow.sourceCode })
    const conceptsQuery = conceptsParams.filter((r: any, p: any) => r.sourceCode === p.code).toObject()
    const concepts = await $table.executeQueryAndReturnResults(conceptsQuery)
    if (concepts.queriedData.length === 1 && !concepts.queriedData[0].conceptName)
      return await $table.updateRows(new Map([[selectedRowIndex, mappedRow]]))

    mappedRow['ADD_INFO:numberOfConcepts'] = concepts.indices.length + 1
    const rowsToUpdate = new Map()
    concepts.indices.forEach((i: number) =>
      rowsToUpdate.set(i, { 'ADD_INFO:numberOfConcepts': concepts.indices.length + 1 }),
    )
    await $table.updateRows(rowsToUpdate)
    await $table.insertRows([mappedRow])
  }

  ///////////////////////////// DETAILS METHODS /////////////////////////////

  async function onUpdateDetails(e: CustomEvent<UpdateDetailsED>) {
    const rows = new Map([[selectedRowIndex, { comment: e.detail.comments, assignedReviewer: e.detail.reviewer }]])
    await $table.updateRows(rows)
  }

  const equivalenceChange = (e: CustomEvent<EquivalenceChangeED>) => (equivalence = e.detail.equivalence)

  ///////////////////////////// ATHENA ROW METHODS /////////////////////////////

  async function getAllMappedToConcepts() {
    if (!selectedRow?.sourceCode) return
    const params = <Query>query().params({ code: selectedRow.sourceCode })
    const rowsQuery = params.filter((r: any, p: any) => r.sourceCode === p.code).toObject()
    const rows = await $table.executeQueryAndReturnResults(rowsQuery)
    mappedToConceptIds = {}
    for (const row of rows.queriedData) Object.assign(mappedToConceptIds, { [row.conceptId]: row.mappingStatus })
  }

  ///////////////////////////// MAPPED TABLE METHODS /////////////////////////////

  // A method to fill the table with the already mapped concepts
  async function fillMappedTable() {
    mappedData = []
    if (!selectedRow?.sourceCode) return
    const queryParams = <Query>query().params({ source: selectedRow.sourceCode })
    const conceptsQuery = queryParams.filter((d: any, p: any) => d.sourceCode === p.source && d.conceptName).toObject()
    const concepts = await $table.executeQueryAndReturnResults(conceptsQuery)
    if (!concepts.queriedData.length) return (mappedData = [{}])
    const newMappedData: (object | IMappedRow)[] = []
    for (let concept of concepts.queriedData) {
      const con = {
        sourceCode: concept.sourceCode,
        sourceName: concept.sourceName,
        conceptId: concept.conceptId,
        conceptName: concept.conceptName,
        customConcept: concept.conceptId === '0' ? true : false,
      }
      if (!newMappedData.includes(con)) newMappedData.push(con)
    }
    mappedData = newMappedData
  }

  ///////////////////////////// HEAD METHODS /////////////////////////////

  const onNavigateRow = (e: CustomEvent<NavigateRowED>) => dispatch('navigateRow', { ...e.detail })

  ///////////////////////////// DIALOG METHODS /////////////////////////////

  const closeDialog = () => dialog.close()

  export async function showDialog(): Promise<void> {
    dialog.showModal()
    fillMappedTable()
    comment = ''
    reviewer = ''
  }

  function EscapeListener(e: KeyboardEvent) {
    if (e.key === 'Escape') closeDialog()
  }

  const addKeyListener = () => dialog.addEventListener('keydown', EscapeListener)

  onMount(() => {
    const savedFilters = localStorageGetter('AthenaFilters')
    activatedAthenaFilters = savedFilters ?? new Map<string, string[]>([['standardConcept', ['Standard']]])
  })

  $: {
    if (dialog) addKeyListener
  }

  $: {
    selectedRowIndex
    getAllMappedToConcepts()
    fillMappedTable()
  }
</script>

<dialog bind:this={dialog} class="athena-dialog">
  <div class="dialog-container" use:clickOutside on:outClick={closeDialog}>
    <button class="close-dialog" on:click={closeDialog}><SvgIcon id="x" /></button>
    <section class="search-container">
      <Search {views} bind:globalFilter={globalAthenaFilter} showFilters={true}>
        <div slot="action-athena" let:renderedRow class="actions-grid">
          <AthenaActions
            {renderedRow}
            {mappedToConceptIds}
            {selectedRow}
            {selectedRowIndex}
            {mappedData}
            {equivalence}
            {comment}
            {reviewer}
          />
        </div>
        <div slot="upperSlot">
          <SearchHead {selectedRow} on:navigateRow={onNavigateRow} />
        </div>
        <div slot="slotView1">
          <CustomView {selectedRow} on:customMappingInput={customMapping} />
        </div>
        <div slot="slotView2">
          <MappedView {mappedData} on:removeMapping={removeMapping} />
        </div>
        <div slot="rightSlot">
          <Details usagiRow={selectedRow} on:updateDetails={onUpdateDetails} on:equivalenceChange={equivalenceChange} />
        </div>
      </Search>
    </section>
  </div>
</dialog>

<style>
  .actions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    height: max-content;
    max-width: 100%;
  }

  button {
    padding: 0 5px;
    font-size: 10px;
  }

  .athena-dialog {
    width: 90%;
    height: 90%;
    border: none;
    border-radius: 10px;
    padding: 0;
    top: 0;
    left: 0;
    transform: none;
  }

  .dialog-container {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }

  .close-dialog {
    position: absolute;
    right: 1rem;
    top: 1rem;
    border: none;
    background-color: inherit;
    color: #4f4f4f;
  }

  .close-dialog:hover {
    color: #3b3b3b;
  }

  .close-dialog:focus {
    outline: none;
    box-shadow: 0 0 0 2px #cecece;
  }

  .search-container {
    padding: 0.5rem 0 0 0;
  }
</style>

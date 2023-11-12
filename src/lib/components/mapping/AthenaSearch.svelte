<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { dev } from '$app/environment'
  import { query } from 'arquero'
  import { localStorageGetter } from '$lib/utils'
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'
  import type Query from 'arquero/dist/types/query/query'
  // @ts-ignore
  import { Search } from '@radar-azdelta/svelte-athena-search'
  import { settings } from '$lib/store'
  import { addExtraFields, resetRow } from '$lib/mappingUtils'
  import { clickOutside } from '$lib/actions/clickOutside'
  import SearchHead from '$lib/components/mapping/SearchHead.svelte'
  import CustomView from '$lib/components/mapping/views/CustomView.svelte'
  import Details from '$lib/components/mapping/details/Details.svelte'
  import MappedView from '$lib/components/mapping/views/MappedView.svelte'
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import type { IView } from '@radar-azdelta/svelte-athena-search/dist/Types'
  import type {
    IAthenaRow,
    IMappedRow,
    IUsagiAllExtra,
    IUsagiRow,
    MappingEvents,
    NavigateRowEventDetail,
  } from '$lib/components/Types'
  import type {
    CustomMappingInputEventDetail,
    EquivalenceChangeEventDetail,
    RemoveMappingEventDetail,
    UpdateDetailsEventDetail,
  } from '$lib/components/Types'

  export let selectedRow: IUsagiRow,
    selectedRowIndex: number,
    mainTable: DataTable,
    customTable: DataTable,
    globalAthenaFilter: { column: string; filter: string | undefined }

  const dispatch = createEventDispatcher<MappingEvents>()
  const views: IView[] = [
    { name: 'custom concept', value: 'custom', viewSlot: 'slotView1' },
    { name: 'mapped concepts', value: 'mapped', viewSlot: 'slotView2' },
  ]

  let dialog: HTMLDialogElement
  let mappedData: (IMappedRow | object)[] = [{}]
  let reviewer: string = '',
    comment: string = '',
    equivalence: string = 'EQUAL'
  let activatedAthenaFilters = new Map<string, string[]>([['standardConcept', ['Standard']]])
  let mappedToConceptIds: number[] = []

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // A method that catches the event for single mapping and throws an event to the parent
  async function singleMapping(row: IAthenaRow): Promise<void> {
    row.equivalence = equivalence
    mappedToConceptIds = [row.id]
    dispatch('singleMapping', { originalRow: selectedRow, row, extra: { comment, reviewer } })
  }

  // A method that catches the event for multiple mapping and throws an event to the parent
  async function multipleMapping(row: IAthenaRow): Promise<void> {
    row.equivalence = equivalence
    mappedToConceptIds = [...mappedToConceptIds, row.id]
    dispatch('multipleMapping', { originalRow: selectedRow, row, extra: { comment, reviewer } })
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // Delete a custom concept from the custom concept table
  async function removeFromCustomTable(conceptId: number, conceptName: string) {
    const params = <Query>query().params({ id: conceptId, name: conceptName })
    const existanceQuery = params
      .filter((r: any, p: any) => r.concept_id === p.id && r.concept_name === p.name)
      .toObject()
    const concepts = await customTable.executeQueryAndReturnResults(existanceQuery)
    if (concepts.indices.length) await customTable.deleteRows(concepts.indices)
  }

  // Delete the mapping in the table & update the other rows if it has multiple concepts that are mapped to the row
  async function removeMapping(e: CustomEvent<RemoveMappingEventDetail>): Promise<void> {
    console.log('REMOVE MAPPING')
    const { conceptId, conceptName } = e.detail
    if (conceptId === 0) removeFromCustomTable(conceptId, conceptName)
    const params = <Query>query().params({ code: selectedRow.sourceCode })
    const conceptsQuery = params.filter((r: any, p: any) => r.sourceCode === p.code).toObject()
    const concepts = await mainTable.executeQueryAndReturnResults(conceptsQuery)
    console.log(concepts)
    if (!concepts.indices.length) return
    if (concepts.indices.length > 1) {
      const rowListIndex = concepts.queriedData.findIndex(
        (r: any) => r.conceptId === conceptId && r.conceptName === conceptName
      )
      debugger
      const originalIndex = concepts.indices[rowListIndex]
      const extraIndices = concepts.indices.filter((i: number) => i !== originalIndex)
      const updatedRows = new Map<number, Record<string, any>>()
      extraIndices.forEach((i: number) => updatedRows.set(i, { 'ADD_INFO:numberOfConcepts': extraIndices.length }))
      await mainTable.updateRows(updatedRows)
      await mainTable.deleteRows([originalIndex])
    } else {
      const index = concepts.indices[0]
      const reset = await resetRow()
      await mainTable.updateRows(new Map([[index, reset]]))
    }
    fillMappedTable()
  }

  // Map a new custom concept to a row
  async function customMapping(e: CustomEvent<CustomMappingInputEventDetail>) {
    if (dev) console.log('mapCustmoRow: Map a row to a custom concept')
    if ($settings.mapToMultipleConcepts) {
      mappedData = [...mappedData, e.detail.row]
      mappedToConceptIds = [...mappedToConceptIds, e.detail.row.conceptId]
    } else {
      mappedData = [e.detail.row]
      mappedToConceptIds = [e.detail.row.conceptId]
    }
    const customConcept = e.detail.row
    let mappedRow = await addExtraFields(selectedRow, false)
    const update: IUsagiAllExtra = {
      conceptId: customConcept.conceptId,
      conceptName: customConcept.conceptName,
      comment,
      assignedReviewer: reviewer,
      mappingStatus: 'SEMI-APPROVED',
      'ADD_INFO:customConcept': true,
    }
    Object.assign(mappedRow, update)
    if (!$settings || !$settings.mapToMultipleConcepts) {
      return await mainTable.updateRows(new Map([[selectedRowIndex, mappedRow]]))
    }

    const conceptsParams = <Query>query().params({ code: mappedRow.sourceCode })
    const conceptsQuery = conceptsParams.filter((r: any, p: any) => r.sourceCode === p.code).toObject()
    const concepts = await mainTable.executeQueryAndReturnResults(conceptsQuery)
    // Update the test row if it is still in there
    if (concepts.queriedData.length === 1 && !concepts.queriedData[0].conceptName)
      return await mainTable.updateRows(new Map([[selectedRowIndex, mappedRow]]))

    mappedRow['ADD_INFO:numberOfConcepts'] = concepts.indices.length + 1
    const rowsToUpdate = new Map()
    concepts.indices.forEach((i: number) =>
      rowsToUpdate.set(i, { 'ADD_INFO:numberOfConcepts': concepts.indices.length + 1 })
    )
    await mainTable.updateRows(rowsToUpdate)
    await mainTable.insertRows([mappedRow])
  }

  ///////////////////////////// DETAILS METHODS /////////////////////////////

  async function onUpdateDetails(e: CustomEvent<UpdateDetailsEventDetail>) {
    const rows = new Map([[selectedRowIndex, { comment: e.detail.comments, assignedReviewer: e.detail.reviewer }]])
    await mainTable.updateRows(rows)
  }

  async function equivalenceChange(e: CustomEvent<EquivalenceChangeEventDetail>) {
    equivalence = e.detail.equivalence
  }

  ///////////////////////////// ATHENA ROW METHODS /////////////////////////////

  async function referToAthena(id: string) {
    const referUrl = import.meta.env.VITE_ATHENA_DETAIL + id
    window.open(encodeURI(referUrl), '_blank')?.focus()
  }

  async function onClickMapping(renderedRow: IAthenaRow) {
    if ($settings.mapToMultipleConcepts) multipleMapping(renderedRow)
    else singleMapping(renderedRow)
    selectedRow.conceptId = renderedRow.id
    const mappedRow = {
      sourceCode: selectedRow.sourceCode,
      sourceName: selectedRow.sourceName,
      conceptId: renderedRow.id,
      conceptName: renderedRow.name,
      customConcept: renderedRow.id === 0 ? true : false,
    }
    if ($settings.mapToMultipleConcepts) mappedData = [...mappedData, mappedRow]
    else mappedData = [mappedRow]
  }

  async function getAllMappedToConcepts() {
    if (!$settings.mapToMultipleConcepts || !selectedRow?.sourceCode) return
    const params = <Query>query().params({ code: selectedRow.sourceCode })
    const rowsQuery = params.filter((r: any, p: any) => r.sourceCode === p.code).toObject()
    const rows = await mainTable.executeQueryAndReturnResults(rowsQuery)
    mappedToConceptIds = rows.queriedData.map((r: IUsagiRow) => r.conceptId)
  }

  ///////////////////////////// MAPPED TABLE METHODS /////////////////////////////

  // A method to fill the table with the already mapped concepts
  async function fillMappedTable() {
    console.log('FILL MAPPED')
    mappedData = []
    if (!selectedRow?.sourceCode) return
    const queryParams = <Query>query().params({ source: selectedRow.sourceCode })
    const conceptsQuery = queryParams.filter((d: any, p: any) => d.sourceCode === p.source && d.conceptName).toObject()
    const concepts = await mainTable.executeQueryAndReturnResults(conceptsQuery)
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
    console.log('SHOW MAPPED ', mappedData)
  }

  ///////////////////////////// HEAD METHODS /////////////////////////////

  async function onNavigateRow(e: CustomEvent<NavigateRowEventDetail>) {
    dispatch('navigateRow', { ...e.detail })
  }

  ///////////////////////////// DIALOG METHODS /////////////////////////////

  async function closeDialog(): Promise<void> {
    dialog.close()
  }

  export async function showDialog(): Promise<void> {
    dialog.showModal()
    fillMappedTable()
    comment = ''
    reviewer = ''
  }

  onMount(() => {
    const savedFilters = localStorageGetter('AthenaFilters')
    activatedAthenaFilters = savedFilters
      ? savedFilters
      : new Map<string, string[]>([['standardConcept', ['Standard']]])
  })

  $: {
    if (dialog)
      dialog.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeDialog()
      })
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
      <Search {views} bind:globalFilter={globalAthenaFilter}>
        <div slot="action-athena" let:renderedRow>
          {#if mappedToConceptIds.includes(renderedRow.id)}
            <button title="Map to row" style="background-color: greenyellow;"><SvgIcon id="check" /></button>
          {:else}
            <button on:click={() => onClickMapping(renderedRow)}><SvgIcon id="plus" /></button>
          {/if}
          <button on:click={() => referToAthena(renderedRow.id)}><SvgIcon id="link" /></button>
        </div>
        <div slot="upperSlot">
          <SearchHead {selectedRow} {mainTable} on:navigateRow={onNavigateRow} />
        </div>
        <div slot="slotView1">
          <CustomView {selectedRow} {customTable} on:customMappingInput={customMapping} />
        </div>
        <div slot="slotView2">
          <MappedView {mappedData} on:removeMapping={removeMapping} />
        </div>
        <div slot="rightSlot">
          <Details on:updateDetails={onUpdateDetails} on:equivalenceChange={equivalenceChange} />
        </div>
      </Search>
    </section>
  </div>
</dialog>

<style>
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

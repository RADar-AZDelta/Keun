<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { query } from 'arquero'
  import { localStorageGetter } from '$lib/utils'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import type Query from 'arquero/dist/types/query/query'
  // @ts-ignore
  import { Search } from '@radar-azdelta/svelte-athena-search'
  import { customConcept, settings } from '$lib/store'
  import { fillInAdditionalFields, resetRow } from '$lib/mappingUtils/utils'
  import { clickOutside } from '$lib/actions/clickOutside'
  import SearchHead from '$lib/components/Mapping/SearchHead.svelte'
  import CustomView from '$lib/components/Mapping/views/CustomView.svelte'
  import Details from '$lib/components/Mapping/details/Details.svelte'
  import MappedView from '$lib/components/Mapping/views/MappedView.svelte'
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import type { IView } from '@radar-azdelta/svelte-athena-search/dist/Types'
  import type { ICustomConcept } from '$lib/components/Types'
  import type {
    CustomMappingInputEventDetail,
    CustomOptionsEvents,
    EquivalenceChangeEventDetail,
    RemoveMappingEventDetail,
    RowChangeEventDetail,
    UpdateDetailsEventDetail,
  } from '$lib/components/Types'

  export let selectedRow: Record<string, any>,
    selectedRowIndex: number,
    mainTable: DataTable,
    customTable: DataTable,
    globalAthenaFilter: { column: string; filter: string | undefined }

  const dispatch = createEventDispatcher<CustomOptionsEvents>()
  const views: IView[] = [
    { name: 'custom concept', value: 'custom', viewSlot: 'slotView1' },
    { name: 'mapped concepts', value: 'mapped', viewSlot: 'slotView2' },
  ]

  let dialog: HTMLDialogElement
  let mappedData: Record<string, any>[] = [{}],
    customConceptData: Record<string, any>[] = [{}]
  let reviewer: string = '',
    comment: string = '',
    equivalence: string = 'EQUAL'
  let activatedAthenaFilters = new Map<string, string[]>([['standardConcept', ['Standard']]])

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // A method that catches the event for single mapping and throws an event to the parent
  async function singleMapping(row: Record<string, any>): Promise<void> {
    row.equivalence = equivalence
    dispatch('singleMapping', { originalRow: selectedRow, row, extra: { comment, reviewer } })
  }

  // A method that catches the event for multiple mapping and throws an event to the parent
  async function multipleMapping(row: Record<string, any>): Promise<void> {
    row.equivalence = equivalence
    dispatch('multipleMapping', { originalRow: selectedRow, row, extra: { comment, reviewer } })
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // Delete a custom concept from the custom concept table
  async function removeFromCustomTable(conceptId: string, conceptName: string) {
    const params = <Query>query().params({ id: conceptId, name: conceptName })
    const existanceQuery = params
      .filter((r: any, p: any) => r.concept_id === p.id && r.concept_name === p.name)
      .toObject()
    const concepts = await customTable.executeQueryAndReturnResults(existanceQuery)
    if (concepts.indices.length) await customTable.deleteRows(concepts.indices)
  }

  // Delete the mapping in the table & update the other rows if it has multiple concepts that are mapped to the row
  async function removeMapping(e: CustomEvent<RemoveMappingEventDetail>): Promise<void> {
    const { conceptId, conceptName } = e.detail
    if (conceptId === '0') removeFromCustomTable(conceptId, conceptName)
    const params = <Query>query().params({ code: selectedRow.sourceCode })
    const conceptsQuery = params.filter((r: any, p: any) => r.sourceCode === p.code).toObject()
    const concepts = await mainTable.executeQueryAndReturnResults(conceptsQuery)
    if (!concepts.indices.length) return
    if (concepts.indices.length > 1) {
      const rowListIndex = concepts.queriedData.find(
        (r: any) => r.conceptId === conceptId && r.conceptName === conceptName
      )
      const originalIndex = concepts.indices[rowListIndex]
      const extraIndices = concepts.indices.filter((i: number) => i !== originalIndex)
      const updatedRows = new Map<number, Record<string, any>>()
      extraIndices.forEach((i: number) => updatedRows.set(i, { 'ADD_INFO:numberOfConcepts': extraIndices.length }))
      await mainTable.updateRows(updatedRows)
      await mainTable.deleteRows(originalIndex)
    } else {
      const reset = await resetRow()
      await mainTable.updateRows(new Map([concepts.indices[0], reset]))
    }
    fillMappedTable()
  }

  // Map the new custom concept to the selected row
  async function mapCustomRow(customConcept: Record<string, any>) {
    let mappedRow = selectedRow
    mappedRow.conceptId = customConcept['concept_id']
    mappedRow.conceptName = customConcept['concept_name']
    mappedRow = await fillInAdditionalFields(mappedRow, selectedRow, false)
    mappedRow['ADD_INFO:customConcept'] = true
    if (!mappedRow['ADD_INFO:numberOfConcepts']) mappedRow['ADD_INFO:numberOfConcepts'] = 1
    mappedRow.comment = comment
    mappedRow.assignedReviewer = reviewer
    if (!$settings || !$settings.mapToMultipleConcepts)
      return await mainTable.updateRows(new Map([[selectedRowIndex, mappedRow]]))

    const conceptsParams = <Query>query().params({ code: mappedRow.sourceCode })
    const conceptsQuery = conceptsParams.filter((r: any, p: any) => r.sourceCode === p.code).toObject()
    const concepts = await mainTable.executeQueryAndReturnResults(conceptsQuery)
    if (concepts.queriedData.length === 1 && !concepts.queriedData[0].conceptId)
      return await mainTable.updateRows(new Map([[selectedRowIndex, mappedRow]]))

    mappedRow['ADD_INFO:numberOfConcepts'] = concepts.indices.length + 1
    const rowsToUpdate = new Map()
    concepts.indices.forEach((i: number) =>
      rowsToUpdate.set(i, { 'ADD_INFO:numberOfConcepts': concepts.indices.length + 1 })
    )
    await mainTable.updateRows(rowsToUpdate)
    await mainTable.insertRows([mappedRow])
  }

  // Add a new custom concept to the table with all custom concepts
  async function addCustomConcept(row: Record<string, any>) {
    const conceptRow = {
      concept_id: row.conceptId,
      concept_name: row.conceptName,
      domain_id: row.domainId,
      vocabulary_id: row.vocabularyId,
      concept_class_id: row.conceptClassId,
      standard_concept: row.standardConcept,
      concept_code: row.conceptCode,
      valid_start_date: row.validStartDate,
      valid_end_date: row.validEndDate,
      invalid_reason: row.invalidReason,
    }
    customConceptData = [conceptRow, ...customConceptData]
    const params = { name: row.conceptName, domain: row.domainId, vocab: row.vocabularyId, class: row.conceptClassId }
    const existanceParams = <Query>query().params(params)
    const existanceQuery = existanceParams
      .filter(
        (r: any, p: any) =>
          r.concept_name === p.name &&
          r.domain_id === p.domain &&
          r.vocabulary_id === p.vocab &&
          r.concept_class_id === p.class
      )
      .toObject()
    const existance = await customTable.executeQueryAndReturnResults(existanceQuery)
    if (!existance.indices.length) {
      const testRow = await customTable.getFullRow(0)
      if (testRow.domain_id === 'test') await customTable.deleteRows([0])
      await customTable.insertRows([customConcept])
    }
    return conceptRow
  }

  // Map a new custom concept to a row
  async function customMapping(e: CustomEvent<CustomMappingInputEventDetail>) {
    const row = <ICustomConcept>e.detail.row
    const customConcept = await addCustomConcept(row)
    await mapCustomRow(customConcept)
  }

  ///////////////////////////// DETAILS METHODS /////////////////////////////

  async function onUpdateDetails(e: CustomEvent<UpdateDetailsEventDetail>) {
    // Don't change the equivalence here --> the comment & reviewer can be assigned after the mapping but the equivalence not
    const rows = new Map([[e.detail.index, { comment: e.detail.comments, assignedReviewer: e.detail.reviewer }]])
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

  async function onClickMapping(renderedRow: Record<string, any>) {
    if ($settings.mapToMultipleConcepts) multipleMapping(renderedRow)
    else singleMapping(renderedRow)
    setVocabularyId()
    selectedRow.conceptId = renderedRow.id
  }

  ///////////////////////////// CUSTOM INPUT ROW METHODS /////////////////////////////

  // A method to set the custom concept vocabulary id from the settings
  function setVocabularyId(): void {
    if (!$settings?.hasOwnProperty('vocabularyIdCustomConcept')) return
    $customConcept.vocabulary_id = $settings.vocabularyIdCustomConcept
  }

  ///////////////////////////// MAPPED TABLE METHODS /////////////////////////////

  // A method to fill the table with the already mapped concepts
  async function fillMappedTable() {
    mappedData = []
    const code = selectedRow.sourceCode
    const queryParams = <Query>query().params({ source: code })
    const conceptsQuery = queryParams.filter((d: any, p: any) => d.sourceCode === p.code).toObject()
    const concepts = await mainTable.executeQueryAndReturnResults(conceptsQuery)
    if (!concepts.queriedData.length) return (mappedData = [{}])
    for (let concept of concepts.queriedData)
      mappedData.push({
        sourceCode: concept.sourceCode,
        sourceName: concept.sourceName,
        conceptId: concept.conceptId,
        conceptName: concept.conceptName,
        customConcept: concept.conceptId === '0' ? true : false,
      })
    mappedData
  }

  ///////////////////////////// HEAD METHODS /////////////////////////////

  // When a arrow button is clicked in the Athena pop-up to navigate between rows
  function onRowChange(e: CustomEvent<RowChangeEventDetail>): void {
    dispatch('rowChange', { ...e.detail })
  }

  ///////////////////////////// DIALOG METHODS /////////////////////////////

  async function closeDialog(): Promise<void> {
    dialog.close()
  }

  export async function showDialog(): Promise<void> {
    dialog.showModal()
    comment = ''
    reviewer = ''
    setVocabularyId()
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
</script>

<dialog bind:this={dialog} class="athena-dialog">
  <div class="dialog-container" use:clickOutside on:outClick={closeDialog}>
    <button class="close-dialog" on:click={closeDialog}><SvgIcon id="x" /></button>
    <section class="search-container">
      <Search {views} bind:globalFilter={globalAthenaFilter} >
        <div slot="action-athena" let:renderedRow>
          {#if selectedRow.conceptId === renderedRow.id}
            <button title="Map to row" style="background-color: greenyellow;"><SvgIcon id="check" /></button>
          {:else}
            <button on:click={() => onClickMapping(renderedRow)}><SvgIcon id="plus" /></button>
          {/if}
          <button on:click={() => referToAthena(renderedRow.id)}><SvgIcon id="link" /></button>
        </div>
        <div slot="upperSlot">
          <SearchHead {selectedRow} on:rowChange={onRowChange} />
        </div>
        <div slot="slotView1">
          <CustomView {customConceptData} {selectedRow} on:customMappingInput={customMapping} />
        </div>
        <div slot="slotView2">
          <MappedView {mappedData} on:removeMapping={removeMapping} />
        </div>
        <div slot="rightSlot">
          <Details
            selectedIndex={selectedRowIndex}
            on:updateDetails={onUpdateDetails}
            on:equivalenceChange={equivalenceChange}
          />
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

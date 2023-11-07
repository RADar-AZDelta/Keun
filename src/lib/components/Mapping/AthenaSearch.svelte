<script lang="ts">
  //////////////////////////////////////////////// Framework imports
  import { createEventDispatcher, onMount } from 'svelte'
  import { base } from '$app/paths'
  //////////////////////////////////////////////// Package imports
  import { query } from 'arquero'
  //////////////////////////////////////////////// Component & type imports
  import { localStorageGetter } from '$lib/utils'
  import type {
    CustomMappingInputEventDetail,
    CustomOptionsEvents,
    EquivalenceChangeEventDetail,
    ICustomConcept,
    RemoveMappingEventDetail,
    RowChangeEventDetail,
    UpdateDetailsEventDetail,
  } from '../Types'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import type Query from 'arquero/dist/types/query/query'
  import { clickOutside } from '$lib/actions/clickOutside'
  import { customConcept, settings } from '$lib/store'
  // @ts-ignore
  import { Search } from '@radar-azdelta/svelte-athena-search'
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import type { IView } from '@radar-azdelta/svelte-athena-search/dist/Types'
  import SearchHead from './SearchHead.svelte'
  import CustomView from './views/CustomView.svelte'
  import Details from './details/Details.svelte'
  import MappedView from './views/MappedView.svelte'

  export let selectedRow: Record<string, any>,
    selectedRowIndex: number,
    mainTable: DataTable,
    showModal: boolean = false

  // General variables
  const dispatch = createEventDispatcher<CustomOptionsEvents>()
  let layoutDialog: HTMLDialogElement,
    lastRow: boolean = false,
    errorMessage: string = ''
  // Table variables
  let reviewer: string = '',
    comment: string = '',
    equivalence: string = 'EQUAL'

  const views: IView[] = [
    { name: 'custom concept', value: 'custom', viewSlot: 'slotView1' },
    { name: 'mapped concepts', value: 'mapped', viewSlot: 'slotView2' },
  ]

  // Data variables
  let activatedAthenaFilters = new Map<string, string[]>([['standardConcept', ['Standard']]])

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////

  let mappedData: Record<string, any>[] = [{}],
    alreadyMapped: Record<string, Record<string, any>> = {},
    customConceptData: Record<string, any>[] = [{}]

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // A method that catches the event for single mapping and throws an event to the parent
  function singleMapping(row: Record<string, any>): void {
    row.equivalence = equivalence
    console.log("MAPPIGN ROW ", row)
    dispatch('singleMapping', { originalRow: selectedRow, row, extra: { comment, reviewer } })
  }

  // A method that catches the event for multiple mapping and throws an event to the parent
  function multipleMapping(row: Record<string, any>): void {
    row.equivalence = equivalence
    dispatch('multipleMapping', { originalRow: selectedRow, row, extra: { comment, reviewer } })
  }

  // A method to update the already mapped concepts (used to see the already mapped concepts for a certain row)
  function updateUniqueConceptIds(id: string, name: string, multiple: boolean): void | Record<string, any>[] {
    let alreadyMappedRow = alreadyMapped[selectedRow.sourceCode]
    // Check if there is multiple mapping
    if (multiple) {
      alreadyMappedRow = { conceptId: [id], conceptName: [name], custom: [false] }
      alreadyMapped[selectedRow.sourceCode] = alreadyMappedRow
      return fillMappedTable()
    }
    // If it is the first concept mapped to the row
    if (!alreadyMappedRow) alreadyMappedRow = { conceptId: [id], conceptName: [name], custom: [false] }
    else {
      alreadyMappedRow.conceptId.push(id)
      alreadyMappedRow.conceptName.push(name)
      alreadyMappedRow.custom.push(false)
    }
    alreadyMapped[selectedRow.sourceCode] = alreadyMappedRow
    return fillMappedTable()
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  async function fillUniqueConceptIds(row: Record<string, any>): Promise<void> {
    if (!row.conceptId) return
    let mappedRow = alreadyMapped[row.sourceCode]
    if (!mappedRow) {
      mappedRow = {
        conceptId: [row.conceptId],
        conceptName: [row.conceptName],
        custom: [row['ADD_INFO:customConcept'] ? true : false],
      }
      alreadyMapped[row.sourceCode] = mappedRow
      return
    }
    if (!mappedRow.conceptId.includes(row.conceptId) || !mappedRow.conceptName.includes(row.conceptName)) {
      mappedRow.conceptId.push(row.conceptId)
      mappedRow.conceptName.push(row.conceptName)
    }
    mappedRow.custom.push(row['ADD_INFO:customConcept'] ? true : false)
    alreadyMapped[row.sourceCode] = mappedRow
  }

  // A method to get all the mapped concept ids for a certain row
  async function getUniqueConceptIds(): Promise<void> {
    alreadyMapped = {}
    if (!selectedRow) return
    // Create a query that finds all rows with the same sourceCode as the selected row
    const rowsQuery = (<Query>query().params({ source: selectedRow.sourceCode }))
      .filter((d: any, params: any) => d.sourceCode == params.source)
      .toObject()
    const rows = await mainTable.executeQueryAndReturnResults(rowsQuery)
    for (let row of rows.queriedData) await fillUniqueConceptIds(row)
    fillMappedTable()
  }

  // A method to delete the mapping in the pop-up
  function removeMapping(e: CustomEvent<RemoveMappingEventDetail>): void {
    const { conceptId, conceptName } = e.detail
    // Check if the value needs to be erased, if there are multiple mappings for the same sourceCode it needs to be erased
    let erase = alreadyMapped[selectedRow.sourceCode].conceptId.length > 1
    const index = customConceptData.findIndex((r: any) => r.concept_id == conceptId && r.concept_name == conceptName)
    if (customConceptData.length > 1) customConceptData.splice(index, 1)

    dispatch('deleteRowInnerMapping', { conceptId, conceptName, erase, custom: true })
    removeUniqueConcept(conceptId, conceptName)
    fillMappedTable()
  }

  // A method to remove the concept from the alreadyMapped object
  function removeUniqueConcept(conceptId: string, conceptName: string): void {
    // Find the index of the conceptId and conceptName in the alreadyMapped object
    // There could be more instances with the same conceptId but other conceptName and vice versa so we need to check both
    const alreadyMappedRow = alreadyMapped[selectedRow.sourceCode]
    const conceptIdIndexes: number[] = alreadyMappedRow.conceptId.reduce(function (a: any, e: any, i: number) {
      if (e === conceptId) a.push(i)
      return a
    }, [])
    const conceptNameIndexes: number[] = alreadyMappedRow.conceptName.reduce(function (a: any, e: any, i: number) {
      if (e === conceptName) a.push(i)
      return a
    }, [])
    const index = conceptIdIndexes.filter(i => conceptNameIndexes.includes(i))[0]
    if (alreadyMapped[selectedRow.sourceCode].conceptId.length) {
      alreadyMapped[selectedRow.sourceCode].conceptId.splice(index, 1)
      alreadyMapped[selectedRow.sourceCode].conceptName.splice(index, 1)
      alreadyMapped[selectedRow.sourceCode].custom.splice(index, 1)
    } else delete alreadyMapped[selectedRow.sourceCode]
    alreadyMapped = alreadyMapped
  }

  // A method for custom mapping
  function customMapping(e: CustomEvent<CustomMappingInputEventDetail>) {
    errorMessage = ''
    const row = <ICustomConcept>e.detail.row
    dispatch('customMapping', { row, extra: { comment, reviewer } })

    if ($settings.mapToMultipleConcepts) {
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
    }

    let mappedRow = alreadyMapped[selectedRow.sourceCode]
    if (!mappedRow) {
      mappedRow = { conceptId: [selectedRow.sourceCode], conceptName: [row.conceptName], custom: [true] }
      return fillMappedTable()
    }
    if (!mappedRow.conceptId.length || !mappedRow.conceptName.length || !mappedRow.custom.length) {
      mappedRow = { conceptId: [selectedRow.sourceCode], conceptName: [row.conceptName], custom: [true] }
      return fillMappedTable()
    }
    mappedRow.conceptId.push(selectedRow.sourceCode)
    mappedRow.conceptName.push(row.conceptName)
    mappedRow.custom.push(true)
    fillMappedTable()
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
    if ($settings.mapToMultipleConcepts) {
      multipleMapping(renderedRow)
      updateUniqueConceptIds(renderedRow.id, renderedRow.name, true)
    } else {
      singleMapping(renderedRow)
      updateUniqueConceptIds(renderedRow.id, renderedRow.name, false)
    }
  }

  ///////////////////////////// CUSTOM INPUT ROW METHODS /////////////////////////////

  // A method to set the custom concept vocabulary id from the settings
  function setVocabularyId(): void {
    if (!$settings?.hasOwnProperty('vocabularyIdCustomConcept')) return
    $customConcept.vocabulary_id = $settings.vocabularyIdCustomConcept
  }

  ///////////////////////////// MAPPED TABLE METHODS /////////////////////////////

  // A method to fill the table with the already mapped concepts
  function fillMappedTable(): void | Record<string, any>[] {
    mappedData = []
    const code = selectedRow.sourceCode
    // If there are no concepts mapped yet, fill the array with an empty object
    // This empty object is needed because the DataTable component uses it to determine the data type
    if (!Object.keys(alreadyMapped).includes(code)) return (mappedData = [{}])
    if (!alreadyMapped[code].conceptId.length) return (mappedData = [{}])
    for (let i = 0; i < alreadyMapped[code].conceptId.length; i++) {
      mappedData.push({
        sourceCode: code,
        sourceName: selectedRow.sourceName,
        conceptId: alreadyMapped[code].conceptId[i],
        conceptName: alreadyMapped[code].conceptName[i],
        customConcept: alreadyMapped[code].custom[i],
      })
    }
    mappedData = mappedData
  }

  ///////////////////////////// HEAD METHODS /////////////////////////////

  // When a arrow button is clicked in the Athena pop-up to navigate between rows
  function onRowChange(e: CustomEvent<RowChangeEventDetail>): void {
    dispatch('rowChange', { ...e.detail })
  }

  ///////////////////////////// DIALOG METHODS /////////////////////////////

  // A method to close the dialog if it was opened
  function closeDialog(): void {
    if (!layoutDialog.attributes.getNamedItem('open')) return
    layoutDialog.close()
    dispatch('generalVisibilityChanged', { visibility: false })
  }

  // A method to open the dialog if it was closed
  function openDialog(): void {
    setVocabularyId()
    if (layoutDialog?.attributes.getNamedItem('open')) return
    comment = ''
    reviewer = ''
    layoutDialog.showModal()
  }

  onMount(() => {
    const savedFilters = localStorageGetter('AthenaFilters')
    activatedAthenaFilters = savedFilters
      ? savedFilters
      : new Map<string, string[]>([['standardConcept', ['Standard']]])
    dispatch('filterOptionsChanged', { filters: activatedAthenaFilters })
  })

  $: {
    selectedRowIndex
    if (mainTable) {
      const pagination = mainTable.getTablePagination()
      if (pagination.totalRows == selectedRowIndex) lastRow = true
      else lastRow = false
    }
  }

  $: {
    if (layoutDialog)
      layoutDialog.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') dispatch('generalVisibilityChanged', { visibility: false })
      })
  }

  $: {
    if (showModal == true) openDialog()
    else if (layoutDialog) closeDialog()
  }

  $: {
    selectedRow
    getUniqueConceptIds()
  }
</script>

<dialog bind:this={layoutDialog} data-name="athena-dialog">
  <div data-name="dialog-container" use:clickOutside on:outClick={closeDialog}>
    <button data-name="close-dialog" on:click={closeDialog}>
      <SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
    </button>
    <section class="search-container">
      <Search {views}>
        <div slot="action-athena" let:renderedRow>
          {#if Object.keys(alreadyMapped).length && alreadyMapped[Object.keys(alreadyMapped)[0]].conceptId.includes(renderedRow.id)}
            <button title="Map to row" style="background-color: greenyellow;">
              <SvgIcon href="{base}/icons.svg" id="check" width="16px" height="16px" />
            </button>
          {:else}
            <button on:click={() => onClickMapping(renderedRow)}>
              <SvgIcon href="{base}/icons.svg" id="plus" width="16px" height="16px" />
            </button>
          {/if}
          <button on:click={() => referToAthena(renderedRow.id)}
            ><SvgIcon href="{base}/icons.svg" id="link" width="16px" height="16px" /></button
          >
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
  .search-container {
    padding: 0.5rem 0 0 0;
  }
</style>

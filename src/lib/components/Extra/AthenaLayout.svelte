<!-- <script lang="ts">
  //////////////////////////////////////////////// Framework imports
  import { createEventDispatcher, onMount } from 'svelte'
  import { base } from '$app/paths'
  //////////////////////////////////////////////// Package imports
  import { query } from 'arquero'
  import debounce from 'lodash.debounce'
  import DataTable, { type FetchDataFunc, type IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  //////////////////////////////////////////////// Component & type imports
  import Equivalence from '../Mapping/Equivalence.svelte'
  import AthenaFilter from './AthenaFilter.svelte'
  import filtersJSON from '$lib/data/filters.json'
  import columnsAthena from '$lib/data/columnsAthena.json'
  import columnCustomConcept from '$lib/data/columnsCustomConcept.json'
  import columnsAlreadyMapped from '$lib/data/columnsAlreadyMapped.json'
  import { localStorageGetter, localStorageSetter } from '$lib/utils'
  import type {
    CustomMappingInputEventDetail,
    CustomOptionsEvents,
    ICategories,
    ISides,
    MappingEventDetail,
    ReviewerChangedEventDetail,
    UpdateUniqueConceptIdsEventDetail,
  } from '../Types'
  import SvgIcon from './SvgIcon.svelte'
  import AthenaRow from '../Mapping/AthenaRow.svelte'
  import customConceptInfo from '$lib/data/customConceptInfo.json'
  import type Query from 'arquero/dist/types/query/query'
  import AutocompleteInputSettings from './AutocompleteInputSettings.svelte'
  import { clickOutside } from '$lib/actions/clickOutside'
  import CustomConceptInputRow from '../Mapping/CustomConceptInputRow.svelte'
  import { customConcept, settings } from '$lib/store'
  import { AthenaDataTypeImpl } from '$lib/dataTypes/AthenaDataTypeImpl'

  export let equivalenceMapping: string,
    selectedRow: Record<string, any>,
    selectedRowIndex: number,
    mainTable: DataTable,
    fetchData: FetchDataFunc,
    globalFilter: { column: string; filter: string | undefined },
    showModal: boolean = false,
    facets: Record<string, any> | undefined

  // General variables
  const dispatch = createEventDispatcher<CustomOptionsEvents>()
  let layoutDialog: HTMLDialogElement,
    openedFilter: string,
    lastRow: boolean = false,
    sidesShowed: ISides = {
      filters: true,
      details: true,
    },
    conceptSelection: string = 'athena',
    errorMessage: string = '',
    sidesSet: boolean = false

  // Table variables
  let reviewer: string = '',
    comment: string = ''

  // Data variables
  let JSONFilters = new Map<string, ICategories>([]),
    activatedAthenaFilters = new Map<string, string[]>([['standardConcept', ['Standard']]]),
    filterColors: Record<string, string> = {
      domain: '#ec3d31',
      concept: '#50a5ba',
      class: '#6967d2',
      vocab: '#ffa200',
      validity: '#ad007c',
    },
    filterNames: Record<string, string> = {
      domain: 'domain',
      standardConcept: 'concept',
      conceptClass: 'class',
      Vocabulary: 'vocab',
      invalidReason: 'validity',
    }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////

  const athenaColumns: IColumnMetaData[] = columnsAthena,
    alreadyMappedColumns: IColumnMetaData[] = columnsAlreadyMapped

  let alreadyMappedData: Record<string, any>[] = [{}],
    dataTableAthena: DataTable,
    alreadyMapped: Record<string, Record<string, any>> = {},
    customConceptData: Record<string, any>[] = [{}]

  for (let filter of filtersJSON) {
    JSONFilters.set(filter.name, {
      altName: filter.altName,
      altNameFacet: filter.altNameFacet,
      options: filter.options,
    })
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // A method that catches the event for single mapping and throws an event to the parent
  function singleMapping(event: CustomEvent<MappingEventDetail>): void {
    dispatch('singleMapping', { originalRow: selectedRow, row: event.detail.row, extra: { comment, reviewer } })
  }

  // A method that catches the event for multiple mapping and throws an event to the parent
  function multipleMapping(event: CustomEvent<MappingEventDetail>): void {
    event.detail.row.comment = comment
    event.detail.row.assignedReviewer = reviewer
    dispatch('multipleMapping', { originalRow: selectedRow, row: event.detail.row, extra: { comment, reviewer } })
  }

  // A method to update the already mapped concepts (used to see the already mapped concepts for a certain row)
  function updateUniqueConceptIds(event: CustomEvent<UpdateUniqueConceptIdsEventDetail>): void | Record<string, any>[] {
    let alreadyMappedRow = alreadyMapped[selectedRow.sourceCode]
    // Check if there is multiple mapping
    if (!event.detail.multiple) {
      alreadyMappedRow = {
        conceptId: [event.detail.conceptId],
        conceptName: [event.detail.conceptName],
        custom: [false],
      }
      alreadyMapped[selectedRow.sourceCode] = alreadyMappedRow
      return fillMappedTable()
    }
    // If it is the first concept mapped to the row
    if (!alreadyMappedRow) {
      alreadyMappedRow = {
        conceptId: [event.detail.conceptId],
        conceptName: [event.detail.conceptName],
        custom: [false],
      }
    } else {
      alreadyMappedRow.conceptId.push(event.detail.conceptId)
      alreadyMappedRow.conceptName.push(event.detail.conceptName)
      alreadyMappedRow.custom.push(false)
    }
    alreadyMapped[selectedRow.sourceCode] = alreadyMappedRow
    return fillMappedTable()
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  // A method to update the API filters applied on the API call for Athena
  const updateAPIFilters = async (event: Event, filter: string, option: string): Promise<void> => {
    let chosenFilter = activatedAthenaFilters.get(filter)
    const inputValue = (event.target as HTMLInputElement).checked
    // If the filter is checked, add it
    if (chosenFilter && inputValue == true) chosenFilter.push(option)
    else if (chosenFilter && !inputValue && chosenFilter?.includes(option)) {
      // If the filter is unchecked and was already in the list, remove it
      chosenFilter.splice(chosenFilter.indexOf(option), 1)
      if (chosenFilter.length == 0) activatedAthenaFilters.delete(filter)
      else activatedAthenaFilters.set(filter, chosenFilter)
    } else activatedAthenaFilters.set(filter, [option])
    localStorageSetter('AthenaFilters', activatedAthenaFilters)
    activatedAthenaFilters = activatedAthenaFilters
    dispatch('filterOptionsChanged', { filters: activatedAthenaFilters })
  }

  // A method to check if the filter is already applied to the API call
  const checkIfFilterExists = (filter: string, altName: string | undefined, option: string): boolean => {
    let allFilters: Map<string, string[]> = activatedAthenaFilters
    const chosenFilter = !allFilters.get(filter)
      ? altName
        ? allFilters.get(altName)
        : undefined
      : allFilters.get(filter)

    return chosenFilter && chosenFilter?.includes(option) ? true : false
  }

  // A method to delete a filter when a filter for the Athena API call is removed in the section "Activated filters"
  function removeFilter(filter: string, option: string): void {
    activatedAthenaFilters.get(filter)!.splice(activatedAthenaFilters.get(filter)!.indexOf(option), 1)
    activatedAthenaFilters = activatedAthenaFilters
    localStorageSetter('AthenaFilters', activatedAthenaFilters)
    dispatch('filterOptionsChanged', { filters: activatedAthenaFilters })
  }

  // When a arrow button is clicked in the Athena pop-up to navigate between rows
  function onRowChange(up: boolean): void {
    dispatch('rowChange', { up, currentRow: selectedRow })
  }

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

  // A method for when the assigned reviewer has changed
  function reviewerChanged(e: CustomEvent<ReviewerChangedEventDetail>): void | string {
    if (!e.detail.reviewer) return (reviewer = '')
    reviewer = e.detail.reviewer
    dispatch('updateDetails', { index: selectedRowIndex, assignedReviewer: reviewer, comment })
  }

  // A method to close the dialog if it was opened
  function closeDialog(): void {
    if (!layoutDialog.attributes.getNamedItem('open')) return
    layoutDialog.close()
    dispatch('generalVisibilityChanged', { visibility: false })
  }

  // A method to open the dialog if it was closed
  function openDialog(): void {
    fetchData = fetchData
    setVocabularyId()
    if (layoutDialog?.attributes.getNamedItem('open')) return
    comment = ''
    reviewer = ''
    layoutDialog.showModal()
  }

  // A method to delete the mapping in the pop-up
  function removeMapping(conceptId: string, conceptName: string): void {
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
  function customMapping(e: CustomEvent<CustomMappingInputEventDetail>): void | string {
    errorMessage = ''
    const domainKeys = Object.keys(customConceptInfo.domain_id)
    const domainValues = Object.values(customConceptInfo.domain_id)
    // Check if the domain id and the concept class id are predefined values
    if (!domainKeys.includes(e.detail.domainId) || !domainValues.includes(e.detail.domainId))
      return (errorMessage = 'The domain id is not valid')
    const classKeys = Object.keys(customConceptInfo.concept_class_id)
    const classValues = Object.values(customConceptInfo.concept_class_id)
    if (!classKeys.includes(e.detail.conceptClassId) || !classValues.includes(e.detail.conceptClassId))
      return (errorMessage = 'The concept class id is not valid')

    dispatch('customMapping', {
      customConcept: e.detail,
      extra: {
        comment,
        reviewer,
      },
    })

    if ($settings.mapToMultipleConcepts) {
      customConceptData.push({
        concept_id: e.detail.conceptId,
        concept_name: e.detail.conceptName,
        domain_id: e.detail.domainId,
        vocabulary_id: e.detail.vocabularyId,
        concept_class_id: e.detail.conceptClassId,
        standard_concept: e.detail.standardConcept,
        concept_code: e.detail.conceptCode,
        valid_start_date: e.detail.validStartDate,
        valid_end_date: e.detail.validEndDate,
        invalid_reason: e.detail.invalidReason,
      })
      customConceptData = customConceptData
    }

    let alreadyMappedSelected = alreadyMapped[selectedRow.sourceCode]
    if (alreadyMappedSelected) {
      if (alreadyMappedSelected.conceptId.length > 0) alreadyMappedSelected.conceptId.push(selectedRow.sourceCode)
      else alreadyMappedSelected.conceptId = [selectedRow.sourceCode]
      if (alreadyMappedSelected.conceptName.length > 0)
        alreadyMappedSelected.conceptName.push($customConcept.concept_name)
      else alreadyMappedSelected.conceptName = [$customConcept.concept_name]
      if (alreadyMappedSelected.custom.length > 0) alreadyMappedSelected.custom.push(true)
      else alreadyMappedSelected.custom = [true]
    } else {
      alreadyMappedSelected = {
        conceptId: [selectedRow.sourceCode],
        conceptName: [$customConcept.concept_name],
        custom: [true],
      }
    }
    alreadyMapped[selectedRow.sourceCode] = alreadyMappedSelected
    fillMappedTable()
  }

  // A method to set the custom concept vocabulary id from the settings
  function setVocabularyId(): void {
    if (!$settings?.hasOwnProperty('vocabularyIdCustomConcept')) return
    $customConcept.vocabulary_id = $settings.vocabularyIdCustomConcept
  }

  // A method to set the visibility of the sides in the pop-up
  function sideVisibilityChange(side: 'details' | 'filters', value: boolean): void {
    sidesShowed[side] = value
    $settings.popupSidesShowed = sidesShowed
  }

  // A method for when the user fills in the comment
  const onInputComment = debounce(async (e: any): Promise<void> => {
    dispatch('updateDetails', { index: selectedRowIndex, comment, assignedReviewer: reviewer })
  }, 500)

  // A method to sync the sidesShowed object with the settings
  function setSidesShowed(): void {
    if (!$settings?.hasOwnProperty('vocabularyIdCustomConcept')) return
    sidesShowed = $settings.popupSidesShowed
  }

  // A method to fill the table with the already mapped concepts
  function fillMappedTable(): void | Record<string, any>[] {
    alreadyMappedData = []
    const code = selectedRow.sourceCode
    // If there are no concepts mapped yet, fill the array with an empty object
    // This empty object is needed because the DataTable component uses it to determine the data type
    if (!Object.keys(alreadyMapped).includes(code)) return (alreadyMappedData = [{}])
    if (!alreadyMapped[code].conceptId.length) return (alreadyMappedData = [{}])
    for (let i = 0; i < alreadyMapped[code].conceptId.length; i++) {
      alreadyMappedData.push({
        sourceCode: code,
        sourceName: selectedRow.sourceName,
        conceptId: alreadyMapped[code].conceptId[i],
        conceptName: alreadyMapped[code].conceptName[i],
        customConcept: alreadyMapped[code].custom[i],
      })
    }
    alreadyMappedData = alreadyMappedData
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

  $: {
    $settings
    if ($settings && sidesSet == false) {
      setSidesShowed()
      sidesSet = true
    }
  }
</script>

<dialog bind:this={layoutDialog} data-name="athena-dialog">
  <div data-name="dialog-container" use:clickOutside on:outClick={closeDialog}>
    <button data-name="close-dialog" on:click={closeDialog}>
      <SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
    </button>
    <div data-name="athena-layout">
      {#if sidesShowed.filters}
        <section data-name="filters-container">
          <div data-name="filters-head">
            <h2>Filters</h2>
            <button on:click={() => sideVisibilityChange('filters', false)} id="filters">
              <SvgIcon href="{base}/icons.svg" id="chevrons-left" width="16px" height="16px" />
            </button>
          </div>
          <div data-name="filters">
            {#each [...JSONFilters] as [key, options]}
              {#if facets}
                {#if facets[options.altNameFacet]}
                  <AthenaFilter
                    filter={{ name: key, categories: options }}
                    bind:openedFilter
                    allowInput={true}
                    color={filterColors[key.toLowerCase()]}
                  >
                    <div slot="option" data-name="filter-option" let:option>
                      {#if facets[options.altNameFacet].hasOwnProperty(option) && facets[options.altNameFacet][option] > 0}
                        <input
                          id={option}
                          type="checkbox"
                          title="Activate/deactivate filter"
                          checked={checkIfFilterExists(key, options.altName, option)}
                          on:change={() =>
                            event != undefined
                              ? updateAPIFilters(
                                  event,
                                  options.altName != undefined ? options.altName : 'sourceName',
                                  option
                                )
                              : null}
                        />
                        <label for={option}>{option.replaceAll('/', ' / ')}</label>
                      {/if}
                    </div>
                  </AthenaFilter>
                {/if}
              {/if}
            {/each}
            <div data-name="activated-filters">
              {#each [...activatedAthenaFilters] as [filter, values]}
                {#each values as value}
                  <div
                    data-name="activated-filter"
                    id={value}
                    style={`background-color: ${filterColors[filterNames[filter]]}`}
                  >
                    <button on:click={() => removeFilter(filter, value)}>
                      <SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
                    </button>
                    <p>{value}</p>
                  </div>
                {/each}
              {/each}
            </div>
          </div>
        </section>
      {:else}
        <div data-name="sidebar-right">
          <button data-name="closed-bar" on:click={() => sideVisibilityChange('filters', true)}>
            <SvgIcon href="{base}/icons.svg" id="chevrons-right" width="16px" height="16px" />
            <p>F</p>
            <p>I</p>
            <p>L</p>
            <p>T</p>
            <p>E</p>
            <p>R</p>
            <p>S</p>
          </button>
        </div>
      {/if}
      <section data-name="table-pop-up">
        <div data-name="table-head">
          <div data-name="currentRow">
            <button
              title="Previous row"
              id="left"
              on:click={() => {
                onRowChange(false)
              }}
              disabled={selectedRowIndex == 0 ? true : false}
            >
              <SvgIcon href="{base}/icons.svg" id="arrow-left" width="24px" height="24px" />
            </button>
            <table>
              <tr>
                <th data-name="normal-cell">sourceCode</th>
                <th data-name="sourceName">sourceName</th>
                <th data-name="normal-cell">sourceFrequency</th>
              </tr>
              <tr>
                {#if selectedRow != undefined}
                  <td data-name="normal-cell" title={selectedRow.sourceCode}>{selectedRow.sourceCode}</td>
                  <td data-name="sourceName" title={selectedRow.sourceName}>{selectedRow.sourceName}</td>
                  <td data-name="normal-cell" title={selectedRow.sourceFrequency}>{selectedRow.sourceFrequency}</td>
                {/if}
              </tr>
            </table>
            <button title="Next row" id="right" on:click={() => onRowChange(true)} disabled={lastRow}>
              <SvgIcon href="{base}/icons.svg" id="arrow-right" width="24px" height="24px" />
            </button>
          </div>
        </div>
        <div data-name="concept-choice">
          <button>
            <input type="radio" bind:group={conceptSelection} id="athena" name="concept-type" value="athena" />
            <label for="athena">Athena concepts</label>
          </button>

          <button>
            <input type="radio" bind:group={conceptSelection} id="custom" name="concept-type" value="custom" />
            <label for="custom">Custom concept</label>
          </button>

          <button>
            <input type="radio" bind:group={conceptSelection} id="mapped" name="content-type" value="mapped" />
            <label for="mapped">Mapped concepts</label>
          </button>
        </div>
        {#if conceptSelection === 'athena'}
          <div data-name="table-container">
            <DataTable
              data={fetchData}
              columns={athenaColumns}
              options={{
                id: 'athena',
                actionColumn: true,
                rowsPerPageOptions: [5, 10, 15, 20],
                globalFilter: globalFilter,
                saveOptions: false,
                singleSort: true,
                dataTypeImpl: new AthenaDataTypeImpl(),
              }}
              bind:this={dataTableAthena}
            >
              <AthenaRow
                slot="default"
                let:renderedRow
                let:columns
                {renderedRow}
                {columns}
                bind:alreadyMapped
                on:singleMapping={singleMapping}
                on:multipleMapping={multipleMapping}
                on:updateUniqueConceptIds={updateUniqueConceptIds}
              />
            </DataTable>
          </div>
        {:else if conceptSelection === 'custom'}
          <div data-name="custom-concept-container">
            <h2>Create a custom concept</h2>
            <DataTable
              data={customConceptData}
              columns={columnCustomConcept}
              options={{ actionColumn: true, id: 'createCustomConcepts', saveOptions: false }}
            >
              <CustomConceptInputRow
                slot="default"
                let:columns
                let:originalIndex
                let:renderedRow
                {columns}
                {selectedRow}
                suggestiveList={customConceptInfo}
                index={originalIndex}
                {renderedRow}
                on:customMappingInput={customMapping}
              />
            </DataTable>

            {#if errorMessage}
              <div data-name="errormessage">
                <p>{errorMessage}</p>
                <button
                  on:click={() => {
                    errorMessage = ''
                  }}><SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" /></button
                >
              </div>
            {/if}
          </div>
        {:else if conceptSelection === 'mapped'}
          <div data-name="alreadymapped-table">
            <DataTable
              data={alreadyMappedData}
              columns={alreadyMappedColumns}
              options={{ actionColumn: true, id: 'mappedConcepts' }}
              let:renderedRow
            >
              <td>
                {#if renderedRow.conceptId && renderedRow.conceptName}
                  <button
                    on:click={() => {
                      if (renderedRow.conceptId && renderedRow.conceptName)
                        removeMapping(renderedRow.conceptId, renderedRow.conceptName)
                    }}
                    ><SvgIcon href="{base}/icons.svg" id="x" width="16px" height="16px" />
                  </button>
                {/if}
              </td>
              {#each Object.keys(renderedRow) as key}
                <td>
                  <p>{renderedRow[key]}</p>
                </td>
              {/each}
            </DataTable>
          </div>
        {/if}
      </section>
      {#if sidesShowed.details}
        <section data-name="additional-information">
          <div data-name="additional-information-head">
            <button on:click={() => sideVisibilityChange('details', false)}>
              <SvgIcon href="{base}/icons.svg" id="chevrons-right" width="16px" height="16px" />
            </button>
            <h2>Detail</h2>
          </div>
          <div data-name="info-container">
            <Equivalence bind:Eq={equivalenceMapping} />
            <div data-name="reviewer">
              <p>Assigned reviewer: {reviewer}</p>
              <AutocompleteInputSettings on:reviewerChanged={reviewerChanged} />
            </div>
            <div data-name="comments">
              <p>Comments</p>
              <textarea
                title="Comments"
                name="Comments"
                id="Comments"
                cols="28"
                rows="6"
                on:input={onInputComment}
                bind:value={comment}
              />
            </div>
          </div>
        </section>
      {:else}
        <div data-name="sidebar-left">
          <button data-name="closed-bar" on:click={() => sideVisibilityChange('details', true)}>
            <SvgIcon href="{base}/icons.svg" id="chevrons-left" width="16px" height="16px" />
            <p>D</p>
            <p>E</p>
            <p>T</p>
            <p>A</p>
            <p>I</p>
            <p>L</p>
          </button>
        </div>
      {/if}
    </div>
  </div>
</dialog> -->

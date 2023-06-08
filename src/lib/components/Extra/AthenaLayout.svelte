<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import Equivalence from '../Mapping/Equivalence.svelte'
  import AthenaFilter from './AthenaFilter.svelte'
  import filtersJSON from '$lib/data/filters.json'
  import columnsAthena from '$lib/data/columnsAthena.json'
  import columnsAlreadyMapped from '$lib/data/columnsAlreadyMapped.json'
  import { localStorageGetter, localStorageSetter } from '$lib/utils'
  import type {
    AutoCompleteEventDetail,
    CustomOptionsEvents,
    ICategories,
    ICustomConcept,
    MappingEventDetail,
    ReviewerChangedEventDetail,
    UpdateUniqueConceptIdsEventDetail,
  } from '../Types'
  import SvgIcon from './SvgIcon.svelte'
  import DataTable, { type FetchDataFunc, type IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import { query } from 'arquero'
  import AthenaRow from '../Mapping/AthenaRow.svelte'
  import customConceptInfo from '$lib/data/customConceptInfo.json'
  import debounce from 'lodash.debounce'
  import type Query from 'arquero/dist/types/query/query'
  import AutocompleteInputSettings from './AutocompleteInputSettings.svelte'
  import { clickOutside } from '$lib/actions/clickOutside'
  import AutocompleteInput from './AutocompleteInput.svelte'
  import { dev } from '$app/environment'

  export let equivalenceMapping: string,
    selectedRow: Record<string, any>,
    selectedRowIndex: number,
    mainTable: DataTable,
    fetchData: FetchDataFunc,
    settings: Record<string, any>,
    globalFilter: { column: string; filter: string | undefined },
    showModal: boolean = false,
    facets: Record<string, any> | undefined

  // General variables
  const dispatch = createEventDispatcher<CustomOptionsEvents>()
  let layoutDialog: HTMLDialogElement
  let openedFilter: string
  let lastRow: boolean = false
  let sidesShowed: Record<string, boolean> = {
    filters: true,
    details: true,
  }
  let conceptSelection: string = 'athena'
  let errorMessage: string = ''
  let sidesSet: boolean = false

  // Table variables
  let reviewer: string = ''
  let comment: string = ''

  // Data variables
  let JSONFilters = new Map<string, ICategories>([])
  let activatedAthenaFilters = new Map<string, string[]>([['standardConcept', ['Standard']]])
  let customConcept: ICustomConcept = {
    vocabularyId: '',
    domainId: '',
    conceptClassId: '',
    conceptName: '',
  }
  let filterColors: Record<string, string> = {
    domain: '#ec3d31',
    concept: '#50a5ba',
    class: '#6967d2',
    vocab: '#ffa200',
    validity: '#ad007c',
  }
  let filterNames: Record<string, string> = {
    domain: 'domain',
    standardConcept: 'concept',
    conceptClass: 'class',
    Vocabulary: 'vocab',
    invalidReason: 'validity',
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // DATA
  ///////////////////////////////////////////////////////////////////////////////////////////////

  const athenaColumns: IColumnMetaData[] = columnsAthena

  const alreadyMappedColumns: IColumnMetaData[] = columnsAlreadyMapped

  let alreadyMappedData: Record<string, any>[] = [{}]

  let dataTableAthena: DataTable

  let alreadyMapped: Record<string, Record<string, any>> = {}

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
  function updateUniqueConceptIds(event: CustomEvent<UpdateUniqueConceptIdsEventDetail>): void {
    let alreadyMappedRow = alreadyMapped[selectedRow.sourceCode]
    // Check if there is multiple mapping
    if (event.detail.multiple == true) {
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
    } else {
      alreadyMappedRow = {
        conceptId: [event.detail.conceptId],
        conceptName: [event.detail.conceptName],
        custom: [false],
      }
    }
    alreadyMapped[selectedRow.sourceCode] = alreadyMappedRow
    fillMappedTable()
  }

  // A method to update the values of a row with the autocompleted values of the input fields
  function autoComplete(event: CustomEvent<AutoCompleteEventDetail>): void {
    if (event.detail.id === 'domainId') {
      customConcept.domainId = event.detail.value
    } else if (event.detail.id === 'conceptClassId') {
      customConcept.conceptClassId = event.detail.value
    }
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
    // If the filter is unchecked and was already in the list, remove it
    else if (chosenFilter && inputValue == false) {
      if (chosenFilter.includes(option) == true) {
        chosenFilter.splice(chosenFilter.indexOf(option), 1)
        if (chosenFilter.length == 0) activatedAthenaFilters.delete(filter)
        else activatedAthenaFilters.set(filter, chosenFilter)
      }
    } else {
      activatedAthenaFilters.set(filter, [option])
    }
    localStorageSetter('AthenaFilters', activatedAthenaFilters)
    activatedAthenaFilters = activatedAthenaFilters
    dispatch('filterOptionsChanged', { filters: activatedAthenaFilters })
  }

  // A method to check if the filter is already applied to the API call
  const checkIfFilterExists = (filter: string, altName: string | undefined, option: string): boolean => {
    let allFilters: Map<string, string[]> = activatedAthenaFilters
    const chosenFilter =
      allFilters.get(filter) == undefined
        ? altName != undefined
          ? allFilters.get(altName)
          : undefined
        : allFilters.get(filter)

    if (chosenFilter == undefined || chosenFilter.length == 0) return false
    else if (chosenFilter.includes(option)) return true
    else return false
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
    dispatch('rowChange', { up })
  }

  // A method to get all the mapped concept ids for a certain row
  async function getUniqueConceptIds(): Promise<void> {
    alreadyMapped = {}
    if (selectedRow) {
      // Create a query that finds all rows with the same sourceCode as the selected row
      const q = (<Query>query().params({ source: selectedRow.sourceCode }))
        .filter((d: any, params: any) => d.sourceCode == params.source)
        .toObject()
      const res = await mainTable.executeQueryAndReturnResults(q)
      for (let row of res.queriedData) {
        if (row.conceptId) {
          let alreadyMappedRow = alreadyMapped[row.sourceCode]
          if (alreadyMappedRow) {
            if (
              !alreadyMappedRow.conceptId.includes(row.conceptId) ||
              !alreadyMappedRow.conceptName.includes(row.conceptName)
            ) {
              alreadyMappedRow.conceptId.push(row.conceptId)
              alreadyMappedRow.conceptName.push(row.conceptName)
            }
            if (row['ADD_INFO:customConcept'] == true) alreadyMappedRow.custom.push(true)
            else alreadyMappedRow.custom.push(false)
          } else {
            alreadyMappedRow = {
              conceptId: [row.conceptId],
              conceptName: [row.conceptName],
              custom: [row['ADD_INFO:customConcept'] == true ? true : false],
            }
          }
          alreadyMapped[row.sourceCode] = alreadyMappedRow
        }
      }

      fillMappedTable()
    }
  }

  // A method for when the assigned reviewer has changed
  function reviewerChanged(e: CustomEvent<ReviewerChangedEventDetail>): void {
    if (e.detail.reviewer) {
      reviewer = e.detail.reviewer
      dispatch('updateDetails', { index: selectedRowIndex, assignedReviewer: reviewer, comment })
    } else reviewer = ''
  }

  // A method to close the dialog if it was opened
  function closeDialog(): void {
    if (layoutDialog.attributes.getNamedItem('open') != null) {
      layoutDialog.close()
      dispatch('generalVisibilityChanged', { visibility: false })
    }
  }

  // A method to open the dialog if it was closed
  function openDialog(): void {
    if (layoutDialog)
      if (layoutDialog.attributes.getNamedItem('open') == null) {
        comment = ''
        reviewer = ''
        layoutDialog.showModal()
      }
    fetchData = fetchData
    setVocabularyId()
  }

  // A method to delete the mapping in the pop-up
  function removeMapping(conceptId: string, conceptName: string): void {
    // Check if the value needs to be erased, if there are multiple mappings for the same sourceCode it needs to be erased
    let erase = alreadyMapped[selectedRow.sourceCode].conceptId.length > 1
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
    if (alreadyMapped[selectedRow.sourceCode].conceptId.length > 1) {
      alreadyMapped[selectedRow.sourceCode].conceptId.splice(index, 1)
      alreadyMapped[selectedRow.sourceCode].conceptName.splice(index, 1)
      alreadyMapped[selectedRow.sourceCode].custom.splice(index, 1)
    } else {
      delete alreadyMapped[selectedRow.sourceCode]
    }
    alreadyMapped = alreadyMapped
  }

  // A method for custom mapping
  function customMapping(): void {
    errorMessage = ''
    // Check if the domain id and the concept class id are predefined values
    if (
      Object.keys(customConceptInfo.domain).includes(customConcept.domainId) ||
      Object.values(customConceptInfo.domain).includes(customConcept.domainId)
    ) {
      if (
        Object.keys(customConceptInfo.concept).includes(customConcept.conceptClassId) ||
        Object.values(customConceptInfo.concept).includes(customConcept.conceptClassId)
      ) {
        dispatch('customMapping', {
          conceptId: selectedRow.sourceCode,
          conceptName: customConcept.conceptName,
          domainId: customConcept.domainId,
          vocabularyId: customConcept.vocabularyId,
          conceptClassId: customConcept.conceptClassId,
          standardConcept: '',
          conceptCode: selectedRow.sourceCode,
          validStartDate: `${new Date().getFullYear()}-${new Date().getMonth()}-${new Date().getDate()}`,
          validEndDate: '2099-12-31',
          invalidReason: '',
          extra: {
            comment,
            reviewer,
          },
        })

        let alreadyMappedSelected = alreadyMapped[selectedRow.sourceCode]
        if (alreadyMappedSelected) {
          if (alreadyMappedSelected.conceptId.length > 0) alreadyMappedSelected.conceptId.push(selectedRow.sourceCode)
          else alreadyMappedSelected.conceptId = [selectedRow.sourceCode]
          if (alreadyMappedSelected.conceptName.length > 0)
            alreadyMappedSelected.conceptName.push(customConcept.conceptName)
          else alreadyMappedSelected.conceptName = [customConcept.conceptName]
          if (alreadyMappedSelected.custom.length > 0) alreadyMappedSelected.custom.push(true)
          else alreadyMappedSelected.custom = [true]
        } else {
          alreadyMappedSelected = {
            conceptId: [selectedRow.sourceCode],
            conceptName: [customConcept.conceptName],
            custom: [true],
          }
        }
        alreadyMapped[selectedRow.sourceCode] = alreadyMappedSelected
        fillMappedTable()
      } else {
        errorMessage = 'The concept class id is not valid'
        if (dev) console.log(`customMapping: The concept class id: ${customConcept.conceptClassId}, is not valid`)
      }
    } else {
      errorMessage = 'The domain id is not valid'
      if (dev) console.log(`customMapping: the domain id: ${customConcept.domainId}, is not valid`)
    }
  }

  // A method to set the custom concept vocabulary id from the settings
  function setVocabularyId(): void {
    if (settings) {
      if (settings.hasOwnProperty('vocabularyIdCustomConcept'))
        customConcept.vocabularyId = settings.vocabularyIdCustomConcept
    }
  }

  // A method to set the visibility of the sides in the pop-up
  function sideVisibilityChange(side: string, value: boolean): void {
    sidesShowed[side] = value
    if (side == 'filters') settings.popupSidesShowed.filters = value
    else if (side == 'detail') settings.popupSidesShowed.details = value
  }

  // A method for when the user fills in the comment
  const onInputComment = debounce(async (e: any): Promise<void> => {
    dispatch('updateDetails', { index: selectedRowIndex, comment, assignedReviewer: reviewer })
  }, 500)

  // A method to sync the sidesShowed object with the settings
  function setSidesShowed(): void {
    if (settings) {
      if (settings.popupSidesShowed) {
        sidesShowed = settings.popupSidesShowed
      }
    }
  }

  // A method to fill the table with the already mapped concepts
  function fillMappedTable(): void {
    alreadyMappedData = []
    for (let code of Object.keys(alreadyMapped)) {
      if (selectedRow.sourceCode == code) {
        for (let i = 0; i < alreadyMapped[code].conceptId.length; i++) {
          alreadyMappedData.push({
            sourceCode: selectedRow.sourceCode,
            sourceName: selectedRow.sourceName,
            conceptId: alreadyMapped[code].conceptId[i],
            conceptName: alreadyMapped[code].conceptName[i],
            customConcept: alreadyMapped[code].custom[i],
          })
        }
      }
    }
    // If there are no concepts mapped yet, fill the array with an empty object
    // This empty object is needed because the DataTable component uses it to determine the data type
    if (alreadyMappedData.length == 0) alreadyMappedData = [{}]
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
    settings
    if (settings && sidesSet == false) {
      setSidesShowed()
      sidesSet = true
    }
  }
</script>

<dialog bind:this={layoutDialog} data-name="athena-dialog">
  <div data-name="dialog-container" use:clickOutside on:outClick={closeDialog}>
    <button data-name="close-dialog" on:click={closeDialog}>
      <SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
    </button>
    <div data-name="athena-layout">
      {#if sidesShowed.filters}
        <section data-name="filters-container">
          <div data-name="filters-head">
            <h2>Filters</h2>
            <button on:click={() => sideVisibilityChange('filters', false)} id="filters">
              <SvgIcon href="icons.svg" id="chevrons-left" width="16px" height="16px" />
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
                      <SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
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
            <SvgIcon href="icons.svg" id="chevrons-right" width="16px" height="16px" />
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
              <SvgIcon href="icons.svg" id="arrow-left" width="24px" height="24px" />
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
              <SvgIcon href="icons.svg" id="arrow-right" width="24px" height="24px" />
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
              }}
              bind:this={dataTableAthena}
            >
              <AthenaRow
                slot="default"
                let:renderedRow
                let:columns
                {renderedRow}
                {settings}
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
            <table data-name="custom-concept-table">
              <tr>
                <th />
                <th>domain_id</th>
                <th>vocabulary_id</th>
                <th>concept_class_id</th>
                <th>concept_name</th>
              </tr>
              <tr>
                <td data-name="custom-concept-actions"
                  ><button on:click={customMapping}
                    ><SvgIcon href="icons.svg" id="plus" width="16px" height="16px" /></button
                  ></td
                >
                <td
                  ><AutocompleteInput
                    id="domainId"
                    initial={customConcept.domainId}
                    list={customConceptInfo.domain}
                    on:autoComplete={autoComplete}
                  />
                </td>
                <td><input title="vocabularyId" type="text" bind:value={customConcept.vocabularyId} /></td>
                <td
                  ><AutocompleteInput
                    id="conceptClassId"
                    initial={customConcept.conceptClassId}
                    list={customConceptInfo.concept}
                    on:autoComplete={autoComplete}
                  />
                </td>
                <td><input title="conceptName" type="text" bind:value={customConcept.conceptName} /></td>
              </tr>
            </table>

            {#if errorMessage}
              <div data-name="errormessage">
                <p>{errorMessage}</p>
                <button
                  on:click={() => {
                    errorMessage = ''
                  }}><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
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
                    ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
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
              <SvgIcon href="icons.svg" id="chevrons-right" width="16px" height="16px" />
            </button>
            <h2>Detail</h2>
          </div>
          <div data-name="info-container">
            <Equivalence bind:Eq={equivalenceMapping} />
            <div data-name="reviewer">
              <p>Assigned reviewer: {reviewer}</p>
              <AutocompleteInputSettings {settings} on:reviewerChanged={reviewerChanged} />
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
            <SvgIcon href="icons.svg" id="chevrons-left" width="16px" height="16px" />
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
</dialog>

<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import Equivalence from '../Mapping/Equivalence.svelte'
  import AthenaFilter from './AthenaFilter.svelte'
  import filtersJSON from '$lib/data/filters.json'
  import { localStorageSetter } from '$lib/utils'
  import type {
    AutoCompleteEventDetail,
    CustomOptionsEvents,
    ICategories,
    MultipleMappingEventDetail,
    ReviewerChangedEventDetail,
    SingleMappingEventDetail,
    UpdateUniqueConceptIdsEventDetail,
  } from '../Types'
  import SvgIcon from './SvgIcon.svelte'
  import DataTable, { type FetchDataFunc, type IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import { query } from 'arquero'
  import AthenaRow from '../Mapping/AthenaRow.svelte'
  import AutocompleteInputSettings from './AutocompleteInputSettings.svelte'
  import customConceptInfo from '$lib/data/customConceptInfo.json'
  import debounce from 'lodash.debounce'
  import type Query from 'arquero/dist/types/query/query'
  import AutoCompleteInput from './AutoCompleteInput.svelte'

  export let urlFilters: string[],
    url: string,
    equivalenceMapping: string,
    selectedRow: Record<string, any>,
    selectedRowIndex: number,
    mainTable: DataTable,
    fetchData: FetchDataFunc,
    settings: Record<string, any>,
    globalFilter: { column: string; filter: string | undefined },
    showModal: boolean = false,
    facets: Record<string, any> | undefined

  let JSONFilters = new Map<string, ICategories>([])
  let activatedAthenaFilters = new Map<string, string[]>([['standardConcept', ['Standard']]])
  let openedFilter: string
  let lastRow: boolean = false
  let sidesShowed: Record<string, boolean> = {
    filters: true,
    details: true,
  }
  let layoutDialog: HTMLDialogElement
  let reviewer: string = ''
  let comment: string = ''
  let customConcept: Record<string, string> = {
    vocabularyId: '',
    domainId: '',
    conceptClassId: '',
    conceptName: '',
  }
  let conceptSelection: string = 'existing'
  let errorMessage: string = ''
  let sidesSet: boolean = false

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

  const athenaColumns: IColumnMetaData[] = [
    {
      id: 'id',
      filterable: false,
    },
    {
      id: 'code',
      filterable: false,
    },
    {
      id: 'name',
    },
    {
      id: 'className',
      filterable: false,
    },
    {
      id: 'standardConcept',
      filterable: false,
      visible: false,
    },
    {
      id: 'invalidReason',
      filterable: false,
      visible: false,
    },
    {
      id: 'domain',
      filterable: false,
    },
    {
      id: 'vocabulary',
      filterable: false,
    },
    {
      id: 'score',
      filterable: false,
      visible: false,
    },
  ]

  const alreadyMappedColumns: IColumnMetaData[] = [
    {
      id: 'sourceCode',
    },
    {
      id: 'sourceName',
    },
    {
      id: 'conceptId',
    },
    {
      id: 'conceptName',
    },
    {
      id: 'customConcept',
    },
  ]

  let alreadyMappedData: Record<string, any>[] = [{}]

  let dataTableAthena: DataTable

  let alreadyMapped: Record<string, Record<string, any>> = {}

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

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
  function singleMapping(event: CustomEvent<SingleMappingEventDetail>) {
    dispatch('singleMapping', {
      originalRow: selectedRow,
      row: event.detail.row,
      extra: { comment: comment, assignedReviewer: reviewer },
    })
  }

  // A method that catches the event for multiple mapping and throws an event to the parent
  function multipleMapping(event: CustomEvent<MultipleMappingEventDetail>) {
    dispatch('multipleMapping', {
      originalRow: selectedRow,
      row: event.detail.row,
      extra: { comment: comment, assignedReviewer: reviewer },
    })
  }

  // A method to update the already mapped concepts (used to see the already mapped concepts for a certain row)
  function updateUniqueConceptIds(event: CustomEvent<UpdateUniqueConceptIdsEventDetail>) {
    if (event.detail.multiple == true) {
      if (!alreadyMapped[selectedRow.sourceCode]) {
        alreadyMapped[selectedRow.sourceCode] = {
          conceptId: [event.detail.conceptId],
          conceptName: [event.detail.conceptName],
          custom: [false],
        }
      } else {
        alreadyMapped[selectedRow.sourceCode].conceptId.push(event.detail.conceptId)
        alreadyMapped[selectedRow.sourceCode].conceptName.push(event.detail.conceptName)
        alreadyMapped[selectedRow.sourceCode].custom.push(false)
        alreadyMapped = alreadyMapped
      }
    }

    fillMappedTable()
  }

  function autoComplete(event: CustomEvent<AutoCompleteEventDetail>) {
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
    const inputElement = event.target as HTMLInputElement
    const inputValue = inputElement.checked
    // If the filter is checked, add it
    if (chosenFilter != undefined && inputValue == true) chosenFilter.push(option)
    // If the filter is unchecked and was already in the list, remove it
    else if (chosenFilter != undefined && inputValue == false) {
      if (chosenFilter.includes(option) == true) {
        chosenFilter.splice(chosenFilter.indexOf(option), 1)
        if (chosenFilter.length == 0) activatedAthenaFilters.delete(filter)
        else activatedAthenaFilters.set(filter, chosenFilter)
      }
    } else {
      activatedAthenaFilters.set(filter, [option])
    }

    localStorageSetter('AthenaFilters', activatedAthenaFilters)

    let URLFilters: string[] = []

    // Create a list of string to add to the API call with the filters in it
    for (let [filter, options] of activatedAthenaFilters) {
      let substring: string = ''
      for (let option of options) {
        substring += `&${filter}=${option}`
      }
      URLFilters.push(substring)
    }

    urlFilters = URLFilters
    dispatch('filterOptionsChanged', { filters: activatedAthenaFilters })
    activatedAthenaFilters = activatedAthenaFilters
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

    if (chosenFilter == undefined || chosenFilter.length == 0) {
      return false
    } else {
      if (chosenFilter.includes(option)) {
        return true
      } else {
        return false
      }
    }
  }

  // A method to delete a filter when a filter for the Athena API call is removed in the section "Activated filters"
  function removeFilter(filter: string, option: string) {
    activatedAthenaFilters.get(filter)!.splice(activatedAthenaFilters.get(filter)!.indexOf(option), 1)
    activatedAthenaFilters = activatedAthenaFilters
    localStorageSetter('AthenaFilters', activatedAthenaFilters)
    dispatch('filterOptionsChanged', { filters: activatedAthenaFilters })
  }

  // When a arrow button is clicked in the Athena pop-up to navigate between rows
  function onRowChange(up: boolean) {
    dispatch('rowChange', { up })
  }

  // A method to get all the mapped concept ids for a certain row
  async function getUniqueConceptIds() {
    alreadyMapped = {}
    if (selectedRow) {
      const q = (<Query>query().params({ source: selectedRow.sourceCode }))
        .filter((d: any, params: any) => d.sourceCode == params.source)
        .toObject()
      const res = await mainTable.executeQueryAndReturnResults(q)
      for (let row of res.queriedData) {
        if (row.conceptId) {
          if (alreadyMapped[row.sourceCode]) {
            if (
              !alreadyMapped[row.sourceCode].conceptId.includes(row.conceptId) ||
              !alreadyMapped[row.sourceCode].conceptName.includes(row.conceptName)
            )
              alreadyMapped[row.sourceCode].conceptId.push(row.conceptId)
            alreadyMapped[row.sourceCode].conceptName.push(row.conceptName)
            if (row['ADD_INFO:customConcept'] == true) alreadyMapped[row.sourceCode].custom.push(true)
            else alreadyMapped[row.sourceCode].custom.push(false)
          } else {
            alreadyMapped[row.sourceCode] = {
              conceptId: [row.conceptId],
              conceptName: [row.conceptName],
              custom: [row['ADD_INFO:customConcept'] == true ? true : false],
            }
          }
        }
      }

      fillMappedTable()
    }
  }

  // A method for when the assigned reviewer has changed
  function reviewerChanged(e: CustomEvent<ReviewerChangedEventDetail>) {
    if (e.detail.reviewer) {
      reviewer = e.detail.reviewer
      dispatch('updateDetails', { index: selectedRowIndex, assignedReviewer: reviewer, comment })
    } else reviewer = ''
  }

  function closeDialog() {
    if (layoutDialog.attributes.getNamedItem('open') != null) layoutDialog.close()
    dispatch('generalVisibilityChanged', { visibility: false })
  }

  function openDialog() {
    if (layoutDialog) if (layoutDialog.attributes.getNamedItem('open') == null) layoutDialog.showModal()
    fetchData = fetchData
    setVocabularyId()
  }

  function removeMapping(conceptId: string, conceptName: string) {
    let erase = alreadyMapped[selectedRow.sourceCode].conceptId.length > 1
    dispatch('deleteRowInnerMapping', { conceptId, conceptName, erase, custom: true })
    removeUniqueConcept(conceptId, conceptName)
    fillMappedTable()
  }

  function removeUniqueConcept(conceptId: string, conceptName: string) {
    const index = alreadyMapped[selectedRow.sourceCode].conceptId.indexOf(conceptId)
    if (alreadyMapped[selectedRow.sourceCode].conceptId.length > 1) {
      alreadyMapped[selectedRow.sourceCode].conceptId.splice(index, 1)
      alreadyMapped[selectedRow.sourceCode].conceptName.splice(index, 1)
      alreadyMapped[selectedRow.sourceCode].custom.splice(index, 1)
    } else {
      delete alreadyMapped[selectedRow.sourceCode]
    }
    alreadyMapped = alreadyMapped
  }

  function customMapping() {
    errorMessage = ''
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
            comment: comment,
            assignedReviewer: reviewer,
          },
        })

        if (alreadyMapped[selectedRow.sourceCode]) {
          if (alreadyMapped[selectedRow.sourceCode].conceptId.length > 0)
            alreadyMapped[selectedRow.sourceCode].conceptId.push(selectedRow.sourceCode)
          else alreadyMapped[selectedRow.sourceCode].conceptId = [selectedRow.sourceCode]
          if (alreadyMapped[selectedRow.sourceCode].conceptName.length > 0)
            alreadyMapped[selectedRow.sourceCode].conceptName.push(customConcept.conceptName)
          else alreadyMapped[selectedRow.sourceCode].conceptName = [customConcept.conceptName]
          if (alreadyMapped[selectedRow.sourceCode].custom.length > 0)
            alreadyMapped[selectedRow.sourceCode].custom.push(true)
          else alreadyMapped[selectedRow.sourceCode].custom = [true]
        } else {
          alreadyMapped[selectedRow.sourceCode] = {
            conceptId: [selectedRow.sourceCode],
            conceptName: [customConcept.conceptName],
            custom: [true],
          }
        }
        alreadyMapped = alreadyMapped
        fillMappedTable()
      } else {
        errorMessage = 'The concept class id is not valid'
      }
    } else {
      errorMessage = 'The domain id is not valid'
    }
  }

  function setVocabularyId() {
    if (settings) {
      if (settings.hasOwnProperty('vocabularyIdCustomConcept'))
        customConcept.vocabularyId = settings.vocabularyIdCustomConcept
    }
  }

  function sideVisibilityChange(side: string, value: boolean) {
    sidesShowed[side] = value
    if (side == 'filters') settings.popupSidesShowed.filters = value
    else if (side == 'detail') settings.popupSidesShowed.details = value
  }

  const onInputComment = debounce(async (e: any) => {
    dispatch('updateDetails', { index: selectedRowIndex, comment, assignedReviewer: reviewer })
  }, 500)

  function setSidesShowed() {
    if (settings) {
      if (settings.popupSidesShowed) {
        sidesShowed = settings.popupSidesShowed
      }
    }
  }

  function fillMappedTable() {
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
    if (alreadyMappedData.length == 0) alreadyMappedData = [{}]
    alreadyMappedData = alreadyMappedData
  }

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
    if (showModal == true) {
      getUniqueConceptIds()
      openDialog()
    } else {
      if (layoutDialog) closeDialog()
    }
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
  <button data-name="close-dialog" on:click={closeDialog}
    ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
  >
  <div data-name="athena-layout">
    {#if sidesShowed.filters}
      <section data-name="filters-container">
        <div data-name="filters-head">
          <h2>Filters</h2>
          <button on:click={() => sideVisibilityChange('filters', false)} id="filters"
            ><SvgIcon href="icons.svg" id="chevrons-left" width="16px" height="16px" /></button
          >
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
                <div data-name="activated-filter" style={`background-color: ${filterColors[filterNames[filter]]}`}>
                  <button on:click={() => removeFilter(filter, value)}
                    ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
                  >
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
            <SvgIcon href="icons.svg" id="arrow-left" width="16px" height="16px" />
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
            <SvgIcon href="icons.svg" id="arrow-right" width="16px" height="16px" />
          </button>
        </div>
      </div>
      <div data-name="concept-choice">
        <button>
          <input type="radio" bind:group={conceptSelection} id="existing" name="concept-type" value="existing" />
          <label for="existing">Existing concepts</label>
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
      {#if conceptSelection === 'existing'}
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
              {url}
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
              <td><AutoCompleteInput id="domainId" list={customConceptInfo.domain} on:autoComplete={autoComplete} /></td
              >
              <td><input type="text" bind:value={customConcept.vocabularyId} /></td>
              <td
                ><AutoCompleteInput
                  id="conceptClassId"
                  list={customConceptInfo.concept}
                  on:autoComplete={autoComplete}
                /></td
              >
              <td><input type="text" bind:value={customConcept.conceptName} /></td>
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
            options={{ actionColumn: true }}
            let:renderedRow
            let:columns
          >
            <td>
              <button
                on:click={() => {
                  removeMapping(renderedRow.conceptId, renderedRow.conceptName)
                }}
                ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
              </button>
            </td>
            {#each Object.keys(renderedRow) as key}
              <td>{renderedRow[key]}</td>
            {/each}
          </DataTable>
        </div>
      {/if}
    </section>
    {#if sidesShowed.details}
      <section data-name="additional-information">
        <div data-name="additional-information-head">
          <button on:click={() => sideVisibilityChange('details', false)}
            ><SvgIcon href="icons.svg" id="chevrons-right" width="16px" height="16px" /></button
          >
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
</dialog>

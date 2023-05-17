<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import Equivalence from '../Mapping/Equivalence.svelte'
  import AthenaFilter from './AthenaFilter.svelte'
  import filtersJSON from '$lib/data/filters.json'
  import { localStorageGetter, localStorageSetter } from '$lib/utils'
  import type {
    CustomOptionsEvents,
    ICategories,
    MultipleMappingEventDetail,
    ReviewerChangedEventDetail,
    SingleMappingEventDetail,
    UpdateUniqueConceptIdsEventDetail,
  } from '../Types'
  import SvgIcon from './SvgIcon.svelte'
  import DataTable, { type FetchDataFunc, type IColumnMetaData } from 'svelte-radar-datatable'
  import { query } from 'arquero'
  import AthenaRow from '../Mapping/AthenaRow.svelte'
  import AutocompleteInput from './AutocompleteInput.svelte'

  export let urlFilters: string[],
    equivalenceMapping: string,
    athenaFilteredColumn: string,
    selectedRow: Record<string, any>,
    selectedRowIndex: number,
    mainTable: DataTable,
    fetchData: FetchDataFunc,
    settings: Record<string, any>,
    showModal: boolean = false

  let JSONFilters = new Map<string, ICategories>([])
  let activatedAthenaFilters = new Map<string, string[]>([['standardConcept', ['Standard']]])
  let openedFilter: string
  let savedFilters: Map<string, string[]>
  let lastRow: boolean = false
  let layoutDialog: HTMLDialogElement
  let reviewer: string = ''
  let comment: string = ''

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
    vocabulary: 'vocab',
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

  let dataTableAthena: DataTable

  let alreadyMapped: Record<string, Record<string, any>> = {}
  let uniqueConceptIds: string[] = []

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  for (let filter of filtersJSON) {
    JSONFilters.set(filter.name, { altName: filter.altName, options: filter.options })
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
      if (!Object.values(alreadyMapped).find((row: any) => row.conceptId.includes(event.detail.conceptId))) {
        if (!alreadyMapped[selectedRow.sourceCode]) {
          alreadyMapped[selectedRow.sourceCode] = {
            conceptId: [event.detail.conceptId],
            conceptName: [event.detail.conceptName],
          }
        } else {
          alreadyMapped[selectedRow.sourceCode].conceptId.push(event.detail.conceptId)
          alreadyMapped[selectedRow.sourceCode].conceptName.push(event.detail.conceptName)
          alreadyMapped = alreadyMapped
        }
      }
    } else {
      alreadyMapped[selectedRow.sourceCode] = {
        conceptId: [event.detail.conceptId],
        conceptName: [event.detail.conceptName],
      }
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
      if (chosenFilter.includes(option) == true) activatedAthenaFilters.delete(filter)
      else chosenFilter.splice(chosenFilter.indexOf(option), 1)
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
    getUniqueConceptIds()
  }

  // A method to get all the mapped concept ids for a certain row
  async function getUniqueConceptIds() {
    alreadyMapped = {}
    uniqueConceptIds = []
    const q = query()
      .params({ source: selectedRow.sourceCode })
      .filter((d: any, params: any) => d.sourceCode == params.source)
      .toObject()
    const res = await mainTable.executeQueryAndReturnResults(q)
    for (let row of res.queriedData) {
      if (row.conceptId) {
        if (!uniqueConceptIds.includes(row.conceptId)) uniqueConceptIds.push(row.conceptId)
        if (alreadyMapped[row.sourceCode]) {
          if (!alreadyMapped[row.sourceCode].conceptId.includes(row.conceptId))
            alreadyMapped[row.sourceCode].conceptId.push(row.conceptId)
          if (!alreadyMapped[row.sourceCode].conceptName.includes(row.conceptName))
            alreadyMapped[row.sourceCode].conceptName.push(row.conceptName)
        } else alreadyMapped[row.sourceCode] = { conceptId: [row.conceptId], conceptName: [row.conceptName] }
      }
    }

    savedFilters = localStorageGetter('AthenaFilters')
    if (savedFilters) activatedAthenaFilters = savedFilters
    else activatedAthenaFilters = new Map<string, string[]>([['standardConcept', ['Standard']]])
    uniqueConceptIds = uniqueConceptIds
  }

  // A method for when the assigned reviewer has changed
  function reviewerChanged(e: CustomEvent<ReviewerChangedEventDetail>) {
    if (e.detail.reviewer) reviewer = e.detail.reviewer
    else reviewer = ''
  }

  function closeDialog() {
    if (layoutDialog.attributes.getNamedItem('open') != null) layoutDialog.close()
    dispatch('generalVisibilityChanged', { visibility: false })
  }

  function openDialog() {
    if (layoutDialog) if (layoutDialog.attributes.getNamedItem('open') == null) layoutDialog.showModal()
    fetchData = fetchData
  }

  function removeMapping(conceptId: string, conceptName: string) {
    let erase = alreadyMapped[selectedRow.sourceCode].conceptId.length > 1
    dispatch('deleteRowInnerMapping', { conceptId, conceptName, erase })
    removeUniqueConcept(conceptId, conceptName)
  }

  function removeUniqueConcept(conceptId: string, conceptName: string) {
    if (alreadyMapped[selectedRow.sourceCode].conceptId.length > 1) {
      alreadyMapped[selectedRow.sourceCode].conceptId.splice(
        alreadyMapped[selectedRow.sourceCode].conceptId.indexOf(conceptId),
        1
      )
      alreadyMapped[selectedRow.sourceCode].conceptName.splice(
        alreadyMapped[selectedRow.sourceCode].conceptName.indexOf(conceptName),
        1
      )
    } else {
      delete alreadyMapped[selectedRow.sourceCode]
    }
    alreadyMapped = alreadyMapped
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
</script>

<dialog bind:this={layoutDialog} data-name="athena-dialog">
  <button data-name="close-dialog" on:click={closeDialog}
    ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
  >
  <div data-name="athena-layout">
    <section data-name="filters-container">
      <h2>Filters</h2>
      <div data-name="filters">
        {#each [...JSONFilters] as [key, options]}
          <AthenaFilter
            filter={{ name: key, categories: options }}
            bind:openedFilter
            allowInput={true}
            color={filterColors[key.toLowerCase()]}
          >
            <div slot="option" data-name="filter-option" let:option>
              <input
                id={option}
                type="checkbox"
                title="Activate/deactivate filter"
                checked={checkIfFilterExists(key, options.altName, option)}
                on:change={() =>
                  event != undefined
                    ? updateAPIFilters(event, options.altName != undefined ? options.altName : 'sourceName', option)
                    : null}
              />
              <label for={option}>{option.replaceAll('/', ' / ')}</label>
            </div>
          </AthenaFilter>
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
    <section data-name="table-pop-up">
      <div data-name="table-head">
        <h2>Athena data</h2>
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
              <th>sourceCode</th>
              <th>sourceName</th>
              <th>sourceFrequency</th>
            </tr>
            <tr>
              {#if selectedRow != undefined}
                <td>{selectedRow.sourceCode}</td>
                <td>{selectedRow.sourceName}</td>
                <td>{selectedRow.sourceFrequency}</td>
              {/if}
            </tr>
          </table>
          <button title="Next row" id="right" on:click={() => onRowChange(true)} disabled={lastRow}>
            <SvgIcon href="icons.svg" id="arrow-right" width="16px" height="16px" />
          </button>
        </div>
      </div>
      <div data-name="table-container">
        <DataTable
          data={fetchData}
          columns={athenaColumns}
          options={{ id: 'athena', actionColumn: true, rowsPerPageOptions: [5, 10, 15, 20] }}
          bind:this={dataTableAthena}
        >
          <AthenaRow
            slot="default"
            let:renderedRow
            let:columns
            {renderedRow}
            {settings}
            {columns}
            bind:uniqueConceptIds
            on:singleMapping={singleMapping}
            on:multipleMapping={multipleMapping}
            on:updateUniqueConceptIds={updateUniqueConceptIds}
          />
        </DataTable>
      </div>
    </section>
    <section data-name="additional-information">
      <h2>Extra</h2>
      <div data-name="info-container">
        {#if selectedRow}
          <div data-name="mappedRows">
            <table>
              {#if Object.keys(alreadyMapped).length == 0 && Object.keys(alreadyMapped).includes(selectedRow.conceptName)}
                <div />
              {:else}
                <tr>
                  <th />
                  <th>conceptId</th>
                  <th>conceptName</th>
                </tr>
                {#each Object.keys(alreadyMapped) as code}
                  {#if selectedRow.sourceCode == code}
                    {#each alreadyMapped[code].conceptId as id, i}
                      <tr>
                        <td
                          ><button
                            on:click={() =>
                              removeMapping(alreadyMapped[code].conceptId[i], alreadyMapped[code].conceptName[i])}
                            ><SvgIcon href="icons.svg" id="x" width="12px" height="12px" /></button
                          ></td
                        >
                        <td>{alreadyMapped[code].conceptId[i]}</td>
                        <td>{alreadyMapped[code].conceptName[i]}</td>
                      </tr>
                    {/each}
                  {/if}
                {/each}
              {/if}
            </table>
          </div>
        {/if}
        <Equivalence bind:Eq={equivalenceMapping} />
        <div data-name="reviewer">
          <p>Assigned reviewer: {reviewer}</p>
          <AutocompleteInput {settings} on:reviewerChanged={reviewerChanged} />
        </div>
        <div data-name="comments">
          <p>Comments</p>
          <textarea title="Comments" name="Comments" id="Comments" cols="28" rows="6" bind:value={comment} />
        </div>
      </div>
    </section>
  </div>
</dialog>

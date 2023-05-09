<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import Equivalence from '../Mapping/Equivalence.svelte'
  import AthenaFilter from './AthenaFilter.svelte'
  import filtersJSON from '$lib/data/filters.json'
  import { localStorageGetter, localStorageSetter } from '$lib/utils'
  import type { CustomOptionsEvents, ICategories, MultipleMappingEventDetail, SingleMappingEventDetail } from '../Types'
  import SvgIcon from './SvgIcon.svelte'
  import AthenaActivatedFilter from './AthenaActivatedFilter.svelte'
  import DataTable, { type FetchDataFunc, type IColumnMetaData } from 'svelte-radar-datatable'
  import { query } from 'arquero'
  import AthenaRow from '../Mapping/AthenaRow.svelte'

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
  let activatedAthenaFilters = new Map<string, string[]>()
  let openedFilter: string
  let savedFilters: Map<string, string[]>
  let lastRow: boolean = false
  let layoutDialog: HTMLDialogElement

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
    },
  ]

  let dataTableAthena: DataTable

  let alreadyMapped: Record<string, Record<string, any>> = {}
  let uniqueConceptIds: string[]

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  for (let filter of filtersJSON) {
    JSONFilters.set(filter.name, { altName: filter.altName, options: filter.options })
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  function singleMapping(event: CustomEvent<SingleMappingEventDetail>) {
    dispatch('singleMapping', { originalRow: selectedRow, row: event.detail.row })
  }

  function multipleMapping(event: CustomEvent<MultipleMappingEventDetail>) {
    dispatch('multipleMapping', { originalRow: selectedRow, row: event.detail.row })
  }

  function closeDialog() {
    layoutDialog.close()
    dispatch('generalVisibilityChanged', { visibility: false })
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // METHODS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  const updateAPIFilters = async (event: Event, filter: string, option: string): Promise<void> => {
    let chosenFilter = activatedAthenaFilters.get(filter)
    const inputElement = event.target as HTMLInputElement
    const inputValue = inputElement.checked
    if (chosenFilter != undefined && inputValue == true) chosenFilter.push(option)
    else if (chosenFilter != undefined && inputValue == false) {
      if (chosenFilter.includes(option) == true) activatedAthenaFilters.delete(filter)
      else chosenFilter.splice(chosenFilter.indexOf(option), 1)
    } else {
      activatedAthenaFilters.set(filter, [option])
    }

    localStorageSetter('AthenaFilters', activatedAthenaFilters)

    let URLFilters: string[] = []

    for (let [filter, options] of activatedAthenaFilters) {
      let substring: string = ''
      for (let option of options) {
        substring += `&${filter}=${option}`
      }
      URLFilters.push(substring)
    }

    urlFilters = URLFilters
    dispatch('filterOptionsChanged', { filters: activatedAthenaFilters })
  }

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

  function changeFilteredColumnAthena(e: Event) {
    const inputElement = e.target as HTMLInputElement
    const inputValue = inputElement.value
    athenaFilteredColumn = inputValue
    dispatch('columnFilterChanged', { filter: athenaFilteredColumn })
  }

  function removeFilter(filter: string, option: string) {
    activatedAthenaFilters.get(filter)!.splice(activatedAthenaFilters.get(filter)!.indexOf(option), 1)
    localStorageSetter('AthenaFilters', activatedAthenaFilters)
    dispatch('filterOptionsChanged', { filters: activatedAthenaFilters })
  }

  function onRowChange(up: boolean) {
    dispatch('rowChange', { up })
    getUniqueConceptIds()
  }

  async function getUniqueConceptIds() {
    const q = query()
      .filter((d: any) => d.conceptId != null)
      .toObject()
    const res = await mainTable.executeQueryAndReturnResults(q)
    for (let row of res.queriedData) {
      if (row.conceptId) {
        if (alreadyMapped[row.sourceCode]) {
          if (!alreadyMapped[row.sourceCode].conceptId.includes(row.conceptId))
            alreadyMapped[row.sourceCode].conceptId.push(row.conceptId)
          if (!alreadyMapped[row.sourceCode].conceptName.includes(row.conceptName))
            alreadyMapped[row.sourceCode].conceptName.push(row.conceptName)
        } else alreadyMapped[row.sourceCode] = { conceptId: [row.conceptId], conceptName: [row.conceptName] }
      }
    }

    savedFilters =
      localStorageGetter('AthenaFilters') !== null ? new Map<string, string[]>() : localStorageGetter('AthenaFilters')

    if (savedFilters) activatedAthenaFilters = savedFilters
    else activatedAthenaFilters = new Map<string, string[]>()
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
    if (showModal == true) {
      getUniqueConceptIds()
      layoutDialog.showModal()
    } else {
      if (layoutDialog) layoutDialog.close()
    }
  }
</script>

<dialog bind:this={layoutDialog} data-name="athena-dialog">
  <button data-name="close-dialog" on:click={closeDialog}><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button>
  <div data-name="athena-layout">
    <section data-name="filters-container">
      <h2>Filters</h2>
      <div data-name="filters">
        {#each [...JSONFilters] as [key, options]}
          <AthenaFilter filter={{ name: key, categories: options }} bind:openedFilter allowInput={true}>
            <div slot="option" data-name="filter-option" let:option>
              <input
                type="checkbox"
                checked={checkIfFilterExists(key, options.altName, option)}
                on:change={() =>
                  event != undefined
                    ? updateAPIFilters(event, options.altName != undefined ? options.altName : 'sourceName', option)
                    : null}
              />
              <p>{option}</p>
            </div>
          </AthenaFilter>
        {/each}
        <AthenaActivatedFilter filters={activatedAthenaFilters} bind:openedFilter filterName="Activated filters">
          <div slot="option" data-name="filter-option" let:filter let:option>
            <button on:click={() => removeFilter(filter, option)}
              ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
            >
            <p>{option}</p>
          </div>
        </AthenaActivatedFilter>
      </div>
    </section>
    <section data-name="table-pop-up">
      <div data-name="table-head">
        <div data-name="top">
          <h2>Athena data</h2>
          <div data-name="currentRow">
            <button id="left" on:click={() => onRowChange(false)} disabled={selectedRowIndex == 0 ? true : false}>
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
            <button id="right" on:click={() => onRowChange(true)} disabled={lastRow}>
              <SvgIcon href="icons.svg" id="arrow-right" width="16px" height="16px" />
            </button>
          </div>
          <div data-name="options">
            <Equivalence bind:Eq={equivalenceMapping} />
            <div data-name="columnFilter">
              <p>Filter on column:</p>
              <select name="columns" id="columns" on:change={changeFilteredColumnAthena}>
                <option value="sourceName">sourceName</option>
                <option value="sourceCode">sourceCode</option>
              </select>
            </div>
          </div>
        </div>
        {#if selectedRow}
          <div data-name="bottom">
            <div data-name="mappedRows">
              <table>
                {#if Object.keys(alreadyMapped).length == 0 && Object.keys(alreadyMapped).includes(selectedRow.conceptName)}
                  <div />
                {:else}
                  <tr>
                    <th>conceptId</th>
                    <th>conceptName</th>
                  </tr>
                  {#each Object.keys(alreadyMapped) as code}
                    {#if selectedRow.sourceCode == code}
                      {#each alreadyMapped[code].conceptId as id, i}
                        <tr>
                          <td>{alreadyMapped[code].conceptId[i]}</td>
                          <td>{alreadyMapped[code].conceptName[i]}</td>
                        </tr>
                      {/each}
                    {/if}
                  {/each}
                {/if}
              </table>
            </div>
          </div>
        {/if}
      </div>
      <div data-name="table">
        <DataTable
          data={fetchData}
          columns={athenaColumns}
          options={{ id: 'Athena', actionColumn: true }}
          bind:this={dataTableAthena}
        >
          <AthenaRow
            slot="default"
            let:renderedRow
            {renderedRow}
            {settings}
            columns={athenaColumns}
            {uniqueConceptIds}
            on:singleMapping={singleMapping}
            on:multipleMapping={multipleMapping}
          />
        </DataTable>
      </div>
      <slot name="extra" />
    </section>
  </div>
</dialog>

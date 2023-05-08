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
  import Modal from './Modal.svelte'
  import AthenaRow from '../Mapping/AthenaRow.svelte'

  export let urlFilters: string[],
    equivalenceMapping: string,
    athenaFilteredColumn: string,
    filterColumns: string[],
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

  const athenaColumns: IColumnMetaData[] = [
    {
      id: 'id',
    },
    {
      id: 'code',
    },
    {
      id: 'name',
    },
    {
      id: 'className',
    },
    {
      id: 'standardConcept',
    },
    {
      id: 'invalidReason',
    },
    {
      id: 'domain',
    },
    {
      id: 'vocabulary',
    },
    {
      id: 'score',
    },
  ]

  let dataTableAthena: DataTable

  let alreadyMapped: Record<string, any>[] = []

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  for (let filter of filtersJSON) {
    JSONFilters.set(filter.name, { altName: filter.altName, options: filter.options })
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////
  // EVENTS
  ///////////////////////////////////////////////////////////////////////////////////////////////

  function singleMapping(event: CustomEvent<SingleMappingEventDetail>) {
    dispatch('singleMapping', { originalRow: event.detail.originalRow, row: event.detail.row })
  }

  function multipleMapping(event: CustomEvent<MultipleMappingEventDetail>) {
    dispatch('multipleMapping', { originalRow: event.detail.originalRow, row: event.detail.row })
  }

  function onGeneralVisibilityChanged(event: CustomEvent) {
    if (!event.detail.visibility && !settings.author) return
    showModal = event.detail.visibility
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

  function onRowChange(e: Event) {
    const elem = e.target as HTMLButtonElement
    if (elem.id == 'left') dispatch('rowChange', { up: false })
    else dispatch('rowChange', { up: true })
  }

  // onMount(async () => {
  //   const q = query()
  //     .params({ value: selectedRow.sourceCode })
  //     .filter((d: any, params: any) => d.sourceCode == params.value)
  //     .toObject()
  //   const res = await mainTable.executeQueryAndReturnResults(q)
  //   for (let row of res.queriedData) {
  //     alreadyMapped.push(row)
  //   }
  //   dispatch('uniqueConceptIdsChanged', { uniqueConceptIds: alreadyMapped.map(row => row.conceptId) })
  //   savedFilters =
  //     localStorageGetter('AthenaFilters') !== null ? new Map<string, string[]>() : localStorageGetter('AthenaFilters')
  //   activatedAthenaFilters = savedFilters
  //   savedFilters != null
  //     ? (activatedAthenaFilters = savedFilters)
  //     : (activatedAthenaFilters = new Map<string, string[]>())
  //   //CAUSES INFINITE LOOP !!!!!!!!!!!!!!!!!!!!!!
  //   //activatedAthenaFilters != null ? dispatch('filterOptionsChanged', { filters: activatedAthenaFilters }) : null
  // })

  async function getUniqueConceptIds() {
    const q = query()
      .params({ value: selectedRow.sourceCode })
      .filter((d: any, params: any) => d.sourceCode == params.value)
      .toObject()
    const res = await mainTable.executeQueryAndReturnResults(q)
    for (let row of res.queriedData) {
      alreadyMapped.push(row)
    }
    dispatch('uniqueConceptIdsChanged', { uniqueConceptIds: alreadyMapped.map(row => row.conceptId) })
    savedFilters =
      localStorageGetter('AthenaFilters') !== null ? new Map<string, string[]>() : localStorageGetter('AthenaFilters')
    activatedAthenaFilters = savedFilters
    savedFilters != null
      ? (activatedAthenaFilters = savedFilters)
      : (activatedAthenaFilters = new Map<string, string[]>())
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
    if (showModal == true) getUniqueConceptIds()
  }
</script>

<Modal on:generalVisibilityChanged={onGeneralVisibilityChanged} show={showModal} size="large">
  <div data-name="athena-layout">
    <section data-name="filters-container">
      <h2>Filters</h2>
      <div data-name="filters-buttons">
        <div data-name="filters">
          {#each [...JSONFilters] as [key, options]}
            <AthenaFilter filter={{ name: key, categories: options }} bind:openedFilter allowInput={true}>
              <div slot="option" data-component="filter-option" let:option>
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
            <div slot="option" data-component="filter-option" let:filter let:option>
              <p>{option}</p>
              <button on:click={() => removeFilter(filter, option)}
                ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
              >
            </div>
          </AthenaActivatedFilter>
        </div>
      </div>
    </section>
    <section data-name="table-pop-up">
      <div data-name="table-head">
        <div data-name="top-large">
          <h2>Athena data</h2>
          <div data-name="currentRow">
            <button id="left" on:click={onRowChange} disabled={selectedRowIndex == 0 ? true : false}>
              <SvgIcon href="icons.svg" id="arrow-left" width="16px" height="16px" />
            </button>
            <table class="table">
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
            <button id="right" on:click={onRowChange} disabled={lastRow}>
              <SvgIcon href="icons.svg" id="arrow-right" width="16px" height="16px" />
            </button>
          </div>
          <div data-name="options">
            <Equivalence bind:Eq={equivalenceMapping} />
            <div data-name="columnFilter">
              <p>Filter on column:</p>
              <select class="columnSelect" name="columns" id="columns" on:change={changeFilteredColumnAthena}>
                {#each filterColumns as column}
                  <option value={column}>{column}</option>
                {/each}
              </select>
            </div>
          </div>
        </div>
        <div data-name="top-small">
          <h2>Athena data</h2>
          <Equivalence bind:Eq={equivalenceMapping} />
          <select class="columnSelect" name="columns" id="columns" on:change={changeFilteredColumnAthena}>
            {#each filterColumns as column}
              <option value={column}>{column}</option>
            {/each}
          </select>
        </div>
        <div data-name="bottom-large">
          <div data-name="mappedRows">
            <table>
              {#if alreadyMapped.length == 1 && alreadyMapped[0].conceptId == undefined && alreadyMapped[0].conceptName == undefined}
                <div />
              {:else}
                <tr>
                  <th>conceptId</th>
                  <th>conceptName</th>
                </tr>
                {#each alreadyMapped as row}
                  <tr>
                    <td>{row.conceptId}</td>
                    <td>{row.conceptName}</td>
                  </tr>
                {/each}
              {/if}
            </table>
          </div>
        </div>
      </div>
      <div data-component="table">
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
            {mainTable}
            {selectedRowIndex}
            on:singleMapping={singleMapping}
            on:multipleMapping={multipleMapping}
          />
        </DataTable>
      </div>
      <slot name="extra" />
    </section>
  </div>
</Modal>

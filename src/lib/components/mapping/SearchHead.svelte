<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { query } from 'arquero'
  import ShowColumnsDialog from '$lib/components/mapping/ShowColumnsDialog.svelte'
  import type Query from 'arquero/dist/types/query/query'
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import type { IQueryResult, ITablePagination, IUsagiRow, MappingEvents, ShowColumnsED } from '$lib/components/Types'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'

  export let selectedRow: IUsagiRow, mainTable: DataTable

  const dispatch = createEventDispatcher<MappingEvents>()
  let dialog: HTMLDialogElement
  let shownColumns: string[] = ['sourceCode', 'sourceName', 'sourceFrequency']

  async function getPagination() {
    let pag: ITablePagination = await mainTable.getTablePagination()
    const { currentPage } = pag
    return currentPage ?? 0
  }

  function rowFilter(row: IUsagiRow, params: Record<string, string>) {
    const sourceCodeEqual = row.sourceCode === params.sourceCode
    const sourceNameEqual = row.sourceName === params.sourceName
    const conceptNameEqual = row.conceptName === params.conceptName || row.conceptName === params.conceptName2
    return sourceCodeEqual && sourceNameEqual && conceptNameEqual
  }

  async function getCurrentRowIndex() {
    const { sourceCode, sourceName, conceptName: concept } = selectedRow
    const conceptName = concept === 'Unmapped' ? undefined : concept
    const conceptName2 = concept === 'Unmapped' ? null : concept
    const params = { sourceCode, sourceName, conceptName, conceptName2 }
    const indexQuery = (<Query>query().params(params)).filter(rowFilter).toObject()
    const rows: IQueryResult = await mainTable.executeQueryAndReturnResults(indexQuery)
    const index = rows.indices[0]
    return index
  }

  async function getFollowingRow(up: boolean, currentRowIndex: number) {
    const rowResult = up ? await mainTable.getNextRow(currentRowIndex) : await mainTable.getPreviousRow(currentRowIndex)
    const { row, index, page } = rowResult
    return { row, index, page }
  }

  async function navigateRows(up: boolean) {
    const rowIndex = await getCurrentRowIndex()
    const { row, index, page } = await getFollowingRow(up, rowIndex)
    if (!row.sourceCode) return
    const currentPage = await getPagination()
    if (currentPage !== page) mainTable.changePagination({ currentPage: page })
    dispatch('navigateRow', { row, index })
  }

  const showDialogColumns = () => dialog.showModal()

  const showColumns = (e: CustomEvent<ShowColumnsED>) => ({ columns: shownColumns } = e.detail)

  $: columns = selectedRow ? Object.keys(selectedRow) : []
</script>

<ShowColumnsDialog bind:dialog {columns} {shownColumns} on:showColumns={showColumns} />

<div class="table-head">
  <div class="currentRow">
    <button class="arrow-button" title="Previous row" id="left" on:click={() => navigateRows(false)}>
      <SvgIcon id="arrow-left" width="24px" height="24px" />
    </button>
    <div class="center">
      <table class="table">
        <tr>
          {#each shownColumns as column}
            <th>{column}</th>
          {/each}
        </tr>
        <tr>
          {#if selectedRow}
            {#each shownColumns as column}
              <td title={selectedRow[column]}>{selectedRow[column]}</td>
            {/each}
          {/if}
        </tr>
      </table>
      <button class="settings" on:click={showDialogColumns}><SvgIcon id="settings" /></button>
    </div>
    <button class="arrow-button" title="Next row" id="right" on:click={() => navigateRows(true)}>
      <SvgIcon id="arrow-right" width="24px" height="24px" />
    </button>
  </div>
</div>

<style>
  .table-head {
    max-height: 40%;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0 0 0;
  }

  .center {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .table {
    max-width: 60%;
    overflow-x: auto;
  }

  .settings {
    background-color: transparent;
    border: none;
    cursor: pointer;
  }

  .currentRow {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .arrow-button {
    border: none;
    background-color: inherit;
    color: #4f4f4f;
    padding: 0 1rem;
  }

  .arrow-button:disabled {
    color: #cecece;
  }

  .arrow-button:hover {
    color: #3b3b3b;
  }

  .arrow-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px #cecece;
  }

  table {
    table-layout: fixed;
  }

  td {
    border-top: 1px solid lightgray;
    border-bottom: 1px solid lightgray;
  }

  th,
  td {
    padding: 0.5rem 1rem;
  }
</style>

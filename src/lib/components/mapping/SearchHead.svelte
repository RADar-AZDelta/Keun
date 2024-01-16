<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { query } from 'arquero'
  import SvgIcon from '$lib/obsolete/SvgIcon.svelte'
  import ShowColumnsDialog from '$lib/components/mapping/ShowColumnsDialog.svelte'
  import type Query from 'arquero/dist/types/query/query'
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import type { ITablePagination, IUsagiRow, MappingEvents, ShowColumnsEventDetail } from '$lib/components/Types'

  export let selectedRow: IUsagiRow, mainTable: DataTable

  const dispatch = createEventDispatcher<MappingEvents>()
  let dialog: HTMLDialogElement
  let shownColumns: string[] = ['sourceCode', 'sourceName', 'sourceFrequency']

  async function navigateRows(up: boolean) {
    let pag: ITablePagination = await mainTable.getTablePagination()
    if (!pag.currentPage || !pag.rowsPerPage) return
    const indexParams = <Query>query().params({
      code: selectedRow.sourceCode,
      name: selectedRow.sourceName,
      concept: selectedRow.conceptName === 'Unmapped' ? undefined : selectedRow.conceptName,
      concept2: selectedRow.conceptName === 'Unmapped' ? null : selectedRow.conceptName,
    })
    const indexQuery = indexParams
      .filter(
        (r: any, p: any) =>
          r.sourceCode === p.code &&
          r.sourceName === p.name &&
          (r.conceptName === p.concept || r.conceptName === p.concept2),
      )
      .toObject()
    const rows = await mainTable.executeQueryAndReturnResults(indexQuery)
    const i = rows.indices[0]
    const { row, index, page } = up ? await mainTable.getNextRow(i) : await mainTable.getPreviousRow(i)
    if (!row.sourceCode) return
    if (pag.currentPage !== page) mainTable.changePagination({ currentPage: page })
    dispatch('navigateRow', { row, index })
  }

  const showDialogColumns = () => dialog.showModal()

  const showColumns = (e: CustomEvent<ShowColumnsEventDetail>) => (shownColumns = e.detail.columns)

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
          {#if selectedRow != undefined}
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

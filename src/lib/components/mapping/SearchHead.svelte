<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import { query } from 'arquero'
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'
  import type Query from 'arquero/dist/types/query/query'
  import type { ITablePagination, IUsagiRow, MappingEvents } from '$lib/components/Types'

  export let selectedRow: IUsagiRow, mainTable: DataTable

  const dispatch = createEventDispatcher<MappingEvents>()

  async function navigateRows(up: boolean) {
    let pag: ITablePagination = await mainTable.getTablePagination()
    if (!pag.currentPage || !pag.rowsPerPage) return
    const indexParams = <Query>query().params({
      code: selectedRow.sourceCode,
      name: selectedRow.sourceName,
      concept: selectedRow.conceptName === 'Unmapped' ? undefined : selectedRow.conceptName,
    })
    const indexQuery = indexParams
      .filter((r: any, p: any) => r.sourceCode === p.code && r.sourceName === p.name && r.conceptName === p.concept)
      .toObject()
    const rows = await mainTable.executeQueryAndReturnResults(indexQuery)
    const i = rows.indices[0]
    const { row, index, page } = up ? await mainTable.getNextRow(i) : await mainTable.getPreviousRow(i)
    if (!row.sourceCode) return
    if (pag.currentPage !== page) mainTable.changePagination({ currentPage: page })
    dispatch('navigateRow', { row, index })
  }
</script>

<div class="table-head">
  <div class="currentRow">
    <button class="arrow-button" title="Previous row" id="left" on:click={() => navigateRows(false)}>
      <SvgIcon id="arrow-left" width="24px" height="24px" />
    </button>
    <table>
      <tr>
        <th>sourceCode</th>
        <th>sourceName</th>
        <th>sourceFrequency</th>
      </tr>
      <tr>
        {#if selectedRow != undefined}
          <td title={selectedRow.sourceCode}>{selectedRow.sourceCode}</td>
          <td title={selectedRow.sourceName}>{selectedRow.sourceName}</td>
          <td title={selectedRow.sourceFrequency.toString()}>{selectedRow.sourceFrequency}</td>
        {/if}
      </tr>
    </table>
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
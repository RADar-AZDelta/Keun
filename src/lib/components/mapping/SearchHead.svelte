<script lang="ts">
  import ShowColumnsDialog from '$lib/components/mapping/ShowColumnsDialog.svelte'
  import Table from '$lib/helpers/tables/Table'
  import type { IUsagiRow, ISearchHeadProps } from '$lib/interfaces/Types'
  import SvgIcon from '../extra/SvgIcon.svelte'

  let { selectedRow, index: currentIndex, navigateRow }: ISearchHeadProps = $props()

  let dialog: HTMLDialogElement | undefined = $state()
  let shownColumns: string[] = $state(['sourceCode', 'sourceName', 'sourceFrequency'])
  let columns = $derived(selectedRow ? Object.keys(selectedRow) : [])

  async function navigateRows(up: boolean) {
    const rowInfo = up ? await Table.getNextRow(currentIndex) : await Table.getPreviousRow(currentIndex)
    const { row, index } = rowInfo
    navigateRow(row as IUsagiRow, index)
  }

  const showDialogColumns = () => dialog?.showModal()

  async function showColumns(columns: string[]) {
    shownColumns = columns
  }
</script>

<ShowColumnsDialog bind:dialog {columns} {shownColumns} {showColumns} />

<div class="table-head">
  <div class="currentRow">
    <button class="arrow-button" title="Previous row" id="left" onclick={() => navigateRows(false)}>
      <SvgIcon id="arrow-left" width="24px" height="24px" />
    </button>
    <div class="center">
      <table class="table">
        <thead>
          <tr>
            {#each shownColumns as column}
              <th>{column}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          <tr>
            {#if selectedRow}
              {#each shownColumns as column}
                <td title={selectedRow[column]}>{selectedRow[column]}</td>
              {/each}
            {/if}
          </tr>
        </tbody>
      </table>
      <button class="settings" onclick={showDialogColumns}><SvgIcon id="settings" /></button>
    </div>
    <button class="arrow-button" title="Next row" id="right" onclick={() => navigateRows(true)}>
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

<!-- Copyright 2023 RADar-AZDelta -->
<!-- SPDX-License-Identifier: gpl3+ -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import type { CustomOptionsEvents } from '$lib/components/Types'

  export let selectedRow: Record<string, any>

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  async function rowChange(up: boolean) {
    dispatch('rowChange', { up, currentRow: selectedRow })
  }
</script>

<div class="table-head">
  <div class="currentRow">
    <button class="arrow-button" title="Previous row" id="left" on:click={() => rowChange(false)}>
      <SvgIcon href="/icons.svg" id="arrow-left" width="24px" height="24px" />
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
    <button class="arrow-button" title="Next row" id="right" on:click={() => rowChange(true)}>
      <SvgIcon href="/icons.svg" id="arrow-right" width="24px" height="24px" />
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

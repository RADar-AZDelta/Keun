<!-- Copyright 2023 RADar-AZDelta -->
<!-- SPDX-License-Identifier: gpl3+ -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import DataTable from '@radar-azdelta/svelte-datatable'
  import customColumns from '$lib/data/columnsCustomConcept.json'
  import suggestions from '$lib/data/customConceptInfo.json'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import { reformatDate } from '$lib/utils'
  import type { CustomMappingInputEventDetail, CustomOptionsEvents } from '$lib/components/Types'
  import InputRow from '$lib/components/Mapping/views/InputRow.svelte'

  export let customConceptData: Record<string, any>[], selectedRow: Record<string, any>

  const dispatch = createEventDispatcher<CustomOptionsEvents>()

  const inputAvailableColumns = ['code', 'name', 'className', 'domain', 'vocabulary']
  let errorMessage: string = ''
  const options = { actionColumn: true, id: 'createCustomConcepts', saveOptions: false }

  async function getCustomColumnConfig() {
    const config: Record<string, any> = {}
    for (let col of customColumns) {
      const name = col.label ? col.label : col.id
      const columnConfig: any[] = customColumns.filter(col => col.id === name || col.label === name)
      config[col.id] = {
        inputAvailable: inputAvailableColumns.includes(name),
        value: columnConfig[0].value === 'date' ? reformatDate() : columnConfig[0].value ? columnConfig[0].value : '',
        suggestions: (<Record<string, any>>suggestions)[columnConfig[0].id],
      }
    }
    return config
  }

  async function onClickMapping(e: CustomEvent<CustomMappingInputEventDetail>) {
    dispatch('customMappingInput', { ...e.detail })
  }

  async function deleteError() {
    errorMessage = ''
  }
</script>

<div class="custom-concept-container">
  <h2 class="custom-concept-title">Create a custom concept</h2>
  {#await getCustomColumnConfig() then config}
    <DataTable data={customConceptData} columns={customColumns} {options}>
      <InputRow
        slot="default"
        let:columns
        let:originalIndex
        data={config}
        {columns}
        {originalIndex}
        {selectedRow}
        on:customMappingInput={onClickMapping}
      />
    </DataTable>
  {/await}

  {#if errorMessage}
    <div class="errormessage">
      <p>{errorMessage}</p>
      <button class="errormessage-button" on:click={deleteError}>
        <SvgIcon href="/icons.svg" id="x" width="16px" height="16px" />
      </button>
    </div>
  {/if}
</div>

<style>
  .custom-concept-container {
    padding: 1rem 1rem 3rem 1rem;
  }

  .custom-concept-title {
    font-size: 24px;
    font-weight: 600;
    margin: 0;
    padding: 0 2rem;
    margin-bottom: 2rem;
  }

  .errormessage {
    display: flex;
    width: max-content;
    border-radius: 5px;
    align-items: center;
    gap: 1rem;
    border: 1px solid red;
    background-color: lightcoral;
    padding: 0.5rem 1rem;
  }

  .errormessage-button {
    background-color: inherit;
    border: none;
    cursor: pointer;
    padding: 0;
    height: auto;
  }
</style>

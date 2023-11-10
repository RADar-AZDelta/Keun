<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import DataTable, { type ITableOptions } from '@radar-azdelta/svelte-datatable'
  import { reformatDate } from '$lib/utils'
  import customColumns from '$lib/data/columnsCustomConcept.json'
  import suggestions from '$lib/data/customConceptInfo.json'
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'
  import InputRow from '$lib/components/mapping/views/InputRow.svelte'
  import type { CustomMappingInputEventDetail, MappingEvents, UpdateErrorEventDetail } from '$lib/components/Types'

  export let customConceptData: Record<string, any>[], selectedRow: Record<string, any>

  const dispatch = createEventDispatcher<MappingEvents>()

  const inputAvailableColumns = ['name', 'className', 'domain', 'vocabulary']
  let errorMessage: string = ''
  const options: ITableOptions = {
    actionColumn: true,
    id: 'createCustomConcepts',
    saveOptions: false,
    rowsPerPageOptions: [5, 10, 15],
  }

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
    deleteError()
  }

  async function deleteError() {
    errorMessage = ''
  }

  async function updateError(e: CustomEvent<UpdateErrorEventDetail>) {
    errorMessage = e.detail.error
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
        on:updateError={updateError}
      />
    </DataTable>
  {/await}

  {#if errorMessage}
    <div class="errormessage">
      <p>{errorMessage}</p>
      <button class="errormessage-button" on:click={deleteError}><SvgIcon id="x" /></button>
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

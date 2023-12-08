<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import DataTable, { type ITableOptions } from '@radar-azdelta/svelte-datatable'
  import { query } from 'arquero'
  import { SvgIcon } from 'components'
  import { settings } from '$lib/store'
  import { reformatDate } from 'utils'
  import customColumns from '$lib/data/columnsCustomConcept.json'
  import InputRow from '$lib/components/mapping/views/InputRow.svelte'
  import type Query from 'arquero/dist/types/query/query'
  import type { ICustomConceptInput, IUsagiRow, MappingEvents } from '$lib/components/Types'
  import type { CustomMappingInputEventDetail, UpdateErrorEventDetail } from '$lib/components/Types'

  export let selectedRow: IUsagiRow, customTable: DataTable

  const dispatch = createEventDispatcher<MappingEvents>()

  let data: ICustomConceptInput[] = []

  let errorMessage: string = ''
  const options: ITableOptions = {
    actionColumn: true,
    id: 'createCustomConcepts',
    saveOptions: false,
    rowsPerPageOptions: [5, 10, 15],
  }

  async function onClickMapping(e: CustomEvent<CustomMappingInputEventDetail>) {
    dispatch('customMappingInput', { ...e.detail })
    data[0] = e.detail.originalRow
    await createInputRow()
    data = data
    deleteError()
  }

  const deleteError = () => (errorMessage = '')

  const updateError = (e: CustomEvent<UpdateErrorEventDetail>) => (errorMessage = e.detail.error)

  async function getCustomsForRow() {
    const params = <Query>query().params({ code: selectedRow.sourceCode })
    const conceptsQuery = params.filter((r: any, p: any) => r.concept_code === p.code).toObject()
    const concepts = await customTable.executeQueryAndReturnResults(conceptsQuery)
    data = concepts.queriedData
    await createInputRow()
  }

  async function createInputRow() {
    const inputRow: ICustomConceptInput = {
      concept_id: 0,
      concept_name: '',
      domain_id: '',
      vocabulary_id: '',
      concept_class_id: '',
      standard_concept: '',
      concept_code: selectedRow.sourceCode,
      valid_start_date: reformatDate(),
      valid_end_date: '2099-12-31',
      invalid_reason: '',
    }
    if ($settings.mapToMultipleConcepts) {
      if (data[0]?.concept_name) data.unshift(inputRow)
      else data[0] = inputRow
    } else {
      if (data.length >= 2) data = [inputRow, data[0]]
      else if (data[0]?.concept_name) data.unshift(inputRow)
      else data[0] = inputRow
    }
  }

  $: {
    selectedRow
    getCustomsForRow()
  }
</script>

<div class="custom-concept-container">
  <h2 class="custom-concept-title">Create a custom concept</h2>
  <DataTable {data} columns={customColumns} {options}>
    <InputRow
      slot="default"
      let:columns
      let:renderedRow
      let:originalIndex
      {renderedRow}
      {columns}
      {originalIndex}
      {customTable}
      on:customMappingInput={onClickMapping}
      on:updateError={updateError}
    />
  </DataTable>

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

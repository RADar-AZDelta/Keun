<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import DataTable, { type IColumnMetaData, type ITableOptions } from '@radar-azdelta/svelte-datatable'
  import { databaseImpl } from '$lib/store'
  import type {
    CustomConceptAddedED,
    ICustomConceptCompact,
    IUsagiRow,
    MapCustomConceptED,
    MappingEvents,
  } from '$lib/components/Types'
  import type { UpdateErrorED } from '$lib/components/Types'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import CustomRow from './CustomRow.svelte'

  export let selectedRow: IUsagiRow, selectedRowIndex: number, equivalence: string

  const dispatch = createEventDispatcher<MappingEvents>()

  let data: ICustomConceptCompact[] = []
  const columns: IColumnMetaData[] = [
    {
      id: 'concept_name',
      label: 'name',
    },
    {
      id: 'concept_class_id',
      label: 'className',
    },
    {
      id: 'domain_id',
      label: 'domain',
    },
    {
      id: 'vocabulary_id',
      label: 'vocabulary',
    },
  ]

  let errorMessage: string = ''
  const options: ITableOptions = {
    actionColumn: true,
    id: 'createCustomConcepts',
    saveOptions: false,
    rowsPerPageOptions: [5, 10, 15],
    rowsPerPage: 15,
  }

  async function mapCustomConcept(e: CustomEvent<MapCustomConceptED>) {
    const { concept, action } = e.detail
    dispatch('customMappingInput', { row: concept, action })
  }

  const deleteError = () => (errorMessage = '')

  const updateError = (e: CustomEvent<UpdateErrorED>) => (errorMessage = e.detail.error)

  async function getAllCustomConcepts() {
    const customConcepts: ICustomConceptCompact[] = await $databaseImpl?.getCustomConcepts()
    const inputRow = { concept_name: '', domain_id: '', vocabulary_id: '', concept_class_id: '' }
    data = [inputRow, ...customConcepts]
  }

  async function addCustomConcept(e: CustomEvent<CustomConceptAddedED>) {
    const { concept } = e.detail
    data = [...data, concept]
  }

  onMount(() => {
    getAllCustomConcepts()
  })
</script>

<div class="custom-concept-container">
  <h2 class="custom-concept-title">Create a custom concept</h2>
  <DataTable {data} {columns} {options}>
    <CustomRow
      slot="default"
      let:columns
      let:renderedRow
      let:originalIndex
      {renderedRow}
      {columns}
      {originalIndex}
      usagiRow={selectedRow}
      usagiRowIndex={selectedRowIndex}
      {equivalence}
      on:updateError={updateError}
      on:customConceptAdded={addCustomConcept}
      on:mapCustomConcept={mapCustomConcept}
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

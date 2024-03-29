<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import { query } from 'arquero'
  import { settings } from '$lib/store'
  import AutocompleteInput from '$lib/components/extra/AutocompleteInput.svelte'
  import type Query from 'arquero/dist/types/query/query'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import type { ICustomConcept, ICustomConceptInput, MappingEvents } from '$lib/Types'
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'
  import { Config } from '$lib/helperClasses/Config'

  export let renderedRow: Record<string, any>,
    columns: IColumnMetaData[] | undefined,
    originalIndex: number,
    customTable: DataTable

  const inputAvailableColumns = ['concept_name', 'concept_class_id', 'domain_id', 'vocabulary_id']
  const colSuggestions: Record<string, string[]> = Config.customConceptInfo

  const dispatch = createEventDispatcher<MappingEvents>()

  let inputRow: Record<string, any> =
    originalIndex === 0 ? { ...renderedRow, ...{ vocabulary_id: $settings.vocabularyIdCustomConcept ?? '' } } : {}
  let showMappingButton: boolean = true

  async function saveToRow(e: CustomEvent<any>) {
    if (originalIndex !== 0) return
    inputRow[e.detail.id] = e.detail.value
  }

  async function onClickMapping() {
    if (originalIndex !== 0) return
    addCustomConcept()
    const transformedRow = await transformFromCustomRowToUsagiRow(inputRow as ICustomConceptInput)
    showMappingButton = false
    dispatch('customMappingInput', { row: transformedRow, action: 'APPROVE' })
  }

  async function transformFromCustomRowToUsagiRow(custom: ICustomConceptInput) {
    const usagiRow: ICustomConcept = {
      conceptId: custom.concept_id,
      conceptName: custom.concept_name,
      domainId: custom.domain_id,
      vocabularyId: custom.vocabulary_id,
      conceptClassId: custom.concept_class_id,
      standardConcept: custom.standard_concept,
      conceptCode: custom.concept_code,
      validStartDate: custom.valid_start_date,
      validEndDate: custom.valid_end_date,
      invalidReason: custom.invalid_reason,
    }
    return usagiRow
  }

  // If multiple mapping is off & there are already other custom concepts for this row, delete those
  async function checkForPreviousCustomConcept() {
    const params = <Query>query().params({ code: inputRow.concept_code })
    const existanceQuery = params.filter((r: any, p: any) => r.concept_code === p.code).toObject()
    const existance = await customTable.executeQueryAndReturnResults(existanceQuery)
    if (!existance.queriedData.length) return
    await customTable.deleteRows(existance.indices)
  }

  async function addCustomConcept() {
    if (!$settings.mapToMultipleConcepts) await checkForPreviousCustomConcept()
    const concept = inputRow
    const testRow = await customTable.getFullRow(0)
    if (!testRow.domain_id) await customTable.deleteRows([0])
    await customTable.insertRows([concept])
    inputRow = originalIndex === 0 ? { ...renderedRow } : {}
    updateVocab()
  }

  const updateVocab = () => (inputRow.vocabulary_id = $settings.vocabularyIdCustomConcept ?? '')

  $: {
    if ($settings.vocabularyIdCustomConcept) updateVocab()
  }
</script>

{#if columns}
  {#if originalIndex === 0}
    {#if showMappingButton}
      <button on:click={onClickMapping}><SvgIcon id="plus" /></button>
    {:else}
      <button style="background-color: greenyellow;"><SvgIcon id="check" /></button>
    {/if}
    {#each columns as column, _}
      <td>
        <div class="cell-container">
          {#if inputAvailableColumns.includes(column.id) && ['domain_id', 'concept_class_id'].includes(column.id)}
            <AutocompleteInput id={column.id} list={colSuggestions[column.id]} on:autoComplete={saveToRow} />
          {:else if inputAvailableColumns.includes(column.id)}
            <input bind:value={inputRow[column.id]} />
          {:else}
            <p>{inputRow[column.id]}</p>
          {/if}
        </div>
      </td>
    {/each}
  {:else}
    <td />
    <!-- Empty cell for action column -->
    {#each columns as column, _}
      <td><p>{renderedRow[column.id]}</p></td>
    {/each}
  {/if}
{/if}

<script lang="ts">
  import type { ICustomConceptInput, MappingEvents } from '$lib/components/Types'
  import AutocompleteInput from '$lib/components/extra/AutocompleteInput.svelte'
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'
  import suggestions from '$lib/data/customConceptInfo.json'
  import { transformFromCustomRowToUsagiRow } from '$lib/mappingUtils'
  import { settings } from '$lib/store'
  import type DataTable from '@radar-azdelta/svelte-datatable'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import { query } from 'arquero'
  import type Query from 'arquero/dist/types/query/query'
  import { createEventDispatcher } from 'svelte'

  export let renderedRow: Record<string, any>,
    columns: IColumnMetaData[] | undefined,
    originalIndex: number,
    customTable: DataTable

  const inputAvailableColumns = ['concept_name', 'concept_class_id', 'domain_id', 'vocabulary_id']
  const colSuggestions: Record<string, Record<string, string>> = suggestions

  const dispatch = createEventDispatcher<MappingEvents>()

  let inputRow: Record<string, any> = originalIndex === 0 ? renderedRow : {}
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
    dispatch('customMappingInput', { row: transformedRow, originalRow: inputRow as ICustomConceptInput })
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
    const params = {
      name: concept.concept_name,
      domain: concept.domain_id,
      vocab: concept.vocabulary_id,
      class: concept.concept_class_id,
    }
    const existanceParams = <Query>query().params(params)
    const existanceQuery = existanceParams
      .filter((r: any, p: any) => {
        r.concept_name === p.name &&
          r.domain_id === p.domain &&
          r.vocabulary_id === p.vocab &&
          r.concept_class_id === p.class
      })
      .toObject()
    const existance = await customTable.executeQueryAndReturnResults(existanceQuery)
    if (existance.indices.length) return
    const testRow = await customTable.getFullRow(0)
    if (testRow.domain_id === 'test') await customTable.deleteRows([0])
    await customTable.insertRows([concept])
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

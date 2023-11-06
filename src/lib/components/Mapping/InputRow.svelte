<!-- Copyright 2023 RADar-AZDelta -->
<!-- SPDX-License-Identifier: gpl3+ -->
<script lang="ts">
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import AutocompleteInput from '$lib/components/Extra/AutocompleteInput.svelte'
  import { createEventDispatcher } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import { reformatDate } from '$lib/utils'
  import customConceptInfo from '$lib/data/customConceptInfo.json'

  export let columns: IColumnMetaData[] | undefined,
    data: Record<string, any>,
    originalIndex: number,
    selectedRow: Record<string, string>

  const dispatch = createEventDispatcher<CustomOptionsEvents>()
  let convertedRow: Record<string, string> = {}
  let inputRow: Record<string, any> = data
  let mapped: Record<string, string> = {}
  let mappedButton: boolean = false

  async function saveToRow(e: CustomEvent<any>) {
    inputRow[e.detail.id] = e.detail.value
  }

  function convertResult(): void {
    for (let item of Object.entries(inputRow)) convertedRow[item[0]] = item[1].value
    dispatch('customMappingInput', { row: convertedRow })
  }

  async function onClickMapping() {
    const validated = await validateInputs(inputRow.domain_id, inputRow.concept_class_id)
    if (!validated) return
    mapped = {
      conceptId: '0',
      conceptName: inputRow.concept_name,
      domainId: inputRow.domain_id,
      vocabularyId: inputRow.vocabulary_id,
      conceptClassId: inputRow.concept_class_id,
      standardConcept: '',
      conceptCode: selectedRow.sourceCode,
      validStartDate: reformatDate(),
      validEndDate: '2099-12-31',
      invalidReason: '',
    }
    mappedButton = true
    convertResult()
  }

  async function validateInputs(domain: string, conceptClassId: string) {
    const domainKeys = Object.keys(customConceptInfo.domain_id)
    const domainValues = Object.values(customConceptInfo.domain_id)
    // Check if the domain id and the concept class id are predefined values
    if (!domainKeys.includes(domain) || !domainValues.includes(domain)) {
      dispatch('updateError', { error: 'The domain id is not valid' })
      return false
    }
    const classKeys = Object.keys(customConceptInfo.concept_class_id)
    const classValues = Object.values(customConceptInfo.concept_class_id)
    if (!classKeys.includes(conceptClassId) || !classValues.includes(conceptClassId)) {
      dispatch('updateError', { error: 'The concept class id is not valid' })
      return false
    }
    return true
  }
</script>

{#if columns}
  {#if originalIndex == 0}
    <td>
      {#if mappedButton}
        <button on:click={onClickMapping}><SvgIcon href="/icons.svg" id="plus" width="16px" height="16px" /></button>
      {:else}
        <button style="background-color: greenyellow;"
          ><SvgIcon href="/icons.svg" id="check" width="16px" height="16px" /></button
        >
      {/if}
    </td>
  {:else}
    <td />
  {/if}
  {#each columns || [] as column (column.id)}
    <td>
      <div data-name="cell-container">
        {#if inputRow[column.id].inputAvailable}
          {#if inputRow[column.id].suggestions}
            <AutocompleteInput
              id={column.id}
              initial={inputRow[column.id].value}
              list={inputRow[column.id].suggestions}
              on:autoComplete={saveToRow}
            />
          {:else}
            <input type="text" bind:value={inputRow[column.id].value} />
          {/if}
        {:else}
          <p>{inputRow[column.id].value}</p>
        {/if}
      </div>
    </td>
  {/each}
{/if}

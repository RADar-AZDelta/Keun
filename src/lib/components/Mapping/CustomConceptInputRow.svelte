<script lang="ts">
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import { createEventDispatcher } from 'svelte'
  import type { AutoCompleteEventDetail, CustomOptionsEvents, ICustomConcept } from '../Types'
  import SvgIcon from '../Extra/SvgIcon.svelte'
  import AutocompleteInput from '../Extra/AutocompleteInput.svelte'
  import { customConcept } from '$lib/store'
  import { base } from '$app/paths'

  export let columns: IColumnMetaData[] | undefined,
    selectedRow: Record<string, any>,
    suggestiveList: Record<string, Record<string, string>>,
    index: number,
    renderedRow: Record<string, any>

  const dispatch = createEventDispatcher<CustomOptionsEvents>()
  let predefined: Record<string, string>,
    mapped: ICustomConcept | undefined,
    mappedButton: boolean = false

  function autoComplete(e: CustomEvent<AutoCompleteEventDetail>): void {
    $customConcept[e.detail.id] = e.detail.value
  }

  function onClickMapping(): void {
    mapped = {
      conceptId: predefined.concept_id,
      conceptName: $customConcept.concept_name,
      domainId: $customConcept.domain_id,
      vocabularyId: $customConcept.vocabulary_id,
      conceptClassId: $customConcept.concept_class_id,
      standardConcept: predefined.standard_concept,
      conceptCode: predefined.concept_code,
      validStartDate: predefined.valid_start_date,
      validEndDate: predefined.valid_end_date,
      invalidReason: predefined.invalid_reason,
    }
    dispatch('customMappingInput', mapped)
    mappedButton = true
  }

  function checkRow() {
    if (
      mapped?.conceptName !== $customConcept.concept_name ||
      mapped?.domainId !== $customConcept.domain_id ||
      mapped?.vocabularyId !== $customConcept.vocabulary_id ||
      mapped?.conceptClassId !== $customConcept.concept_class_id
    )
      mappedButton = false
    else mappedButton = true
  }

  $: {
    if (selectedRow) {
      predefined = {
        concept_id: '0',
        concept_code: selectedRow.sourceCode,
        standard_concept: '',
        valid_start_date: `${new Date().getFullYear()}-${
          (new Date().getMonth() + 1).toString().length === 2
            ? new Date().getMonth() + 1
            : `0${new Date().getMonth() + 1}`
        }-${new Date().getDate().toString().length === 2 ? new Date().getDate() : `0${new Date().getDate()}`}`,
        valid_end_date: '2099-12-31',
        invalid_reason: '',
      }
    }
  }
</script>

{#if index == 0}
  <td>
    {#if mappedButton}
      <button on:click={onClickMapping}><SvgIcon href="{base}/icons.svg" id="plus" width="16px" height="16px" /></button
      >
    {:else}
      <button style="background-color: greenyellow;"
        ><SvgIcon href="{base}/icons.svg" id="check" width="16px" height="16px" /></button
      >
    {/if}
  </td>
{:else}
  <td />
{/if}
{#if columns && predefined}
  {#each columns || [] as column (column.id)}
    <td>
      <div data-name="cell-container">
        {#if index == 0}
          {#if Object.keys($customConcept).includes(column.id)}
            {#if column.id == 'domain_id' || column.id == 'concept_class_id'}
              <AutocompleteInput
                id={column.id}
                initial={$customConcept[column.id]}
                list={suggestiveList[column.id]}
                on:autoComplete={autoComplete}
              />
            {:else}
              <input type="text" bind:value={$customConcept[column.id]} on:change={checkRow} />
            {/if}
          {:else}
            <p>{predefined[column.id]}</p>
          {/if}
        {:else}
          <p>{renderedRow[column.id]}</p>
        {/if}
      </div>
    </td>
  {/each}
{/if}

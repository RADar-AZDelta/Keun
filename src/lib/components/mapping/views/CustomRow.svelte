<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { databaseImpl, settings } from '$lib/store'
  import suggestions from '$lib/data/customConceptInfo.json'
  import AutocompleteInput from '$lib/components/extra/AutocompleteInput.svelte'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import type { ICustomConcept, ICustomConceptCompact, MappingEvents } from '$lib/components/Types'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import { reformatDate } from '@radar-azdelta-int/radar-utils'

  export let renderedRow: ICustomConceptCompact,
    columns: IColumnMetaData[] | undefined,
    originalIndex: number,
    sourceCode: string

  const inputAvailableColumns = ['concept_name', 'concept_class_id', 'domain_id', 'vocabulary_id']
  const colSuggestions: Record<string, Record<string, string>> = suggestions
  let action: string | undefined = undefined

  const dispatch = createEventDispatcher<MappingEvents>()

  let inputRow: Record<string, any> = {}
  let showMappingButton: boolean = true

  async function autoCompleteRow(e: CustomEvent<any>) {
    if (originalIndex !== 0) return
    inputRow[e.detail.id] = e.detail.value
  }

  async function onClickAdd() {
    // TODO: check if a custom concept with the same name doesn't already exist
    if (!$databaseImpl) return
    const { concept_name, concept_class_id, domain_id, vocabulary_id } = inputRow
    const concept: ICustomConceptCompact = {
      concept_name,
      concept_class_id,
      domain_id,
      vocabulary_id,
    }
    $databaseImpl.addCustomConcept(concept)
    await resetInputRow()
    dispatch('customConceptAdded', { concept })
  }

  async function resetInputRow() {
    if (originalIndex !== 0) return (inputRow = {})
    inputRow = { ...renderedRow, ...{ vocabulary_id: $settings.vocabularyIdCustomConcept ?? '' } }
    updateVocab()
  }

  const updateVocab = () => (inputRow.vocabulary_id = $settings.vocabularyIdCustomConcept ?? '')

  async function mapRow() {
    const compactConcept = renderedRow as ICustomConceptCompact
    const { concept_name, domain_id, vocabulary_id, concept_class_id } = compactConcept
    const concept: ICustomConcept = {
      conceptId: 0,
      conceptName: concept_name,
      domainId: domain_id,
      vocabularyId: vocabulary_id,
      conceptClassId: concept_class_id,
      standardConcept: '',
      conceptCode: sourceCode,
      validStartDate: reformatDate(),
      validEndDate: '2099-12-31',
      invalidReason: '',
    }
    action = 'SEMI-APPROVED'
    dispatch('mapCustomConcept', { concept, action: 'SEMI-APPROVED' })
  }

  async function flagRow() {
    const compactConcept = renderedRow as ICustomConceptCompact
    const { concept_name, domain_id, vocabulary_id, concept_class_id } = compactConcept
    const concept: ICustomConcept = {
      conceptId: 0,
      conceptName: concept_name,
      domainId: domain_id,
      vocabularyId: vocabulary_id,
      conceptClassId: concept_class_id,
      standardConcept: '',
      conceptCode: sourceCode,
      validStartDate: reformatDate(),
      validEndDate: '2099-12-31',
      invalidReason: '',
    }
    action = 'FLAGGED'
    dispatch('mapCustomConcept', { concept, action: 'FLAGGED' })
  }
  async function unapproveRow() {
    const compactConcept = renderedRow as ICustomConceptCompact
    const { concept_name, domain_id, vocabulary_id, concept_class_id } = compactConcept
    const concept: ICustomConcept = {
      conceptId: 0,
      conceptName: concept_name,
      domainId: domain_id,
      vocabularyId: vocabulary_id,
      conceptClassId: concept_class_id,
      standardConcept: '',
      conceptCode: sourceCode,
      validStartDate: reformatDate(),
      validEndDate: '2099-12-31',
      invalidReason: '',
    }
    action = 'UNAPPROVED'
    dispatch('mapCustomConcept', { concept, action: 'UNAPPROVED' })
  }

  $: {
    if ($settings.vocabularyIdCustomConcept) updateVocab()
  }

  resetInputRow()
</script>

{#if columns}
  {#if originalIndex === 0}
    {#if showMappingButton}
      <button on:click={onClickAdd}><SvgIcon id="save" /></button>
    {:else}
      <button style="background-color: greenyellow;"><SvgIcon id="check" /></button>
    {/if}
    {#each columns as column, _}
      <td>
        <div class="cell-container">
          {#if inputAvailableColumns.includes(column.id) && ['domain_id', 'concept_class_id'].includes(column.id)}
            <AutocompleteInput id={column.id} list={colSuggestions[column.id]} on:autoComplete={autoCompleteRow} />
          {:else if inputAvailableColumns.includes(column.id)}
            <input bind:value={inputRow[column.id]} />
          {:else}
            <p>{inputRow[column.id]}</p>
          {/if}
        </div>
      </td>
    {/each}
  {:else}
    <td class="actions-cell">
      <div class="actions-grid">
        {#if action === 'SEMI-APPROVED'}
          <button title="Approved" style="background-color: hsl(84, 100%, 70%);">
            <SvgIcon id="check" width="10px" height="10px" />
          </button>
        {:else}
          <button on:click={mapRow} title="Approve"><SvgIcon id="check" width="10px" height="10px" /></button>
        {/if}
        <button on:click={flagRow} title="Flag"><SvgIcon id="flag" width="10px" height="10px" /></button>
        <button on:click={unapproveRow} title="Unapprove"><SvgIcon id="x" width="10px" height="10px" /></button>
      </div>
    </td>
    <!-- Empty cell for action column -->
    {#each columns as column, _}
      <td><p>{renderedRow[column.id]}</p></td>
    {/each}
  {/if}
{/if}

<style>
  .actions-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(1, 1fr);
    height: max-content;
    max-width: 100%;
  }
</style>

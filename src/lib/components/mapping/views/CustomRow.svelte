<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { databaseImpl, settings } from '$lib/store'
  import AutocompleteInput from '$lib/components/extra/AutocompleteInput.svelte'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import type { ICustomConceptCompact, IUsagiRow, MappingEvents } from '$lib/components/Types'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import { Config } from '$lib/helperClasses/Config'
  import CustomRowActions from '$lib/classes/CustomRowActions'

  export let renderedRow: ICustomConceptCompact,
    columns: IColumnMetaData[] | undefined,
    originalIndex: number,
    usagiRow: IUsagiRow,
    usagiRowIndex: number,
    equivalence: string

  const inputAvailableColumns = ['concept_name', 'concept_class_id', 'domain_id', 'vocabulary_id']
  const colSuggestions: Record<string, Record<string, string>> = Config.customConceptInfo
  let action: string | undefined = undefined
  let row: CustomRowActions

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
    const concept = { concept_name, concept_class_id, domain_id, vocabulary_id }
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

  const mapRow = async () => await row.mapCustomConcept('SEMI-APPROVED', equivalence)
  const flagRow = async () => await row.mapCustomConcept('FLAGGED', equivalence)
  const unapproveRow = async () => await row.mapCustomConcept('UNAPPROVED', equivalence)

  $: {
    if ($settings.vocabularyIdCustomConcept) updateVocab()
  }

  onMount(async () => {
    await resetInputRow()
    row = new CustomRowActions(renderedRow as ICustomConceptCompact, usagiRow, usagiRowIndex)
  })
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

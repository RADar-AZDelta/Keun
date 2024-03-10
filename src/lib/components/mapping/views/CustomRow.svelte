<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { mappedToConceptIds, settings, user } from '$lib/store'
  import AutocompleteInput from '$lib/components/extra/AutocompleteInput.svelte'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import type { ICustomConceptCompact, IUsagiRow, MappingEvents } from '$lib/Types'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import { Config } from '$lib/helperClasses/Config'
  import CustomRow from '$lib/classes/customRow/CustomRow'
  import DatabaseImpl from '$lib/classes/implementation/DatabaseImpl'

  export let renderedRow: ICustomConceptCompact,
    columns: IColumnMetaData[] | undefined,
    originalIndex: number,
    usagiRow: IUsagiRow,
    usagiRowIndex: number,
    equivalence: string

  const inputAvailableColumns = ['concept_name', 'concept_class_id', 'domain_id', 'vocabulary_id']
  const colSuggestions: Record<string, string[]> = Config.customConceptInfo
  let action: string | undefined = undefined
  let columnInputs: Record<string, string> = { domain_id: '', concept_class_id: '' }
  let row: CustomRow

  const dispatch = createEventDispatcher<MappingEvents>()

  let inputRow: Record<string, any> = {}

  async function autoCompleteRow(e: CustomEvent<any>) {
    if (originalIndex !== 0) return
    inputRow[e.detail.id] = e.detail.value
  }

  async function onClickAdd() {
    const conceptAlreadyExists = await DatabaseImpl.checkIfCustomConceptAlreadyExists(<ICustomConceptCompact>inputRow)
    if (conceptAlreadyExists) return dispatch('updateError', { error: 'This custom concept already exists' })
    const error = await inputValidation()
    if (error) return dispatch('updateError', { error })
    const { concept_name, concept_class_id, domain_id, vocabulary_id } = inputRow
    const concept = { concept_name, concept_class_id, domain_id, vocabulary_id }
    await DatabaseImpl.addCustomConcept(concept)
    await resetInputRow()
    dispatch('customConceptAdded', { concept })
    dispatch('updateError', { error: '' })
  }

  async function inputValidation() {
    const emptyProperties = []
    for (let [property, value] of Object.entries(inputRow)) if (!value) emptyProperties.push(property)
    if (emptyProperties.length) return `The following properties can't be empty: ${emptyProperties}`
    const { concept_class_id, domain_id } = inputRow
    if (!colSuggestions['domain_id'].includes(domain_id)) return 'The domain must be one of the suggested values'
    if (!colSuggestions['concept_class_id'].includes(concept_class_id))
      return 'The className must be one of the suggested values'
  }

  async function resetInputRow() {
    columnInputs = { domain_id: '', concept_class_id: '' }
    if (originalIndex !== 0) return (inputRow = {})
    inputRow = { ...renderedRow, ...{ vocabulary_id: $settings.vocabularyIdCustomConcept ?? '' } }
    updateVocab()
  }

  const updateVocab = () => (inputRow.vocabulary_id = $settings.vocabularyIdCustomConcept ?? '')

  const mapRow = async () => await row.mapCustomConcept('SEMI-APPROVED', equivalence)
  const flagRow = async () => await row.mapCustomConcept('FLAGGED', equivalence)
  const unapproveRow = async () => await row.mapCustomConcept('UNAPPROVED', equivalence)
  const approveRow = async () => {}

  $: {
    if ($settings.vocabularyIdCustomConcept) updateVocab()
  }

  $: {
    renderedRow, usagiRow, usagiRowIndex
    row = new CustomRow(renderedRow as ICustomConceptCompact, usagiRow, usagiRowIndex)
  }

  onMount(async () => await resetInputRow())
</script>

{#if columns}
  {#if originalIndex === 0}
    <button on:click={onClickAdd}><SvgIcon id="save" /></button>
    {#each columns as column, _}
      <td>
        <div class="cell-container">
          {#if inputAvailableColumns.includes(column.id) && ['domain_id', 'concept_class_id'].includes(column.id)}
            <AutocompleteInput
              id={column.id}
              list={colSuggestions[column.id]}
              bind:inputValue={columnInputs[column.id]}
              on:autoComplete={autoCompleteRow}
            />
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
        {#if $mappedToConceptIds[usagiRow.sourceCode]?.[`custom-${renderedRow.concept_name}`] === 'APPROVED'}
          <button title="Approve mapping" style="background-color: {Config.colors['APPROVED']}">
            <SvgIcon id="check" width="10px" height="10px" />
          </button>
        {:else if $mappedToConceptIds[usagiRow.sourceCode]?.[`custom-${renderedRow.concept_name}`] === 'SEMI-APPROVED' && usagiRow.statusSetBy !== $user.name}
          <button
            on:click={approveRow}
            title="Approve mapping"
            style="background-color: {Config.colors['SEMI-APPROVED']}"
          >
            <SvgIcon id="check" width="10px" height="10px" />
          </button>
        {:else if $mappedToConceptIds[usagiRow.sourceCode]?.[`custom-${renderedRow.concept_name}`] === 'SEMI-APPROVED'}
          <button title="Mapped to row" style="background-color: {Config.colors['SEMI-APPROVED']}">
            <SvgIcon id="check" width="10px" height="10px" />
          </button>
        {:else}
          <button on:click={mapRow} title="Approve"><SvgIcon id="plus" width="10px" height="10px" /></button>
        {/if}
        {#if $mappedToConceptIds[usagiRow.sourceCode]?.[`custom-${renderedRow.concept_name}`] === 'FLAGGED'}
          <button title="Flagged mapping" style="background-color: {Config.colors['FLAGGED']}">
            <SvgIcon id="flag" width="10px" height="10px" />
          </button>
        {:else}
          <button on:click={flagRow} title="Flag"><SvgIcon id="flag" width="10px" height="10px" /></button>
        {/if}
        {#if $mappedToConceptIds[usagiRow.sourceCode]?.[`custom-${renderedRow.concept_name}`] === 'UNAPPROVED'}
          <button title="Unapproved mapping" style="background-color: {Config.colors['UNAPPROVED']}">
            <SvgIcon id="x" width="10px" height="10px" />
          </button>
        {:else}
          <button on:click={unapproveRow} title="Unapprove"><SvgIcon id="x" width="10px" height="10px" /></button>
        {/if}
      </div>
    </td>
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

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'
  import { settings } from '$lib/store'
  import { Config } from '$lib/helperClasses/Config'
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'
  import DatabaseImpl from '$lib/classes/implementation/DatabaseImpl'
  import CustomValidation from '$lib/classes/customRow/CustomValidation'
  import AutocompleteInput from '$lib/components/extra/AutocompleteInput.svelte'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import type { ICustomConceptCompact, MappingEvents } from '$lib/Types'

  export let columns: IColumnMetaData[], originalIndex: number, renderedRow: ICustomConceptCompact

  const dispatch = createEventDispatcher<MappingEvents>()
  const autoCompleteColumns = ['concept_class_id', 'domain_id']
  let inputRow: Record<string, any> = {}

  async function addRow() {
    const conceptAlreadyExists = await DatabaseImpl.checkIfCustomConceptAlreadyExists(<ICustomConceptCompact>inputRow)
    if (conceptAlreadyExists) return dispatch('updateError', { error: 'This custom concept already exists' })
    const result = await CustomValidation.validateRow(inputRow, true).catch(error => dispatch('updateError', { error }))
    console.log('RESULT ', result)
    if (result) return
    const { concept_name, concept_class_id, domain_id, vocabulary_id } = inputRow
    const concept = { concept_name, concept_class_id, domain_id, vocabulary_id }
    await DatabaseImpl.addCustomConcept(concept)
    await resetInputRow()
    dispatch('customConceptAdded', { concept })
    dispatch('updateError', { error: '' })
  }

  async function resetInputRow() {
    if (originalIndex !== 0) return (inputRow = {})
    inputRow = { ...renderedRow, ...{ vocabulary_id: $settings.vocabularyIdCustomConcept ?? '' } }
    updateVocab()
  }

  async function autoCompleteRow(e: CustomEvent<any>) {
    if (originalIndex !== 0) return
    const { id, value } = e.detail
    inputRow[id] = value
  }

  const updateVocab = () => (inputRow.vocabulary_id = $settings.vocabularyIdCustomConcept ?? '')

  $: {
    if ($settings.vocabularyIdCustomConcept) updateVocab()
  }

  onMount(() => resetInputRow())
</script>

<td><button on:click={addRow}><SvgIcon id="save" /></button></td>
{#each columns as column, _}
  {@const { id } = column}
  {@const list = Config.customConceptInfo[id]}
  <td>
    <div class="cell-container">
      {#if autoCompleteColumns.includes(id)}
        <AutocompleteInput {id} {list} bind:inputValue={inputRow[column.id]} on:autoComplete={autoCompleteRow} />
      {:else}
        <input bind:value={inputRow[column.id]} />
      {/if}
    </div>
  </td>
{/each}

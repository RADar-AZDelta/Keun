<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import { EditableCell } from '@radar-azdelta/svelte-datatable'
  import { mappedToConceptIds, user } from '$lib/store'
  import { Config } from '$lib/helperClasses/Config'
  import CustomRow from '$lib/classes/customRow/CustomRow'
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'
  import DatabaseImpl from '$lib/classes/implementation/DatabaseImpl'
  import CustomValidation from '$lib/classes/customRow/CustomValidation'
  import type { IColumnMetaData } from '@radar-azdelta/svelte-datatable'
  import type { ICustomConceptCompact, IUsagiRow, MappingEvents } from '$lib/Types'

  export let usagiRow: IUsagiRow,
    usagiRowIndex: number,
    renderedRow: ICustomConceptCompact,
    columns: IColumnMetaData[],
    equivalence: string

  const dispatch = createEventDispatcher<MappingEvents>()
  let row: CustomRow = new CustomRow(renderedRow as ICustomConceptCompact, usagiRow, usagiRowIndex)

  const mapRow = async () => await row.mapCustomConcept('SEMI-APPROVED', equivalence)
  const flagRow = async () => await row.mapCustomConcept('FLAGGED', equivalence)
  const unapproveRow = async () => await row.mapCustomConcept('UNAPPROVED', equivalence)
  const approveRow = async () => await row.mapCustomConcept('APPROVED', equivalence)
  const setRow = async () => (row = new CustomRow(renderedRow as ICustomConceptCompact, usagiRow, usagiRowIndex))

  async function updateCustomConcept(e: CustomEvent, columnId: string) {
    const value = e.detail
    const editedRow = { ...renderedRow, ...{ [columnId]: value } }
    const result = await CustomValidation.validateRow(editedRow).catch(error => dispatch('updateError', { error }))
    if (result) return (renderedRow[columnId] = renderedRow[columnId])
    const { concept_name, concept_class_id, domain_id, vocabulary_id } = renderedRow
    const existingConcept = { concept_name, concept_class_id, domain_id, vocabulary_id }
    if (columnId === 'concept_name') 
      $mappedToConceptIds[usagiRow.sourceCode][`custom-${value}`] =
        $mappedToConceptIds[usagiRow.sourceCode]?.[`custom-${renderedRow.concept_name}`]
    renderedRow[columnId] = value
    const { concept_name: name, concept_class_id: classId, domain_id: domain, vocabulary_id: vocab } = renderedRow
    const newConcept = { concept_name: name, concept_class_id: classId, domain_id: domain, vocabulary_id: vocab }
    await DatabaseImpl.updateCustomConcept(newConcept, existingConcept)
  }

  $: {
    renderedRow, usagiRow, usagiRowIndex
    setRow()
  }
</script>

{#if usagiRow}
  {@const mappingStatus = $mappedToConceptIds[usagiRow.sourceCode]?.[`custom-${renderedRow.concept_name}`]}
  {@const color = Config.colors[mappingStatus]}
  <td class="actions-cell">
    <div class="actions-grid">
      {#if mappingStatus === 'APPROVED'}
        <button title="Approve mapping" style="background-color: {color}">
          <SvgIcon id="check" width="10px" height="10px" />
        </button>
      {:else if mappingStatus === 'SEMI-APPROVED' && usagiRow.statusSetBy !== $user.name}
        <button on:click={approveRow} title="Approve mapping" style="background-color: {color}">
          <SvgIcon id="check" width="10px" height="10px" />
        </button>
      {:else if mappingStatus === 'SEMI-APPROVED'}
        <button title="Mapped to row" style="background-color: {color}">
          <SvgIcon id="check" width="10px" height="10px" />
        </button>
      {:else}
        <button on:click={mapRow} title="Approve"><SvgIcon id="plus" width="10px" height="10px" /></button>
      {/if}
      {#if mappingStatus === 'FLAGGED'}
        <button title="Flagged mapping" style="background-color: {color}">
          <SvgIcon id="flag" width="10px" height="10px" />
        </button>
      {:else}
        <button on:click={flagRow} title="Flag"><SvgIcon id="flag" width="10px" height="10px" /></button>
      {/if}
      {#if mappingStatus === 'UNAPPROVED'}
        <button title="Unapproved mapping" style="background-color: {color}">
          <SvgIcon id="x" width="10px" height="10px" />
        </button>
      {:else}
        <button on:click={unapproveRow} title="Unapprove"><SvgIcon id="x" width="10px" height="10px" /></button>
      {/if}
    </div>
  </td>
  {#each columns as column, _}
    <td title={renderedRow[column.id]}>
      <EditableCell value={renderedRow[column.id]} on:valueChanged={e => updateCustomConcept(e, column.id)} />
    </td>
  {/each}
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

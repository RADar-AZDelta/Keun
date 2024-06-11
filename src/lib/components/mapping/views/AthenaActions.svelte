<script lang="ts">
  import { PUBLIC_ATHENA_DETAIL } from '$env/static/public'
  import Config from '$lib/helpers/Config'
  import Athena from '$lib/helpers/athena/Athena'
  import type { IAthenaActionsProps } from '$lib/interfaces/Types'
  import { createMappedToConceptIds, createUser } from '$lib/stores/runes.svelte'
  import SvgIcon from '$lib/components/extra/SvgIcon.svelte'

  // TODO: fix user here
  let user = createUser()

  let { renderedRow, selectedRow, selectedRowIndex, equivalence }: IAthenaActionsProps = $props()

  let mappedToConceptIds = createMappedToConceptIds()
  let rowActions: Athena

  const approveRow = async () => await rowActions.approveRow()
  const mapRowApproved = async () => await rowActions.mapRowApproved(equivalence)
  const mapRowFlagged = async () => await rowActions.mapRowFlagged(equivalence)
  const mapRowUnapproved = async () => await rowActions.mapRowUnapproved(equivalence)

  async function referToAthena() {
    const referUrl = PUBLIC_ATHENA_DETAIL + renderedRow.id.toString()
    window.open(encodeURI(referUrl), '_blank')?.focus()
  }

  async function updateRow() {
    if (!rowActions) return (rowActions = new Athena(renderedRow, selectedRow, selectedRowIndex))
    const updatedRows = { athenaRow: renderedRow, usagiRow: selectedRow, usagiRowIndex: selectedRowIndex }
    await rowActions.updateCurrentRow(updatedRows)
  }

  $effect(() => {
    selectedRow
    selectedRowIndex
    renderedRow
    updateRow()
  })
</script>

{#if selectedRow}
  {@const conceptIds = mappedToConceptIds.value}
  {#if selectedRow?.sourceCode && conceptIds[selectedRow.sourceCode]?.[renderedRow.id] === 'APPROVED'}
    <button title="Mapped to row" style="background-color: {Config.colors['APPROVED']};">
      <SvgIcon id="check" width="10px" height="10px" />
    </button>
  {:else if selectedRow?.sourceCode && conceptIds[selectedRow.sourceCode]?.[renderedRow.id] === 'SEMI-APPROVED' && selectedRow.statusSetBy !== user.value}
    <button onclick={approveRow} title="Approve mapping" style="background-color: {Config.colors['SEMI-APPROVED']};">
      <SvgIcon id="check" width="10px" height="10px" />
    </button>
  {:else if selectedRow?.sourceCode && conceptIds[selectedRow.sourceCode]?.[renderedRow.id] === 'SEMI-APPROVED'}
    <button title="Mapped to row" style="background-color: {Config.colors['SEMI-APPROVED']};">
      <SvgIcon id="plus" width="10px" height="10px" />
    </button>
  {:else}
    <button title="Map to row" onclick={mapRowApproved}>
      <SvgIcon id="plus" width="10px" height="10px" />
    </button>
  {/if}
  {#if selectedRow?.sourceCode && conceptIds[selectedRow.sourceCode]?.[renderedRow.id] === 'FLAGGED'}
    <button title="Flagged row" style="background-color: {Config.colors['FLAGGED']};">
      <SvgIcon id="flag" width="10px" height="10px" />
    </button>
  {:else}
    <button title="Flag row" onclick={mapRowFlagged}>
      <SvgIcon id="flag" width="10px" height="10px" />
    </button>
  {/if}
  {#if selectedRow?.sourceCode && conceptIds[selectedRow.sourceCode]?.[renderedRow.id] === 'UNAPPROVED'}
    <button title="Unapproved row" style="background-color: {Config.colors['UNAPPROVED']};">
      <SvgIcon id="x" width="10px" height="10px" />
    </button>
  {:else}
    <button title="Unapprove row" onclick={mapRowUnapproved}>
      <SvgIcon id="x" width="10px" height="10px" />
    </button>
  {/if}
  <button onclick={referToAthena}>
    <SvgIcon id="link" width="10px" height="10px" />
  </button>
{/if}

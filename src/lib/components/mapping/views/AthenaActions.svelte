<script lang="ts">
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import { mappedToConceptIds, user } from '$lib/store'
  import { Config } from '$lib/helperClasses/Config'
  import AthenaActions from '$lib/classes/AthenaActions'
  import { PUBLIC_ATHENA_DETAIL } from '$env/static/public'
  import type { IAthenaRow, IUsagiRow } from '$lib/components/Types'

  export let renderedRow: IAthenaRow
  export let selectedRow: IUsagiRow, selectedRowIndex: number, equivalence: string

  let rowActions: AthenaActions
  
  const approveRow = async () => await rowActions.approveRow()
  const mapRowApproved = async () => await rowActions.mapRowApproved(equivalence)
  const mapRowFlagged = async () => await rowActions.mapRowFlagged(equivalence)
  const mapRowUnapproved = async () => await rowActions.mapRowUnapproved(equivalence)

  async function referToAthena(id: number) {
    const referUrl = PUBLIC_ATHENA_DETAIL + id.toString()
    window.open(encodeURI(referUrl), '_blank')?.focus()
  }

  async function updateRow() {
    if (!rowActions) return (rowActions = new AthenaActions(renderedRow, selectedRow, selectedRowIndex))
    return rowActions.updateSelectedRow(renderedRow, selectedRow, selectedRowIndex)
  }

  $: {
    selectedRow, selectedRowIndex, renderedRow
    updateRow()
  }
</script>

{#if $mappedToConceptIds[renderedRow.id] === 'APPROVED'}
  <button title="Mapped to row" style="background-color: {Config.colors['APPROVED']};">
    <SvgIcon id="check" width="10px" height="10px" />
  </button>
{:else if $mappedToConceptIds[renderedRow.id] === 'SEMI-APPROVED' && selectedRow.statusSetBy !== $user.name}
  <button on:click={approveRow} title="Approve mapping" style="background-color: {Config.colors['SEMI-APPROVED']};">
    <SvgIcon id="check" width="10px" height="10px" />
  </button>
{:else if $mappedToConceptIds[renderedRow.id] === 'SEMI-APPROVED'}
  <button title="Mapped to row" style="background-color: {Config.colors['SEMI-APPROVED']};">
    <SvgIcon id="plus" width="10px" height="10px" />
  </button>
{:else}
  <button title="Map to row" on:click={mapRowApproved}>
    <SvgIcon id="plus" width="10px" height="10px" />
  </button>
{/if}
{#if $mappedToConceptIds[renderedRow.id] === 'FLAGGED'}
  <button title="Flagged row" style="background-color: {Config.colors['FLAGGED']};">
    <SvgIcon id="flag" width="10px" height="10px" />
  </button>
{:else}
  <button title="Flag row" on:click={mapRowFlagged}>
    <SvgIcon id="flag" width="10px" height="10px" />
  </button>
{/if}
{#if $mappedToConceptIds[renderedRow.id] === 'UNAPPROVED'}
  <button title="Unapproved row" style="background-color: {Config.colors['UNAPPROVED']};">
    <SvgIcon id="x" width="10px" height="10px" />
  </button>
{:else}
  <button title="Unapprove row" on:click={mapRowUnapproved}>
    <SvgIcon id="x" width="10px" height="10px" />
  </button>
{/if}
<button on:click={() => referToAthena(renderedRow.id)}>
  <SvgIcon id="link" width="10px" height="10px" />
</button>

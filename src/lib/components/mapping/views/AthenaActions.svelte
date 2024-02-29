<script lang="ts">
  import { onMount } from 'svelte'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import { user } from '$lib/store'
  import { Config } from '$lib/helperClasses/Config'
  import AthenaActions from '$lib/classes/AthenaActions'
  import type { IAthenaRow, IMappedRows, IUsagiRow } from '$lib/components/Types'

  export let renderedRow: IAthenaRow, mappedToConceptIds: IMappedRows
  export let selectedRow: IUsagiRow, selectedRowIndex: number
  export let equivalence: string, comment: string, reviewer: string

  let rowActions: AthenaActions
  const width = '10px'
  const height = '10px'

  const approveRow = async () => await rowActions.approveRow()
  const mapRowApproved = async () => await rowActions.mapRowApproved({ equivalence, comment, reviewer })
  const mapRowFlagged = async () => await rowActions.mapRowFlagged({ equivalence, comment, reviewer })
  const mapRowUnapproved = async () => await rowActions.mapRowUnapproved({ equivalence, comment, reviewer })

  async function referToAthena(id: number) {
    const referUrl = import.meta.env.VITE_ATHENA_DETAIL + id.toString()
    window.open(encodeURI(referUrl), '_blank')?.focus()
  }

  onMount(() => {
    rowActions = new AthenaActions(renderedRow, selectedRow, selectedRowIndex)
  })
</script>

{#if mappedToConceptIds[renderedRow.id] === 'APPROVED'}
  <button title="Mapped to row" style="background-color: {Config.colors['APPROVED']};">
    <SvgIcon id="check" {width} {height} />
  </button>
{:else if mappedToConceptIds[renderedRow.id] === 'SEMI-APPROVED' && selectedRow.statusSetBy !== $user.name}
  <button on:click={approveRow} title="Approve mapping" style="background-color: {Config.colors['SEMI-APPROVED']};">
    <SvgIcon id="check" {width} {height} />
  </button>
{:else if mappedToConceptIds[renderedRow.id] === 'SEMI-APPROVED'}
  <button title="Mapped to row" style="background-color: {Config.colors['SEMI-APPROVED']};">
    <SvgIcon id="plus" {width} {height} />
  </button>
{:else}
  <button title="Map to row" on:click={mapRowApproved}>
    <SvgIcon id="plus" {width} {height} />
  </button>
{/if}
{#if mappedToConceptIds[renderedRow.id] === 'FLAGGED'}
  <button title="Flagged row" style="background-color: {Config.colors['FLAGGED']};">
    <SvgIcon id="flag" {width} {height} />
  </button>
{:else}
  <button title="Flag row" on:click={mapRowFlagged}>
    <SvgIcon id="flag" {width} {height} />
  </button>
{/if}
{#if mappedToConceptIds[renderedRow.id] === 'UNAPPROVED'}
  <button title="Unapproved row" style="background-color: {Config.colors['UNAPPROVED']};">
    <SvgIcon id="x" {width} {height} />
  </button>
{:else}
  <button title="Unapprove row" on:click={mapRowUnapproved}>
    <SvgIcon id="x" {width} {height} />
  </button>
{/if}
<button on:click={() => referToAthena(renderedRow.id)}>
  <SvgIcon id="link" {width} {height} />
</button>

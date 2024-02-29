<script lang="ts">
  import AthenaActions from '$lib/classes/AthenaActions'
  import type { IAthenaRow, IMappedRow, IMappedRows, IUsagiRow } from '$lib/components/Types'
  import { user } from '$lib/store'
  import { SvgIcon } from '@radar-azdelta-int/radar-svelte-components'
  import { onMount } from 'svelte'

  export let renderedRow: IAthenaRow, mappedToConceptIds: IMappedRows
  export let selectedRow: IUsagiRow, selectedRowIndex: number
  export let mappedData: (IMappedRow | object)[]
  export let equivalence: string, comment: string, reviewer: string

  let rowActions: AthenaActions

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
  <button title="Mapped to row" style="background-color: hsl(156, 100%, 35%);">
    <SvgIcon id="check" width="10px" height="10px" />
  </button>
{:else if mappedToConceptIds[renderedRow.id] === 'SEMI-APPROVED' && selectedRow.statusSetBy !== $user.name}
  <button on:click={approveRow} title="Approve mapping" style="background-color: hsl(84, 100%, 70%);">
    <SvgIcon id="check" width="10px" height="10px" />
  </button>
{:else if mappedToConceptIds[renderedRow.id] === 'SEMI-APPROVED'}
  <button title="Mapped to row" style="background-color: hsl(84, 100%, 70%);">
    <SvgIcon id="plus" width="10px" height="10px" />
  </button>
{:else}
  <button title="Map to row" on:click={mapRowApproved}>
    <SvgIcon id="plus" width="10px" height="10px" />
  </button>
{/if}
{#if mappedToConceptIds[renderedRow.id] === 'FLAGGED'}
  <button title="Flagged row" style="background-color: hsl(54, 89%, 64%);">
    <SvgIcon id="flag" width="10px" height="10px" />
  </button>
{:else}
  <button title="Flag row" on:click={mapRowFlagged}>
    <SvgIcon id="flag" width="10px" height="10px" />
  </button>
{/if}
{#if mappedToConceptIds[renderedRow.id] === 'UNAPPROVED'}
  <button title="Unapproved row" style="background-color: hsl(8, 100%, 59%);">
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

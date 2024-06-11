<script lang="ts">
  import PaginationIntegrated from '$lib/components/extra/PaginationIntegrated.svelte'
  import File from '$lib/components/menu/File.svelte'
  import Database from '$lib/helpers/Database'
  import { createUser } from '$lib/stores/runes.svelte'
  import Confirm from '../extra/Confirm.svelte'
  import type { IFileMenuProps } from '$lib/interfaces/Types'

  let { files = $bindable(), setProcessing }: IFileMenuProps = $props()

  let user = createUser()

  let confirmDialog: HTMLDialogElement | undefined = $state(undefined)
  let fileToDelete = $state({ id: '', name: '' })

  async function deleteFiles(approveId: string, props?: any | undefined): Promise<void> {
    if (!props || approveId !== 'delete') return
    await setProcessing(true)
    if (props?.id) {
      await Database.deleteKeunFile(props.id)
      files = files.filter(file => file.id !== props.id)
    }
    await setProcessing(false)
  }

  async function confirmFileDeletion(id: string, name: string) {
    fileToDelete = { id, name }
    confirmDialog?.showModal()
  }
</script>

<Confirm bind:dialog={confirmDialog} title={fileToDelete.name} approveProps={{ id: fileToDelete.id }} approveId="delete" approve={deleteFiles} />

{#if user.value}
  <PaginationIntegrated total={files.length} perPageOptions={[5, 10]} perPage={5}>
    {#snippet child(start: number, end: number)}
      {#each files.slice(start, end) as file (file.id)}
        <File {...file} {confirmFileDeletion} />
      {/each}
    {/snippet}
  </PaginationIntegrated>
{/if}

<style>
  .rights-error {
    text-align: center;
    margin: 0 0 1rem 0;
  }
</style>

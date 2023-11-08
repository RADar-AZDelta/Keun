<script lang="ts">
  import { dev } from '$app/environment'
  import { authImpl, databaseImpl } from '$lib/store'
  import { loadImplementationDB } from '$lib/implementation'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'

  export let processing: boolean, selected: string

  let dialog: HTMLDialogElement, authorizedAuthors: string[]

  export async function showDialog(): Promise<void> {
    dialog.showModal()
  }

  export async function closeDialog(): Promise<void> {
    dialog.close()
  }

  // A method to edit the authors that have access to a file
  async function editFile(id: string): Promise<void> {
    if (dev) console.log('editFile: The file authors are being updated')
    if (!$databaseImpl) await loadImplementationDB()
    await $databaseImpl!.editFileAuthors(id, authorizedAuthors)
    closeDialog()
    if (dev) console.log('editFile: The file authors were updated')
  }
</script>

<dialog bind:this={dialog} class="authors-dialog">
  <div class="authors-container">
    <button on:click={closeDialog} class="close-dialog" disabled={processing}><SvgIcon id="x" /></button>
    <h1 class="title">Update the authorized authors</h1>
    <ul class="list">
      {#await $authImpl?.getAllAuthors() then users}
        {#if users}
          {#each Object.entries(users) as [uid, info]}
            {#if info.email}
              <li>
                <label class="option">
                  <input
                    type="checkbox"
                    checked={info.files ? Object.values(info.files).includes(selected) : false}
                    bind:group={authorizedAuthors}
                    value={uid}
                  />
                  {info.email}
                </label>
              </li>
            {/if}
          {/each}
        {/if}
      {/await}
    </ul>
    <button on:click={() => editFile(selected)}>Update</button>
  </div>
</dialog>

<style>
  .authors-dialog {
    width: 80%;
    height: 80%;
    border-radius: 10px;
    border: none;
  }

  .authors-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }

  .close-dialog {
    position: absolute;
    right: 1rem;
    top: 1rem;
    border: none;
    background-color: inherit;
    color: #4f4f4f;
  }

  .title {
    font-size: 1.5rem;
    text-align: center;
  }

  .list {
    flex: 1 1 auto;
    list-style: none;
    padding: 0;
  }

  .option {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
</style>

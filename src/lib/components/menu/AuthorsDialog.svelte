<script lang="ts">
  import { dev } from '$app/environment'
  import { SvgIcon } from 'components'
  import { authImpl, databaseImpl } from '$lib/store'
  import { loadImplementationDB } from '$lib/implementations/implementation'

  export let processing: boolean, selected: string

  let dialog: HTMLDialogElement, authorizedAuthors: string[]

  export const showDialog = () => dialog.showModal()

  export const closeDialog = () => dialog.close()

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
          {#each users as user, _}
            {#if user.id}
              <li>
                <label class="option">
                  <input
                    type="checkbox"
                    checked={user.fileIds ? Object.values(user.fileIds).includes(selected) : false}
                    bind:group={authorizedAuthors}
                    value={user.id}
                  />
                  {user.name}
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

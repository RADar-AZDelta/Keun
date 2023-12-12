<script lang="ts">
  import { dev } from '$app/environment'
  import { createEventDispatcher } from 'svelte'
  import SvgIcon from '$lib/obsolete/SvgIcon.svelte'
  import { user } from '$lib/store'
  import type { PageEvents } from '$lib/components/Types'

  export let missing: Record<string, string>, cols: string[], file: File

  const dispatch = createEventDispatcher<PageEvents>()

  let dialog: HTMLDialogElement

  export const showDialog = () => dialog.showModal()

  export const closeDialog = () => dialog.close()

  // A method to rename the columns to get a standardized version of the file
  async function fileUploadWithColumnChanges(): Promise<void> {
    if (dev) console.log('fileUploadWithColumnChanges: The file is uploading and process the column changes')
    if (!$user) return console.error('fileUploadWithColumnChanges: There is no author name set.')
    // if (!($implementation === 'firebase' && $settings?.author?.roles?.includes('Admin')) && $databaseImpl) return
    var reader = new FileReader()
    reader.onload = processUpdatedColumns
    reader.readAsText(<Blob>file)
  }

  // Read the file and update the columns
  async function processUpdatedColumns(this: FileReader, ev: ProgressEvent<FileReader>): Promise<void> {
    if (dev) console.log('processUpdatedColumns: Update the given columns to the expected columns')
    if (!ev.target?.result) return
    // Get the columns row of the file
    const fileContent = ev.target.result.toString()
    let columns = fileContent.substring(0, fileContent.indexOf('\n'))
    for (let [newColumn, oldColumn] of Object.entries(missing)) {
      // Replace the old columns with the standardized columns
      columns = columns.replace(oldColumn, newColumn)
    }
    // Combine the columns and the rest of the file together
    const updatedFileContent = columns + fileContent.slice(fileContent.indexOf('\n'))
    const blob = new Blob([updatedFileContent], { type: 'text/csv' })
    file = new File([blob], file.name, { type: 'text/csv' })
    closeDialog()
    dispatch('fileUpdateColumns', { file })
  }
</script>

<dialog bind:this={dialog} class="column-dialog">
  <div class="dialog-container">
    <button class="close-dialog" on:click={closeDialog}><SvgIcon id="x" /></button>
    <h1>Set columns</h1>
    {#each Object.keys(missing) as newColumn, _}
      <div class="column-selection">
        <p>{newColumn} column:</p>
        <select name={newColumn} id={newColumn} bind:value={missing[newColumn]}>
          {#each cols as col, i}
            {#if col.toLowerCase() === newColumn.toLowerCase()}
              <option value={col} selected>{col}</option>
            {:else}
              <option value={col}>{col}</option>
            {/if}
          {/each}
        </select>
      </div>
    {/each}
    <div class="button-container">
      <button class="save" on:click={fileUploadWithColumnChanges}>Save</button>
    </div>
  </div>
</dialog>

<style>
  .column-dialog {
    width: max-content;
    height: max-content;
    padding: 1rem;
  }

  .close-dialog {
    position: absolute;
    right: 1rem;
    top: 1rem;
    border: none;
    background-color: inherit;
    color: #4f4f4f;
  }

  .column-selection {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  select {
    padding: 0.5rem 1rem;
  }

  .button-container {
    width: 100%;
    padding: 2rem 0 1rem 0;
    display: flex;
    justify-content: center;
  }

  .save {
    background-color: #0094d3;
    color: black;
  }

  .save:hover {
    background-color: #0082ba;
  }

  .save:focus {
    outline: none;
    box-shadow: 0 0 0 2px #62b4cf;
  }
</style>

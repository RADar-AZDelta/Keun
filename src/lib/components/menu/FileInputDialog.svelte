<script lang="ts">
  import { dev } from '$app/environment'
  import { createEventDispatcher } from 'svelte'
  import { authImpl, databaseImplementation } from '$lib/store'
  import Drop from '$lib/components/Extra/Drop.svelte'
  import Spinner from '$lib/components/Extra/Spinner.svelte'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import type { FileDropEventDetail, PageEvents } from '$lib/components/Types'

  export let processing: boolean

  const dispatch = createEventDispatcher<PageEvents>()

  let dialog: HTMLDialogElement, file: File | undefined, userFilter: string, authorizedAuthors: string[]
  let currentColumns: string[] = []
  let missingColumns: Record<string, string> = {}

  export async function showDialog() {
    dialog.showModal()
  }

  export async function closeDialog() {
    file = undefined
    dialog.close()
  }

  // A method for when a new file has been put in the field
  async function onFileInputChange(e: Event) {
    if (dev) console.log('onFileInputChange: A file has been upload via the input button')
    const allowedExtensions = ['csv']
    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return
    const reader = new FileReader()
    reader.onload = checkForMissingColumns
    // There will only be one file, split the name from the extension
    const extension = inputFiles[0].name.split('.').pop()
    // Check if the extension is allowed, check the file for missing columns
    if (!extension || !allowedExtensions.includes(extension)) return
    file = inputFiles[0]
    reader.readAsText(file)
  }

  // Read the content of the file, seperate the columns from the rows and check if all columns are in the file
  async function checkForMissingColumns(this: FileReader, ev: ProgressEvent<FileReader>) {
    if (dev) console.log('checkForMissingColumns: Checking if there are missing columns in the file')
    if (!this.result) return
    let content = this.result.toString()
    if (!content) return
    // Check if all columns needed are available
    if (content.includes('sourceName') && content.includes('sourceCode') && content.includes('sourceFrequency')) return
    // Get all the columns from the document
    currentColumns = content.split(/\n/)[0].split(',')
    // Sometimes a column ends with multiple instances of ";" so this needs to be removed
    for (let i = 0; i < currentColumns.length; i++)
      if (currentColumns[i].includes(';'))
        currentColumns[i] = currentColumns[i].substring(0, currentColumns[i].indexOf(';'))
    ;['sourceCode', 'sourceName', 'sourceFrequency'].forEach(col => {
      // If a important column is missing, add it to the missingColumns object, the corresponding column will be asigned to this object later
      if (!currentColumns.includes(col)) missingColumns[col] = ''
    })
    // Show the pop up where the user can select the corresponding columns to the missing important columns
    if (dev) console.log('checkForMissingColumns: All missing columns were identified')
    dispatch('columnsDialogShow')
  }

  async function fileDrop(e: CustomEvent<FileDropEventDetail>) {
    file = e.detail.file
  }

  async function checkForCache() {
    if (!file) return
    dispatch('checkForCache', { file })
  }
</script>

<dialog bind:this={dialog} class="file-dialog">
  <div class="file-input-container">
    <h1 class="file-input-title">Upload a new file</h1>
    <button on:click={closeDialog} class="close-dialog" disabled={processing}>
      <SvgIcon id="x" />
    </button>
    <Drop extensions={['csv']} readerMethod={checkForMissingColumns} on:fileDrop={fileDrop}>
      <label class="upload-file">
        {#if file}
          <SvgIcon id="excel" width="40px" height="40px" />
          <p>{file.name}</p>
        {:else}
          <SvgIcon id="upload" width="24px" height="24px" />
          <p>Drag or click to upload a file</p>
        {/if}
        <input class="file-input" type="file" name="file" id="file" accept=".csv" on:input={onFileInputChange} />
      </label>
    </Drop>
    {#if databaseImplementation === 'firebase'}
      <h2 class="authors-title">Select the authors that have permission to this file:</h2>
      <input class="authors-input" type="text" placeholder="search for an user" bind:value={userFilter} />
      <ul class="authors-list">
        {#await $authImpl?.getAllAuthors() then users}
          {#if users}
            {#each Object.entries(users) as [uid, info]}
              <li class="author-option">
                <label class="author-label">
                  <input type="checkbox" name={info.email} id={info.email} bind:group={authorizedAuthors} value={uid} />
                  {info.email}
                </label>
              </li>
            {/each}
          {/if}
        {/await}
      </ul>
    {/if}
    <button class="upload" on:click={checkForCache} disabled={file ? false : true || processing}>Upload</button>
    {#if processing}
      <Spinner />
    {/if}
  </div>
</dialog>

<style>
  .file-dialog {
    width: 80%;
    height: 80%;
    border-radius: 10px;
    border: none;
  }

  .file-input-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
  }

  .file-input-title {
    font-size: 1.5rem;
    text-align: center;
  }

  .close-dialog {
    position: absolute;
    right: 1rem;
    top: 1rem;
    border: none;
    background-color: inherit;
    color: #4f4f4f;
  }

  .upload-file {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .file-input {
    display: none;
  }

  .authors-title {
    font-size: 1.25rem;
    font-weight: 500;
  }

  .authors-input {
    padding: 0.5rem;
    font-size: 1rem;
  }

  .authors-list {
    list-style: none;
    flex: 1 1 auto;
    overflow-y: auto;
  }

  .author-option {
    display: flex;
    gap: 1rem;
  }

  .author-label {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .upload {
    width: 100%;
  }
</style>

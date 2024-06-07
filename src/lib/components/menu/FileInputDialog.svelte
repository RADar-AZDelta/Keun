<script lang="ts">
  import Config from '$lib/helpers/Config'
  import Reader from '$lib/helpers/FileReader'
  import type { IFileInputDialogProps } from '$lib/interfaces/Types'
  import { dev } from '$app/environment'
  import SvgIcon from '../extra/SvgIcon.svelte'
  import Drop from '../extra/Drop.svelte'
  import Spinner from '../extra/Spinner.svelte'
    import { createUser } from '$lib/stores/runes.svelte'

  let { processing = $bindable(), checkForCache, columnsDialogShow }: IFileInputDialogProps = $props()

  let user = createUser()
  let dialog: HTMLDialogElement | undefined = $state(undefined)
  let file: File | undefined = $state(undefined)
  let selectedDomain: string = $state('none')
  let currentColumns: string[] = $state([])
  let missingColumns: Record<string, string> = $state({})

  export const showDialog = async () => dialog?.showModal()

  export async function closeDialog(): Promise<void> {
    file = undefined
    dialog?.close()
  }

  async function onFileInputChange(e: Event): Promise<void> {
    if (dev) console.log('onFileInputChange: A file has been upload via the input button')
    const allowedExtensions = ['csv']
    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return
    // const reader = new FileReader()
    // reader.onload = checkForMissingColumns
    // There will only be one file, split the name from the extension
    if (!inputFiles[0]) return
    const extension = inputFiles[0].name.split('.').pop()
    // Check if the extension is allowed, check the file for missing columns
    if (!extension || !allowedExtensions.includes(extension)) return
    file = inputFiles[0]
    // reader.readAsText(file)
    await Reader.readFileAsText(file)
    await checkForMissingColumns(Reader.content)
  }

  async function checkForMissingColumns(content: string | undefined) {
    if (!content) return
    if (content.includes('sourceName') && content.includes('sourceCode') && content.includes('sourceFrequency')) return
    // Get all the columns from the document
    currentColumns = content.split(/\n/)[0].split(',')
    // Sometimes a column ends with multiple instances of ";" so this needs to be removed
    for (let i = 0; i < currentColumns.length; i++)
      if (currentColumns[i].includes(';')) currentColumns[i] = currentColumns[i].substring(0, currentColumns[i].indexOf(';'))
    ;['sourceCode', 'sourceName', 'sourceFrequency'].forEach(col => {
      // If a important column is missing, add it to the missingColumns object, the corresponding column will be asigned to this object later
      if (!currentColumns.includes(col)) missingColumns[col] = ''
    })
    // Show the pop up where the user can select the corresponding columns to the missing important columns
    if (dev) console.log('checkForMissingColumns: All missing columns were identified')
    columnsDialogShow(missingColumns, currentColumns, file)
  }

  async function fileDrop(newFile: File) {
    file = newFile
    await Reader.readFileAsText(file)
    await checkForMissingColumns(Reader.content)
  }

  async function cacheCheck() {
    if (!file || !user.value) return
    checkForCache(file, selectedDomain === 'none' ? null : selectedDomain)
  }
</script>

<dialog bind:this={dialog} class="file-dialog">
  <div class="file-input-container">
    <h1 class="file-input-title">Upload a new file</h1>
    <button onclick={closeDialog} class="close-dialog" disabled={processing}><SvgIcon id="x" /></button>
    <div class="drop-container">
      <Drop extensions={['csv']} {fileDrop}>
        {#snippet children()}
          <label class="upload-file">
            {#if file}
              <SvgIcon id="excel" width="40px" height="40px" />
              <p>{file.name}</p>
            {:else}
              <SvgIcon id="upload" width="24px" height="24px" />
              <p>Drag or click to upload a file</p>
            {/if}
            <input class="file-input" type="file" name="file" id="file" accept=".csv" oninput={onFileInputChange} />
          </label>
        {/snippet}
      </Drop>
    </div>
    <div class="domain-container">
      <p class="domain-title">Domain:</p>
      <select class="domain-select" name="domains" id="domains" bind:value={selectedDomain}>
        <option value="none" selected>No domain</option>
        {#each Config.domains as domain}
          <option value={domain}>{domain}</option>
        {/each}
      </select>
    </div>
    <button class="upload" onclick={cacheCheck} disabled={file ? false : true || processing}>Upload</button>
    {#if processing}
      <Spinner />
    {/if}
  </div>
</dialog>

<style>
  .domain-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin: 1rem auto;
  }

  .domain-select {
    border: 1px solid lightgray;
    border-radius: 5px;
    padding: 0.2rem 0.5rem;
  }

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

  .drop-container {
    flex: 1 1 auto;
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

  .upload {
    width: 100%;
  }
</style>

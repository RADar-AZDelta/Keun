<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'
  import SvgIcon from './SvgIcon.svelte'
  import type { CustomOptionsEvents } from '../Types'
  import { dev } from '$app/environment'

  export let file: File | undefined

  const dispatch = createEventDispatcher<CustomOptionsEvents>()
  let columnDialog: HTMLDialogElement
  let inputFile: HTMLInputElement
  let currentColumns: string[]
  let missingColumns: Record<string, string> = {}

  // A method for when the button to upload a file is pressed
  async function onFileInputChange(e: Event): Promise<void> {
    if (dev) console.log('onFileInputChange: New file uploaded')
    await tick()

    var reader = new FileReader()

    reader.onload = () => {
      let content = reader.result?.toString()
      let importantColumns: string[] = ['sourceCode', 'sourceName', 'sourceFrequency']
      if (content) {
        if (
          !content.includes('sourceName') ||
          !content.includes('sourceCode') ||
          !content.includes('sourceFrequency')
        ) {
          currentColumns = content.split(/\n/)[0].split(',')
          importantColumns.forEach(col => {
            if (!currentColumns.includes(col)) missingColumns[col] = ''
          })
          // alert('Provide a file that contains the following columns: sourceCode, sourceName & sourceFrequency')
          openDialog()
        } else {
          file = file
          if (file) dispatch('fileUploaded', { file })
        }
      }
      inputFile.value = ''
      return
    }

    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return

    // Check the files if the extension is allowed
    for (const f of inputFiles) {
      const extension = f.name.split('.').pop()
      if (extension && extension == 'csv') {
        file = f
        reader.readAsText(f)
        break
      }
    }
  }

  function openDialog() {
    if (columnDialog.attributes.getNamedItem('open') == null) columnDialog.showModal()
  }

  function closeDialog() {
    if (columnDialog.attributes.getNamedItem('open') != null) columnDialog.close()
  }

  function saveColumnChange() {
    if (!Object.values(missingColumns).includes('')) {
      if (file) dispatch('fileUploadWithColumnChanges', { file, columnChange: missingColumns })
      closeDialog()
    }
  }
</script>

<dialog bind:this={columnDialog} data-name="column-dialog">
  <div data-name="dialog-container">
    <button data-name="close-dialog" on:click={closeDialog}>
      <SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
    </button>
    <h1>Set columns</h1>
    {#each Object.entries(missingColumns) as [newColumn, oldColumn]}
      <div data-name="column-selection">
        <p>{newColumn} column:</p>
        <select name={newColumn} id={newColumn} bind:value={missingColumns[newColumn]}>
          {#if currentColumns}
            {#each currentColumns as col}
              {#if col.toLowerCase() == newColumn.toLowerCase()}
                <option value={col} selected>{col}</option>
              {:else}
                <option value={col}>{col}</option>
              {/if}
            {/each}
          {/if}
        </select>
      </div>
    {/each}
    <div data-name="button-container"><button data-name="save" on:click={saveColumnChange}>Save</button></div>
  </div>
</dialog>

{#if file}
  <p data-name="filename" title={file.name}>{file.name}</p>
{/if}
<label title="Upload" for="file-upload" data-name="file-upload"
  ><SvgIcon href="icons.svg" id="upload" width="16px" height="16px" /></label
>
<input id="file-upload" type="file" accept=".csv" on:change={onFileInputChange} bind:this={inputFile} />

<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'
  import type { CustomOptionsEvents } from '../Types'
  import SvgIcon from './SvgIcon.svelte'
  import { dev } from '$app/environment'

  const dispatch = createEventDispatcher<CustomOptionsEvents>()
  let inputFile: HTMLInputElement
  let columnDialog: HTMLDialogElement
  let file: File
  let currentColumns: string[]
  let missingColumns: Record<string, string> = {}

  // A method for when a file is dropped in the drag and drop area
  function dropHandler(event: DragEvent): void {
    if (dev) console.log('dropHandler: A file has been dropped in the drag and drop area')
    event.preventDefault()
    var reader = new FileReader()

    reader.onload = () => {
      let content = reader.result?.toString()
      if (content) {
        if (
          !content.includes('sourceName') ||
          !content.includes('sourceCode') ||
          !content.includes('sourceFrequency')
        ) {
          // alert('Provide a file that contains the following columns: sourceCode, sourceName & sourceFrequency')
          currentColumns = content.split(/\n/)[0].split(',')
          openDialog()
        } else dispatch('fileUploaded', { file })
      }
      return
    }

    if (event.dataTransfer?.items) {
      if (event.dataTransfer.items.length > 1) {
        alert('Only drop one file')
      }
      for (let item of event.dataTransfer.items) {
        if (item.kind === 'file') {
          const f = item.getAsFile()
          // Check if the file is a csv file
          if (f?.name.toLowerCase().includes('csv')) {
            file = f
            reader.readAsText(f)
          }
        }
      }
    }
  }

  // A method for when a file is dragged over the drag and drop area
  function dragOverHandler(event: DragEvent): void {
    event.preventDefault()
  }

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
          for (let i = 0; i < currentColumns.length; i++) {
            if (currentColumns[i].includes(';'))
              currentColumns[i] = currentColumns[i].substring(0, currentColumns[i].indexOf(';'))
          }
          importantColumns.forEach(col => {
            if (!currentColumns.includes(col)) missingColumns[col] = ''
          })
          columnDialog.showModal()
        }
      }
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
    var reader = new FileReader()
      reader.onload = evt => {
        // Get the columns row of the file
        let sub = evt.target!.result!.toString().substring(0, evt.target!.result!.toString().indexOf('\n'))
        for (let [newColumn, oldColumn] of Object.entries(missingColumns)) {
          // Replace the old columns with the standardized columns
          sub = sub.replace(oldColumn, newColumn)
        }
        const result = sub + evt.target!.result!.toString().slice(evt.target!.result!.toString().indexOf('\n'))
        const blob = new Blob([result], { type: 'text/csv' })
        file = new File([blob], file.name, { type: 'text/csv' })
        dispatch('fileUploaded', { file })
        columnDialog.close()
      }
      reader.readAsText(file)
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

<div data-name="drag-drop">
  <div data-name="drag-drop-container" on:drop={dropHandler} on:dragover={dragOverHandler}>
    <p>Drag a file here</p>
    <img src="drag.png" alt="Drag & drop file here" />
    <p>Or click here</p>
    <label title="Upload" for="file-upload" data-name="file-upload">
      <SvgIcon href="icons.svg" id="upload" width="16px" height="16px" />
    </label>
    <input id="file-upload" type="file" accept=".csv" on:change={onFileInputChange} bind:this={inputFile} />
  </div>
</div>

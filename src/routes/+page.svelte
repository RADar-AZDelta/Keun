<script lang="ts">
  import Spinner from '$lib/components/Extra/Spinner.svelte'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import { writable } from 'svelte/store'
  import { goto } from '$app/navigation'
  import { dev } from '$app/environment'
  import DragAndDrop from '$lib/components/Extra/DragAndDrop.svelte'
  import { columnChanges, implementation, implementationClass, settings } from '$lib/store'
  import type { FileUploadWithColumnChanges, FileUploadedEventDetail, IFunctionalityImpl } from '$lib/components/Types'

  let impl: IFunctionalityImpl

  let files: string[] = []
  let fileInputDialog: HTMLDialogElement, authorsDialog: HTMLDialogElement, columnDialog: HTMLDialogElement
  let currentColumns: string[],
    missingColumns: Record<string, string> = {}
  let file: File
  let userFilter: string
  let authorizedAuthors: string[]
  let processing = writable<boolean>(false)
  let chosenFile: string

  async function fileUploadedDragAndDrop(e: CustomEvent<FileUploadedEventDetail>) {
    if (dev) console.log('fileUploaded: New file uploaded')
    file = e.detail.file
    const url = URL.createObjectURL(file)
    goto(`/mapping?file=${url}&impl=none&fileName=${file.name}`)
    // TODO: implement possibility to change the columns
  }

  // A method to upload a file
  async function fileUploaded() {
    const allFiles = await $implementationClass.uploadFile(file, authorizedAuthors)
    if (allFiles) files = allFiles
    fileInputDialog.close()
  }

  // A method for when a new file has been put in the field
  function onFileInputChange(e: Event) {
    const allowedExtensions = ['csv', 'json']
    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return

    var reader = new FileReader()

    reader.onload = () => {
      let content = reader.result?.toString()
      let importantColumns: string[] = ['sourceCode', 'sourceName', 'sourceFrequency']
      if (content) {
        // Check if all columns needed are available
        if (
          !content.includes('sourceName') ||
          !content.includes('sourceCode') ||
          !content.includes('sourceFrequency')
        ) {
          currentColumns = content.split(/\n/)[0].split(',')
          importantColumns.forEach(col => {
            if (!currentColumns.includes(col)) missingColumns[col] = ''
          })
          columnDialog.showModal()
        }
      }
      return
    }

    for (const f of inputFiles) {
      const extension = f.name.split('.').pop()
      if (extension && allowedExtensions.includes(extension)) {
        file = f
        reader.readAsText(f)
        break
      }
    }
  }

  // A method for when a file is dropped in the drag and drop area
  function dropHandler(event: DragEvent): void {
    if (dev) console.log('dropHandler: A file has been dropped in the drag and drop area')
    event.preventDefault()
    var reader = new FileReader()

    reader.onload = () => {
      let content = reader.result?.toString()
      let importantColumns: string[] = ['sourceCode', 'sourceName', 'sourceFrequency']
      if (content) {
        // Check if all columns needed are available
        if (
          !content.includes('sourceName') ||
          !content.includes('sourceCode') ||
          !content.includes('sourceFrequency')
        ) {
          currentColumns = content.split(/\n/)[0].split(',')
          importantColumns.forEach(col => {
            if (!currentColumns.includes(col)) missingColumns[col] = ''
          })
          columnDialog.showModal()
        }
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

  // A method to rename the columns to get a standardized version of the file
  function fileUploadWithColumnChanges() {
    if ($settings?.author?.uid && $settings?.author?.roles?.includes('Admin')) {
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
        columnDialog.close()
      }
      reader.readAsText(file)
    }
  }

  function fileUploadedWithColumnChangesLocal(e: CustomEvent<FileUploadWithColumnChanges>) {
    if (dev) console.log('fileUploadedWithColumnChanges: New file uploaded and columns have changed')
    file = e.detail.file
    $columnChanges = Object.fromEntries(Object.entries(e.detail.columnChange).map(a => a.reverse()))
  }

  // A method to delete a file
  async function deleteFile(fileName: string) {
    $processing = true
    await $implementationClass.deleteFile(fileName)
    $processing = false
  }

  // A method to edit the authors that have access to a file
  async function editFile(fileName: string) {
    await $implementationClass.editFile(fileName, authorizedAuthors)
    authorsDialog.close()
  }

  // A method to send the user to the mappingtool
  function openMappingTool(fileName: string) {
    if (fileName !== 'customConcepts.csv') goto(`/mapping?impl=firebase&fileName=${fileName}`)
  }

  async function getFiles() {
    const getFilesRes = await $implementationClass?.getFiles()
    if (getFilesRes) files = getFilesRes
  }

  $: {
    // When the user changes, renew the files
    if ($settings.author && $implementationClass) {
      getFiles()
    }
  }
</script>

<svelte:head>
  <title>Keun</title>
  <meta
    name="description"
    content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi."
  />
</svelte:head>

{#if $implementation == 'firebase'}
  <main data-name="files-screen">
    <dialog bind:this={fileInputDialog} data-name="file-dialog">
      <div data-name="file-input-container">
        <h1 data-name="file-input-title">Upload a new file</h1>
        <button
          on:click={() => {
            fileInputDialog.close()
            authorizedAuthors = []
          }}
          data-name="close-dialog"
          disabled={$processing}
          ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
        </button>
        <div data-name="drag-drop-container" on:drop={dropHandler} on:dragover|preventDefault>
          <label data-name="upload-file">
            {#if file}
              <SvgIcon href="icons.svg" id="excel" width="40px" height="40px" />
              <p>{file.name}</p>
            {:else}
              <SvgIcon href="icons.svg" id="upload" width="24px" height="24px" />
              <p>Drag or click to upload a file</p>
            {/if}
            <input type="file" name="file" id="file" accept=".csv" on:change={onFileInputChange} />
          </label>
        </div>

        <h2>Select the authors that have permission to this file:</h2>
        <input type="text" placeholder="search for an user" bind:value={userFilter} />
        <ul data-name="authors-list">
          {#await $implementationClass?.getAllAuthors() then users}
            {#if users}
              {#each Object.entries(users) as [uid, info]}
                {#if info.email}
                  {#if userFilter}
                    {#if info.email.toLowerCase().includes(userFilter.toLowerCase())}
                      <li>
                        <label>
                          <input
                            type="checkbox"
                            name={info.email}
                            id={info.email}
                            bind:group={authorizedAuthors}
                            value={uid}
                          />
                          {info.email}
                        </label>
                      </li>
                    {/if}
                  {:else}
                    <li>
                      <label>
                        <input
                          type="checkbox"
                          name={info.email}
                          id={info.email}
                          bind:group={authorizedAuthors}
                          value={uid}
                        />
                        {info.email}
                      </label>
                    </li>
                  {/if}
                {/if}
              {/each}
            {/if}
          {/await}
        </ul>

        <button on:click={fileUploaded} disabled={file ? false : true || $processing}>Upload</button>
        {#if $processing}
          <Spinner />
        {/if}
      </div>
    </dialog>

    <dialog bind:this={columnDialog} data-name="column-dialog">
      <div data-name="dialog-container">
        <button data-name="close-dialog" on:click={() => columnDialog.close()}>
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
        <div data-name="button-container">
          <button data-name="save" on:click={fileUploadWithColumnChanges}>Save</button>
        </div>
      </div>
    </dialog>

    <dialog bind:this={authorsDialog} data-name="authors-dialog">
      <div data-name="authors-container">
        <button
          on:click={() => {
            authorsDialog.close()
            authorizedAuthors = []
          }}
          data-name="close-dialog"
          disabled={$processing}
          ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
        </button>
        <h1>Update the authorized authors</h1>
        <ul>
          {#await $implementationClass?.getAllAuthors() then users}
            {#if users}
              {#each Object.entries(users) as [uid, info]}
                {#if info.email}
                  <li>
                    <label>
                      <input
                        type="checkbox"
                        name={info.email}
                        id={info.email}
                        checked={info.files ? Object.values(info.files).includes(chosenFile) : false}
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
        <button on:click={() => editFile(chosenFile)}>Update</button>
      </div>
    </dialog>

    <section data-name="file-selection">
      <section data-name="file-container">
        <div data-name="file-menu">
          <h1>Files to map</h1>
          <div data-name="file-list">
            {#if $settings?.author?.uid}
              {#each files as file}
                <button data-name="file-card" on:click={() => openMappingTool(file)}>
                  <div data-name="file-name">
                    <SvgIcon href="icons.svg" id="excel" width="40px" height="40px" />
                    <p>{file}</p>
                  </div>
                  {#if $settings.author?.roles?.includes('Admin')}
                    <div>
                      <button
                        data-name="download-file"
                        on:click={async e => {
                          if (e && e.stopPropagation) e.stopPropagation()
                          $implementationClass.downloadFile(file)
                        }}
                      >
                        <SvgIcon href="icons.svg" id="download" width="16px" height="16px" />
                      </button>
                      <button
                        disabled={file === 'customConcepts.csv'}
                        data-name="edit-file"
                        on:click={async e => {
                          if (e && e.stopPropagation) e.stopPropagation()
                          if (file !== 'customConcepts.csv') {
                            chosenFile = file
                            authorsDialog.showModal()
                          }
                        }}
                      >
                        <SvgIcon href="icons.svg" id="edit" width="16px" height="16px" />
                      </button>
                      <button
                        disabled={file === 'customConcepts.csv'}
                        data-name="delete-file"
                        on:click={e => {
                          if (e && e.stopPropagation) e.stopPropagation()
                          if (file !== 'customConcepts.csv') deleteFile(file)
                        }}><SvgIcon href="icons.svg" id="x" width="16px" height="16px" /></button
                      >
                    </div>
                  {/if}
                </button>
              {/each}
            {:else}
              <div data-name="loader">
                <Spinner />
              </div>
            {/if}
          </div>
          {#if $processing}
            <Spinner />
          {/if}
          {#if $settings?.author?.roles?.includes('Admin')}
            <button on:click={() => fileInputDialog.showModal()} data-name="file-add">+ Add file</button>
          {/if}
        </div>
      </section>
    </section>
  </main>
{:else}
  <DragAndDrop
    on:fileUploaded={fileUploadedDragAndDrop}
    on:fileUploadedWithColumnChanges={fileUploadedWithColumnChangesLocal}
  />
{/if}

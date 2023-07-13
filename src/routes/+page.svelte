<script lang="ts">
  import Spinner from '$lib/components/Extra/Spinner.svelte'
  import SvgIcon from '$lib/components/Extra/SvgIcon.svelte'
  import { writable } from 'svelte/store'
  import { goto } from '$app/navigation'
  import { dev } from '$app/environment'
  import { fileName, implementation, implementationClass, settings } from '$lib/store'

  let files: string[] = []
  let fileInputDialog: HTMLDialogElement, authorsDialog: HTMLDialogElement, columnDialog: HTMLDialogElement
  let currentColumns: string[],
    missingColumns: Record<string, string> = {}
  let file: File
  let userFilter: string
  let authorizedAuthors: string[]
  let processing = writable<boolean>(false)
  let chosenFile: string
  let locationDialog: HTMLDialogElement

  // A method to check if there is cache of files
  async function checkForCache() {
    const cached = await $implementationClass.checkForCache(file.name)
    // When the application is using Firebase, this function will always return void so the file will be uploaded
    // Checking for cache is only for local mapping without a cloud implementation
    if (cached) locationDialog.showModal()
    else await fileUploaded()
  }

  // A method to upload a file
  async function fileUploaded() {
    await $implementationClass.checkCustomConcepts()
    // Upload the file to the storage depending on the implementationmethod
    const allFiles = await $implementationClass.uploadFile(file, authorizedAuthors)
    if (allFiles) files = allFiles
    fileInputDialog.close()
  }

  // A method to go to the mapping route without updating the file in IndexedDB for local mapping (the cached version is still in IndexedDB)
  async function mapCachedFile(fileName: string) {
    if (dev) console.log(`mapCachedFile: Go to the route "/mapping" to map the file: ${fileName}`)
    $fileName = fileName
    await $implementationClass.checkCustomConcepts()
    goto('/mapping')
  }

  function checkForMissingColumns(this: FileReader, ev: ProgressEvent<FileReader>) {
    let content = this.result?.toString()
    let importantColumns: string[] = ['sourceCode', 'sourceName', 'sourceFrequency']
    if (content) {
      // Check if all columns needed are available
      if (!content.includes('sourceName') || !content.includes('sourceCode') || !content.includes('sourceFrequency')) {
        // Get all the columns from the document
        currentColumns = content.split(/\n/)[0].split(',')
        for (let i = 0; i < currentColumns.length; i++) {
          // Sometimes a column ends with multiple instances of ";" so this needs to be removed
          if (currentColumns[i].includes(';'))
            currentColumns[i] = currentColumns[i].substring(0, currentColumns[i].indexOf(';'))
        }
        importantColumns.forEach(col => {
          // If a important column is missing, add it to the missingColumns object, the corresponding column will be asigned to this object later
          if (!currentColumns.includes(col)) missingColumns[col] = ''
        })
        // Show the pop up where the user can select the corresponding columns to the missing important columns
        columnDialog.showModal()
      }
    }
    return
  }

  // A method for when a new file has been put in the field
  function onFileInputChange(e: Event) {
    if (dev) console.log('onFileInputChange: A file has been upload via the input button')
    const allowedExtensions = ['csv']
    const inputFiles = (e.target as HTMLInputElement).files
    if (!inputFiles) return

    var reader = new FileReader()

    reader.onload = checkForMissingColumns

    for (const f of inputFiles) {
      // There will only be one file, split the name from the extension
      const extension = f.name.split('.').pop()
      // Check if the extension is allowed, check the file for missing columns
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
    const allowedExtensions = ['csv']
    var reader = new FileReader()

    reader.onload = checkForMissingColumns

    if (event.dataTransfer?.items) {
      if (event.dataTransfer.items.length > 1) {
        alert('Only drop one file')
      }
      for (let item of event.dataTransfer.items) {
        if (item.kind === 'file') {
          const f = item.getAsFile()
          const extension = f?.name.split('.').pop()
          // Check if the extension is allowed, check the file for missing columns
          if (extension && allowedExtensions.includes(extension) && f) {
            file = f
            reader.readAsText(f)
          }
        }
      }
    }
  }

  // A method to rename the columns to get a standardized version of the file
  function fileUploadWithColumnChanges() {
    if (
      (($implementation == 'firebase' && $settings?.author?.roles?.includes('Admin')) ||
        $implementation == 'none' ||
        !$implementation) &&
      $settings?.author?.name
    ) {
      var reader = new FileReader()
      reader.onload = evt => {
        // Get the columns row of the file
        const fileContent = evt.target!.result?.toString()!
        let columns = fileContent.substring(0, fileContent.indexOf('\n'))
        for (let [newColumn, oldColumn] of Object.entries(missingColumns)) {
          // Replace the old columns with the standardized columns
          columns = columns.replace(oldColumn, newColumn)
        }
        // Combine the columns and the rest of the file together
        const updatedFileContent = columns + fileContent.slice(fileContent.indexOf('\n'))
        const blob = new Blob([updatedFileContent], { type: 'text/csv' })
        file = new File([blob], file.name, { type: 'text/csv' })
        columnDialog.close()
      }
      reader.readAsText(file)
    }
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

  // A method to get all the files to map
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

  $: {
    if(file) $fileName = file.name
  }
</script>

<svelte:head>
  <title>Keun</title>
  <meta
    name="description"
    content="Keun is a mapping tool to map concepts to OMOP concepts. It's a web based modern variant of Usagi."
  />
</svelte:head>

<dialog data-name="location-dialog" bind:this={locationDialog}>
  <div data-name="location-container">
    <button
      on:click={() => {
        locationDialog.close()
      }}
      data-name="close-dialog"
      disabled={$processing}
      ><SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
    </button>
    <h2>Do you want to use this file or the cached version of this file?</h2>
    <div data-name="button-choices">
      <button on:click={fileUploaded}>File</button>
      <button on:click={() => mapCachedFile(file.name)}>Cached version</button>
    </div>
  </div>
</dialog>

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
    {#if $implementation == 'firebase'}
      <h2>Select the authors that have permission to this file:</h2>
      <input type="text" placeholder="search for an user" bind:value={userFilter} />
      <ul data-name="authors-list">
        {#await $implementationClass?.getAllAuthors() then users}
          {#if users}
            {#each Object.entries(users) as [uid, info]}
              {#if userFilter && info.email?.toLowerCase().includes(userFilter?.toLowerCase())}
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
            {/each}
          {/if}
        {/await}
      </ul>
    {/if}
    <button on:click={checkForCache} disabled={file ? false : true || $processing}>Upload</button>
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

<main data-name="files-screen">
  <section data-name="file-selection">
    <section data-name="file-container">
      <div data-name="file-menu">
        <h1>Files to map</h1>
        <div data-name="file-list">
          {#if $implementation == 'firebase'}
            {#if $settings?.author?.name}
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
                          await $implementationClass.downloadFile(file)
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
          {:else}
            {#each files as file}
              <button data-name="file-card" disabled={file == "customConcepts.csv" ? true : false} on:click={() => mapCachedFile(file)}>
                <div data-name="file-name">
                  <SvgIcon href="icons.svg" id="excel" width="40px" height="40px" />
                  <p>{file}</p>
                </div>
                <div>
                  <button
                    data-name="download-file"
                    on:click={async e => {
                      if (e && e.stopPropagation) e.stopPropagation()
                      await $implementationClass.downloadFile(file)
                    }}
                  >
                    <SvgIcon href="icons.svg" id="download" width="16px" height="16px" />
                  </button>
                  <button data-name="delete-file" disabled={file == "customConcepts.csv" ? true : false} on:click={async e => {
                    if(e && e.stopPropagation) e.stopPropagation()
                    await $implementationClass.removeCache(file)
                    await getFiles()
                  }}>
                    <SvgIcon href="icons.svg" id="x" width="16px" height="16px" />
                  </button>
                </div>
              </button>
            {/each}
          {/if}
        </div>
        {#if $processing}
          <Spinner />
        {/if}
        {#if $implementation == 'firebase' && $settings?.author?.roles?.includes('Admin')}
          <button on:click={() => fileInputDialog.showModal()} data-name="file-add">+ Add file</button>
        {:else}
          <button on:click={() => fileInputDialog.showModal()} data-name="file-add">+ Add file</button>
        {/if}
      </div>
    </section>
  </section>
</main>